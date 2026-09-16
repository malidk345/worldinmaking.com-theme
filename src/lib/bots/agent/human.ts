/**
 * Host-owned human interrupt (PostHog create_form / plan approval).
 * The graph stops. The client shows a card. The next turn resumes.
 */

export type HumanTurnKind = 'plan_approval' | 'ask_user'

export type HumanPlanItem = {
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'completed'
}

export type HumanTurnStatus = 'pending' | 'approved' | 'revised' | 'answered'

export type HumanTurn = {
    kind: HumanTurnKind
    title: string
    status: HumanTurnStatus
    plan?: HumanPlanItem[]
    summary?: string
    question?: string
    /** Optional short choices for the host form. The composer always offers free text. */
    choices?: string[]
    /** User's answer text when status is 'answered' (ask_user history). */
    answer?: string
    /** Optional revision note when status is 'revised' (plan_approval history). */
    revisionNote?: string
}
