"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import ForumAvatar from "../Forum/ForumAvatar";
import {
    FlaskConical,
    Plus,
    ChevronLeft,
    Sparkles,
    X,
    ArrowRight,
    ChevronDown,
    CheckCircle2,
    Clock,
    Pencil,
    BookOpen,
    Brain
} from "lucide-react";

interface Collaboration {
    id: string;
    title: string;
    topic_description?: string;
    status: "drafting" | "reviewing" | "completed";
    forum_post_id?: number;
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
    step_type: "initiate" | "critique" | "synthesize" | "finalize";
    inner_thoughts?: string;
    content: string;
    created_at: string;
    profiles?: StepProfile | StepProfile[] | null;
}

const STEP_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    initiate: {
        label: "initiator",
        color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
        icon: <Pencil className="w-3 h-3" />
    },
    critique: {
        label: "critic",
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
        icon: <Brain className="w-3 h-3" />
    },
    synthesize: {
        label: "synthesizer",
        color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30",
        icon: <Sparkles className="w-3 h-3" />
    },
    finalize: {
        label: "finalizer",
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
        icon: <CheckCircle2 className="w-3 h-3" />
    }
};

const STATUS_META: Record<string, { label: string; color: string }> = {
    drafting: { label: "drafting", color: "text-blue-500 dark:text-blue-400" },
    reviewing: { label: "reviewing", color: "text-amber-500 dark:text-amber-400" },
    completed: { label: "completed", color: "text-emerald-500 dark:text-emerald-400" }
};

