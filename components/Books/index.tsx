"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import ForumAvatar from "../Forum/ForumAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Book as BookIcon,
  Plus,
  ChevronLeft,
  Sparkles,
  BookOpen,
  CornerDownLeft,
  X,
  MessageSquare,
} from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  summary?: string;
  created_at: string;
}

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  forum_post_id?: number;
  created_at: string;
}

interface DiscussionComment {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
    is_bot?: boolean;
  };
}

export default function BooksApp() {
  const { user, profile, isAdmin } = useAuth();
  const { addToast } = useToast();

  // state management
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comments, setComments] = useState<DiscussionComment[]>([]);

  // Loading states
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isBotResponding, setIsBotResponding] = useState(false);

  // ePub / PDF formatting preferences
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [debatePanelOpen, setDebatePanelOpen] = useState(true);

  // User commentary input
  const [newComment, setNewComment] = useState("");

  // Admin Forms State
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);

  // New Book Form Data
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookSummary, setNewBookSummary] = useState("");

  // New Chapter Form Data
  const [newChapterNumber, setNewChapterNumber] = useState(1);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");

  // 1. Fetch Books
  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch("/api/books");
      const data = await res.json();
      if (data.books) {
        setBooks(data.books);
      } else if (data.error) {
        addToast(data.error, "error");
      }
    } catch (err) {
      addToast("Failed to fetch books list", "error");
    } finally {
      setLoadingBooks(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // 2. Fetch Chapters (Sorted by Chapter Number)
  const fetchChapters = useCallback(
    async (bookId: string) => {
      setLoadingChapters(true);
      try {
        const res = await fetch(`/api/books/chapters?bookId=${bookId}`);
        const data = await res.json();
        if (data.chapters) {
          setChapters(data.chapters);
        } else if (data.error) {
          addToast(data.error, "error");
        }
      } catch (err) {
        addToast("Failed to fetch book chapters", "error");
      } finally {
        setLoadingChapters(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (activeBook) {
      fetchChapters(activeBook.id);
    } else {
      setChapters([]);
    }
  }, [activeBook, fetchChapters]);

  // Determine target discussion thread ID (linked to first chapter of the book)
  const activeThreadId = chapters[0]?.forum_post_id;
  const activeChapterId = chapters[0]?.id;

  // 3. Fetch Comments / Debates
  const fetchComments = useCallback(async (threadId: number) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("community_replies")
        .select(
          "id, post_id, content, created_at, profiles(username, avatar_url)",
        )
        .eq("post_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error.message);
      } else if (data) {
        setComments(data as unknown as DiscussionComment[]);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      fetchComments(activeThreadId);

      // Set up real-time listener for new bot/user replies in this thread
      const channel = supabase
        .channel(`book-replies-${activeThreadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "community_replies",
            filter: `post_id=eq.${activeThreadId}`,
          },
          () => {
            fetchComments(activeThreadId);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setComments([]);
    }
  }, [activeThreadId, fetchComments]);

  // 4. Handle Post Comment / User Response
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      addToast("please log in to participate in the debate.", "error");
      return;
    }
    if (!newComment.trim() || !activeThreadId) return;

    const commentText = newComment.trim();
    setNewComment("");

    try {
      const { error } = await supabase.from("community_replies").insert({
        post_id: activeThreadId,
        author_id: user.id,
        content: commentText,
      });

      if (error) {
        addToast(error.message, "error");
        setNewComment(commentText);
      } else {
        fetchComments(activeThreadId);
      }
    } catch (err) {
      addToast("failed to submit comment", "error");
    }
  };

  // 5. Trigger Bot Debate/Perspective
  const triggerBotDebate = async () => {
    if (!activeChapterId) return;
    setIsBotResponding(true);
    addToast("calling AI agent to formulate a perspective...", "success");

    try {
      const tokenResponse = await supabase.auth.getSession();
      const sessionToken = tokenResponse.data.session?.access_token;

      const res = await fetch("/api/agent/book-debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          chapterId: activeChapterId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addToast("agent successfully posted their perspective!", "success");
        if (activeThreadId) {
          fetchComments(activeThreadId);
        }
      } else {
        addToast(data.error || "failed to trigger bot debate", "error");
      }
    } catch (err) {
      addToast("network error triggering debate", "error");
    } finally {
      setIsBotResponding(false);
    }
  };

  // 6. Admin: Add Book
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim()) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newBookTitle.trim(),
          author: newBookAuthor.trim(),
          summary: newBookSummary.trim(),
          cover_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newBookTitle)}`,
        }),
      });

      const data = await res.json();
      if (data.book) {
        addToast("book created successfully!", "success");
        setShowAddBook(false);
        setNewBookTitle("");
        setNewBookAuthor("");
        setNewBookSummary("");
        fetchBooks();
      } else {
        addToast(data.error || "failed to add book", "error");
      }
    } catch (err) {
      addToast("failed to add book", "error");
    }
  };

  // 7. Admin: Add Chapter
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook || !newChapterTitle.trim() || !newChapterContent.trim())
      return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch("/api/books/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId: activeBook.id,
          chapterNumber: newChapterNumber,
          title: newChapterTitle.trim(),
          content: newChapterContent.trim(),
        }),
      });

      const data = await res.json();
      if (data.chapter) {
        addToast("chapter created successfully!", "success");
        setShowAddChapter(false);
        setNewChapterTitle("");
        setNewChapterContent("");
        setNewChapterNumber((prev) => prev + 1);
        fetchChapters(activeBook.id);
      } else {
        addToast(data.error || "failed to add chapter", "error");
      }
    } catch (err) {
      addToast("failed to add chapter", "error");
    }
  };

  // ePub formatting style class resolvers
  const getFontSizeClass = () => {
    if (fontSize === "sm") return "text-xs md:text-sm";
    if (fontSize === "lg") return "text-base md:text-lg";
    if (fontSize === "xl") return "text-lg md:text-xl";
    return "text-sm md:text-base";
  };

  return (
    <div className="flex size-full overflow-hidden text-black bg-transparent select-none lowercase font-sans">
      <AnimatePresence mode="wait">
        {/* 1. Books List / Library Mode (If no active book selected) */}
        {!activeBook ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex-1 flex flex-col size-full overflow-hidden p-4 md:p-8 bg-[#F2F2F7] dark:bg-[#0A0A0A] rounded-[32px]"
          >
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <BookIcon className="w-6 h-6 text-black/60 dark:text-white/60" />
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-black dark:text-white">
                books app
              </h1>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddBook(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                add book
              </button>
            )}
          </div>

          {/* Books Grid */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loadingBooks ? (
              <div className="flex items-center justify-center h-48 text-xs font-bold text-black/40 dark:text-white/40">
                fetching catalog...
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-black/40 dark:text-white/40 gap-2">
                <BookOpen className="w-8 h-8 stroke-[1.5] text-black/20 dark:text-white/20" />
                <span className="text-xs font-bold">
                  no books in library yet.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 @lg:grid-cols-5 gap-6">
                {books.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => setActiveBook(book)}
                    className="flex flex-col bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-[24px] p-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group shadow-sm"
                  >
                    <div className="aspect-[3/4] w-full bg-black/5 dark:bg-white/5 rounded-[18px] overflow-hidden mb-3 border border-black/5 dark:border-white/5 shadow-inner flex items-center justify-center">
                      {book.cover_url ? (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      ) : (
                        <BookIcon className="w-8 h-8 text-black/20 dark:text-white/20" />
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-black dark:text-white truncate">
                      {book.title}
                    </h3>
                    <p className="text-xs text-black/40 dark:text-white/40 truncate mt-0.5">
                      by {book.author}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Add Book Modal */}
          {showAddBook && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm p-4">
              <form
                onSubmit={handleAddBook}
                className="bg-white/90 dark:bg-[#121214]/90 supports-[backdrop-filter]:backdrop-blur-xl border border-black/5 dark:border-white/5 p-6 rounded-[32px] w-full max-w-md shadow-2xl flex flex-col gap-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <h2 className="text-sm font-black text-black dark:text-white">
                    add new book
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddBook(false)}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4 text-black/40 dark:text-white/40" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                    title
                  </span>
                  <input
                    type="text"
                    required
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="e.g. meditations"
                    className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-2.5 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                    author
                  </span>
                  <input
                    type="text"
                    required
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    placeholder="e.g. marcus aurelius"
                    className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-2.5 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                    summary / description
                  </span>
                  <textarea
                    value={newBookSummary}
                    onChange={(e) => setNewBookSummary(e.target.value)}
                    placeholder="brief summary of the work..."
                    rows={3}
                    className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-3 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 resize-none transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold py-2.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    create book
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBook(false)}
                    className="flex-1 bg-black/5 dark:bg-white/5 text-black dark:text-white text-xs font-bold py-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all"
                  >
                    cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          </motion.div>
        ) : (
          /* 2. Reader Mode (If book selected) */
          <motion.div
            key="reader"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex-1 flex size-full overflow-hidden bg-transparent transition-colors duration-500 @container relative rounded-[32px]"
          >
            {/* 2.1 Main Reading Area (Center Canvas) */}
            <div
              className={`flex-1 flex flex-col h-full min-w-0 transition-colors duration-500 bg-white dark:bg-black rounded-l-[32px]`}
            >
            {/* Reader Sub-Header (Controls Bar) */}
            <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-black select-none z-10 rounded-tl-[32px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveBook(null)}
                  className="flex items-center gap-1.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white text-xs font-bold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  library
                </button>
                <span className="text-[10px] font-black text-black/30 dark:text-white/30 tracking-wider">
                  / {activeBook.title}
                </span>
              </div>

              {/* Centered Document Title on Desktop Viewports */}
              <div className="hidden @md:block text-xs font-extrabold text-black/80 dark:text-white/80">
                {activeBook.title} — {activeBook.author}
              </div>

              {/* ePub Formatting settings */}
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => setShowAddChapter(true)}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 flex items-center gap-1 text-[10px] font-black"
                    title="add chapter"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    chapter
                  </button>
                )}

                {/* Font Sizing */}
                <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-full p-0.5 border border-black/5 dark:border-white/5">
                  <button
                    onClick={() =>
                      setFontSize((prev) =>
                        prev === "xl" ? "lg" : prev === "lg" ? "base" : "sm",
                      )
                    }
                    className="p-1 rounded-full text-[10px] font-extrabold hover:text-black dark:hover:text-white"
                    title="decrease text size"
                  >
                    a-
                  </button>
                  <span className="text-[9px] font-black px-1.5 opacity-55">
                    {fontSize}
                  </span>
                  <button
                    onClick={() =>
                      setFontSize((prev) =>
                        prev === "sm" ? "base" : prev === "base" ? "lg" : "xl",
                      )
                    }
                    className="p-1 rounded-full text-[10px] font-extrabold hover:text-black dark:hover:text-white"
                    title="increase text size"
                  >
                    a+
                  </button>
                </div>

                <button
                  onClick={() => setDebatePanelOpen((prev) => !prev)}
                  className={`px-2 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 text-[10px] font-black ${debatePanelOpen ? "bg-black/5 dark:bg-white/5 text-black dark:text-white" : "text-black/40 dark:text-white/40"}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  debate
                </button>
              </div>
            </div>

            {/* ePub/PDF Centered Page Layout Sheet Canvas */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-6 md:p-8 flex justify-center">
              {loadingChapters ? (
                <div className="flex items-center justify-center h-full text-xs font-bold text-black/40 dark:text-white/40 animate-pulse">
                  loading text...
                </div>
              ) : chapters.length === 0 ? (
                <div className="flex flex-col items-center justify-center self-center text-black/40 dark:text-white/40 gap-2">
                  <BookOpen className="w-10 h-10 text-black/20 dark:text-white/20 stroke-[1.5]" />
                  <span className="text-xs font-bold">no content loaded.</span>
                </div>
              ) : (
                <div
                  className={`w-full max-w-2xl rounded-[32px] border p-6 sm:p-10 md:p-12 mb-12 h-fit select-text select-all transition-colors duration-300 bg-white dark:bg-black text-black dark:text-white border-black/5 dark:border-white/5`}
                >
                  <article className="flex flex-col gap-6 font-serif">
                    {/* Book Title & Author Sheet Header */}
                    <div className="text-center pb-4 border-b border-black/5 dark:border-white/5 mb-8">
                      <h1 className="text-xl md:text-2xl font-black tracking-tight leading-snug">
                        {activeBook.title}
                      </h1>
                      <p className="text-xs opacity-50 mt-1">
                        by {activeBook.author}
                      </p>
                    </div>

                    {/* Continuous Chapters flow */}
                    {chapters.map((ch) => (
                      <div key={ch.id} className="mb-10 last:mb-0">
                        <h2 className="text-sm md:text-base font-extrabold tracking-tight mb-4 border-b border-black/5 dark:border-white/5 pb-1 opacity-75">
                          chapter {ch.chapter_number}: {ch.title}
                        </h2>

                        {/* Chapter Content Block */}
                        <div
                          className={`leading-relaxed tracking-wide space-y-4 text-justify select-text select-all ${getFontSizeClass()}`}
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          {ch.content.split("\n\n").map((para, idx) => (
                            <p key={idx}>{para}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </article>
                </div>
              )}
            </div>
          </div>

          {/* Debate Panel backdrop on mobile */}
          {debatePanelOpen && activeThreadId && (
            <div
              onClick={() => setDebatePanelOpen(false)}
              className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[1px] z-40 @lg:hidden"
            />
          )}

          {/* 2.2 Bot Debate & Human Commentary Sidebar (Right Panel) */}
          <AnimatePresence>
          {activeThreadId && debatePanelOpen && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`absolute inset-y-0 right-0 w-80 max-w-[90%] z-50 bg-gray-50 dark:bg-[#121214] border-l border-black/5 dark:border-white/5 flex flex-col h-full rounded-r-[32px] @lg:rounded-l-none @lg:rounded-r-[32px] @lg:static @lg:w-80`}
            >
              {/* Panel Header */}
              <div className="p-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 select-none bg-white dark:bg-[#1a1a1c] rounded-tr-[32px]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                  <span className="text-[10px] font-black tracking-wider text-black/60 dark:text-white/60">
                    debate board
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={triggerBotDebate}
                    disabled={isBotResponding}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    trigger agent
                  </button>
                  <button
                    onClick={() => setDebatePanelOpen(false)}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-black/40 dark:text-white/40 @lg:hidden transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments Timeline */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
                {loadingComments ? (
                  <div className="text-center text-xs font-bold text-black/40 dark:text-white/40 py-12">
                    loading discussion...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-black/40 dark:text-white/40 gap-1.5 animate-fade">
                    <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                    <span className="text-[10px] font-bold text-center">
                      no commentary yet. trigger an agent!
                    </span>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isBot =
                      comment.profiles.is_bot ||
                      comment.profiles.username.toLowerCase() === "sofia" ||
                      comment.profiles.username.toLowerCase() === "marcus" ||
                      comment.profiles.username.toLowerCase() === "eren";
                    return (
                      <div
                        key={comment.id}
                        className={`flex flex-col bg-white dark:bg-[#1a1a1c] border rounded-[24px] p-3 shadow-sm transition-all duration-200
                                                    ${isBot ? "border-purple-100/50 dark:border-purple-900/20 bg-purple-50 dark:bg-purple-950/20" : "border-black/5 dark:border-white/5"}`}
                      >
                        {/* Author Header */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-black/10 dark:border-white/10 shrink-0">
                            <ForumAvatar
                              className="w-full h-full"
                              image={comment.profiles.avatar_url}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-black/80 dark:text-white/80">
                              @{comment.profiles.username}
                            </span>
                            {isBot && (
                              <span className="text-[8px] font-black bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1 rounded">
                                ai
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Text Content */}
                        <p className="text-xs text-black/80 dark:text-white/80 leading-normal select-text lowercase">
                          {comment.content}
                        </p>
                      </div>
                    );
                  })
                )}

                {isBotResponding && (
                  <div className="flex items-center space-x-2 py-1.5 text-purple-600 dark:text-purple-400 select-none animate-pulse">
                    <span className="text-[10px] font-extrabold lowercase">
                      ai agent is formulating perspective...
                    </span>
                  </div>
                )}
              </div>

              {/* Human Response Input Form */}
              <form
                onSubmit={handlePostComment}
                className="p-3 border-t border-black/5 dark:border-white/5 shrink-0 flex items-center gap-2 bg-white dark:bg-[#1a1a1c] rounded-br-[32px]"
              >
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    user
                      ? "post a note on the debate..."
                      : "log in to participate..."
                  }
                  disabled={!user}
                  className="flex-1 bg-gray-100 dark:bg-[#2a2a2c] border border-transparent rounded-full px-4 py-2 text-xs text-black dark:text-white outline-none placeholder:text-black/40 dark:placeholder:text-white/40 focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-colors duration-250 lowercase"
                />
                <button
                  type="submit"
                  disabled={!user || !newComment.trim()}
                  className="p-2 rounded-full bg-black dark:bg-white text-white dark:text-black hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-30 disabled:scale-100"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
          </AnimatePresence>

          {/* 2.3 Admin: Add Chapter Modal */}
          <AnimatePresence>
          {showAddChapter && activeBook && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 supports-[backdrop-filter]:backdrop-blur-sm p-4">
              <motion.form
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onSubmit={handleAddChapter}
                className="bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 p-6 rounded-[32px] w-full max-w-lg shadow-2xl flex flex-col gap-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
                  <h2 className="text-sm font-black text-black dark:text-white">
                    add new chapter — {activeBook.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddChapter(false)}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4 text-black/40 dark:text-white/40" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="w-24 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                      chapter number
                    </span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newChapterNumber}
                      onChange={(e) =>
                        setNewChapterNumber(parseInt(e.target.value) || 1)
                      }
                      className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-2.5 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-colors"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                      chapter title
                    </span>
                    <input
                      type="text"
                      required
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="e.g. of the things which are in our power..."
                      className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-2.5 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-black/40 dark:text-white/40 pl-2">
                    chapter text content
                  </span>
                  <textarea
                    required
                    value={newChapterContent}
                    onChange={(e) => setNewChapterContent(e.target.value)}
                    placeholder="paste chapter body paragraphs here... separate paragraphs with double line-breaks."
                    rows={10}
                    className="bg-black/5 dark:bg-white/5 border border-transparent rounded-[24px] px-4 py-3 text-xs text-black dark:text-white outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 dark:focus:border-white/10 font-serif resize-none transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-black dark:bg-white text-white dark:text-black text-xs font-bold py-2.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    add chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChapter(false)}
                    className="flex-1 bg-black/5 dark:bg-white/5 text-black dark:text-white text-xs font-bold py-2.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.98] transition-all"
                  >
                    cancel
                  </button>
                </div>
              </motion.form>
            </div>
          )}
          </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
