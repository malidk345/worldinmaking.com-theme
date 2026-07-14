export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';
import { cleanAISmell } from '../../../../../lib/agent-orchestrator';
import type { ResearchSource } from '../../../symposium/research/route';

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskType = 'research_dossier' | 'draft_first_sections' | 'expand_section' | 'peer_review_section' | 'merge_and_synthesis' | 'final_polish';

function formatSources(sources: ResearchSource[]): string {
    if (!sources || sources.length === 0) return '(No external sources available.)';
    return sources.map((s, i) =>
        `[${i + 1}] ${s.source} — "${s.title}"\n    URL: ${s.url}\n    Excerpt: ${s.excerpt}`
    ).join('\n\n');
}

// ─── Section parser/merger helper ─────────────────────────────────────────────
interface DraftSection {
    title: string;
    content: string;
}

function parseDraftSections(draft: string): DraftSection[] {
    if (!draft) return [];
    const sections: DraftSection[] = [];
    const lines = draft.split('\n');
    let currentTitle = 'Introduction';
    let currentLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith('## ')) {
            sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
            currentTitle = line.replace('## ', '').trim();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() });
    return sections.filter(s => s.content.length > 0 || s.title !== 'Introduction');
}

function mergeSectionUpdate(currentDraft: string, targetSection: string, newContent: string): string {
    const sections = parseDraftSections(currentDraft);
    const isNew = targetSection.startsWith('YENİ:') || targetSection.startsWith('NEW:');
    const cleanTitle = targetSection.replace(/^(YENİ:|NEW:)\s*/i, '').trim();

    if (isNew || !sections.some(s => s.title.toLowerCase() === cleanTitle.toLowerCase())) {
        return currentDraft.trim() + `\n\n## ${cleanTitle}\n\n${newContent}\n`;
    }

    const updated = sections.map(s => {
        if (s.title.toLowerCase() === cleanTitle.toLowerCase()) {
            return { title: s.title, content: newContent };
        }
        return s;
    });

    let result = '';
    const intro = updated.find(s => s.title === 'Introduction');
    if (intro) result += intro.content + '\n\n';

    updated.forEach(s => {
        if (s.title !== 'Introduction') {
            result += `## ${s.title}\n\n${s.content}\n\n`;
        }
    });

    return result.trim();
}

// ─── Prompt building instructions ─────────────────────────────────────────────
const EDITORIAL_GUIDELINES = `
=== MANDATORY EDITORIAL GUIDELINES ===
- LANGUAGE: Write in English.
- INTELLECTUAL VOICE: Write like an expert essayist or columnist publishing in Aeon, Wired, or The Atlantic. Use rich, precise vocabulary, mature sentence rhythm, and deep analytical reasoning.
- NO AI CLICHES: Do not use common AI patterns, introductory fluff, or summary endings (e.g. avoid: "In this section, we will...", "Let's explore", "It is important to remember", "First, second, third", "Ultimately", "In conclusion"). Jump straight into the core argument.
- NO TRUNCATION OR SUMMARIZATION: You MUST NOT shorten, compress, or summarize. Keep every detail, paragraph, and citation intact. The final combined essay must target 2500-3500 words of rich content.
- DYNAMIC ILLUSTRATIONS: Whenever a visual concept fits the narrative flow, insert exactly one image placeholder using the format: ![illustration: exact descriptive search keywords for LoremFlickr (e.g., vintage mainframe computers glowing green terminal screens in dark laboratory)](). Do not output empty markdown brackets; provide vivid, explicit search keywords.
- CITATIONS & SOURCES: Integrate facts from the provided sources and cite them inline using bracket numbers (e.g. [1], [2]).
`;

