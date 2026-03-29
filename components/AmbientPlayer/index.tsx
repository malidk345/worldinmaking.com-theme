"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Headphones, Play, Square, Volume2, Loader2 } from 'lucide-react'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

// SomaFM "Groove Salad": A nicely chilled plate of ambient/downtempo beats and grooves.
// Perfect for coding and deep focus.
const AUDIO_SRC = 'https://ice1.somafm.com/groovesalad-128-mp3'

export default function AmbientPlayer() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        // Initialize audio only on client side to avoid hydration mismatch
        const audio = new Audio(AUDIO_SRC)
        audio.crossOrigin = 'anonymous' // Helps with streaming from external sources
        audio.volume = 0.5 // Start at 50% volume so it's ambient

        audio.addEventListener('error', () => {
            console.warn('Focus stream not reachable.')
            setHasError(true)
            setIsLoading(false)
            setIsPlaying(false)
        })

        audio.addEventListener('playing', () => {
            setIsLoading(false)
            setIsPlaying(true)
        })

        audio.addEventListener('pause', () => {
            setIsPlaying(false)
        })

        audio.addEventListener('waiting', () => {
            setIsLoading(true)
        })

        audioRef.current = audio

        return () => {
            audio.pause()
            audio.src = ''
        }
    }, [])

    const togglePlay = () => {
        if (!audioRef.current) return

        if (hasError) {
            // Retry loading the audio file
            setHasError(false)
            setIsLoading(true)
            audioRef.current.load()
            audioRef.current.play().catch((err) => {
                console.error("Audio playback retry failed:", err)
                setHasError(true)
                setIsLoading(false)
                setIsPlaying(false)
            })
            return
        }

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            setIsLoading(true)
            // Play returns a promise in modern browsers
            audioRef.current.play().catch((err) => {
                console.error("Audio playback failed:", err)
                setHasError(true)
                setIsLoading(false)
                setIsPlaying(false)
            })
        }
    }

    // Mini EQ animation when playing
    const eqAnimation = (
        <div className="flex items-end gap-[1px] h-3 mr-1 opacity-80">
            <span className="w-[2px] bg-black rounded-t-sm animate-[eq_0.8s_ease-in-out_infinite_alternate]" style={{ height: '30%' }} />
            <span className="w-[2px] bg-black rounded-t-sm animate-[eq_0.5s_ease-in-out_infinite_alternate]" style={{ height: '60%' }} />
            <span className="w-[2px] bg-black rounded-t-sm animate-[eq_1.2s_ease-in-out_infinite_alternate]" style={{ height: '40%' }} />
            <span className="w-[2px] bg-black rounded-t-sm animate-[eq_0.9s_ease-in-out_infinite_alternate]" style={{ height: '80%' }} />
        </div>
    )

    return (
        <>
            <style jsx global>{`
                @keyframes eq {
                    0% { height: 20%; }
                    100% { height: 100%; }
                }
            `}</style>
            
            <Tooltip
                delay={200}
                trigger={
                    <OSButton
                        onClick={togglePlay}
                        size="sm"
                        className={`!px-1 group/music relative translate-y-[2px] transition-all ${isPlaying ? 'bg-primary/5 dark:bg-white/10' : ''}`}
                    >
                        <div className="flex items-center justify-center gap-1.5 min-w-[32px] px-1 h-5">
                            {isLoading ? (
                                <Loader2 className="size-[18px] text-black animate-spin" strokeWidth={1.5} />
                            ) : hasError ? (
                                <Headphones className="size-[18px] text-black opacity-30" strokeWidth={1.5} />
                            ) : isPlaying ? (
                                <>
                                    {eqAnimation}
                                    <Volume2 className="size-3.5 text-black" strokeWidth={1.5} />
                                </>
                            ) : (
                                <Headphones className="size-[18px] text-black transition-transform group-hover/music:scale-110" strokeWidth={1.5} />
                            )}
                        </div>
                    </OSButton>
                }
            >
                <div className="p-1 px-2 text-center">
                    <p className="text-sm font-bold mb-0.5 whitespace-nowrap">
                        {hasError ? 'Stream Error' : 'Deep Focus'}
                    </p>
                    <p className="text-[12px] opacity-70 mb-0 leading-tight">
                        {hasError 
                            ? 'Failed to connect to the focus stream.' 
                            : isPlaying 
                                ? 'playing ambient focus beats. click to pause.' 
                                : 'click to play chill-hop focus radio.'}
                    </p>
                </div>
            </Tooltip>
        </>
    )
}
