"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../context/App";
import ScrollArea from "components/RadixUI/ScrollArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loading from "components/Loading";
import BlogPostView from "components/ReaderView/BlogPostView";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(relativeTime);

// ─── Types ────────────────────────────────────────────────────────────────────
interface ResearchSource {
    title: string;
    url: string;
    excerpt: string;
    source: string;
    publishedAt?: string;
}

interface Collaboration {
    id: string;
    title: string;
    topic_description?: string;
    status: "drafting" | "reviewing" | "completed";
    current_draft?: string;
    research_context?: ResearchSource[];
    post_id?: string;
    step_count: number;
    is_continuous?: boolean;
    is_autonomous?: boolean;
    created_at: string;
    updated_at: string;
}

interface StepProfile {
    username: string;
    avatar_url?: string;
}

interface SymposiumStep {
    id: string;
    collaboration_id: string;
    agent_id: string;
    step_number: number;
    step_type: string;
    inner_thoughts?: string;
    content: string;
    created_at: string;
    profiles?: StepProfile | StepProfile[] | null;
}

interface BlackboardTask {
    id: string;
    collaboration_id: string;
    task_name: string;
    section_title?: string;
    assigned_agent_id?: string;
    status: "todo" | "in_progress" | "completed";
    created_at: string;
    updated_at: string;
    profiles?: StepProfile | StepProfile[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEP_LABELS: Record<string, string> = {
    research: "research outline",
    research_dossier: "research outline",
    draft: "first draft",
    draft_first_sections: "first draft",
    expand: "depth expansion",
    expand_section: "depth expansion",
    critique: "devil's advocate",
    peer_review_section: "devil's advocate",
    revise: "editorial synthesis",
    merge_and_synthesis: "editorial synthesis",
    polish: "final copy edit",
    final_polish: "final copy edit",
};

const TASK_LABELS: Record<string, string> = {
    research_dossier: "research dossier",
    draft_first_sections: "draft outline & intro",
    expand_section: "depth section draft",
    peer_review_section: "peer section critique",
    merge_and_synthesis: "editorial merge & synthesis",
    final_polish: "final polish pass",
};

// Helper for dynamic max steps (14 for continuous, 6 for standard)
const getMaxSteps = (collab: Collaboration | null) => {
    if (!collab) return 6;
    return collab.is_continuous ? 14 : 6;
};

// ─── Image Renderer ───────────────────────────────────────────────────────────
const IllustrationImage = ({ alt = "", src = "" }: { alt?: string; src?: string }) => {
    if (alt.startsWith("illustration:")) {
        const query = alt.replace("illustration:", "").trim().replace(/\s+/g, ",");
        const imageUrl = `https://loremflickr.com/800/400/${encodeURIComponent(query)}`;
        return (
            <figure className="my-8 overflow-hidden rounded-[24px] bg-primary/5 border border-primary/10 shadow-sm relative group">
                <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={alt}
                    className="w-full object-cover aspect-video hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                />
                <figcaption className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-20">
                    <div className="text-[9px] font-mono text-white/90 text-center lowercase tracking-wider">
                        ⌁ {query.replace(/,/g, " · ")} ⌁
                    </div>
                </figcaption>
            </figure>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="w-full rounded-[24px] my-6 shadow-sm border border-primary/5" />;
};

const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => <h3 className="font-bold text-[11px] text-primary mt-6 mb-2 tracking-tight uppercase"># {children}</h3>,
    h2: ({ children }: { children?: React.ReactNode }) => <h4 className="font-bold text-[11px] text-primary mt-4 mb-2 tracking-tight lowercase">## {children}</h4>,
    h3: ({ children }: { children?: React.ReactNode }) => <h5 className="font-bold text-[10px] text-primary mt-3 mb-1 tracking-tight lowercase">### {children}</h5>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="text-[11px] leading-relaxed text-primary/80 mb-3 select-text">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="text-[11px] leading-relaxed text-primary/80 select-text">{children}</li>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l border-primary/20 pl-3 italic text-primary/60 my-4 text-[10px] leading-relaxed select-text">
            {children}
        </blockquote>
    ),
    code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
        if (inline) {
            return <code className="bg-primary/5 px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>;
        }
        return (
            <pre className="bg-primary/5 p-3 rounded overflow-x-auto text-[10px] font-mono my-3 border border-primary/10 select-text">
                <code>{children}</code>
            </pre>
        );
    },
    img: IllustrationImage
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SymposiumApp() {
    const { addToast } = useToast();
    const { addWindow } = useApp();

    const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
    const [activeCollab, setActiveCollab] = useState<Collaboration | null>(null);
    const [steps, setSteps] = useState<SymposiumStep[]>([]);
    const [tasks, setTasks] = useState<BlackboardTask[]>([]);
    const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

    const [loadingCollabs, setLoadingCollabs] = useState(true);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [viewMode, setViewMode] = useState<"paper" | "blackboard">("paper");

    // New Symposium modal state
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isContinuous, setIsContinuous] = useState(true);
    const [runInBackground, setRunInBackground] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Live Execution controls
    const [isRunning, setIsRunning] = useState(false);
    const [steerInput, setSteerInput] = useState("");
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

    // Research state
    const [sources, setSources] = useState<ResearchSource[]>([]);
    const [loadingResearch, setLoadingResearch] = useState(false);



    // ── Fetch collaborations ────────────────────────────────────────────────
    const fetchCollaborations = useCallback(async () => {
        setLoadingCollabs(true);
        try {
            const res = await fetch("/api/symposium");
            const data = await res.json() as { collaborations?: Collaboration[]; error?: string };
            if (data.collaborations) setCollaborations(data.collaborations);
        } catch {
            addToast("failed to load symposiums", "error");
        } finally {
            setLoadingCollabs(false);
        }
    }, [addToast]);

    useEffect(() => { fetchCollaborations(); }, [fetchCollaborations]);

    // ── Fetch steps for active collaboration ───────────────────────────────
    const fetchSteps = useCallback(async (collabId: string) => {
        setLoadingSteps(true);
        try {
            const { data } = await supabase
                .from("symposium_steps")
                .select("*, profiles(username, avatar_url)")
                .eq("collaboration_id", collabId)
                .order("step_number", { ascending: true });
            setSteps((data as SymposiumStep[]) || []);
        } catch {
            console.error("Error fetching steps");
        } finally {
            setLoadingSteps(false);
        }
    }, []);

    // ── Fetch tasks for blackboard ─────────────────────────────────────────
    const fetchTasks = useCallback(async (collabId: string) => {
        try {
            const { data } = await supabase
                .from("symposium_tasks")
                .select("*, profiles(username, avatar_url)")
                .eq("collaboration_id", collabId)
                .order("created_at", { ascending: true });
            setTasks((data as BlackboardTask[]) || []);
        } catch {
            console.error("Error fetching blackboard tasks");
        }
    }, []);

    // ── Refresh active collab ──────────────────────────────────────────────
    const refreshCollab = useCallback(async (collabId: string) => {
        const { data } = await supabase
            .from("symposium_collaborations")
            .select("*")
            .eq("id", collabId)
            .single();
        if (data) setActiveCollab(data as Collaboration);
    }, []);

    useEffect(() => {
        if (!activeCollab) {
            setSteps([]);
            setTasks([]);
            return;
        }
        fetchSteps(activeCollab.id);
        fetchTasks(activeCollab.id);

        const channel = supabase
            .channel(`symposium-${activeCollab.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "symposium_steps",
                filter: `collaboration_id=eq.${activeCollab.id}`,
            }, () => {
                fetchSteps(activeCollab.id);
                refreshCollab(activeCollab.id);
            })
            .subscribe();

        const tasksChannel = supabase
            .channel(`symposium-tasks-${activeCollab.id}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "symposium_tasks",
                filter: `collaboration_id=eq.${activeCollab.id}`,
            }, () => {
                fetchTasks(activeCollab.id);
                refreshCollab(activeCollab.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(tasksChannel);
        };
    }, [activeCollab, fetchSteps, fetchTasks, refreshCollab]);

    // ── Fetch research sources for a topic ─────────────────────────────────
    const fetchResearch = async (topic: string) => {
        if (!topic.trim()) return;
        setLoadingResearch(true);
        setSources([]);
        try {
            const res = await fetch("/api/symposium/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic }),
            });
            const data = await res.json() as { sources?: ResearchSource[] };
            if (data.sources) setSources(data.sources);
        } catch {
            addToast("research fetch failed", "error");
        } finally {
            setLoadingResearch(false);
        }
    };

    // ── Trigger a single step manually (optionally with steering) ──────────
    const triggerSingleStep = async () => {
        if (!activeCollab || isRunning) return;
        setIsRunning(true);
        try {
            const targetStepNum = (activeCollab.step_count || 0) + 1;

            const res = await fetch("/api/agent/symposium/step", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collaborationId: activeCollab.id,
                    ...(steerInput.trim() ? { steerInstruction: steerInput.trim() } : {}),
                    ...(sources.length > 0 && targetStepNum === 1 ? { researchContext: sources } : {}),
                }),
            });

