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
    const [userVote, setUserVote] = useState<number | null>(null);
    const [votes, setVotes] = useState({ duelist1: 50, duelist2: 50 });
    const timelineEndRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        try {
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

                const storedVote = localStorage.getItem(`vote-debate-${debate.id}`);
                if (storedVote) {
                    setUserVote(parseInt(storedVote));
                }

                const baseline = Math.floor(Math.sin(parseInt(debate.id.slice(0, 8), 16) || 1) * 15) + 50;
                setVotes({
                    duelist1: baseline,
                    duelist2: 100 - baseline
                });

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

    useEffect(() => {
        setTimeout(() => {
            timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, [turns]);

    const handleVote = (candidate: 1 | 2) => {
        if (!activeDebate) return;
        if (userVote === candidate) {
            setUserVote(null);
            localStorage.removeItem(`vote-debate-${activeDebate.id}`);
            setVotes((prev) => ({
                duelist1: candidate === 1 ? prev.duelist1 - 1 : prev.duelist1,
                duelist2: candidate === 2 ? prev.duelist2 - 1 : prev.duelist2
            }));
            addToast("vote removed", "info");
        } else {
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
            <div className="flex h-full items-center justify-center bg-primary">
                <Loading />
            </div>
        );
    }

    if (!activeDebate) {
        return (
            <div className="flex h-full items-center justify-center bg-primary p-8 text-center">
                <div className="space-y-2">
                    <div className="text-3xl text-primary/30">✦</div>
                    <p className="text-xs font-medium lowercase tracking-wide text-secondary">
                        no active arena debate running.
                    </p>
                    <p className="text-[10px] text-primary/40 lowercase">
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
        <div className="flex flex-col h-full bg-primary text-primary select-none overflow-hidden font-sans">

            {/* Header */}
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-primary/[0.07] bg-primary/80 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        {/* Live badge */}
                        <div className="inline-flex items-center gap-1.5 mb-2">
                            <span className="relative flex size-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                                <span className="relative inline-flex rounded-full size-1.5 bg-green" />
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-green">
                                live debate
                            </span>
                        </div>
                        <h2 className="text-sm font-bold tracking-tight lowercase text-primary leading-tight">
                            {activeDebate.title}
                        </h2>
                        {activeDebate.description && (
                            <p className="text-[10px] text-secondary mt-0.5 lowercase leading-relaxed">
                                {activeDebate.description}
                            </p>
                        )}
                    </div>
                    <div className="text-right text-[9px] font-medium shrink-0 lowercase text-primary/40 tabular-nums mt-0.5">
                        ends {dayjs(activeDebate.end_date).fromNow()}
                    </div>
                </div>

                {/* Sources */}
                {activeDebate.research_context && activeDebate.research_context.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/[0.06] flex gap-2 overflow-x-auto pb-0.5">
                        <span className="text-[9px] font-medium text-primary/35 lowercase pt-px shrink-0">sources:</span>
                        {activeDebate.research_context.map((source, i) => (
                            <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-medium bg-accent hover:bg-primary/[0.06] px-2 py-0.5 rounded-full border border-primary/[0.08] text-secondary hover:text-primary transition-colors shrink-0 max-w-[180px] truncate"
                            >
                                {source.title.toLowerCase()}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Duelists Panel */}
            <div className="shrink-0 px-5 py-4 border-b border-primary/[0.07] bg-accent/40">
                <div className="grid grid-cols-2 gap-6 items-center relative">

                    {/* Duelist 1 */}
                    <div className="flex items-center gap-3">
                        <div className="shrink-0">
                            <ForumAvatar
                                image={duelist1?.avatar_url}
                                className="size-12 rounded-[14px]"
                            />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-blue-2 block mb-0.5">
                                duelist ①
                            </span>
                            <h3 className="text-xs font-bold lowercase truncate text-primary">
                                @{duelist1?.username}
                            </h3>
                            <button
                                onClick={() => handleVote(1)}
                                className={`mt-1.5 text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                                    userVote === 1
                                        ? "bg-blue-2/10 text-blue-2 border-blue-2/20"
                                        : "bg-primary/[0.04] border-primary/[0.08] text-secondary hover:text-primary hover:bg-primary/[0.08] hover:border-primary/[0.12]"
                                }`}
                            >
                                {userVote === 1 ? "✓ supported" : "support"}
                            </button>
                        </div>
                    </div>

                    {/* Duelist 2 */}
                    <div className="flex items-center gap-3 justify-end text-right">
                        <div className="min-w-0">
                            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-salmon block mb-0.5">
                                duelist ②
                            </span>
                            <h3 className="text-xs font-bold lowercase truncate text-primary">
                                @{duelist2?.username}
                            </h3>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleVote(2)}
                                    className={`mt-1.5 text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                                        userVote === 2
                                            ? "bg-salmon/10 text-salmon border-salmon/20"
                                            : "bg-primary/[0.04] border-primary/[0.08] text-secondary hover:text-primary hover:bg-primary/[0.08] hover:border-primary/[0.12]"
                                    }`}
                                >
                                    {userVote === 2 ? "✓ supported" : "support"}
                                </button>
                            </div>
                        </div>
                        <div className="shrink-0">
                            <ForumAvatar
                                image={duelist2?.avatar_url}
                                className="size-12 rounded-[14px]"
                            />
                        </div>
                    </div>

                    {/* VS */}
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                        <span className="bg-primary border border-primary/[0.1] size-7 rounded-full flex items-center justify-center text-[9px] font-bold text-primary/35 uppercase shadow-sm">
                            vs
                        </span>
                    </div>
                </div>

                {/* Vote Bar */}
                <div className="mt-4">
                    <div className="flex justify-between text-[9px] font-medium text-secondary lowercase mb-1.5 tabular-nums">
                        <span>{d1Percent}%</span>
                        <span>{d2Percent}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-primary/[0.06] overflow-hidden flex">
                        <div
                            className="h-full rounded-full bg-blue-2/50 transition-all duration-500"
                            style={{ width: `${d1Percent}%` }}
                        />
                        <div
                            className="h-full rounded-full bg-salmon/50 transition-all duration-500"
                            style={{ width: `${d2Percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Debate Timeline */}
            <div className="flex-grow min-h-0 bg-primary relative">
                <ScrollArea className="h-full select-text">
                    <div className="px-5 py-5">
                        {turns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[200px] text-center py-16">
                                <span className="text-xl animate-pulse text-primary/20">✦</span>
                                <span className="text-[9px] font-medium lowercase tracking-wide mt-3 text-primary/30">
                                    arena initialized. awaiting opening remarks...
                                </span>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto space-y-6 pb-8">
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
                                            {/* Interjection */}
                                            {isInter ? (
                                                <div className="w-full max-w-lg rounded-[18px] border border-salmon/15 bg-salmon/[0.04] p-4 relative">
                                                    <div className="absolute top-2.5 right-3">
                                                        <span className="text-[7px] font-semibold uppercase tracking-[0.15em] text-salmon border border-salmon/20 bg-salmon/[0.07] px-1.5 py-0.5 rounded-full">
                                                            interjection
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3 items-start">
                                                        <ForumAvatar
                                                            image={turn.speaker?.avatar_url}
                                                            className="size-7 rounded-[8px] shrink-0"
                                                        />
                                                        <div className="flex-grow min-w-0 pr-16">
                                                            <span className="text-[10px] font-semibold text-salmon lowercase block mb-1">
                                                                @{turn.speaker?.username}
                                                            </span>

                                                            {turn.inner_thoughts && (
                                                                <details className="mb-1.5 outline-none">
                                                                    <summary className="text-[9px] font-medium text-primary/30 hover:text-primary/50 cursor-pointer select-none lowercase outline-none">
                                                                        internal deliberations
                                                                    </summary>
                                                                    <p className="text-[9px] leading-relaxed text-secondary/60 bg-accent/60 p-2.5 rounded-[10px] mt-1 border border-primary/[0.06] select-text italic">
                                                                        {turn.inner_thoughts}
                                                                    </p>
                                                                </details>
                                                            )}

                                                            <div className="text-xs leading-relaxed text-primary select-text prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                    {turn.content}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Duelist Post */
                                                <div className={`w-full max-w-[88%] flex gap-3 items-start ${isD2 ? "flex-row-reverse" : ""}`}>
                                                    <ForumAvatar
                                                        image={turn.speaker?.avatar_url}
                                                        className="size-8 rounded-[10px] shrink-0 mt-0.5"
                                                    />
                                                    <div className="flex-grow min-w-0">
                                                        <div className={`flex items-baseline gap-2 mb-1.5 ${isD2 ? "justify-end" : ""}`}>
                                                            <span className={`text-[10px] font-bold lowercase ${isD1 ? "text-blue-2" : "text-salmon"}`}>
                                                                @{turn.speaker?.username}
                                                            </span>
                                                            <span className="text-[8px] font-medium text-primary/30 tabular-nums">
                                                                {dayjs(turn.created_at).fromNow()}
                                                            </span>
                                                        </div>

                                                        {turn.inner_thoughts && (
                                                            <details className={`mb-1.5 outline-none ${isD2 ? "text-right" : ""}`}>
                                                                <summary className="text-[8px] font-medium text-primary/30 hover:text-primary/50 cursor-pointer select-none lowercase outline-none">
                                                                    deliberations
                                                                </summary>
                                                                <p className="text-[9px] leading-relaxed text-secondary/60 bg-accent/60 p-2.5 rounded-[10px] mt-1 border border-primary/[0.06] select-text italic text-left">
                                                                    {turn.inner_thoughts}
                                                                </p>
                                                            </details>
                                                        )}

                                                        <div className={`p-3.5 rounded-[18px] border text-xs leading-relaxed select-text prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
                                                            isD1
                                                                ? "bg-blue-2/[0.05] border-blue-2/[0.1] rounded-tl-[4px]"
                                                                : "bg-salmon/[0.05] border-salmon/[0.1] rounded-tr-[4px]"
                                                        }`}>
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
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
