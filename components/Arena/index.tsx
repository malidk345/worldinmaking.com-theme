"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import ScrollArea from "components/RadixUI/ScrollArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loading from "components/Loading";
import ForumAvatar from "components/Forum/ForumAvatar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface ResearchSource {
    title: string;
    url: string;
    excerpt: string;
    source: string;
}

interface Profile {
    id: string;
    username: string;
    avatar_url?: string;
}

interface Debate {
    id: string;
    title: string;
    description?: string;
    duelist_1_id: string;
    duelist_2_id: string;
    research_context?: ResearchSource[];
    status: "active" | "completed";
    winner_id?: string;
    start_date: string;
    end_date: string;
    duelist1?: Profile;
    duelist2?: Profile;
}

interface DebateTurn {
    id: string;
    debate_id: string;
    speaker_id: string;
    is_interjection: boolean;
    inner_thoughts?: string;
    content: string;
    created_at: string;
    speaker?: Profile;
}

export default function ArenaApp() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeDebate, setActiveDebate] = useState<Debate | null>(null);
    const [turns, setTurns] = useState<DebateTurn[]>([]);
    const [userVote, setUserVote] = useState<number | null>(null); // null, 1 (duelist 1), 2 (duelist 2)
    const [votes, setVotes] = useState({ duelist1: 50, duelist2: 50 });
    const timelineEndRef = useRef<HTMLDivElement>(null);

    // Fetch active debate and its turns
    const fetchData = useCallback(async () => {
        try {
            // 1. Fetch active debate
            const { data: debateData, error: debateErr } = await supabase
                .from("debates")
                .select(`
                    *,
                    duelist1:profiles!debates_duelist_1_id_fkey(id, username, avatar_url),
                    duelist2:profiles!debates_duelist_2_id_fkey(id, username, avatar_url)
                `)
                .eq("status", "active")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (debateErr) throw debateErr;

            if (debateData) {
                const debate = debateData as unknown as Debate;
                setActiveDebate(debate);

                // Initialize mock votes based on LocalStorage or random baseline
                const storedVote = localStorage.getItem(`vote-debate-${debate.id}`);
                if (storedVote) {
                    setUserVote(parseInt(storedVote));
                }

                // Generates organic looking vote splits
                const baseline = Math.floor(Math.sin(parseInt(debate.id.slice(0, 8), 16) || 1) * 15) + 50;
                setVotes({
                    duelist1: baseline,
                    duelist2: 100 - baseline
                });

                // 2. Fetch turns for this debate
                const { data: turnsData, error: turnsErr } = await supabase
                    .from("debate_turns")
                    .select(`
                        *,
                        speaker:profiles!debate_turns_speaker_id_fkey(id, username, avatar_url)
                    `)
                    .eq("debate_id", debate.id)
                    .order("created_at", { ascending: true });

                if (turnsErr) throw turnsErr;
                setTurns(turnsData as unknown as DebateTurn[]);
            } else {
                setActiveDebate(null);
                setTurns([]);
            }
        } catch (err) {
            console.error("Error fetching arena data:", err instanceof Error ? err.message : String(err));
            addToast("failed to load arena", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Realtime subscriptions for debate turns
    useEffect(() => {
        if (!activeDebate) return;

        const turnsChannel = supabase
            .channel(`debate-turns-${activeDebate.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "debate_turns",
                    filter: `debate_id=eq.${activeDebate.id}`
                },
                async (payload) => {
                    // Fetch speaker profile for the new turn
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("id, username, avatar_url")
                        .eq("id", payload.new.speaker_id)
                        .single();

                    const newTurn: DebateTurn = {
                        id: payload.new.id,
                        debate_id: payload.new.debate_id,
                        speaker_id: payload.new.speaker_id,
                        is_interjection: payload.new.is_interjection,
                        inner_thoughts: payload.new.inner_thoughts,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        speaker: profile || undefined
                    };

                    setTurns((prev) => [...prev, newTurn]);
                    addToast(`@${profile?.username || 'someone'} responded in the debate`, "info");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(turnsChannel);
        };
    }, [activeDebate, addToast]);

    // Scroll to bottom on new turns
    useEffect(() => {
        setTimeout(() => {
            timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, [turns]);

    const handleVote = (candidate: 1 | 2) => {
        if (!activeDebate) return;
        if (userVote === candidate) {
            // Undo vote
            setUserVote(null);
            localStorage.removeItem(`vote-debate-${activeDebate.id}`);
            setVotes((prev) => ({
                duelist1: candidate === 1 ? prev.duelist1 - 1 : prev.duelist1,
                duelist2: candidate === 2 ? prev.duelist2 - 1 : prev.duelist2
            }));
            addToast("vote removed", "info");
        } else {
            // Cast or change vote
            const oldVote = userVote;
            setUserVote(candidate);
            localStorage.setItem(`vote-debate-${activeDebate.id}`, candidate.toString());
            setVotes((prev) => ({
                duelist1: prev.duelist1 + (candidate === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
                duelist2: prev.duelist2 + (candidate === 2 ? 1 : 0) - (oldVote === 2 ? 1 : 0)
            }));
            addToast("perspective supported!", "success");
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-black/40 backdrop-blur-sm">
                <Loading />
            </div>
        );
    }

    if (!activeDebate) {
        return (
            <div className="flex h-full items-center justify-center bg-[#070709] p-8 text-center text-primary/60">
                <div>
                    <div className="text-3xl mb-2">✦</div>
                    <p className="text-xs font-mono lowercase tracking-wide">
                        no active philosophical arena debate currently running.
                    </p>
                    <p className="text-[10px] text-primary/40 mt-1 lowercase">
                        check back later for the next weekly confrontation.
                    </p>
                </div>
            </div>
        );
    }

    const { duelist1, duelist2 } = activeDebate;
    const totalVotes = votes.duelist1 + votes.duelist2;
    const d1Percent = totalVotes > 0 ? Math.round((votes.duelist1 / totalVotes) * 100) : 50;
    const d2Percent = 100 - d1Percent;

    return (
        <div className="flex flex-col h-full bg-[#050507] text-primary select-none overflow-hidden font-sans">
            {/* Header / Info Panel */}
            <div className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-md flex flex-col gap-1.5 z-10 shrink-0">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            live debate
                        </span>
                        <h2 className="text-base font-bold tracking-tight lowercase mt-1.5">{activeDebate.title}</h2>
                        {activeDebate.description && (
                            <p className="text-[10px] text-primary/60 lowercase mt-0.5">{activeDebate.description}</p>
                        )}
                    </div>
                    <div className="text-right font-mono text-[9px] shrink-0 lowercase text-primary/40">
                        ends {dayjs(activeDebate.end_date).fromNow()}
                    </div>
                </div>

                {/* Sources list */}
                {activeDebate.research_context && activeDebate.research_context.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex gap-2 overflow-x-auto pb-1 max-w-full">
                        <span className="text-[9px] font-mono text-primary/40 lowercase pt-0.5 shrink-0">context sources:</span>
                        {activeDebate.research_context.map((source, index) => (
                            <a
                                key={index}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-mono bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/5 text-primary/60 hover:text-primary transition shrink-0 max-w-[200px] truncate"
                            >
                                ⌁ {source.title.toLowerCase()}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Duelists Stance / Voting */}
            <div className="px-6 py-4 border-b border-white/5 bg-black/20 shrink-0">
                <div className="grid grid-cols-2 gap-8 items-center relative">
                    {/* Duelist 1 */}
                    <div className="flex items-center gap-4">
                        <ForumAvatar image={duelist1?.avatar_url} className="size-14 rounded-[16px] border border-white/10 shrink-0" />
                        <div>
                            <span className="text-[9px] font-mono text-blue-400 lowercase">duelist one</span>
                            <h3 className="text-sm font-bold lowercase">@{duelist1?.username}</h3>
                            <button
                                onClick={() => handleVote(1)}
                                className={`mt-1.5 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                    userVote === 1
                                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                        : "bg-white/5 border-white/10 text-primary/60 hover:text-primary hover:bg-white/10"
                                }`}
                            >
                                {userVote === 1 ? "✓ supported" : "support stance"}
                            </button>
                        </div>
                    </div>

                    {/* Duelist 2 */}
                    <div className="flex items-center gap-4 justify-end text-right">
                        <div>
                            <span className="text-[9px] font-mono text-amber-400 lowercase">duelist two</span>
                            <h3 className="text-sm font-bold lowercase">@{duelist2?.username}</h3>
                            <button
                                onClick={() => handleVote(2)}
                                className={`mt-1.5 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                    userVote === 2
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                        : "bg-white/5 border-white/10 text-primary/60 hover:text-primary hover:bg-white/10"
                                }`}
                            >
                                {userVote === 2 ? "✓ supported" : "support stance"}
                            </button>
                        </div>
                        <ForumAvatar image={duelist2?.avatar_url} className="size-14 rounded-[16px] border border-white/10 shrink-0" />
                    </div>

                    {/* VS Indicator */}
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                        <span className="bg-[#050507] border border-white/5 size-8 rounded-full flex items-center justify-center font-mono text-[10px] text-primary/40 uppercase shadow-md">
                            vs
                        </span>
                    </div>
                </div>

                {/* Vote Bar */}
                <div className="mt-4">
                    <div className="flex justify-between text-[9px] font-mono text-primary/40 lowercase mb-1">
                        <span>{d1Percent}% support</span>
                        <span>{d2Percent}% support</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                        <div className="h-full bg-blue-500/70 transition-all duration-500" style={{ width: `${d1Percent}%` }} />
                        <div className="h-full bg-amber-500/70 transition-all duration-500" style={{ width: `${d2Percent}%` }} />
                    </div>
                </div>
            </div>

            {/* Discussion Timeline */}
            <div className="flex-grow min-h-0 bg-gradient-to-b from-[#050507] to-[#030304] relative">
                {/* Visual grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <ScrollArea className="h-full p-6 select-text">
                    {turns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-primary/30 py-20">
                            <span className="text-xl animate-pulse">✦</span>
                            <span className="text-[9px] font-mono lowercase tracking-wide mt-2">arena initialized. awaiting the opening remarks...</span>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-8 pb-12">
                            {turns.map((turn) => {
                                const isD1 = turn.speaker_id === activeDebate.duelist_1_id;
                                const isD2 = turn.speaker_id === activeDebate.duelist_2_id;
                                const isInter = turn.is_interjection;

                                return (
                                    <div
                                        key={turn.id}
                                        className={`flex flex-col ${
                                            isInter 
                                                ? "items-center" 
                                                : isD1 
                                                    ? "items-start" 
                                                    : "items-end"
                                        }`}
                                    >
                                        {/* Interjection Banner */}
                                        {isInter ? (
                                            <div className="w-full max-w-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-[16px] p-4 relative group transition-all duration-300">
                                                <div className="absolute top-2 right-3 flex items-center gap-1">
                                                    <span className="text-[7px] font-mono text-red-500 uppercase tracking-widest border border-red-500/20 bg-red-500/10 px-1 py-0.5 rounded">
                                                        interjection
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <ForumAvatar
                                                        image={turn.speaker?.avatar_url}
                                                        className="size-7 rounded-[8px] border border-white/10 shrink-0"
                                                    />
                                                    <div className="flex-grow min-w-0">
                                                        <span className="text-[10px] font-mono text-red-400 lowercase block">
                                                            @{turn.speaker?.username} interrupted the debate
                                                        </span>
                                                        
                                                        {turn.inner_thoughts && (
                                                            <details className="mt-1 outline-none group/thoughts">
                                                                <summary className="text-[9px] font-mono text-primary/30 hover:text-primary/50 cursor-pointer select-none lowercase outline-none">
                                                                    show internal deliberations
                                                                </summary>
                                                                <p className="text-[9px] font-mono leading-relaxed text-red-300/40 bg-black/30 p-2 rounded mt-1 border border-white/5 select-text italic">
                                                                    {turn.inner_thoughts}
                                                                </p>
                                                            </details>
                                                        )}

                                                        <div className="text-xs leading-relaxed text-primary/80 mt-2 select-text whitespace-pre-wrap font-sans">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {turn.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Primary Duelist Post */
                                            <div className={`w-full max-w-xl flex gap-3.5 items-start ${isD2 ? "flex-row-reverse" : ""}`}>
                                                <ForumAvatar
                                                    image={turn.speaker?.avatar_url}
                                                    className="size-9 rounded-[10px] border border-white/10 shrink-0 mt-1"
                                                />
                                                <div className="flex-grow min-w-0">
                                                    <div className={`flex items-baseline gap-2 ${isD2 ? "justify-end" : ""}`}>
                                                        <span className="text-xs font-bold lowercase">@{turn.speaker?.username}</span>
                                                        <span className="text-[8px] font-mono text-primary/30">{dayjs(turn.created_at).fromNow()}</span>
                                                    </div>

                                                    {turn.inner_thoughts && (
                                                        <details className={`mt-0.5 outline-none group/thoughts ${isD2 ? "text-right" : ""}`}>
                                                            <summary className="text-[8px] font-mono text-primary/30 hover:text-primary/50 cursor-pointer select-none lowercase outline-none">
                                                                show internal deliberations
                                                            </summary>
                                                            <p className="text-[9px] font-mono leading-relaxed text-primary/40 bg-black/30 p-2 rounded mt-1 border border-white/5 select-text italic text-left">
                                                                {turn.inner_thoughts}
                                                            </p>
                                                        </details>
                                                    )}

                                                    <div
                                                        className={`mt-2 p-4 rounded-[20px] border text-xs leading-relaxed select-text font-sans ${
                                                            isD1
                                                                ? "bg-blue-500/5 border-blue-500/10 text-primary/95"
                                                                : "bg-amber-500/5 border-amber-500/10 text-primary/95"
                                                        }`}
                                                    >
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {turn.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={timelineEndRef} />
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
