"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import ScrollArea from "components/RadixUI/ScrollArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Loading from "components/Loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  LemonButton,
  LemonInput,
  LemonTextArea,
  LemonTag,
} from "components/LemonUI";

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

function ProfileAvatar({ name, size = 24 }: { name?: string; size?: number }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: "var(--primary-3000)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${size * 0.45}px`,
        fontWeight: 600,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
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

  // Discussion state (PostHog UI Gallery 1:1)
  const [activeReplyTurnId, setActiveReplyTurnId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [newTurnText, setNewTurnText] = useState("");
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});

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

        const { data: voteCounts, error: countsErr } = await supabase.rpc(
          "get_debate_vote_counts",
          { debate_id_input: debate.id }
        );

        if (!countsErr && voteCounts) {
          const counts = voteCounts as unknown as { duelist1: number; duelist2: number };
          setVotes({
            duelist1: counts.duelist1 || 0,
            duelist2: counts.duelist2 || 0,
          });
        } else {
          const baseline =
            Math.floor(Math.sin(parseInt(debate.id.slice(0, 8), 16) || 1) * 15) + 50;
          setVotes({
            duelist1: baseline,
            duelist2: 100 - baseline,
          });
        }

        if (user) {
          const { data: myVote } = await supabase
            .from("debate_votes")
            .select("candidate")
            .eq("debate_id", debate.id)
            .eq("user_id", user.id)
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
          filter: `debate_id=eq.${activeDebate.id}`,
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
            speaker: profile || undefined,
          };

          setTurns((prev) => [...prev, newTurn]);
          addToast(`@${profile?.username || "someone"} responded in the debate`, "info");
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
        duelist2: candidate === 2 ? prev.duelist2 - 1 : prev.duelist2,
      }));
      addToast("vote removed", "info");

      await supabase
        .from("debate_votes")
        .delete()
        .eq("debate_id", activeDebate.id)
        .eq("user_id", user.id);
    } else {
      const oldVote = userVote;
      setUserVote(candidate);
      setVotes((prev) => ({
        duelist1: prev.duelist1 + (candidate === 1 ? 1 : 0) - (oldVote === 1 ? 1 : 0),
        duelist2: prev.duelist2 + (candidate === 2 ? 1 : 0) - (oldVote === 2 ? 1 : 0),
      }));
      addToast("perspective supported!", "success");

      if (oldVote) {
        await supabase
          .from("debate_votes")
          .update({ candidate })
          .eq("debate_id", activeDebate.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("debate_votes")
          .insert({ debate_id: activeDebate.id, user_id: user.id, candidate });
      }
    }
  };

  const handleSendReaction = (turnId: string, emoji: string) => {
    setReactions((prev) => {
      const turnReactions = prev[turnId] || {};
      const currentCount = turnReactions[emoji] || 0;
      return {
        ...prev,
        [turnId]: {
          ...turnReactions,
          [emoji]: currentCount > 0 ? 0 : 1,
        },
      };
    });
  };

  const handlePostTurn = async (content: string, isInterjection = false) => {
    if (!content.trim() || !activeDebate || !user) {
      if (!user) addToast("Please log in to post", "error");
      return;
    }

    try {
      const { error } = await supabase.from("debate_turns").insert({
        debate_id: activeDebate.id,
        speaker_id: user.id,
        is_interjection: isInterjection,
        content: content.trim(),
      });

      if (error) throw error;
      setNewTurnText("");
      setInlineReplyText("");
      setActiveReplyTurnId(null);
    } catch (err) {
      addToast("Failed to post remark", "error");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-3000)" }}>
        <Loading />
      </div>
    );
  }

  if (!activeDebate) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-3000)", padding: "2rem", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ fontSize: "1.5rem", opacity: 0.3 }}>✦</div>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            no active arena debate running.
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
    <div
      style={{
        height: "100%",
        backgroundColor: "var(--color-bg-3000)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-3000)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Ambient Glowing Glassmorphism Background Blobs (1:1 UI Gallery) ── */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 58, 138, 0.15) 0%, rgba(30, 58, 138, 0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: "550px",
          height: "550px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0) 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Ultra-Compact PostHog 3000 Support & Header Strip ── */}
      <header
        className="posthog-glass"
        style={{
          padding: "0.625rem 1rem",
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <span style={{ position: "relative", display: "inline-flex", width: "6px", height: "6px" }}>
              <span className="animate-ping" style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#10b981", opacity: 0.75 }} />
              <span style={{ position: "relative", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            </span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeDebate.title}
            </span>
          </div>

          <span style={{ fontSize: "0.6875rem", color: "var(--color-text-secondary)", fontFamily: "monospace", flexShrink: 0 }}>
            ends {dayjs(activeDebate.end_date).fromNow()}
          </span>
        </div>

        {/* Compact Duelist Support Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", paddingTop: "0.375rem", borderTop: "1px solid rgba(0, 0, 0, 0.06)" }}>
          {/* Duelist 1 Support */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: 0 }}>
            <ProfileAvatar name={duelist1?.username || "D1"} size={20} />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3000)" }}>@{duelist1?.username}</span>
            <LemonButton
              size="xsmall"
              type={userVote === 1 ? "primary" : "tertiary"}
              onClick={() => handleVote(1)}
              style={{ border: "1px solid rgba(0, 0, 0, 0.08)" }}
            >
              {userVote === 1 ? "✓ Supported" : "Support"}
            </LemonButton>
          </div>

          {/* VS Ratio Bar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "120px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.625rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "2px" }}>
              <span>{d1Percent}%</span>
              <span style={{ textTransform: "uppercase", fontSize: "0.5625rem", opacity: 0.6 }}>VS</span>
              <span>{d2Percent}%</span>
            </div>
            <div style={{ width: "100%", height: "3px", borderRadius: "999px", backgroundColor: "rgba(0, 0, 0, 0.08)", overflow: "hidden", display: "flex" }}>
              <div style={{ height: "100%", width: `${d1Percent}%`, backgroundColor: "var(--primary-3000)", transition: "width 400ms ease" }} />
              <div style={{ height: "100%", width: `${d2Percent}%`, backgroundColor: "rgba(0, 0, 0, 0.2)", transition: "width 400ms ease" }} />
            </div>
          </div>

          {/* Duelist 2 Support */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: 0, justifyContent: "flex-end" }}>
            <LemonButton
              size="xsmall"
              type={userVote === 2 ? "primary" : "tertiary"}
              onClick={() => handleVote(2)}
              style={{ border: "1px solid rgba(0, 0, 0, 0.08)" }}
            >
              {userVote === 2 ? "✓ Supported" : "Support"}
            </LemonButton>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3000)" }}>@{duelist2?.username}</span>
            <ProfileAvatar name={duelist2?.username || "D2"} size={20} />
          </div>
        </div>
      </header>

      {/* ── Main PostHog 3000 Discussions Canvas ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "840px",
          margin: "0 auto",
          zIndex: 1,
          minHeight: 0,
          padding: "1rem 1rem 0.5rem 1rem",
        }}
      >
        <div
          className="posthog-glass-panel"
          style={{
            flex: 1,
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Discussion Cards Stream */}
          <ScrollArea style={{ flex: 1 }}>
            <div
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {turns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
                  No discussion remarks yet. Start the debate below...
                </div>
              ) : (
                turns.map((turn) => {
                  const isD1 = turn.speaker_id === activeDebate.duelist_1_id;
                  const isD2 = turn.speaker_id === activeDebate.duelist_2_id;
                  const isInter = turn.is_interjection;
                  const isReplyingThisCard = activeReplyTurnId === turn.id;
                  const turnReactions = reactions[turn.id] || {};

                  return (
                    <div
                      key={turn.id}
                      className="Comment posthog-glass"
                      style={{
                        border: isReplyingThisCard
                          ? "2px solid var(--color-accent, #1d4ed8)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                        borderRadius: "var(--radius-lg)",
                        padding: "0.875rem 1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.625rem",
                        boxShadow: isReplyingThisCard
                          ? "0 0 0 3px rgba(29,78,216,0.12)"
                          : "0 4px 16px rgba(0,0,0,0.03)",
                        transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      {/* Author Header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <ProfileAvatar
                            name={turn.speaker?.username || "User"}
                            size={24}
                          />
                          <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-3000)" }}>
                            @{turn.speaker?.username}
                          </div>

                          {isInter ? (
                            <LemonTag type="warning">Interjection</LemonTag>
                          ) : isD1 ? (
                            <LemonTag type="primary">Duelist ①</LemonTag>
                          ) : isD2 ? (
                            <LemonTag type="option">Duelist ②</LemonTag>
                          ) : null}
                        </div>

                        <span style={{ fontSize: "0.6875rem", color: "var(--color-text-secondary)" }}>
                          {dayjs(turn.created_at).fromNow()}
                        </span>
                      </div>

                      {/* Internal Deliberations */}
                      {turn.inner_thoughts && (
                        <details style={{ fontSize: "0.75rem" }}>
                          <summary style={{ cursor: "pointer", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                            Internal Deliberations
                          </summary>
                          <div
                            style={{
                              marginTop: "0.375rem",
                              padding: "0.5rem 0.75rem",
                              backgroundColor: "rgba(0, 0, 0, 0.03)",
                              borderRadius: "var(--radius-md)",
                              fontStyle: "italic",
                              color: "var(--color-text-secondary)",
                              fontSize: "0.75rem",
                              lineHeight: 1.5,
                            }}
                          >
                            {turn.inner_thoughts}
                          </div>
                        </details>
                      )}

                      {/* Comment Content */}
                      <div
                        style={{
                          fontSize: "0.8125rem",
                          lineHeight: 1.5,
                          color: "var(--text-3000)",
                        }}
                        className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {turn.content}
                        </ReactMarkdown>
                      </div>

                      {/* Reaction Bar & Reply Action */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                          <LemonButton
                            size="xsmall"
                            type="tertiary"
                            onClick={() => handleSendReaction(turn.id, "👍")}
                            style={{ border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "rgba(255,255,255,0.6)", padding: "0 0.375rem" }}
                          >
                            <span>👍</span>
                            {(turnReactions["👍"] || 0) > 0 && (
                              <span style={{ fontSize: "0.6875rem", fontWeight: 600, marginLeft: "0.25rem" }}>1</span>
                            )}
                          </LemonButton>
                          <LemonButton
                            size="xsmall"
                            type="tertiary"
                            onClick={() => handleSendReaction(turn.id, "🚀")}
                            style={{ border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "rgba(255,255,255,0.6)", padding: "0 0.375rem" }}
                          >
                            <span>🚀</span>
                            {(turnReactions["🚀"] || 0) > 0 && (
                              <span style={{ fontSize: "0.6875rem", fontWeight: 600, marginLeft: "0.25rem" }}>1</span>
                            )}
                          </LemonButton>
                        </div>

                        <LemonButton
                          size="xsmall"
                          type={isReplyingThisCard ? "primary" : "tertiary"}
                          onClick={() => {
                            setActiveReplyTurnId(isReplyingThisCard ? null : turn.id);
                            setInlineReplyText("");
                          }}
                        >
                          {isReplyingThisCard ? "Cancel" : "Reply"}
                        </LemonButton>
                      </div>

                      {/* Inline Glass Composer */}
                      {isReplyingThisCard && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            paddingTop: "0.75rem",
                            borderTop: "1px solid rgba(0, 0, 0, 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.625rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <ProfileAvatar name={user?.user_metadata?.username || user?.email || "You"} size={18} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                              Replying to @{turn.speaker?.username}...
                            </span>
                          </div>

                          <LemonTextArea
                            placeholder={`Write a reply to @${turn.speaker?.username}...`}
                            value={inlineReplyText}
                            onChange={(e) => setInlineReplyText(e.target.value)}
                            rows={3}
                            autoFocus
                          />

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.375rem" }}>
                            <LemonButton
                              size="small"
                              type="secondary"
                              onClick={() => setActiveReplyTurnId(null)}
                            >
                              Cancel
                            </LemonButton>
                            <LemonButton
                              size="small"
                              type="primary"
                              disabled={!inlineReplyText.trim()}
                              onClick={() => handlePostTurn(inlineReplyText, true)}
                            >
                              Add reply
                            </LemonButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={timelineEndRef} />
            </div>
          </ScrollArea>

          {/* New Thread / Turn Composer at Bottom (1:1 PostHog UI Gallery) */}
          <div
            className="posthog-glass"
            style={{
              padding: "0.875rem 1.25rem",
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ProfileAvatar name={user?.user_metadata?.username || user?.email || "You"} size={18} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                Contribute a remark or interjection...
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <LemonInput
                  placeholder="Type your debate argument or interjection..."
                  value={newTurnText}
                  onChange={(e) => setNewTurnText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePostTurn(newTurnText, false);
                  }}
                />
              </div>
              <LemonButton
                size="small"
                type="primary"
                disabled={!newTurnText.trim()}
                onClick={() => handlePostTurn(newTurnText, false)}
              >
                Post
              </LemonButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
