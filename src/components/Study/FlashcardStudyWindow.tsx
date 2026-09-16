import React, { useEffect, useMemo, useState } from 'react'
import { parseStudyDeckId, StudyDeckStore, type StudyCard, type StudyDeck } from '../../lib/study-deck-store'
import type { Sm2Grade } from '../../lib/study-sm2'

const GRADES: Array<{ grade: Sm2Grade; label: string }> = [
    { grade: 1, label: 'Again (1)' },
    { grade: 2, label: 'Hard (2)' },
    { grade: 3, label: 'Good (3)' },
    { grade: 4, label: 'Easy (4)' },
]

export default function FlashcardStudyWindow({ path }: { path?: string }) {
    const [decks, setDecks] = useState<StudyDeck[]>(() => StudyDeckStore.list())
    const [flipped, setFlipped] = useState(false)
    const [complete, setComplete] = useState(false)
    const [sessionCount, setSessionCount] = useState(0)

    useEffect(() => StudyDeckStore.subscribe(setDecks), [])

    const deckId = parseStudyDeckId(path)
    const deck = deckId ? decks.find((item) => item.id === deckId) : undefined
    const queue = useMemo(() => StudyDeckStore.dueCards(deckId || undefined), [decks, deckId])
    const current = complete ? undefined : queue[0]

    useEffect(() => {
        setFlipped(false)
        setComplete(false)
        setSessionCount(0)
    }, [deckId])

    const handleFlip = () => {
        if (!current || complete) return
        setFlipped((value) => !value)
    }

    const handleGrade = (grade: Sm2Grade) => {
        if (!current) return
        StudyDeckStore.gradeCard(current.deck.id, current.card.id, grade)
        setFlipped(false)
        setSessionCount((count) => count + 1)
        const remaining = StudyDeckStore.dueCards(deckId || undefined)
        if (remaining.length === 0) setComplete(true)
    }

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (complete) return
            if (event.code === 'Space' || event.code === 'Enter') {
                event.preventDefault()
                handleFlip()
            }
            if (!flipped) return
            if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4') {
                event.preventDefault()
                handleGrade(Number(event.key) as Sm2Grade)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [complete, flipped, current?.card.id])

    const title = deck?.title || 'Study Session'
    const total = deck?.cards.length || queue.length

    if (complete) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 font-sans text-primary" data-scheme="primary">
                <h2 className="mb-4 text-2xl font-bold">Session complete</h2>
                <p className="text-muted">You reviewed {sessionCount} card{sessionCount === 1 ? '' : 's'}.</p>
                <button
                    type="button"
                    onClick={() => {
                        setComplete(false)
                        setSessionCount(0)
                        setFlipped(false)
                    }}
                    className="mt-6 rounded bg-accent px-6 py-2 text-white transition-colors hover:opacity-90"
                >
                    Continue
                </button>
            </div>
        )
    }

    if (!current) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 font-sans text-primary" data-scheme="primary">
                <h1 className="mb-2 text-xl font-semibold">Study Session</h1>
                <p className="max-w-md text-center text-muted">
                    No flashcards yet. Ask WIM AI to generate a deck, then open Study from the tool result.
                </p>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full flex-col p-8 font-sans" data-scheme="primary">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-primary">{title}</h1>
                <div className="text-sm font-medium text-muted">
                    {sessionCount + 1} due · {total} in deck
                </div>
            </div>

            <div className="mb-8 h-2 w-full rounded bg-primary/10">
                <div
                    className="h-full rounded bg-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, (sessionCount / Math.max(1, sessionCount + queue.length)) * 100)}%` }}
                />
            </div>

            <div className="flex flex-1 flex-col items-center justify-center">
                <button
                    type="button"
                    className="relative min-h-[300px] w-full max-w-2xl cursor-pointer text-left"
                    onClick={handleFlip}
                    aria-label={flipped ? 'Hide answer' : 'Show answer'}
                >
                    <CardFace hidden={flipped} card={current.card} side="front" />
                    <CardFace hidden={!flipped} card={current.card} side="back" onGrade={handleGrade} />
                </button>
            </div>
        </div>
    )
}

function CardFace({
    hidden,
    card,
    side,
    onGrade,
}: {
    hidden: boolean
    card: StudyCard
    side: 'front' | 'back'
    onGrade?: (grade: Sm2Grade) => void
}) {
    return (
        <div
            className={`absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded border border-primary bg-primary p-8 text-center shadow-sm transition-all duration-200 ease-in-out ${
                hidden ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
        >
            {side === 'front' ? (
                <>
                    <h3 className="text-2xl font-medium text-primary">{card.front}</h3>
                    <p className="absolute bottom-6 text-sm text-muted">Press Space to flip</p>
                </>
            ) : (
                <>
                    <p className="text-xl text-primary">{card.back}</p>
                    {card.hint ? <p className="mt-3 text-sm text-muted">{card.hint}</p> : null}
                    <div className="absolute bottom-6 flex flex-wrap justify-center gap-2">
                        {GRADES.map((item) => (
                            <button
                                key={item.grade}
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onGrade?.(item.grade)
                                }}
                                className="rounded border border-primary bg-primary px-4 py-1.5 text-sm text-primary transition-colors hover:bg-accent hover:text-white"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