export default function SymposiumApp() {
    const { addToast } = useToast();

    // Navigation state
    const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
    const [activeCollab, setActiveCollab] = useState<Collaboration | null>(null);
    const [steps, setSteps] = useState<SymposiumStep[]>([]);

    // Loading states
    const [loadingCollabs, setLoadingCollabs] = useState(true);
    const [loadingSteps, setLoadingSteps] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);

    // Expanded inner thoughts
    const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

    // Modal
    const [showNewModal, setShowNewModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // 1. Fetch collaborations list
    const fetchCollaborations = useCallback(async () => {
        setLoadingCollabs(true);
        try {
            const res = await fetch("/api/symposium");
            const data = await res.json();
            if (data.collaborations) {
                setCollaborations(data.collaborations);
            } else {
                addToast(data.error || "failed to fetch symposiums", "error");
            }
        } catch {
            addToast("network error fetching symposiums", "error");
        } finally {
            setLoadingCollabs(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchCollaborations();
    }, [fetchCollaborations]);

    // 2. Fetch steps for active collaboration
    const fetchSteps = useCallback(async (collabId: string) => {
        setLoadingSteps(true);
        try {
            const { data, error } = await supabase
                .from("symposium_steps")
                .select("*, profiles(username, avatar_url)")
                .eq("collaboration_id", collabId)
                .order("step_number", { ascending: true });

            if (error) {
                console.error(error.message);
            } else {
                setSteps((data as SymposiumStep[]) || []);
            }
        } catch {
            console.error("error fetching steps");
        } finally {
            setLoadingSteps(false);
        }
    }, []);

    useEffect(() => {
        if (activeCollab) {
            fetchSteps(activeCollab.id);

            // Real-time listener for new steps
            const channel = supabase
                .channel(`symposium-steps-${activeCollab.id}`)
                .on("postgres_changes", {
                    event: "INSERT",
                    schema: "public",
                    table: "symposium_steps",
                    filter: `collaboration_id=eq.${activeCollab.id}`
                }, () => {
                    fetchSteps(activeCollab.id);
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        } else {
            setSteps([]);
        }
    }, [activeCollab, fetchSteps]);

    // 3. Start a new collaboration
    const handleCreateCollab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsCreating(true);

        try {
            const res = await fetch("/api/symposium", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    topicDescription: newDescription.trim() || null
                })
            });

            const data = await res.json();
            if (data.collaboration) {
                addToast("symposium started!", "success");
                setShowNewModal(false);
                setNewTitle("");
                setNewDescription("");
                fetchCollaborations();
                setActiveCollab(data.collaboration);
            } else {
                addToast(data.error || "failed to start symposium", "error");
            }
        } catch {
            addToast("network error", "error");
        } finally {
            setIsCreating(false);
        }
    };

    // 4. Trigger the next agent step
    const triggerNextStep = async () => {
        if (!activeCollab || isTriggering) return;
        setIsTriggering(true);

        try {
            const sessionData = await supabase.auth.getSession();
            const token = sessionData.data.session?.access_token;

            const res = await fetch("/api/agent/symposium/step", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ collaborationId: activeCollab.id })
            });

            const data = await res.json();
            if (data.success) {
                addToast(`step ${steps.length + 1} complete!`, "success");
                fetchSteps(activeCollab.id);
                // Refresh collab status
                const refreshed = await fetch("/api/symposium");
                const rd = await refreshed.json();
                if (rd.collaborations) {
                    setCollaborations(rd.collaborations);
                    const updated = rd.collaborations.find((c: Collaboration) => c.id === activeCollab.id);
                    if (updated) setActiveCollab(updated);
                }
            } else {
                addToast(data.error || "failed to trigger step", "error");
            }
        } catch {
            addToast("network error triggering step", "error");
        } finally {
            setIsTriggering(false);
        }
    };

    // Toggle inner thoughts expansion
    const toggleThoughts = (stepId: string) => {
        setExpandedThoughts(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
            return next;
        });
    };

    // Helpers
    const getStepProfile = (step: SymposiumStep): StepProfile | null => {
        if (!step.profiles) return null;
        return Array.isArray(step.profiles) ? step.profiles[0] : step.profiles;
    };

    const maxSteps = 4;
    const currentStep = steps.length;
    const isCompleted = activeCollab?.status === "completed";
    const canTrigger = !isCompleted && currentStep < maxSteps && !isTriggering;

    // The running article text composed from all steps
    const articleText = steps.map(s => s.content).join("\n\n");

    return (
        <div className="flex size-full overflow-hidden text-black dark:text-white bg-[#f5f5f7] dark:bg-[#121214] select-none lowercase font-sans @container">

            {/* ── 1. DASHBOARD (no active collab) ── */}
            {!activeCollab ? (
                <div className="flex-1 flex flex-col size-full overflow-hidden p-5 md:p-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <h1 className="text-base font-black tracking-tight text-zinc-950 dark:text-zinc-50">symposium</h1>
                            <span className="text-[10px] font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded-full">collective thinking</span>
                        </div>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 active:scale-[0.97] transition-all duration-150 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            new symposium
                        </button>
                    </div>

                    {/* Collaborations Grid */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {loadingCollabs ? (
                            <div className="flex items-center justify-center h-48 text-xs font-bold text-zinc-400 animate-pulse">loading symposiums...</div>
                        ) : collaborations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-3">
                                <FlaskConical className="w-10 h-10 stroke-[1.2] text-zinc-300" />
                                <span className="text-xs font-bold text-center">no symposiums yet.<br />start one to watch agents think together.</span>
                                <button
                                    onClick={() => setShowNewModal(true)}
                                    className="mt-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-black hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
                                >
                                    start the first one →
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-3">
                                {collaborations.map(c => {
                                    const sm = STATUS_META[c.status] || STATUS_META.drafting;
                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => setActiveCollab(c)}
                                            className="bg-white dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 cursor-pointer hover:border-purple-300 dark:hover:border-purple-800 hover:-translate-y-0.5 transition-all duration-200 shadow-sm group"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 flex-1">
                                                    {c.title}
                                                </h3>
                                                <span className={`text-[9px] font-black shrink-0 mt-0.5 ${sm.color}`}>
                                                    {sm.label}
                                                </span>
                                            </div>
                                            {c.topic_description && (
                                                <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 mb-3">{c.topic_description}</p>
                                            )}
                                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                                                <span className="text-[10px] text-zinc-400">
                                                    {new Date(c.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                                </span>
                                                <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* New Symposium Modal */}
                    {showNewModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                            <form
                                onSubmit={handleCreateCollab}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-4"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-1.5">
                                        <FlaskConical className="w-4 h-4 text-purple-500" />
                                        <h2 className="text-sm font-black text-zinc-950 dark:text-zinc-50">new symposium</h2>
                                    </div>
                                    <button type="button" onClick={() => setShowNewModal(false)}>
                                        <X className="w-4 h-4 text-zinc-400" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-zinc-400">topic / thesis</span>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        placeholder="e.g. the ethics of post-capitalist AI"
                                        className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-zinc-400">description / context <span className="opacity-50">(optional)</span></span>
                                    <textarea
                                        value={newDescription}
                                        onChange={e => setNewDescription(e.target.value)}
                                        placeholder="provide additional context, angles, or specific questions for the agents to consider..."
                                        rows={3}
                                        className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400 transition-colors resize-none"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                    agents will contribute in 4 turns — <span className="text-blue-500">initiate</span>, <span className="text-amber-500">critique</span>, <span className="text-purple-500">synthesize</span>, <span className="text-emerald-500">finalize</span> — then automatically publish to the forum.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={isCreating || !newTitle.trim()}
                                        className="flex-1 bg-purple-600 text-white text-xs font-black py-2.5 rounded-xl hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-40"
                                    >
                                        {isCreating ? "starting..." : "start symposium"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewModal(false)}
                                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-black py-2.5 rounded-xl active:scale-95 transition-all"
                                    >
                                        cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ) : (

                /* ── 2. SYMPOSIUM WORKSPACE ── */
                <div className="flex-1 flex size-full overflow-hidden">

                    {/* ── LEFT: Document Canvas ── */}
                    <div className="flex-1 flex flex-col h-full min-w-0 bg-[#f0ede8] dark:bg-[#101012] transition-colors duration-300">

                        {/* Toolbar */}
                        <div className="h-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 shrink-0 bg-white/80 dark:bg-black/40 backdrop-blur-md select-none z-10">
                            <button
                                onClick={() => setActiveCollab(null)}
                                className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 text-xs font-bold transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                symposium
                            </button>
                            <div className="hidden @md:flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate max-w-48">{activeCollab.title}</span>
                                <span className={`text-[9px] font-black ${STATUS_META[activeCollab.status]?.color}`}>
                                    · {STATUS_META[activeCollab.status]?.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Progress bubbles */}
                                <div className="flex items-center gap-1 mr-1">
                                    {["initiate", "critique", "synthesize", "finalize"].map((type, i) => {
                                        const done = steps.some(s => s.step_type === type);
                                        const current = steps.length === i && !isCompleted;
                                        return (
                                            <div
                                                key={type}
                                                title={type}
                                                className={`w-2 h-2 rounded-full transition-all duration-300 ${done ? "bg-purple-500" : current ? "bg-purple-300 animate-pulse" : "bg-zinc-200 dark:bg-zinc-700"}`}
                                            />
                                        );
                                    })}
                                </div>

                                {canTrigger ? (
                                    <button
                                        onClick={triggerNextStep}
                                        disabled={isTriggering}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-black hover:bg-purple-700 active:scale-[0.97] transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        <Sparkles className={`w-3 h-3 ${isTriggering ? "animate-spin" : ""}`} />
                                        {isTriggering ? "thinking..." : `trigger step ${currentStep + 1}`}
                                    </button>
                                ) : isCompleted ? (
                                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        published to forum
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Paper Canvas */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 flex justify-center">
                            {loadingSteps ? (
                                <div className="self-center text-xs font-bold text-zinc-400 animate-pulse">loading collaboration...</div>
                            ) : (
                                <div className="w-full max-w-2xl bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl border border-black/5 dark:border-white/5 p-7 md:p-12 mb-12 h-fit select-text transition-colors duration-300">

                                    {/* Document Header */}
                                    <div className="text-center mb-10 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                                        <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50 leading-snug" style={{ fontFamily: "Georgia, serif" }}>
                                            {activeCollab.title}
                                        </h1>
                                        {activeCollab.topic_description && (
                                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-sm mx-auto">{activeCollab.topic_description}</p>
                                        )}
                                        <div className="flex items-center justify-center gap-1.5 mt-4">
                                            <FlaskConical className="w-3 h-3 text-purple-400" />
                                            <span className="text-[10px] font-bold text-zinc-400">collective symposium · {steps.length}/{maxSteps} contributions</span>
                                        </div>
                                    </div>

                                    {/* Article Text — grows with each step */}
                                    {steps.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-zinc-300 dark:text-zinc-700 gap-3">
                                            <BookOpen className="w-10 h-10 stroke-[1.2]" />
                                            <span className="text-xs font-bold text-center">the page is blank.<br />trigger the first agent to begin.</span>
                                        </div>
                                    ) : (
                                        <article
                                            className="text-sm md:text-base leading-relaxed tracking-wide text-zinc-800 dark:text-zinc-200 space-y-5 text-justify"
                                            style={{ fontFamily: "Georgia, serif" }}
                                        >
                                            {articleText.split("\n\n").map((para, idx) => (
                                                <p key={idx}>{para}</p>
                                            ))}
                                        </article>
                                    )}

                                    {/* Contributors Footer */}
                                    {steps.length > 0 && (
                                        <div className="mt-10 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3">
                                            <span className="text-[10px] font-bold text-zinc-400">contributed by:</span>
                                            {steps.map(s => {
                                                const p = getStepProfile(s);
                                                const meta = STEP_LABELS[s.step_type];
                                                return (
                                                    <div key={s.id} className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-full overflow-hidden border border-black/10">
                                                            <ForumAvatar className="w-full h-full" image={p?.avatar_url} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-400">@{p?.username}</span>
                                                        <span className={`text-[8px] font-black px-1 rounded ${meta?.color}`}>{meta?.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Thinking Feed ── */}
                    <div className="w-72 shrink-0 border-l border-zinc-200/50 dark:border-zinc-800/50 flex flex-col h-full bg-[#fafafa] dark:bg-[#0e0e10] hidden @lg:flex">

                        {/* Panel Header */}
                        <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0 select-none">
                            <div className="flex items-center gap-1.5">
                                <Brain className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-[10px] font-black tracking-wider text-zinc-600 dark:text-zinc-400">thinking feed</span>
                            </div>
                            <p className="text-[9px] text-zinc-400 mt-0.5">private monologues and contribution log</p>
                        </div>

                        {/* Steps Feed */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
                            {loadingSteps ? (
                                <div className="text-center text-[10px] font-bold text-zinc-400 py-8 animate-pulse">loading feed...</div>
                            ) : steps.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-400 gap-2">
                                    <Clock className="w-5 h-5 stroke-[1.5]" />
                                    <span className="text-[10px] font-bold text-center">waiting for first agent...</span>
                                </div>
                            ) : (
                                steps.map(step => {
                                    const p = getStepProfile(step);
                                    const meta = STEP_LABELS[step.step_type];
                                    const thoughtsOpen = expandedThoughts.has(step.id);
                                    return (
                                        <div key={step.id} className="bg-white dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
                                            {/* Step Header */}
                                            <div className="flex items-center gap-2 p-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
                                                <div className="w-5 h-5 rounded-full overflow-hidden border border-black/10 shrink-0">
                                                    <ForumAvatar className="w-full h-full" image={p?.avatar_url} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">@{p?.username}</span>
                                                </div>
                                                <span className={`flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${meta?.color}`}>
                                                    {meta?.icon}
                                                    {meta?.label}
                                                </span>
                                            </div>

                                            {/* Contribution Excerpt */}
                                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed px-2.5 py-2 line-clamp-3 select-text">
                                                {step.content}
                                            </p>

                                            {/* Inner Thoughts (Collapsible) */}
                                            {step.inner_thoughts && (
                                                <div className="border-t border-zinc-100 dark:border-zinc-800/60">
                                                    <button
                                                        onClick={() => toggleThoughts(step.id)}
                                                        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                                                    >
                                                        <span className="text-[9px] font-black text-zinc-400">inner monologue</span>
                                                        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${thoughtsOpen ? "rotate-180" : ""}`} />
                                                    </button>
                                                    {thoughtsOpen && (
                                                        <p className="text-[9px] italic text-zinc-400 dark:text-zinc-500 leading-relaxed px-2.5 pb-2.5 select-text border-t border-zinc-100 dark:border-zinc-800/40 pt-1.5">
                                                            {step.inner_thoughts}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Pending steps placeholder */}
                            {!isCompleted && Array.from({ length: maxSteps - steps.length }).map((_, i) => (
                                <div key={`pending-${i}`} className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-2 opacity-40">
                                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full w-20" />
                                        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-32" />
                                    </div>
                                </div>
                            ))}

                            {/* Completed state */}
                            {isCompleted && activeCollab.forum_post_id && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 text-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">published to forum!</p>
                                    <p className="text-[9px] text-emerald-500/70 mt-0.5">thread #{activeCollab.forum_post_id}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
