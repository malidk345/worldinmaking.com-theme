/**
 * Host-owned human interrupt (PostHog create_form / plan approval).
 * The graph stops. The client shows a card. The next turn resumes.
 */

export type HumanTurnKind = 'plan_approval'

export type HumanPlanItem = {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
}

export type HumanTurnStatus = 'pending' | 'approved' | 'revised'

export type HumanTurn = {
    kind: HumanTurnKind
    title: string
    status: HumanTurnStatus
    plan?: HumanPlanItem[]
    summary?: string
}
