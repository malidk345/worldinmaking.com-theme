/**
 * Quality Gate — WorldInMaking.com
 *
 * Validates AI-generated text before it is persisted to Supabase.
 * Catches common failure modes (filler language, heading spam, persona drift,
 * output-schema violations, word-budget overruns) and attempts auto-correction.
 *
 * Strategy:
 *   1. Run structural checks synchronously — cheap, fast.
 *   2. If any check fails, attempt a correction prompt (max 2 retries).
 *   3. If all retries fail, publish with a `quality_flag` so editors can review.
 */

import type { BotPersona, TaskType } from './persona-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualityReport {
    /** True if the text passed all quality checks (or was auto-corrected). */
    passed: boolean;
    /** 0–100 composite score. */
    score: number;
    /** Human-readable list of detected issues. */
    issues: string[];
    /** The corrected body if auto-correction changed the text. */
    correctedBody: string;
    /** True if correction was applied (body differs from input). */
    wasCorrected: boolean;
    /** True if all retries were exhausted and the text is still below threshold. */
    flaggedForReview: boolean;
}

export interface QualityGateOptions {
    /** Maximum allowed words in the output body. */
    wordBudget?: number;
    /** Minimum quality score to pass without retry (0–100). Default 60. */
    passThreshold?: number;
    /** Maximum correction retry attempts. Default 2. */
    maxRetries?: number;
    /**
     * A function that calls the AI with a correction prompt and returns
     * the corrected text. Injected by callers to avoid circular deps.
     */
    correctionFn?: (correctionPrompt: string) => Promise<string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Universal AI filler phrases that break persona immersion. */
const FILLER_PATTERNS: RegExp[] = [
    /\bcertainly\b/i,
    /\bof course\b/i,
    /\babsolutely\b/i,
    /\bgreat question\b/i,
    /\bexcellent point\b/i,
    /\bas an AI\b/i,
    /\bi must note\b/i,
    /\bit is worth noting\b/i,
    /\bit is important to note\b/i,
    /\bfascinating\b/i,
    /\bi'?d be happy to\b/i,
    /\bi'?m here to\b/i,
    /\blet'?s explore\b/i,
    /\bin conclusion\b/i,
    /\bto summarize\b/i,
    /\bin summary\b/i,
    /\bin essence\b/i,
    /\bneedless to say\b/i,
    /\bit goes without saying\b/i,
    /\bI hope this helps\b/i,
    /\bI hope that clarifies\b/i,
    /\bfeel free to\b/i,
    /\bdon'?t hesitate to\b/i,
    /\bdelve into\b/i,
    /\bunpack\b/i,          // Common AI buzzword
    /\bnavigate\b/i,        // Overused in AI outputs
    /\blandscape\b/i,       // "the philosophical landscape"
    /\btapestry\b/i,        // "a tapestry of ideas"
    /\bpivotal\b/i,
    /\bgroundbreaking\b/i,
    /\bseamlessly\b/i,
];

/** Turkish AI filler phrases (community bots sometimes slip into Turkish). */
const TURKISH_FILLER_PATTERNS: RegExp[] = [
    /\besasen\b/i,
    /\btemelde\b/i,
    /\bözetle\b/i,
    /\bözetlemek gerekirse\b/i,
    /\bsonuç olarak\b/i,
    /\bharika bir noktaya değindin\b/i,
    /\bkesinlikle katılıyorum\b/i,
    /\byapay zeka olarak\b/i,
];

// ─── Individual Checks ────────────────────────────────────────────────────────

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function checkWordBudget(body: string, budget: number): string | null {
    const count = countWords(body);
    if (count > budget) {
        return `Word budget exceeded: ${count}/${budget} words.`;
    }
    return null;
}

function checkFillerLanguage(body: string): string[] {
    const issues: string[] = [];
    for (const pattern of [...FILLER_PATTERNS, ...TURKISH_FILLER_PATTERNS]) {
        if (pattern.test(body)) {
            issues.push(`Filler language detected: "${pattern.source}"`);
        }
    }
    return issues;
}

function checkHeadingSpam(body: string): string | null {
    const words = countWords(body);
    const headings = (body.match(/^#{1,6}\s+/gm) || []).length;
    // More than 1 heading per 80 words is heading spam
    const threshold = Math.max(2, Math.floor(words / 80));
    if (headings > threshold) {
        return `Heading spam: ${headings} headings in ${words} words (max ${threshold}).`;
    }
    return null;
}

function checkEmojiPresence(body: string): string | null {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]/u;
    if (emojiRegex.test(body)) {
        return 'Emoji detected — must be removed.';
    }
    return null;
}

function checkMinimumLength(body: string, task: TaskType): string | null {
    const wordCount = countWords(body);
    const minimums: Partial<Record<TaskType, number>> = {
        community_reply: 30,
        paper_section: 150,
        dialectic_challenge: 80,
        cross_examine: 80,
        third_voice: 100,
        synthesis: 200,
        thread_init: 50,
        fact_critique: 60,
    };
    const minimum = minimums[task] ?? 30;
    if (wordCount < minimum) {
        return `Response too short: ${wordCount} words (minimum ${minimum} for task "${task}").`;
    }
    return null;
}

function checkPersonaForbiddenWords(body: string, persona: BotPersona): string[] {
    const issues: string[] = [];
    // Only check persona-specific forbidden patterns (not universal ones — already in FILLER_PATTERNS)
    const personaSpecific = persona.forbiddenPatterns.filter(
        p => !FILLER_PATTERNS.some(fp => fp.source.includes(p.toLowerCase().slice(0, 8)))
    );
    for (const forbidden of personaSpecific.slice(0, 20)) {
        const regex = new RegExp(`\\b${forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(body)) {
            issues.push(`Persona-breaking word: "${forbidden}"`);
        }
    }
    return issues;
}

function checkOutputNotEmpty(body: string): string | null {
    if (!body || body.trim().length < 10) {
        return 'Output body is empty or too short to be valid.';
    }
    return null;
}

// ─── Score Calculation ────────────────────────────────────────────────────────

/**
 * Calculates a composite quality score from 0–100.
 * Penalties are weighted by severity.
 */
function calculateScore(issues: string[]): number {
    let score = 100;

    for (const issue of issues) {
        if (issue.includes('empty')) score -= 50;
        else if (issue.includes('Word budget exceeded')) score -= 20;
        else if (issue.includes('too short')) score -= 25;
        else if (issue.includes('Emoji')) score -= 15;
        else if (issue.includes('Heading spam')) score -= 10;
        else if (issue.includes('Filler language')) score -= 5;
        else if (issue.includes('Persona-breaking')) score -= 5;
    }

    return Math.max(0, score);
}

// ─── Auto-Correction (rule-based) ────────────────────────────────────────────

/**
 * Applies cheap rule-based corrections that don't require an LLM call.
 * Returns the corrected text and a list of corrections applied.
 */
function applyRuleBasedCorrections(body: string): { text: string; corrections: string[] } {
    let text = body;
    const corrections: string[] = [];

    // Remove emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]/gu;
    if (emojiRegex.test(text)) {
        text = text.replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim();
        corrections.push('Removed emojis');
    }

    // Strip universal filler phrases
    for (const pattern of [...FILLER_PATTERNS, ...TURKISH_FILLER_PATTERNS]) {
        if (pattern.test(text)) {
            text = text.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
            corrections.push(`Stripped filler: ${pattern.source}`);
        }
    }

    // Collapse 3+ consecutive newlines to 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    text = text.trim();

    return { text, corrections };
}

// ─── Main Gate ────────────────────────────────────────────────────────────────

/**
 * Runs the full quality gate on a generated text body.
 *
 * @param body     - The raw generated text to validate.
 * @param persona  - The BotPersona for persona-specific checks.
 * @param task     - The TaskType to apply appropriate length constraints.
 * @param options  - Optional configuration overrides and correction function.
 */
export async function runQualityGate(
    body: string,
    persona: BotPersona,
    task: TaskType,
    options: QualityGateOptions = {}
): Promise<QualityReport> {
    const {
        wordBudget = getDefaultWordBudget(task),
        passThreshold = 60,
        maxRetries = 2,
        correctionFn,
    } = options;

    let currentBody = body;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        // Step 1: Apply cheap rule-based corrections first
        const { text: ruleFixed, corrections } = applyRuleBasedCorrections(currentBody);
        if (corrections.length > 0) {
            currentBody = ruleFixed;
        }

        // Step 2: Run all checks
        const issues: string[] = [];

        const emptyCheck = checkOutputNotEmpty(currentBody);
        if (emptyCheck) issues.push(emptyCheck);

        const budgetCheck = checkWordBudget(currentBody, wordBudget);
        if (budgetCheck) issues.push(budgetCheck);

        const minLengthCheck = checkMinimumLength(currentBody, task);
        if (minLengthCheck) issues.push(minLengthCheck);

        const emojiCheck = checkEmojiPresence(currentBody);
        if (emojiCheck) issues.push(emojiCheck);

        const headingCheck = checkHeadingSpam(currentBody);
        if (headingCheck) issues.push(headingCheck);

        const fillerIssues = checkFillerLanguage(currentBody);
        issues.push(...fillerIssues);

        const personaIssues = checkPersonaForbiddenWords(currentBody, persona);
        issues.push(...personaIssues);

        const score = calculateScore(issues);

        // Step 3: Pass?
        if (score >= passThreshold) {
            return {
                passed: true,
                score,
                issues,
                correctedBody: currentBody,
                wasCorrected: currentBody !== body,
                flaggedForReview: false,
            };
        }

        // Step 4: Retry via LLM correction if function is provided and retries remain
        if (retryCount < maxRetries && correctionFn && score < passThreshold) {
            const prompt = buildCorrectionPrompt(currentBody, persona, task, issues);
            try {
                const corrected = await correctionFn(prompt);
                currentBody = corrected.trim();
                console.log(`[QualityGate] Retry ${retryCount + 1}/${maxRetries} for @${persona.name}. Score was ${score}.`);
            } catch (e) {
                console.warn(`[QualityGate] Correction LLM call failed on retry ${retryCount + 1}:`, e);
                break;
            }
        } else {
            break;
        }

        retryCount++;
    }

    // All retries exhausted — calculate final score and flag for review
    const finalIssues: string[] = [];
    const emptyCheck = checkOutputNotEmpty(currentBody);
    if (emptyCheck) finalIssues.push(emptyCheck);
    const budgetCheck = checkWordBudget(currentBody, wordBudget);
    if (budgetCheck) finalIssues.push(budgetCheck);
    const minLengthCheck = checkMinimumLength(currentBody, task);
    if (minLengthCheck) finalIssues.push(minLengthCheck);
    const emojiCheck = checkEmojiPresence(currentBody);
    if (emojiCheck) finalIssues.push(emojiCheck);
    const headingCheck = checkHeadingSpam(currentBody);
    if (headingCheck) finalIssues.push(headingCheck);
    finalIssues.push(...checkFillerLanguage(currentBody));
    finalIssues.push(...checkPersonaForbiddenWords(currentBody, persona));

    const finalScore = calculateScore(finalIssues);

    console.warn(`[QualityGate] @${persona.name} / task "${task}" flagged for review. Final score: ${finalScore}/100. Issues: ${finalIssues.slice(0, 3).join(' | ')}`);

    return {
        passed: false,
        score: finalScore,
        issues: finalIssues,
        correctedBody: currentBody,
        wasCorrected: currentBody !== body,
        flaggedForReview: true,
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Default word budgets per task type.
 * These match the budgets in bot-structured-output.ts but are centralized here.
 */
export function getDefaultWordBudget(task: TaskType): number {
    const budgets: Record<TaskType, number> = {
        community_reply: 200,
        thread_init: 250,
        paper_section: 500,
        dialectic_challenge: 350,
        cross_examine: 300,
        third_voice: 350,
        synthesis: 600,
        fact_critique: 200,
    };
    return budgets[task] ?? 200;
}

/**
 * Builds a targeted correction prompt for the LLM.
 * Tells the model exactly what is wrong and what to fix.
 */
function buildCorrectionPrompt(
    originalBody: string,
    persona: BotPersona,
    task: TaskType,
    issues: string[]
): string {
    const budget = getDefaultWordBudget(task);
    const issueList = issues.slice(0, 5).map(i => `- ${i}`).join('\n');

    return `You are @${persona.name}. The following text has quality issues that must be fixed.

ORIGINAL TEXT:
${originalBody}

ISSUES TO FIX:
${issueList}

CORRECTION RULES:
- Remove all filler language (certainly, of course, great question, etc.)
- Remove all emojis
- Keep the same intellectual argument — do not change the core claim
- Stay within ${budget} words
- Write as @${persona.name}: ${persona.epistemicStance}
- Do NOT add an introduction or explanation — output only the corrected text

CORRECTED TEXT:`;
}

/**
 * Convenience wrapper: validates a body and returns the best version available.
 * Always returns a string — either the corrected body or the original if gate fails.
 * Logs the quality report for monitoring.
 */
export async function validateAndReturn(
    body: string,
    persona: BotPersona,
    task: TaskType,
    options: QualityGateOptions = {}
): Promise<string> {
    const report = await runQualityGate(body, persona, task, options);

    if (report.flaggedForReview) {
        console.warn(`[QualityGate] Publishing flagged content for @${persona.name} (score: ${report.score}). Review recommended.`);
    }

    return report.correctedBody;
}
