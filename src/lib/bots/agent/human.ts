/**
 * Host-owned human interrupt (PostHog create_form / plan approval).
 * The graph stops. The client shows a card. The next turn resumes.
 */

export type HumanTurnKind = 'ask' | 'plan_approval'

export type HumanQuestion = {
    id: string
    prompt: string
    options?: string[]
}

export type HumanPlanItem = {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
}

export type HumanTurnStatus = 'pending' | 'answered' | 'approved' | 'revised'

export type HumanTurn = {
    kind: HumanTurnKind
    title: string
    status: HumanTurnStatus
    questions?: HumanQuestion[]
    plan?: HumanPlanItem[]
    summary?: string
}
