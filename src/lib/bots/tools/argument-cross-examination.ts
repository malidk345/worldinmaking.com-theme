/**
 * Dialectical Socratic Cross-Examiner Engine.
 * Formulates rigorous counter-arguments, discovers unstated assumptions,
 * detects logical fallacies, and generates opposing philosophical perspectives.
 */

export interface CrossExaminationResult {
    argument: string
    coreClaim: string
    core_claim?: string
    perspective: string
    identifiedPremises: string[]
    identified_premises?: string[]
    unstatedAssumptions: string[]
    unstated_assumptions?: string[]
    logicalVulnerabilities: string[]
    logical_vulnerabilities?: string[]
    detected_fallacies?: string[]
    socraticCounterDilemma: string
    socratic_counter_dilemma?: string
    opposingPerspectives: Array<{
        school: string
        thinkerRef: string
        critique: string
    }>
    opposing_perspectives?: Array<{
        school: string
        thinkerRef: string
        critique: string
    }>
    verdict: string
}

export function crossExamineArgument(
    argument: string,
    optionsOrTradition?:
        | {
              perspective?: string
              rigor?: 'standard' | 'deep'
              counterTarget?: string
          }
        | string,
    _counterTarget?: string
): CrossExaminationResult {
    const text = String(argument || '').trim()
    const targetPerspective =
        typeof optionsOrTradition === 'string'
            ? optionsOrTradition.toLowerCase()
            : (optionsOrTradition?.perspective || 'socratic').toLowerCase()

    // Analyze linguistic markers to identify argumentative patterns
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 5)
    const coreClaim = sentences[0] || text.slice(0, 100)

    const unstatedAssumptions: string[] = []
    const logicalVulnerabilities: string[] = []
    const identifiedPremises: string[] = []

    // 1. Identify premises
    for (const s of sentences) {
        if (/because|since|if|given that|as|for/i.test(s)) {
            identifiedPremises.push(s)
        }
    }
    if (identifiedPremises.length === 0) {
        identifiedPremises.push(`Explicit assertion: "${coreClaim}"`)
    }

    // 2. Common Philosophical Fallacy & Vulnerability Detectors
    const lower = text.toLowerCase()

    if (/always|never|all|none|everyone|nobody|impossible|must/i.test(lower)) {
        logicalVulnerabilities.push('Universal Generalization: The assertion relies on absolute universals that are vulnerable to a single counter-instance (Black Swan problem).')
        unstatedAssumptions.push('Assumes empirical reality conforms to invariant, non-contextual absolutes.')
    }

    if (/either.*or|if not.*then/i.test(lower)) {
        logicalVulnerabilities.push('Bifurcation / False Dilemma: Forces a binary choice while ignoring intermediate states or transcendent third possibilities.')
    }

    if (/natural|nature|human nature|born to/i.test(lower)) {
        logicalVulnerabilities.push('Naturalistic Fallacy (Is-Ought Problem): Infers normative value or moral justification directly from descriptive natural conditions.')
        unstatedAssumptions.push('Assumes what is "natural" is inherently desirable, just, or immutable.')
    }

    if (/society|culture|tradition|people believe|history shows/i.test(lower)) {
        logicalVulnerabilities.push('Appeal to Consensus or History (Argumentum ad Populum): Confuses temporal or widespread acceptance with necessary truth.')
    }

    if (/science|proven|objective truth|facts/i.test(lower)) {
        logicalVulnerabilities.push('Epistemic Realism Assumption: Conflates current empirical models with noumenal reality in itself (Kant’s Thing-in-itself).')
        unstatedAssumptions.push('Assumes human perceptual apparatus and scientific paradigms provide unmediated access to truth.')
    }

    if (/moral|good|evil|bad|duty|ought/i.test(lower)) {
        logicalVulnerabilities.push('Normative Presupposition: Assumes an objective, transcendent moral hierarchy without demonstrating its ontological basis.')
    }

    if (logicalVulnerabilities.length === 0) {
        logicalVulnerabilities.push('Contingency Vulnerability: The argument’s truth value depends on initial contextual conditions that are not universally binding.')
        unstatedAssumptions.push('Assumes the listener accepts the unproven premise that consciousness and value are commensurable.')
    }

    // 3. Generate Historical Opposing Perspectives
    const opposingPerspectives = [
        {
            school: 'Nietzschean Genealogy & Perspectivism',
            thinkerRef: 'Friedrich Nietzsche',
            critique: `Examines what will or psychological drive produces this claim. Is this assertion born out of abundant vitality and strength, or is it a reactive defense mechanism seeking protection against flux, uncertainty, and suffering?`,
        },
        {
            school: 'Stoic Rational Determinism',
            thinkerRef: 'Marcus Aurelius / Epictetus',
            critique: `Distinguishes what is within control from what is external. If this claim depends on external circumstances or the validation of others, it is fragile and produces perturbation (tarache). True wisdom demands resting solely upon inner judgment.`,
        },
        {
            school: 'Kantian Transcendental Critique',
            thinkerRef: 'Immanuel Kant',
            critique: `Tests whether the principle underlying this claim can be conceived as a universal law of nature without self-contradiction. Furthermore, does it treat human autonomy as an end or merely as an instrumental means?`,
        },
        {
            school: 'Existentialist Lucidity',
            thinkerRef: 'Jean-Paul Sartre / Albert Camus',
            critique: `Challenges the temptation to flee radical freedom into 'bad faith' (mauvaise foi) by blaming external necessity, biological nature, or destiny. Existence precedes essence: man is condemned to be free and solely responsible for his interpretation.`,
        },
    ]

    // 4. Construct Socratic Dilemma / Aporia
    const socraticCounterDilemma = `If "${coreClaim.replace(/"/g, '')}" is true universally, does it hold when its underlying conditions are inverted? Namely: would the opposite condition destroy human flourishing, or would it simply reveal an unacknowledged prejudice of the current epoch?`

    return {
        argument: text,
        coreClaim,
        core_claim: coreClaim,
        perspective: targetPerspective,
        identifiedPremises,
        identified_premises: identifiedPremises,
        unstatedAssumptions,
        unstated_assumptions: unstatedAssumptions,
        logicalVulnerabilities,
        detected_fallacies: logicalVulnerabilities,
        socraticCounterDilemma,
        socratic_counter_dilemma: socraticCounterDilemma,
        opposingPerspectives,
        opposing_perspectives: opposingPerspectives,
        verdict: `Dialectical tension established. The argument exhibits ${logicalVulnerabilities.length} critical vulnerabilities requiring stronger foundational justification.`,
    }
}