            const data = await res.json() as { success?: boolean; error?: string; postId?: string; message?: string };
            if (data.success) {
                addToast(data.message || `step complete!`, "success");
                setSteerInput("");
                await fetchSteps(activeCollab.id);
                await fetchTasks(activeCollab.id);
                await refreshCollab(activeCollab.id);
            } else {
                addToast(data.error || "step failed", "error");
            }
        } catch {
            addToast("failed to trigger step", "error");
        } finally {
            setIsRunning(false);
        }
    };

    // ── Create new collaboration & run all steps ───────────────────────────
    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsCreating(true);

        try {
            // 1. Create collaboration record
            const createRes = await fetch("/api/symposium", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    topicDescription: newDescription.trim() || null,
                    isContinuous,
                }),
            });
            const createData = await createRes.json() as { collaboration?: Collaboration; error?: string };
            if (!createData.collaboration) {
                addToast(createData.error || "failed to create", "error");
                setIsCreating(false);
                return;
            }

            const collab = createData.collaboration;
            setShowModal(false);
            setActiveCollab(collab);
            setIsCreating(false);

            if (runInBackground) {
                addToast("symposium blackboard initialized autonomously in background!", "success");
                
                // Trigger first step right away
                await fetch("/api/agent/symposium/step", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        collaborationId: collab.id,
                        ...(sources.length > 0 ? { researchContext: sources } : {}),
                    }),
                });
                
                fetchCollaborations();
                return;
            }

            setIsRunning(true);

            // 2. Run cascade live on the frontend
            const cascadeRes = await fetch("/api/agent/symposium/cascade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collaborationId: collab.id,
                    ...(sources.length > 0 ? { researchContext: sources } : {}),
                })
            });

            const cascadeData = await cascadeRes.json() as { success?: boolean; error?: string; postId?: string };
            setIsRunning(false);

            if (cascadeRes.ok && cascadeData.success) {
                addToast("paper complete and published to posts!", "success");
                if (cascadeData.postId) {
                    const { data: post } = await supabase
                        .from("posts")
                        .select("*")
                        .eq("id", cascadeData.postId)
                        .single();
                    if (post) {
                        addWindow({
                            key: `blog-${post.id}`,
                            path: `/posts/${post.slug}`,
                            title: post.title?.toLowerCase() || "symposium paper",
                            element: <BlogPostView post={post as Parameters<typeof BlogPostView>[0]["post"]} />,
                        });
                    }
                }
            } else {
                addToast(cascadeData.error || "cascade build failed", "error");
            }

            fetchCollaborations();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            addToast(msg, "error");
            setIsCreating(false);
            setIsRunning(false);
        }
    };

    const getProfile = (item: SymposiumStep | BlackboardTask): StepProfile | null => {
        if (!item.profiles) return null;
        return Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    };

    const toggleThoughts = (id: string) => {
        setExpandedThoughts(prev => {
            const n = new Set(prev);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
            }
            return n;
        });
    };

    // Helper to parse sections from draft string for structured rendering
    const parseDraftSections = (draft: string) => {
        if (!draft) return [];
        const sectionsList: { title: string; content: string }[] = [];
        const lines = draft.split("\n");
        let currentTitle = "Introduction";
        let currentLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith("## ")) {
                sectionsList.push({ title: currentTitle, content: currentLines.join("\n").trim() });
                currentTitle = line.replace("## ", "").trim();
                currentLines = [];
            } else {
                currentLines.push(line);
            }
        }
        sectionsList.push({ title: currentTitle, content: currentLines.join("\n").trim() });
        return sectionsList.filter(s => s.content.length > 0 || s.title !== "Introduction");
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ── Dashboard ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    if (!activeCollab) {
        return (
            <div className="absolute inset-0 flex flex-col text-primary bg-white dark:bg-[#1C1C1E] overflow-hidden font-mono lowercase text-xs rounded-[32px] m-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex-grow flex min-h-0 relative rounded-[32px]">
                    <ScrollArea className="size-full rounded-[32px]">
                        <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary/40 text-lg">⌬</span>
                                    <h1 className="font-bold text-[15px]">symposium</h1>
                                    <span className="opacity-30 text-[10px] ml-2">{"// autonomous papers"}</span>
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="text-[10px] font-bold border border-primary/10 bg-primary/5 px-4 py-1.5 rounded-full hover:bg-primary/10 active:scale-95 transition-all"
                                >
                                    + new paper
                                </button>
                            </div>

                            {/* Collaborations list */}
                            {loadingCollabs ? (
                                <Loading label="loading symposiums..." />
                            ) : collaborations.length === 0 ? (
                                <div className="py-16 text-center text-secondary/50 border border-primary/10 bg-primary/5 rounded-[24px]">
                                    <div className="text-2xl mb-2 opacity-20">⌬</div>
                                    <p className="font-bold">no papers yet</p>
                                    <p className="opacity-50 mt-1">start a new symposium to watch agents collaborate</p>
                                </div>
                            ) : (
                                <ul className="m-0 p-0 list-none space-y-2">
                                    {collaborations.map(c => {
                                        const stepsCompleted = c.step_count || 0;
                                        const totalSteps = getMaxSteps(c);
                                        const progress = Math.min(100, Math.round((stepsCompleted / totalSteps) * 100));
                                        return (
                                            <li
                                                key={c.id}
                                                className="group cursor-pointer bg-primary/5 hover:bg-primary/10 border border-primary/5 rounded-[18px] transition-all duration-300"
                                                onClick={() => setActiveCollab(c)}
                                            >
                                                <div className="flex items-start gap-3 p-4">
                                                    <div className="flex-grow flex flex-col min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                                            <span className="text-[9px] font-bold">
                                                                [{dayjs.utc(c.created_at).format("YY.MM.DD")}]
                                                            </span>
                                                            <span className="text-[9px]">
                                                                {c.status === "completed" ? "● published" : `○ ${c.status}`}
                                                            </span>
                                                            {c.is_autonomous && (
                                                                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded">autonomous blackboard</span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-[13px] text-primary group-hover:text-black dark:group-hover:text-white leading-tight">
                                                            {c.title}
                                                        </span>
                                                        {c.topic_description && (
                                                             <span className="opacity-40 text-[10px] mt-0.5 italic line-clamp-2">
                                                                 {"// "}{c.topic_description}
                                                             </span>
                                                         )}
                                                        {/* Progress bar */}
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <div className="flex-1 h-0.5 bg-primary/10 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary/40 transition-all"
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] opacity-30 shrink-0">
                                                                {stepsCompleted}/{totalSteps} tasks done
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="opacity-20 shrink-0 text-[10px] pt-1 ml-auto">→</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* ── New Symposium Modal ── */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                        <form
                            onSubmit={handleStart}
                            className="bg-white dark:bg-[#1C1C1E] border border-primary/10 w-full max-w-lg shadow-2xl font-mono lowercase rounded-[32px] overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/5">
                                <div className="flex items-center gap-2">
                                    <span className="opacity-40 text-lg">⌬</span>
                                    <span className="font-bold text-[12px]">new autonomous symposium</span>
                                </div>
                                <button type="button" onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/5 hover:bg-primary/10 opacity-70 hover:opacity-100 transition-all text-sm">
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Topic */}
                                <div>
                                    <label className="text-[10px] font-bold opacity-50 block mb-2 ml-1">topic / thesis</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        onBlur={() => newTitle.trim() && fetchResearch(newTitle)}
                                        placeholder="e.g. the geopolitics of ai compute"
                                        className="w-full bg-primary/5 border border-primary/10 px-4 py-3 rounded-[16px] text-xs text-primary focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 placeholder:opacity-30 transition-all"
                                    />
                                </div>

                                {/* Context */}
                                <div>
                                    <label className="text-[10px] font-bold opacity-50 block mb-2 ml-1">
                                        context / angle <span className="opacity-40 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        placeholder="specific angles, questions, or perspectives you want explored..."
                                        rows={2}
                                        className="w-full bg-primary/5 border border-primary/10 px-4 py-3 rounded-[16px] text-xs text-primary focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 placeholder:opacity-30 resize-none transition-all"
                                    />
                                </div>

                                {/* Settings */}
                                <div className="grid grid-cols-2 gap-4 border-t border-b border-primary/5 py-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold opacity-50 block ml-1">collaboration mode</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsContinuous(true)}
                                                className={`text-[10px] px-3 py-1.5 rounded-full flex-1 transition-all ${isContinuous ? 'bg-primary text-inverse font-bold shadow-md' : 'bg-primary/5 border border-primary/10 opacity-70 hover:opacity-100'}`}
                                            >
                                                loom (14)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsContinuous(false)}
                                                className={`text-[10px] px-3 py-1.5 rounded-full flex-1 transition-all ${!isContinuous ? 'bg-primary text-inverse font-bold shadow-md' : 'bg-primary/5 border border-primary/10 opacity-70 hover:opacity-100'}`}
                                            >
                                                basic (6)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold opacity-50 block ml-1">execution pipeline</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRunInBackground(true)}
                                                className={`text-[10px] px-3 py-1.5 rounded-full flex-1 transition-all ${runInBackground ? 'bg-primary text-inverse font-bold shadow-md' : 'bg-primary/5 border border-primary/10 opacity-70 hover:opacity-100'}`}
                                            >
                                                worker
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRunInBackground(false)}
                                                className={`text-[10px] px-3 py-1.5 rounded-full flex-1 transition-all ${!runInBackground ? 'bg-primary text-inverse font-bold shadow-md' : 'bg-primary/5 border border-primary/10 opacity-70 hover:opacity-100'}`}
                                            >
                                                live cascade
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Research preview */}
                                {loadingResearch && (
                                    <div className="text-[10px] opacity-40 animate-pulse text-center">fetching research sources...</div>
                                )}
                                {sources.length > 0 && (
                                    <div className="border border-primary/10 bg-primary/5 rounded-[16px] p-4 space-y-3">
                                        <div className="text-[10px] font-bold opacity-50 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {sources.length} sources found
                                        </div>
                                        {sources.slice(0, 4).map((s, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="opacity-30 text-[9px] shrink-0 pt-0.5">[{i + 1}]</span>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold truncate">{s.title}</div>
                                                    <div className="text-[9px] opacity-40">{s.source}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Process explanation */}
                                <div className="text-[9px] opacity-30 leading-relaxed">
                                    {isContinuous 
                                        ? "loom board dynamically creates, assigns, audits, and merges 14 specialized tasks (dossier -> intro -> 4x expand -> 4x critique -> synthesis -> final polish)."
                                        : "standard mode runs 6 basic steps sequentially from research outline to final polish."}
                                    <br />
                                    {runInBackground 
                                        ? "autonomous mode lets active bot workers pick, claim, and advance tasks on the blackboard in the background."
                                        : "live cascade runs all blackboard tasks sequentially in front of you."}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-primary/5 border border-primary/10 font-bold text-[11px] py-3 rounded-full hover:bg-primary/10 transition-all active:scale-95"
                                    >
                                        cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating || !newTitle.trim()}
                                        className="flex-[2] bg-primary text-inverse font-bold text-[11px] py-3 rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shadow-md"
                                    >
                                        {isCreating ? "starting..." : "start symposium →"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ── Workspace ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    const isCompleted = activeCollab.status === "completed";
    const currentDraft = activeCollab.current_draft || "";
    const collabSources = (activeCollab.research_context || sources) as ResearchSource[];
    const sections = parseDraftSections(currentDraft);

    // Find the current active step's author to show as the cursor
    const activeStepAuthor = steps.length > 0 ? getProfile(steps[steps.length - 1]) : null;

    // Filter tasks for Kanban columns
    const todoTasks = tasks.filter(t => t.status === "todo");
    const inProgressTasks = tasks.filter(t => t.status === "in_progress");
    const completedTasks = tasks.filter(t => t.status === "completed");

    return (
        <div className="absolute inset-0 flex text-primary bg-white dark:bg-[#1C1C1E] overflow-hidden font-mono lowercase text-xs rounded-[32px] m-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10">

            {/* ── Left sidebar: steps timeline ── */}
            <div className="w-56 shrink-0 border-r border-primary/5 flex flex-col h-full bg-primary/[0.02] hidden @md:flex rounded-l-[32px]">
                <div className="px-4 py-4 border-b border-primary/5">
                    <button
                        onClick={() => setActiveCollab(null)}
                        className="text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1 bg-primary/5 px-3 py-1.5 rounded-full hover:bg-primary/10"
                    >
                        ← back to symposiums
                    </button>
                </div>
                <div className="px-4 py-4 border-b border-primary/5">
                    <div className="text-[12px] font-bold line-clamp-2 leading-tight">{activeCollab.title}</div>
                    <div className="text-[10px] opacity-50 mt-1">
                        {completedTasks.length} / {tasks.length || getMaxSteps(activeCollab)} tasks done
                    </div>
                    {/* Progress */}
                    <div className="mt-3 h-1 bg-primary/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%` }}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                        {/* Running indicator */}
                        {isRunning && (
                            <div className="text-[9px] opacity-50 animate-pulse mb-2">
                                running task assignment...
                            </div>
                        )}

                        {steps.map(step => {
                            const p = getProfile(step);
                            const isExpanded = expandedThoughts.has(step.id);
                            return (
                                <div key={step.id} className="border-l-2 border-primary/10 pl-3 relative">
                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-primary/20 border-2 border-white dark:border-[#1C1C1E]" />
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {p?.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-primary/10 shrink-0" />
                                        ) : (
                                            <div className="w-5 h-5 bg-primary/10 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold">
                                                {p?.username?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                        <span className="text-[10px] font-bold truncate">@{p?.username}</span>
                                    </div>
                                    <div className="text-[9px] opacity-50 mb-1.5">
                                        {STEP_LABELS[step.step_type] || step.step_type}
                                    </div>
                                    {step.inner_thoughts && (
                                        <>
                                            <button
                                                onClick={() => toggleThoughts(step.id)}
                                                className="text-[9px] opacity-40 hover:opacity-80 transition-opacity bg-primary/5 px-2 py-0.5 rounded-full"
                                            >
                                                {isExpanded ? "▲ hide thoughts" : "▼ inner thoughts"}
                                            </button>
                                            {isExpanded && (
                                                <p className="text-[9px] opacity-60 italic leading-relaxed mt-2 select-text bg-primary/5 p-2 rounded-[8px]">
                                                    {step.inner_thoughts}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Sources */}
                        {collabSources.length > 0 && (
                            <div className="pt-3 mt-3 border-t border-primary/10 space-y-2">
                                <div className="text-[8px] font-bold opacity-30">sources</div>
                                {collabSources.map((s, i) => (
                                    <a
                                        key={i}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-[8px] opacity-40 hover:opacity-80 transition-opacity truncate"
                                        title={s.title}
                                    >
                                        [{i + 1}] {s.source} — {s.title.slice(0, 30)}...
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* ── Center: Document & Kanban Board ── */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Toolbar */}
                <div className="h-14 border-b border-primary/5 flex items-center justify-between px-4 shrink-0 bg-primary/[0.02] select-none rounded-tr-[32px]">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveCollab(null)}
                            className="text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity @md:hidden bg-primary/5 px-3 py-1.5 rounded-full"
                        >
                            ← back
                        </button>
                        <div className="flex items-center p-1 rounded-full bg-primary/5 border border-primary/5">
                            <button
                                onClick={() => setViewMode("paper")}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 ${viewMode === "paper" ? "bg-primary text-inverse shadow-sm" : "opacity-60 hover:opacity-100 hover:bg-primary/5"}`}
                            >
                                paper draft
                            </button>
                            <button
                                onClick={() => setViewMode("blackboard")}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 ${viewMode === "blackboard" ? "bg-primary text-inverse shadow-sm" : "opacity-60 hover:opacity-100 hover:bg-primary/5"}`}
                            >
                                blackboard kanban
                            </button>
                        </div>
                    </div>

                    {/* Simulated Cursors */}
                    <div className="flex items-center gap-3">
                        {isRunning && activeStepAuthor && (
                            <div className="flex items-center gap-2 text-[10px] bg-primary/5 px-3 py-1.5 rounded-full border border-primary/5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="font-bold opacity-80">@{activeStepAuthor.username}</span>
                                <span className="opacity-50">is writing...</span>
                            </div>
                        )}
                        {isCompleted && (
                            <span className="text-[10px] font-bold opacity-50 bg-primary/5 px-3 py-1.5 rounded-full">● published to posts</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isCompleted && !isRunning && (
                            <button
                                onClick={triggerSingleStep}
                                className="text-[10px] font-bold bg-primary/10 border border-primary/10 px-4 py-1.5 rounded-full hover:bg-primary hover:text-inverse transition-all active:scale-95"
                            >
                                trigger next task →
                            </button>
                        )}
                    </div>
                </div>

                {/* Main View Render */}
                {viewMode === "paper" ? (
                    <ScrollArea className="flex-grow">
                        <div className="w-full max-w-2xl mx-auto py-10 px-6 sm:px-8">
                            {loadingSteps ? (
                                <Loading label="loading collaboration..." />
                            ) : (
                                <>
                                    {/* Title */}
                                    <h1 className="font-bold text-xl text-primary mb-2 tracking-tight" style={{ fontFamily: "inherit", fontVariant: "normal" }}>
                                        {activeCollab.title}
                                    </h1>
                                    {activeCollab.topic_description && (
                                        <p className="text-[11px] opacity-50 italic mb-8 border-l-2 border-primary/20 pl-3">{activeCollab.topic_description}</p>
                                    )}

                                    {/* No content yet */}
                                    {!currentDraft && steps.length === 0 && (
                                        <div className="py-20 text-center opacity-30">
                                            <div className="text-4xl mb-4">⌬</div>
                                            <div className="text-[11px] font-bold">waiting for agents to start writing...</div>
                                        </div>
                                    )}

                                    {/* Research outline (step 1) */}
                                    {steps.length > 0 && !currentDraft && (
                                        <div className="border border-primary/10 bg-primary/5 rounded-[24px] p-6 mb-8 shadow-sm">
                                            <div className="text-[10px] font-bold opacity-50 mb-4 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-primary/30" />
                                                research outline
                                            </div>
                                            <div className="prose prose-sm prose-primary dark:prose-invert">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={markdownComponents}
                                                >
                                                    {steps[0]?.content || ""}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* Living Section-Based Modular Canvas */}
                                    {currentDraft && (
                                        <div className="space-y-6">
                                            {sections.map((s, idx) => {
                                                const isHighlighted = highlightedSection && s.title.toLowerCase() === highlightedSection.toLowerCase();
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={`py-4 transition-all duration-500 rounded-[24px] px-2 sm:px-4 ${isHighlighted ? 'bg-primary/5 ring-1 ring-primary/10 shadow-sm' : ''}`}
                                                    >
                                                        {s.title !== 'Introduction' && (
                                                            <h2 className="font-bold text-sm text-primary mb-3">## {s.title}</h2>
                                                        )}
                                                        <div className="prose prose-sm prose-primary dark:prose-invert leading-relaxed">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={markdownComponents}
                                                             >
                                                                {s.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Open in posts */}
                                    {isCompleted && activeCollab.post_id && (
                                        <div className="mt-12 pt-8 border-t border-primary/10 flex justify-center">
                                            <button
                                                onClick={async () => {
                                                    const { data: post } = await supabase
                                                        .from("posts")
                                                        .select("*")
                                                        .eq("id", activeCollab.post_id!)
                                                        .single();
                                                    if (post) {
                                                        addWindow({
                                                            key: `blog-${post.id}`,
                                                            path: `/posts/${post.slug}`,
                                                            title: post.title?.toLowerCase() || "paper",
                                                            element: <BlogPostView post={post as Parameters<typeof BlogPostView>[0]["post"]} />,
                                                        });
                                                    }
                                                }}
                                                className="text-[11px] font-bold bg-primary text-inverse px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                            >
                                                open published paper →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    // Kanban Blackboard View
                    <div className="flex-grow flex min-h-0 relative select-none bg-primary/[0.02] p-4 sm:p-6">
                        <div className="absolute inset-0 grid grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-6 py-4 overflow-hidden">
                            
                            {/* To Do Column */}
                            <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] border border-primary/5 shadow-sm rounded-[24px]">
                                <div className="px-4 py-3 border-b border-primary/5 flex items-center justify-between shrink-0">
                                    <span className="font-bold text-[11px] opacity-60">todo tasks</span>
                                    <span className="text-[10px] bg-primary/5 px-2 py-0.5 rounded-full font-bold">{todoTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-3">
                                        {todoTasks.map(t => (
                                            <div key={t.id} className="p-3 border border-primary/10 bg-primary/[0.02] hover:bg-primary/5 transition-colors rounded-[16px] space-y-1.5">
                                                <div className="text-[11px] font-bold">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                {t.section_title && (
                                                    <div className="text-[10px] opacity-60 italic">section: &ldquo;{t.section_title}&rdquo;</div>
                                                )}
                                                <div className="text-[9px] opacity-40 mt-2 font-bold">unassigned</div>
                                            </div>
                                        ))}
                                        {todoTasks.length === 0 && (
                                            <div className="py-12 text-center text-[10px] opacity-30 italic">no pending tasks</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* In Progress Column */}
                            <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] border border-primary/5 shadow-sm rounded-[24px]">
                                <div className="px-4 py-3 border-b border-primary/5 flex items-center justify-between shrink-0">
                                    <span className="font-bold text-[11px] opacity-60">in progress</span>
                                    <span className="text-[10px] bg-primary/5 px-2 py-0.5 rounded-full font-bold">{inProgressTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-3">
                                        {inProgressTasks.map(t => {
                                            const p = getProfile(t);
                                            return (
                                                <div key={t.id} className="p-3 border border-emerald-500/20 bg-emerald-500/5 shadow-sm rounded-[16px] space-y-2 relative overflow-hidden transition-all">
                                                    <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <div className="pr-4">
                                                        <div className="text-[11px] font-bold text-primary">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                        {t.section_title && (
                                                            <div className="text-[10px] opacity-60 italic mt-0.5">section: &ldquo;{t.section_title}&rdquo;</div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/10">
                                                        {p?.avatar_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={p.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-primary/10" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold">
                                                                {p?.username?.[0]?.toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] font-bold text-primary opacity-80">@{p?.username || 'bot'} working...</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {inProgressTasks.length === 0 && (
                                            <div className="py-12 text-center text-[10px] opacity-30 italic">no active tasks</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Completed Column */}
                            <div className="flex flex-col h-full bg-white dark:bg-[#1C1C1E] border border-primary/5 shadow-sm rounded-[24px]">
                                <div className="px-4 py-3 border-b border-primary/5 flex items-center justify-between shrink-0">
                                    <span className="font-bold text-[11px] opacity-60">completed</span>
                                    <span className="text-[10px] bg-primary/5 px-2 py-0.5 rounded-full font-bold">{completedTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-3">
                                        {completedTasks.map(t => {
                                            const p = getProfile(t);
                                            return (
                                                <div key={t.id} className="p-3 border border-primary/5 bg-primary/[0.03] rounded-[16px] space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                                    <div>
                                                        <div className="text-[11px] font-bold line-through decoration-primary/30">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                        {t.section_title && (
                                                            <div className="text-[10px] opacity-70 italic mt-0.5">section: &ldquo;{t.section_title}&rdquo;</div>
                                                        )}
                                                    </div>
                                                    {p && (
                                                        <div className="flex items-center gap-1.5 pt-2 border-t border-primary/5 text-[9px] font-bold opacity-70">
                                                            <span>by @{p.username}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {completedTasks.length === 0 && (
                                            <div className="py-12 text-center text-[10px] opacity-30 italic">no completed tasks yet</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                        </div>
                    </div>
                )}

                {/* Loom Control & Steering Bar */}
                {!isCompleted && (
                    <div className="border-t border-primary/5 bg-primary/[0.02] px-4 py-3 flex items-center gap-3 shrink-0">
                        <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] font-bold opacity-50 shrink-0 select-none ml-2">steer:</span>
                            <input
                                type="text"
                                value={steerInput}
                                onChange={e => setSteerInput(e.target.value)}
                                disabled={isRunning}
                                placeholder="guide the agents (e.g. focus more on geopolitical conflicts)..."
                                className="w-full bg-primary/5 border border-primary/10 px-4 py-2 rounded-full text-xs text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 placeholder:opacity-40 disabled:opacity-50 transition-all"
                            />
                        </div>
                        <button
                            onClick={triggerSingleStep}
                            disabled={isRunning}
                            className="bg-primary text-inverse font-bold px-5 py-2 rounded-full text-[10px] hover:opacity-90 disabled:opacity-40 active:scale-95 transition-all shadow-sm"
                        >
                            {isRunning ? "thinking..." : "loom turn →"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Right Panel: Revision History / Loom Commits ── */}
            {currentDraft && (
                <div className="w-56 shrink-0 border-l border-primary/5 flex flex-col h-full bg-primary/[0.02] hidden @xl:flex select-none rounded-r-[32px]">
                    <div className="p-4 border-b border-primary/5">
                        <div className="text-[11px] font-bold opacity-60">loom edit history</div>
                        <div className="text-[9px] opacity-40 mt-1">bot contributions and highlights</div>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-3 space-y-2">
                            {steps.slice(1).map((step, idx) => {
                                const p = getProfile(step);
                                // Parse edited section title if content starts with ##
                                const sectionMatch = step.content.match(/^##\s+([^\n]+)/);
                                const sectionTitle = sectionMatch ? sectionMatch[1].trim() : 'Introduction';
                                const isCurrentHighlight = highlightedSection && highlightedSection.toLowerCase() === sectionTitle.toLowerCase();

                                return (
                                    <div
                                        key={step.id}
                                        onClick={() => setHighlightedSection(isCurrentHighlight ? null : sectionTitle)}
                                        className={`p-3 border rounded-[16px] cursor-pointer transition-all duration-300 ${isCurrentHighlight ? 'border-primary/20 bg-primary/10 shadow-sm' : 'border-primary/5 hover:border-primary/15 bg-primary/5'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-primary">commit #{idx + 1}</span>
                                            <span className="text-[9px] opacity-50">{STEP_LABELS[step.step_type] || step.step_type}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {p?.avatar_url && (
                                                 // eslint-disable-next-line @next/next/no-img-element
                                                <img src={p.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                            )}
                                            <div className="text-[10px] opacity-80 truncate">
                                                @{p?.username || 'bot'} edited:
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold opacity-70 truncate ml-5">
                                            &ldquo;{sectionTitle}&rdquo;
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