function getTaskInstructions(
    taskType: TaskType,
    topic: string,
    currentDraft: string,
    formattedSources: string,
    agentUsername: string,
    agentPersona: string,
    agentMood: string,
    sectionTitle?: string
): string {
    const sourceBlock = `\n=== RESEARCH SOURCES ===\n${formattedSources}\n=== END SOURCES ===\n`;
    const personaBlock = `You are @${agentUsername}.\nYour intellectual persona: ${agentPersona}\nYour current mood: "${agentMood}"\n`;

    let taskPrompt = "";

    if (taskType === 'research_dossier') {
        taskPrompt = `TASK — INTRODUCTORY RESEARCH OUTLINE:
You are the Research Lead. Review the sources above and formulate a master outline.
Your job is to produce a structured, detailed OUTLINE and KEY FACTS document that will serve as the intellectual scaffold for a long-form essay on this topic.

Output a document with the following sections:
1. **Core Thesis** — The central argument the essay will make (2-3 sentences)
2. **Key Facts & Data** — Bullet list of the most important facts, statistics, and developments from the sources (8-12 items, each citing [source number])
3. **Proposed Structure** — Evocative heading titles for 4 body sections (excluding Introduction) that writers will concurrently draft.
4. **Quotes Worth Including** — 2-3 direct quotes from the sources that would be powerful.

Target 500-700 words.`;
    }
    else if (taskType === 'draft_first_sections') {
        taskPrompt = `RESEARCH OUTLINE TO BUILD FROM:
${currentDraft}

TASK — FIRST DRAFT (Introduction & Setup):
You are the Lead Writer. Write the first full draft of the essay's introduction based on the research outline.
- Jump straight into the substance with a specific, arresting opening sentence.
- Frame the core thesis and structure.
- Include exactly ONE image placeholder in this format: ![illustration: descriptive scene or concept in 8-12 words]()

Output ONLY the introduction markdown. Target 500-800 words.`;
    }
    else if (taskType === 'expand_section') {
        taskPrompt = `SECTION YOU ARE WRITING: "## ${sectionTitle || 'Core Argument'}"

CURRENT DRAFT HISTORY FOR CONTEXT:
${currentDraft}

TASK — SECTION EXPANSION:
You are the Depth Editor assigned to draft the specific section "## ${sectionTitle}".
- Write a highly detailed, comprehensive text for this section ONLY (aim for 600-900 words of rich content).
- Include at least one block quote (> text) from or inspired by a source.
- Add an image placeholder if appropriate: ![illustration: descriptive scene or concept]().

Output the written content for this section ONLY. Do not repeat the rest of the essay.`;
    }
    else if (taskType === 'peer_review_section') {
        taskPrompt = `SECTION YOU ARE AUDITING: "## ${sectionTitle}"

CURRENT CONTENT OF THIS SECTION:
${currentDraft}

TASK — PEER REVIEW & DIALECTIC REVISION:
You are the Devil's Advocate. Your job is to challenge the assumptions, introduce counter-arguments, or rewrite this section to add critical depth and balance.
- Identify the places where the writing is one-sided, overconfident, or ignores important counterarguments.
- Rewrite the section to acknowledge the complexity and tension, presenting opposing views.
- Soften unsupported claims.

Output the complete rewritten version of this section ONLY. Do not write meta-commentary. Target 500-800 words.`;
    }
    else if (taskType === 'merge_and_synthesis') {
        taskPrompt = `CURRENT DRAFT SECTIONS:
${currentDraft}

TASK — EDITORIAL REVISION & SYNTHESIS:
You are the Synthesis Editor. Your job is to read and edit the compiled draft to weave multiple voices into a single authoritative flow.
- Restructure sections for a flawless logical progression.
- Cut redundant or repetitive passages.
- Smooth out tone transitions.
- Write a truly memorable conclusion.
- Add a "## Further Reading" section at the end with the 3-5 sources formatted as markdown links.
- CRITICAL: Do NOT summarize the sections. Maintain their original length and detail, editing purely for style, transitions, and flow.

Output the FULL REVISED essay in markdown. Target 2500-3500 words.`;
    }
    else {
        // final_polish
        taskPrompt = `CURRENT DRAFT:
${currentDraft}

TASK — FINAL POLISH:
You are the Chief Copy Editor. This is the final pass. You have the entire document to polish.
- Read every sentence for rhythm, style, and precision. Cut dead weight.
- Ensure the opening hook is absolutely arresting.
- Add a pull-quote blockquote (> "...") from the most powerful passage.
- Add a byline at the top: *A collective paper produced by the Symposium — [Author names]*
- CRITICAL: You must retain the full length and sections of the document. Do not summarize or truncate.

Output the FINAL, PUBLICATION-READY essay in markdown.`;
    }

    return `${personaBlock}\n${sourceBlock}\nTOPIC: "${topic}"\n\n${taskPrompt}\n\n${EDITORIAL_GUIDELINES}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as {
            collaborationId?: string;
            agentId?: string;
            researchContext?: ResearchSource[];
            steerInstruction?: string;
        };
        const { collaborationId, agentId, researchContext, steerInstruction } = body;

        if (!collaborationId) {
            return NextResponse.json({ error: 'collaborationId is required' }, { status: 400 });
        }

        // 1. Fetch the collaboration
        const { data: collaboration, error: collabErr } = await supabaseAdmin
            .from('symposium_collaborations')
            .select('*')
            .eq('id', collaborationId)
            .single();

        if (collabErr || !collaboration) {
            return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 });
        }

        if (collaboration.status === 'completed') {
            return NextResponse.json({ error: 'Collaboration is already completed' }, { status: 400 });
        }

        // 2. Fetch Blackboard Tasks for this collaboration
        const { data: tasks, error: tasksErr } = await supabaseAdmin
            .from('symposium_tasks')
            .select('*')
            .eq('collaboration_id', collaborationId);

        if (tasksErr || !tasks || tasks.length === 0) {
            // Fallback: If blackboard is empty, bootstrap the first task
            await supabaseAdmin
                .from('symposium_tasks')
                .insert({
                    collaboration_id: collaborationId,
                    task_name: 'research_dossier',
                    status: 'todo'
                });
            return NextResponse.json({ success: false, message: 'Blackboard bootstrapped. Try running again.' });
        }

        // 3. Find the next task to process
        // Prioritize: 'in_progress' (if we are resuming/running) then 'todo'
        let activeTask = tasks.find(t => t.status === 'in_progress' && (!agentId || t.assigned_agent_id === agentId));
        if (!activeTask) {
            activeTask = tasks.find(t => t.status === 'todo');
        }

        if (!activeTask) {
            // Check if all current tasks are completed, and we need to spawn next phase tasks
            const allCompleted = tasks.every(t => t.status === 'completed');
            if (allCompleted) {
                // Determine next phase based on what tasks exist
                const taskNames = tasks.map(t => t.task_name);
                
                if (taskNames.includes('research_dossier') && !taskNames.includes('draft_first_sections')) {
                    // Spawn draft
                    const { data: nextTask } = await supabaseAdmin
                        .from('symposium_tasks')
                        .insert({
                            collaboration_id: collaborationId,
                            task_name: 'draft_first_sections',
                            status: 'todo'
                        })
                        .select('*')
                        .single();
                    activeTask = nextTask;
                }
                else if (taskNames.includes('draft_first_sections') && !taskNames.includes('expand_section')) {
                    // Parse the outline or sections, or spawn default 4 sections for writers
                    const outline = collaboration.current_draft || '';
                    // Extract section headers using ##
                    const headings = (Array.from(outline.matchAll(/^##\s+(.+)$/gm)) as RegExpExecArray[]).map(m => m[1].trim());
                    const targets = headings.length > 0 ? headings.slice(0, 5) : ['Historical Context', 'Technical Framework', 'Socio-Political Tensions', 'Future Vectors'];
                    
                    const spawnPayloads = targets.map(title => ({
                        collaboration_id: collaborationId,
                        task_name: 'expand_section',
                        section_title: title,
                        status: 'todo'
                    }));

                    await supabaseAdmin.from('symposium_tasks').insert(spawnPayloads);
                    return NextResponse.json({ success: true, message: `Spawned ${targets.length} section drafting tasks.` });
                }
                else if (taskNames.includes('expand_section') && !taskNames.includes('peer_review_section')) {
                    // Spawn peer review tasks for each section written
                    const expandTasks = tasks.filter(t => t.task_name === 'expand_section');
                    const spawnPayloads = expandTasks.map(t => ({
                        collaboration_id: collaborationId,
                        task_name: 'peer_review_section',
                        section_title: t.section_title,
                        status: 'todo'
                    }));

                    await supabaseAdmin.from('symposium_tasks').insert(spawnPayloads);
                    return NextResponse.json({ success: true, message: `Spawned ${expandTasks.length} peer-review tasks.` });
                }
                else if (taskNames.includes('peer_review_section') && !taskNames.includes('merge_and_synthesis')) {
                    // Spawn merge task
                    const { data: nextTask } = await supabaseAdmin
                        .from('symposium_tasks')
                        .insert({
                            collaboration_id: collaborationId,
                            task_name: 'merge_and_synthesis',
                            status: 'todo'
                        })
                        .select('*')
                        .single();
                    activeTask = nextTask;
                }
                else if (taskNames.includes('merge_and_synthesis') && !taskNames.includes('final_polish')) {
                    // Spawn polish task
                    const { data: nextTask } = await supabaseAdmin
                        .from('symposium_tasks')
                        .insert({
                            collaboration_id: collaborationId,
                            task_name: 'final_polish',
                            status: 'todo'
                        })
                        .select('*')
                        .single();
                    activeTask = nextTask;
                }
                else {
                    return NextResponse.json({ error: 'All blackboard tasks completed.' }, { status: 400 });
                }
            }
        }

        if (!activeTask) {
            return NextResponse.json({ success: false, message: 'Initializing tasks. Please retry.' });
        }

        const taskType = activeTask.task_name as TaskType;
        const targetSectionTitle = activeTask.section_title;

        // 4. Select bot — exclude last 3 participants to ensure variety
        let selectedAgentId = agentId || activeTask.assigned_agent_id;
        if (!selectedAgentId) {
            const { data: activeBots } = await supabaseAdmin
                .from('bot_profiles')
                .select('id')
                .eq('is_active', true);

            if (!activeBots || activeBots.length === 0) {
                return NextResponse.json({ error: 'No active bots found' }, { status: 404 });
            }

            const { data: steps } = await supabaseAdmin
                .from('symposium_steps')
                .select('agent_id')
                .eq('collaboration_id', collaborationId)
                .order('created_at', { ascending: false });

            const lastFewIds = (steps || []).slice(0, 3).map(s => s.agent_id);
            const candidates = activeBots.filter(b => !lastFewIds.includes(b.id));
            const pool = candidates.length > 0 ? candidates : activeBots;
            selectedAgentId = pool[Math.floor(Math.random() * pool.length)].id;
        }

        // 5. Update task to in_progress & assign to agent
        await supabaseAdmin
            .from('symposium_tasks')
            .update({
                status: 'in_progress',
                assigned_agent_id: selectedAgentId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', activeTask.id);

        // Fetch agent profile & metadata
        const [{ data: profile }, { data: meta }] = await Promise.all([
            supabaseAdmin.from('profiles').select('username, avatar_url').eq('id', selectedAgentId).single(),
            supabaseAdmin.from('agent_metadata').select('system_prompt, current_mood, energy_level').eq('agent_id', selectedAgentId).single(),
        ]);

        if (!profile || !meta) {
            return NextResponse.json({ error: 'Failed to retrieve agent credentials' }, { status: 404 });
        }

        const currentDraft: string = collaboration.current_draft || '';

        // 6. Pre-Research query generation phase
        const searchPrompt = `You are @${profile.username}.
Your intellectual persona: ${meta.system_prompt}
Your current topic of research is: "${collaboration.title}"
Task at hand: "${taskType}" ${targetSectionTitle ? `on section "## ${targetSectionTitle}"` : ''}

TASK:
Formulate a single focused search query (3-6 keywords) to look up fresh web information / data to ground your upcoming writing.
Output in the exact format:
[Sorgu]
your search query keywords here`;

        const { generateBotResponse } = await import('../../../../../lib/ai-provider');
        const searchReply = await generateBotResponse(searchPrompt, profile.username);
        const searchQueryMatch = searchReply.match(/\[Sorgu\]([\s\S]*)$/i);
        const searchQuery = searchQueryMatch ? searchQueryMatch[1].trim() : collaboration.title;

        console.log(`[Symposium Blackboard] Bot @${profile.username} generated JIT Search Query: "${searchQuery}"`);

        // Fetch JIT search sources
        let jitSources: ResearchSource[] = [];
        try {
            const baseUrl = request.nextUrl.origin;
            const res = await fetch(`${baseUrl}/api/symposium/research`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: searchQuery })
            });
            if (res.ok) {
                const data = await res.json() as { sources?: ResearchSource[] };
                if (data.sources) jitSources = data.sources;
            }
        } catch (e) {
            console.error('JIT search failed', e);
        }

        const baseSources: ResearchSource[] = researchContext || (collaboration.research_context as ResearchSource[]) || [];
        const combinedSources = [...jitSources, ...baseSources].slice(0, 8);
        const formattedSources = formatSources(combinedSources);

        // 7. Drafting phase
        let instructions = getTaskInstructions(
            taskType,
            collaboration.title,
            currentDraft,
            formattedSources,
            profile.username,
            meta.system_prompt || '',
            meta.current_mood || 'focused',
            targetSectionTitle
        );

        if (steerInstruction && steerInstruction.trim()) {
            instructions += `\n\n=== USER INSTRUCTION / DIRECTION ===\n`;
            instructions += `You MUST align your contribution to satisfy this specific direction from the user:\n`;
            instructions += `"${steerInstruction.trim()}"\n`;
            instructions += `=== END USER INSTRUCTION ===\n`;
        }

        const formatSuffix = `\n\n---
CHAIN-OF-THOUGHT FORMAT (mandatory):

[İç Ses]
(Write your private reasoning in 3-5 sentences. What is the current state of the section/draft? What improvements will you make?)

[Makale]
(Your complete output — the written content in markdown)`;
        const fullPrompt = `${instructions}${formatSuffix}`;

        console.log(`[Symposium Blackboard] Step: ${taskType} (${targetSectionTitle || 'all'}) → @${profile.username}`);
        const replyText = await generateBotResponse(fullPrompt, profile.username);

        // Parse response
        const thoughtsMatch = replyText.match(/\[İç Ses\]([\s\S]*?)(?=\[Makale\]|$)/i);
        const contentMatch = replyText.match(/\[Makale\]([\s\S]*)$/i);

        const innerThoughts = thoughtsMatch ? thoughtsMatch[1].trim() : '';
        const rawContent = contentMatch ? contentMatch[1].trim() : replyText;
        const cleanedContent = cleanAISmell(rawContent);

        // 8. Merge the bot's edits back into the main draft
        let mergedDraft = currentDraft;
        if (taskType === 'expand_section' || taskType === 'peer_review_section') {
            mergedDraft = mergeSectionUpdate(currentDraft, targetSectionTitle || 'Introduction', cleanedContent);
        } else {
            mergedDraft = cleanedContent;
        }

        // 9. Save Step
        const stepContent = targetSectionTitle
            ? `## ${targetSectionTitle}\n\n${cleanedContent}`
            : cleanedContent;

        const { data: step, error: insertErr } = await supabaseAdmin
            .from('symposium_steps')
            .insert({
                collaboration_id: collaborationId,
                agent_id: selectedAgentId,
                step_number: (tasks.filter(t => t.status === 'completed').length) + 1,
                step_type: taskType,
                inner_thoughts: innerThoughts,
                content: stepContent,
            })
            .select('*, profiles!inner(username, avatar_url)')
            .single();

        if (insertErr || !step) {
            return NextResponse.json({ error: `Failed to save step: ${insertErr?.message}` }, { status: 500 });
        }

        // 10. Mark task as completed on the Blackboard
        await supabaseAdmin
            .from('symposium_tasks')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', activeTask.id);

        // 11. Check if all tasks are complete to decide publication
        const isCompleted = taskType === 'final_polish';
        const newStatus = isCompleted ? 'completed' : 'reviewing';

        const updatePayload: Record<string, unknown> = {
            status: newStatus,
            step_count: (tasks.filter(t => t.status === 'completed').length) + 1,
            current_draft: mergedDraft,
            updated_at: new Date().toISOString(),
        };

        if (combinedSources.length > 0 && taskType === 'research_dossier') {
            updatePayload.research_context = combinedSources;
        }

        // Publish to posts on final polish completion
        let postId: string | null = null;
        if (isCompleted) {
            const { data: steps } = await supabaseAdmin
                .from('symposium_steps')
                .select('agent_id, profiles(username, avatar_url)')
                .eq('collaboration_id', collaborationId);
            const allParticipants = [...(steps || []), step];
            const contributorNames = allParticipants
                .map(s => {
                    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                    return p?.username ? `@${p.username}` : null;
                })
                .filter(Boolean)
                .join(', ');

            const publishedContent = `${mergedDraft}\n\n---\n\n*This paper was collectively authored by the Symposium: ${contributorNames}. Generated autonomously using a Blackboard-orchestrated multi-agent collective loom.*`;
            const slug = `symposium-${collaboration.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;

            const { data: newPost } = await supabaseAdmin
                .from('posts')
                .insert({
                    slug,
                    title: collaboration.title,
                    content: publishedContent,
                    excerpt: mergedDraft.replace(/[#*>\[\]!`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) + '...',
                    author: profile.username,
                    author_avatar: profile.avatar_url || null,
                    category: 'Symposium',
                    language: 'en',
                    is_approved: true,
                    published: true,
                    ribbon: '#7c3aed',
                })
                .select('id')
                .single();

            if (newPost) {
                postId = newPost.id;
                updatePayload.post_id = postId;
            }
        }

        await supabaseAdmin
            .from('symposium_collaborations')
            .update(updatePayload)
            .eq('id', collaborationId);

        return NextResponse.json({
            success: true,
            step,
            newStatus,
            taskType,
            sectionTitle: targetSectionTitle || null,
            isCompleted,
            postId,
        });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Symposium Step Error]', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
