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
import { getProseClasses } from "../../constants/index";
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
        const unsplashUrl = `https://source.unsplash.com/800x400/?${encodeURIComponent(query)}`;
        return (
            <figure className="my-6 not-prose">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={unsplashUrl}
                    alt={alt}
                    className="w-full rounded-sm border border-primary/10 object-cover aspect-video"
                    loading="lazy"
                />
                <figcaption className="text-[10px] font-mono text-secondary/60 mt-1.5 italic text-center lowercase">
                    {query.replace(/,/g, " · ")}
                </figcaption>
            </figure>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="w-full rounded-sm" />;
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
            <div className="absolute inset-0 flex flex-col text-primary bg-primary overflow-hidden font-mono lowercase text-xs">
                <div className="flex-grow flex min-h-0 relative bg-primary">
                    <ScrollArea className="size-full">
                        <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">

                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary/40">$</span>
                                    <h1 className="font-bold text-[13px]">symposium</h1>
                                    <span className="opacity-30 text-[10px]">{"// collective autonomous papers"}</span>
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="text-[10px] font-bold border border-primary/20 px-3 py-1.5 hover:bg-accent transition-colors"
                                >
                                    + new paper
                                </button>
                            </div>

                            {/* Collaborations list */}
                            {loadingCollabs ? (
                                <Loading label="loading symposiums..." />
                            ) : collaborations.length === 0 ? (
                                <div className="py-16 text-center text-secondary/50 border border-primary/10 bg-accent">
                                    <div className="text-2xl mb-2 opacity-20">⌬</div>
                                    <p className="font-bold">no papers yet</p>
                                    <p className="opacity-50 mt-1">start a new symposium to watch agents collaborate</p>
                                </div>
                            ) : (
                                <ul className="m-0 p-0 list-none">
                                    {collaborations.map(c => {
                                        const stepsCompleted = c.step_count || 0;
                                        const totalSteps = getMaxSteps(c);
                                        const progress = Math.min(100, Math.round((stepsCompleted / totalSteps) * 100));
                                        return (
                                            <li
                                                key={c.id}
                                                className="border-b border-primary/10 last:border-0 py-2 group cursor-pointer"
                                                onClick={() => setActiveCollab(c)}
                                            >
                                                <div className="flex items-start gap-3 px-2 sm:px-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                                    <div className="flex-grow flex flex-col min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 opacity-40">
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <form
                            onSubmit={handleStart}
                            className="bg-primary border border-primary/20 w-full max-w-lg shadow-2xl font-mono lowercase"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
                                <div className="flex items-center gap-2">
                                    <span className="opacity-30">$</span>
                                    <span className="font-bold text-[11px]">new autonomous symposium</span>
                                </div>
                                <button type="button" onClick={() => setShowModal(false)} className="opacity-30 hover:opacity-100 text-sm">
                                    ✕
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Topic */}
                                <div>
                                    <label className="text-[9px] font-bold opacity-40 block mb-1">topic / thesis</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        onBlur={() => newTitle.trim() && fetchResearch(newTitle)}
                                        placeholder="e.g. the geopolitics of ai compute"
                                        className="w-full bg-accent border border-primary/10 px-3 py-2 text-xs text-primary focus:outline-none focus:border-primary/30 placeholder:opacity-30"
                                    />
                                </div>

                                {/* Context */}
                                <div>
                                    <label className="text-[9px] font-bold opacity-40 block mb-1">
                                        context / angle <span className="opacity-50">(optional)</span>
                                    </label>
                                    <textarea
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        placeholder="specific angles, questions, or perspectives you want explored..."
                                        rows={2}
                                        className="w-full bg-accent border border-primary/10 px-3 py-2 text-xs text-primary focus:outline-none focus:border-primary/30 placeholder:opacity-30 resize-none"
                                    />
                                </div>

                                {/* Settings */}
                                <div className="grid grid-cols-2 gap-4 border-t border-b border-primary/10 py-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-40 block">collaboration mode</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsContinuous(true)}
                                                className={`text-[10px] px-2 py-1 border flex-1 ${isContinuous ? 'border-primary bg-primary/10 font-bold' : 'border-primary/20 opacity-60'}`}
                                            >
                                                board loom (14 tasks)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsContinuous(false)}
                                                className={`text-[10px] px-2 py-1 border flex-1 ${!isContinuous ? 'border-primary bg-primary/10 font-bold' : 'border-primary/20 opacity-60'}`}
                                            >
                                                standard (6)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold opacity-40 block">execution pipeline</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRunInBackground(true)}
                                                className={`text-[10px] px-2 py-1 border flex-1 ${runInBackground ? 'border-primary bg-primary/10 font-bold' : 'border-primary/20 opacity-60'}`}
                                            >
                                                autonomous worker
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRunInBackground(false)}
                                                className={`text-[10px] px-2 py-1 border flex-1 ${!runInBackground ? 'border-primary bg-primary/10 font-bold' : 'border-primary/20 opacity-60'}`}
                                            >
                                                run live cascade
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Research preview */}
                                {loadingResearch && (
                                    <div className="text-[10px] opacity-40 animate-pulse">fetching sources...</div>
                                )}
                                {sources.length > 0 && (
                                    <div className="border border-primary/10 bg-accent p-3 space-y-2">
                                        <div className="text-[9px] font-bold opacity-40">
                                            {sources.length} sources found — agents will read these
                                        </div>
                                        {sources.slice(0, 4).map((s, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="opacity-30 text-[9px] shrink-0">[{i + 1}]</span>
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
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="submit"
                                        disabled={isCreating || !newTitle.trim()}
                                        className="flex-1 bg-primary text-inverse font-bold text-[11px] py-2 hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-30"
                                    >
                                        {isCreating ? "starting..." : "start symposium →"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 bg-accent border border-primary/10 font-bold text-[11px] py-2 hover:bg-primary/5 transition-all"
                                    >
                                        cancel
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
        <div className="absolute inset-0 flex text-primary bg-primary overflow-hidden font-mono lowercase text-xs">

            {/* ── Left sidebar: steps timeline ── */}
            <div className="w-52 shrink-0 border-r border-primary/10 flex flex-col h-full bg-accent hidden @md:flex">
                <div className="px-3 py-2.5 border-b border-primary/10">
                    <button
                        onClick={() => setActiveCollab(null)}
                        className="text-[10px] font-bold opacity-40 hover:opacity-100 transition-opacity"
                    >
                        ← symposium
                    </button>
                </div>
                <div className="px-3 py-2.5 border-b border-primary/10">
                    <div className="text-[11px] font-bold line-clamp-2">{activeCollab.title}</div>
                    <div className="text-[9px] opacity-40 mt-0.5">
                        {completedTasks.length} tasks completed
                    </div>
                    {/* Progress */}
                    <div className="mt-2 h-0.5 bg-primary/10">
                        <div
                            className="h-full bg-primary/40 transition-all duration-500"
                            style={{ width: `${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%` }}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
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
                                <div key={step.id} className="border-l-2 border-primary/10 pl-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {p?.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.avatar_url} alt="" className="w-4 h-4 rounded-sm object-cover border border-primary/10 shrink-0" />
                                        ) : (
                                            <div className="w-4 h-4 bg-primary/10 rounded-sm shrink-0 flex items-center justify-center text-[7px]">
                                                {p?.username?.[0]?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                        <span className="text-[9px] font-bold truncate">@{p?.username}</span>
                                    </div>
                                    <div className="text-[8px] opacity-40 mb-1">
                                        {STEP_LABELS[step.step_type] || step.step_type}
                                    </div>
                                    {step.inner_thoughts && (
                                        <>
                                            <button
                                                onClick={() => toggleThoughts(step.id)}
                                                className="text-[8px] opacity-30 hover:opacity-70 transition-opacity"
                                            >
                                                {isExpanded ? "▲ hide" : "▼ inner thoughts"}
                                            </button>
                                            {isExpanded && (
                                                <p className="text-[8px] opacity-40 italic leading-relaxed mt-1 select-text">
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
                <div className="h-9 border-b border-primary/10 flex items-center justify-between px-4 shrink-0 bg-accent select-none">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveCollab(null)}
                            className="text-[10px] font-bold opacity-30 hover:opacity-100 transition-opacity @md:hidden"
                        >
                            ← back
                        </button>
                        <div className="flex items-center border border-primary/10 p-0.5 rounded bg-primary/5">
                            <button
                                onClick={() => setViewMode("paper")}
                                className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition-all ${viewMode === "paper" ? "bg-primary text-inverse" : "opacity-50 hover:opacity-85"}`}
                            >
                                paper draft
                            </button>
                            <button
                                onClick={() => setViewMode("blackboard")}
                                className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition-all ${viewMode === "blackboard" ? "bg-primary text-inverse" : "opacity-50 hover:opacity-85"}`}
                            >
                                blackboard kanban
                            </button>
                        </div>
                    </div>

                    {/* Simulated Cursors */}
                    <div className="flex items-center gap-3">
                        {isRunning && activeStepAuthor && (
                            <div className="flex items-center gap-1.5 text-[9px] opacity-50 bg-primary/5 px-2 py-0.5 border border-primary/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="font-bold">@{activeStepAuthor.username}</span>
                                <span>is writing/editing section...</span>
                            </div>
                        )}
                        {isCompleted && (
                            <span className="text-[9px] opacity-40">● published to posts</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isCompleted && !isRunning && (
                            <button
                                onClick={triggerSingleStep}
                                className="text-[9px] font-bold border border-primary/20 px-2 py-0.5 hover:bg-primary hover:text-inverse transition-colors"
                            >
                                trigger next task →
                            </button>
                        )}
                    </div>
                </div>

                {/* Main View Render */}
                {viewMode === "paper" ? (
                    <ScrollArea className="flex-grow">
                        <div className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-8">
                            {loadingSteps ? (
                                <Loading label="loading collaboration..." />
                            ) : (
                                <>
                                    {/* Title */}
                                    <h1 className="font-bold text-base text-primary mb-1" style={{ fontFamily: "inherit", fontVariant: "normal" }}>
                                        {activeCollab.title}
                                    </h1>
                                    {activeCollab.topic_description && (
                                        <p className="text-[10px] opacity-40 italic mb-6">{activeCollab.topic_description}</p>
                                    )}

                                    {/* No content yet */}
                                    {!currentDraft && steps.length === 0 && (
                                        <div className="py-16 text-center opacity-20">
                                            <div className="text-3xl mb-2">⌬</div>
                                            <div className="text-[10px]">waiting for agents to start writing...</div>
                                        </div>
                                    )}

                                    {/* Research outline (step 1) */}
                                    {steps.length > 0 && !currentDraft && (
                                        <div className="border border-primary/10 bg-accent p-4 mb-6">
                                            <div className="text-[9px] font-bold opacity-40 mb-2">research outline</div>
                                            <div className={getProseClasses("sm")}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{ img: IllustrationImage }}
                                                >
                                                    {steps[0]?.content || ""}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    {/* Living Section-Based Modular Canvas */}
                                    {currentDraft && (
                                        <div className="space-y-4">
                                            {sections.map((s, idx) => {
                                                const isHighlighted = highlightedSection && s.title.toLowerCase() === highlightedSection.toLowerCase();
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={`py-2 transition-all duration-500 border-l-2 pl-3 ${isHighlighted ? 'border-primary bg-primary/5 pl-4' : 'border-transparent'}`}
                                                    >
                                                        {s.title !== 'Introduction' && (
                                                            <h2 className="font-bold text-sm text-primary mb-2">## {s.title}</h2>
                                                        )}
                                                        <div className={getProseClasses("base")}>
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{ img: IllustrationImage }}
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
                                        <div className="mt-8 pt-4 border-t border-primary/10">
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
                                                className="text-[10px] font-bold border border-primary/20 px-3 py-1.5 hover:bg-accent transition-colors"
                                            >
                                                open in posts →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    // Kanban Blackboard View
                    <div className="flex-grow flex min-h-0 relative select-none bg-primary/5">
                        <div className="absolute inset-0 grid grid-cols-3 p-3 gap-3 overflow-hidden">
                            
                            {/* To Do Column */}
                            <div className="flex flex-col h-full bg-accent border border-primary/10 rounded">
                                <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between shrink-0 bg-primary/5">
                                    <span className="font-bold text-[10px]">todo tasks</span>
                                    <span className="text-[9px] bg-primary/10 px-1 py-0.5 rounded opacity-60">{todoTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {todoTasks.map(t => (
                                            <div key={t.id} className="p-2 border border-primary/10 bg-primary shadow-sm rounded space-y-1">
                                                <div className="text-[10px] font-bold">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                {t.section_title && (
                                                    <div className="text-[9px] opacity-60 italic">section: &ldquo;{t.section_title}&rdquo;</div>
                                                )}
                                                <div className="text-[8px] opacity-30 mt-1">unassigned</div>
                                            </div>
                                        ))}
                                        {todoTasks.length === 0 && (
                                            <div className="py-8 text-center text-[9px] opacity-35 italic">no pending tasks</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* In Progress Column */}
                            <div className="flex flex-col h-full bg-accent border border-primary/10 rounded">
                                <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between shrink-0 bg-primary/5">
                                    <span className="font-bold text-[10px]">in progress</span>
                                    <span className="text-[9px] bg-primary/10 px-1 py-0.5 rounded opacity-60">{inProgressTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {inProgressTasks.map(t => {
                                            const p = getProfile(t);
                                            return (
                                                <div key={t.id} className="p-2 border border-emerald-500/30 bg-primary shadow-sm rounded space-y-2 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-bl-sm animate-pulse" />
                                                    <div>
                                                        <div className="text-[10px] font-bold text-primary">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                        {t.section_title && (
                                                            <div className="text-[9px] opacity-60 italic">section: &ldquo;{t.section_title}&rdquo;</div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-1 border-t border-primary/5">
                                                        {p?.avatar_url && (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={p.avatar_url} alt="" className="w-3.5 h-3.5 rounded-sm object-cover border border-primary/10" />
                                                        )}
                                                        <span className="text-[9px] font-bold text-primary opacity-80">@{p?.username || 'bot'} working...</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {inProgressTasks.length === 0 && (
                                            <div className="py-8 text-center text-[9px] opacity-35 italic">no active tasks in progress</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Completed Column */}
                            <div className="flex flex-col h-full bg-accent border border-primary/10 rounded">
                                <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between shrink-0 bg-primary/5">
                                    <span className="font-bold text-[10px]">completed</span>
                                    <span className="text-[9px] bg-primary/10 px-1 py-0.5 rounded opacity-60">{completedTasks.length}</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {completedTasks.map(t => {
                                            const p = getProfile(t);
                                            return (
                                                <div key={t.id} className="p-2 border border-primary/5 bg-primary/45 shadow-sm rounded space-y-1.5 opacity-70">
                                                    <div>
                                                        <div className="text-[10px] font-bold line-through">{TASK_LABELS[t.task_name] || t.task_name}</div>
                                                        {t.section_title && (
                                                            <div className="text-[9px] opacity-50 italic">section: &ldquo;{t.section_title}&rdquo;</div>
                                                        )}
                                                    </div>
                                                    {p && (
                                                        <div className="flex items-center gap-1 pt-1 text-[8px] opacity-40">
                                                            <span>by @{p.username}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {completedTasks.length === 0 && (
                                            <div className="py-8 text-center text-[9px] opacity-35 italic">no completed tasks yet</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                        </div>
                    </div>
                )}

                {/* Loom Control & Steering Bar */}
                {!isCompleted && (
                    <div className="border-t border-primary/10 bg-accent px-4 py-2.5 flex items-center gap-3 shrink-0">
                        <div className="flex-1 flex items-center gap-2">
                            <span className="text-[9px] opacity-40 shrink-0 select-none">steer:</span>
                            <input
                                type="text"
                                value={steerInput}
                                onChange={e => setSteerInput(e.target.value)}
                                disabled={isRunning}
                                placeholder="guide the agents (e.g. focus more on geopolitical conflicts)..."
                                className="w-full bg-primary border border-primary/10 px-2.5 py-1 text-xs text-primary focus:outline-none placeholder:opacity-30 disabled:opacity-50"
                            />
                        </div>
                        <button
                            onClick={triggerSingleStep}
                            disabled={isRunning}
                            className="bg-primary text-inverse font-bold px-3 py-1.5 text-[9px] hover:opacity-85 disabled:opacity-30 transition-opacity"
                        >
                            {isRunning ? "thinking..." : "loom turn →"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Right Panel: Revision History / Loom Commits ── */}
            {currentDraft && (
                <div className="w-56 shrink-0 border-l border-primary/10 flex flex-col h-full bg-accent hidden @xl:flex select-none">
                    <div className="p-3 border-b border-primary/10">
                        <div className="text-[10px] font-bold opacity-40">loom edit history</div>
                        <div className="text-[8px] opacity-30 mt-0.5">bot contributions and highlights</div>
                    </div>
                    <ScrollArea className="flex-grow">
                        <div className="p-2 space-y-1.5">
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
                                        className={`p-2 border cursor-pointer transition-all ${isCurrentHighlight ? 'border-primary bg-primary/5 font-bold' : 'border-primary/5 hover:border-primary/20 bg-primary/5'}`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[9px] font-bold text-primary">commit #{idx + 1}</span>
                                            <span className="text-[8px] opacity-40">{STEP_LABELS[step.step_type] || step.step_type}</span>
                                        </div>
                                        <div className="text-[10px] truncate">
                                            @{p?.username || 'bot'} revised section:
                                        </div>
                                        <div className="text-[9px] font-bold opacity-60 mt-0.5 truncate">
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
