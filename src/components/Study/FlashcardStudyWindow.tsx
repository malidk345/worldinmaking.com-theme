import React, { useState, useEffect } from 'react'

const MOCK_DECK = [
    { front: 'What is active recall?', back: 'Actively stimulating memory during the learning process.' },
    { front: 'What is spaced repetition?', back: 'Learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.' },
    { front: 'What is World in Making?', back: 'A digital workspace and OS.' }
]

export default function FlashcardStudyWindow() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [isComplete, setIsComplete] = useState(false)

    const currentCard = MOCK_DECK[currentIndex]

    const handleFlip = () => setIsFlipped(!isFlipped)

    const handleNext = () => {
        setIsFlipped(false)
        if (currentIndex < MOCK_DECK.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            setIsComplete(true)
        }
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isComplete) return

            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault()
                handleFlip()
            }
            if (isFlipped && (e.code === 'ArrowRight' || e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
                e.preventDefault()
                handleNext()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFlipped, isComplete, currentIndex])

    if (isComplete) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 font-sans text-primary">
                <h2 className="text-2xl font-bold mb-4">Session Complete!</h2>
                <p className="text-muted">You have reviewed {MOCK_DECK.length} cards.</p>
                <button
                    onClick={() => { setCurrentIndex(0); setIsComplete(false); setIsFlipped(false) }}
                    className="mt-6 rounded-full bg-[#1E3A8A] px-6 py-2 text-white hover:bg-blue-800 transition-colors"
                >
                    Restart Session
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full flex-col p-8 font-sans">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-primary">Study Session</h1>
                <div className="text-sm font-medium text-muted">
                    Card {currentIndex + 1} of {MOCK_DECK.length}
                </div>
            </div>

            <div className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-full mb-8">
                <div
                    className="h-full bg-[#1E3A8A] rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex) / MOCK_DECK.length) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div
                    className="relative w-full max-w-2xl min-h-[300px] cursor-pointer"
                    onClick={handleFlip}
                >
                    <div className={`absolute inset-0 w-full h-full p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${isFlipped ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                        <h3 className="text-2xl font-medium text-primary">{currentCard.front}</h3>
                        <p className="absolute bottom-6 text-sm text-muted">Press Space to flip</p>
                    </div>

                    <div className={`absolute inset-0 w-full h-full p-8 rounded-[24px] bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] ${isFlipped ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <p className="text-xl text-primary">{currentCard.back}</p>
                        <div className="absolute bottom-6 flex gap-2">
                            {['Again (1)', 'Hard (2)', 'Good (3)', 'Easy (4)'].map((label, i) => (
                                <button key={i} onClick={(e) => { e.stopPropagation(); handleNext() }} className="rounded-full px-4 py-1.5 text-sm bg-black/5 dark:bg-white/5 hover:bg-[#1E3A8A] hover:text-white transition-colors">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}