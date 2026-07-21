"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import ScrollArea from "components/RadixUI/ScrollArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loading from "components/Loading";
import ForumAvatar from "components/Forum/ForumAvatar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { IconCopy, IconThumbsUp, IconThumbsDown, IconRefresh, IconEye } from "@posthog/icons";


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
    const { user } = useAuth();
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



                const { data: voteCounts, error: countsErr } = await supabase
                    .rpc('get_debate_vote_counts', { debate_id_input: debate.id });

                if (!countsErr && voteCounts) {
                    const counts = voteCounts as unknown as { duelist1: number, duelist2: number };
                    setVotes({
                        duelist1: counts.duelist1 || 0,
                        duelist2: counts.duelist2 || 0
                    });
                } else {
                    const baseline = Math.floor(Math.sin(parseInt(debate.id.slice(0, 8), 16) || 1) * 15) + 50;
                    setVotes({
                        duelist1: baseline,
                        duelist2: 100 - baseline
                    });
                }

                if (user) {
                    const { data: myVote } = await supabase
                        .from('debate_votes')
                        .select('candidate')
                        .eq('debate_id', debate.id)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (myVote) {
                        setUserVote(myVote.candidate);
                    } else {
                        setUserVote(null);
                    }
                }

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
    }, [addToast, user]);

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

    const handleVote = async (candidate: 1 | 2) => {
        if (!activeDebate) return;
        if (!user) {
            addToast("You must be logged in to vote", "error");
            return;
        }

        if (userVote === candidate) {
            setUserVote(null);
            setVotes((prev) => ({
                duelist1: candidate === 1 ? prev.duelist1 - 1 : prev.duelist1,
                duelist2: candidate === 2 ? prev.duelist2 - 1 : prev.duelist2
            }));
            addToast("vote removed", "info");

            await supabase
                .from('debate_votes')
                .delete()
                .eq('debate_id', activeDebate.id)
                .eq('user_id', user.id);
        } else {
            const oldVote = userVote;
            setUserVote(candidate);
            setVotes((prev) => ({
                duelist1: prev.duelist1 + (candidate === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
                duelist2: prev.duelist2 + (candidate === 2 ? 1 : 0) - (oldVote === 2 ? 1 : 0)
            }));
            addToast("perspective supported!", "success");

            if (oldVote) {
                await supabase
                    .from('debate_votes')
                    .update({ candidate })
                    .eq('debate_id', activeDebate.id)
                    .eq('user_id', user.id);
            } else {
                await supabase
                    .from('debate_votes')
                    .insert({ debate_id: activeDebate.id, user_id: user.id, candidate });
            }
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
        <div className="flex flex-col h-full bg-white dark:bg-[#121214] text-primary select-none overflow-hidden font-sans">

            {/* Header */}
            <div className="shrink-0 px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-xl">
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
                    <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex gap-2 overflow-x-auto pb-0.5">
                        <span className="text-[9px] font-medium text-primary/35 lowercase pt-px shrink-0">sources:</span>
                        {activeDebate.research_context.map((source, i) => (
                            <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-medium bg-accent hover:bg-primary/[0.06] px-2 py-0.5 rounded-full border border-black/10 dark:border-white/10 text-secondary hover:text-primary transition-colors shrink-0 max-w-[180px] truncate"
                            >
                                {source.title.toLowerCase()}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Duelists Panel */}
            <div className="shrink-0 px-5 py-4 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
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
                            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-primary block mb-0.5">
                                duelist ①
                            </span>
                            <h3 className="text-xs font-bold lowercase truncate text-primary">
                                @{duelist1?.username}
                            </h3>
                            <button
                                onClick={() => handleVote(1)}
                                className={`mt-1.5 text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                                    userVote === 1
                                        ? "bg-black/5 dark:bg-white/5 text-primary border-black/10 dark:border-white/10"
                                        : "bg-transparent border-black/10 dark:border-white/10 text-secondary hover:text-primary hover:bg-primary/[0.08] hover:border-primary/[0.12]"
                                }`}
                            >
                                {userVote === 1 ? "✓ supported" : "support"}
                            </button>
                        </div>
                    </div>

                    {/* Duelist 2 */}
                    <div className="flex items-center gap-3 justify-end text-right">
                        <div className="min-w-0">
                            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-primary block mb-0.5">
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
                                            ? "bg-black/5 dark:bg-white/5 text-primary border-black/10 dark:border-white/10"
                                            : "bg-transparent border-black/10 dark:border-white/10 text-secondary hover:text-primary hover:bg-primary/[0.08] hover:border-primary/[0.12]"
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
                        <span className="bg-primary border border-black/10 dark:border-white/10 size-7 rounded-full flex items-center justify-center text-[9px] font-bold text-primary/35 uppercase shadow-sm">
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
                            className="h-full rounded-full bg-black/50 dark:bg-white/50 transition-all duration-500"
                            style={{ width: `${d1Percent}%` }}
                        />
                        <div
                            className="h-full rounded-full bg-black/20 dark:bg-white/20 transition-all duration-500"
                            style={{ width: `${d2Percent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Debate Timeline */}
            <div className="flex-grow min-h-0 bg-[#f4f5f5] dark:bg-[#121214] relative">
                <ScrollArea className="h-full select-text">
                    <div className="px-4 py-6">
                        {turns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[200px] text-center py-16">
                                <span className="text-xl animate-pulse text-primary/20">✦</span>
                                <span className="text-[13px] font-medium lowercase tracking-wide mt-3 text-primary/40">
                                    arena initialized. awaiting opening remarks...
                                </span>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-6 pb-8">
                                {turns.map((turn) => {

                                    const isD2 = turn.speaker_id === activeDebate.duelist_2_id;
                                    const isInter = turn.is_interjection;

                                    return (
                                        <div
                                            key={turn.id}
                                            className={`flex w-full ${
                                                isInter
                                                    ? "justify-center"
                                                    : isD2
                                                        ? "justify-end"
                                                        : "justify-start"
                                            }`}
                                        >
                                            {isInter ? (
                                                <div className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-lg p-4 relative mb-4">
                                                    <div className="flex items-center gap-1.5 mb-2.5 text-primary/60 border border-black/10 dark:border-white/10 rounded-[6px] px-2 py-1 w-fit">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                        <span className="text-[12px] italic text-primary/70">With 1 event</span>
                                                    </div>
                                                    <div className="text-[15px] font-medium text-primary mb-3">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {turn.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                    <div className="text-[15px] leading-relaxed text-primary/80 select-text prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                                       {turn.inner_thoughts && (
                                                           <p>{turn.inner_thoughts}</p>
                                                       )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-4 text-primary/40">
                                                        <button className="hover:text-primary transition-colors" aria-label="Copy"><IconCopy className="size-3.5" /></button>
                                                        <button className="hover:text-primary transition-colors" aria-label="Thumbs up"><IconThumbsUp className="size-3.5" /></button>
                                                        <button className="hover:text-primary transition-colors" aria-label="Thumbs down"><IconThumbsDown className="size-3.5" /></button>
                                                        <button className="hover:text-primary transition-colors" aria-label="Refresh"><IconRefresh className="size-3.5" /></button>
                                                        <button className="hover:text-primary transition-colors" aria-label="View"><IconEye className="size-3.5" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`flex flex-col gap-1.5 w-full max-w-[85%] sm:max-w-[75%]`}>
                                                    <div className={`flex items-center gap-2 ${isD2 ? "flex-row-reverse" : "flex-row"}`}>
                                                        <span className="text-[13px] font-semibold text-primary/60">
                                                            {turn.speaker?.username}
                                                        </span>
                                                        <span className="text-[11px] text-primary/40 tabular-nums mt-0.5">
                                                            {dayjs(turn.created_at).format("HH:mm")}
                                                        </span>
                                                    </div>

                                                    {turn.inner_thoughts && (
                                                        <details className={`mb-1 outline-none ${isD2 ? "text-right" : "text-left"}`}>
                                                            <summary className="text-[12px] font-medium text-primary/40 hover:text-primary/60 cursor-pointer select-none outline-none">
                                                                deliberations
                                                            </summary>
                                                            <div className="text-[13px] leading-relaxed text-secondary/70 bg-black/5 dark:bg-white/5 p-3 rounded-md mt-1 border border-black/5 dark:border-white/5 select-text italic text-left">
                                                                {turn.inner_thoughts}
                                                            </div>
                                                        </details>
                                                    )}

                                                    <div className={`bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-[10px] p-4 shadow-sm text-[15px] leading-relaxed select-text prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {turn.content}
                                                        </ReactMarkdown>
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

                {/* Fixed Input Box */}
                <div className="absolute bottom-4 left-0 right-0 px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="w-full rounded-[10px] border-2 border-[#b07be6] bg-white p-3 shadow-sm">
                            <textarea
                               className="w-full bg-transparent outline-none resize-none text-[15px] placeholder:text-primary/40 text-primary min-h-[44px]"
                               placeholder="Ask follow-up or / for commands"
                               rows={1}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-1.5 px-2 py-1 border border-black/10 rounded-[6px] text-[12px] text-primary/70 hover:bg-black/5 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                                        Auto
                                    </button>
                                    <button className="flex items-center justify-center px-2 py-1 border border-black/10 rounded-[6px] text-[12px] text-primary/70 hover:bg-black/5 transition-colors">
                                        @
                                    </button>
                                    <button className="flex items-center gap-1.5 px-2 py-1 border border-black/10 rounded-[6px] text-[12px] text-primary/70 hover:bg-black/5 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                                        $pageview
                                    </button>
                                </div>
                                <button className="flex items-center justify-center size-7 bg-transparent border border-black/10 rounded-[6px] text-primary/50 hover:bg-black/5 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
