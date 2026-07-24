import React, { useState, useRef, useEffect } from 'react'
import { IconHeadphones, IconSpinner } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

// SomaFM "Groove Salad": A nicely chilled plate of ambient/downtempo beats and grooves.
const AUDIO_SRC = 'https://ice1.somafm.com/groovesalad-128-mp3'

export default function AmbientPlayer() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const audio = new Audio(AUDIO_SRC)
        audio.crossOrigin = 'anonymous'
        audio.volume = 0.5

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
            audioRef.current.play().catch((err) => {
                console.error("Audio playback failed:", err)
                setHasError(true)
                setIsLoading(false)
                setIsPlaying(false)
            })
        }
    }

    const eqAnimation = (
        <div className="flex items-end gap-[1px] h-3 mr-1 opacity-80">
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.8s_ease-in-out_infinite_alternate]" style={{ height: '30%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.5s_ease-in-out_infinite_alternate]" style={{ height: '60%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_1.2s_ease-in-out_infinite_alternate]" style={{ height: '40%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.9s_ease-in-out_infinite_alternate]" style={{ height: '80%' }} />
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
                trigger={
                    <OSButton
                        onClick={togglePlay}
                        size="sm"
                        className={`!px-1.5 h-7 flex items-center justify-center transition-all ${
                            isPlaying ? '!bg-accent border-primary' : ''
                        }`}
                    >
                        <div className="flex items-center gap-1.5">
                            {isLoading ? (
                                <IconSpinner className="size-5 animate-spin text-primary" />
                            ) : isPlaying ? (
                                <>
                                    {eqAnimation}
                                    <IconHeadphones className="size-5 text-primary animate-pulse" />
                                </>
                            ) : (
                                <IconHeadphones className={`size-5 ${hasError ? 'text-red opacity-60' : 'text-primary'}`} />
                            )}
                        </div>
                    </OSButton>
                }
            >
                <div className="flex flex-col items-center gap-1 p-1 max-w-48 text-center">
                    <p className="text-sm font-bold mb-0">
                        {isPlaying ? 'Focus Audio Playing' : isLoading ? 'Connecting to Stream...' : 'Ambient Focus Audio'}
                    </p>
                    <p className="text-[11px] opacity-70 mb-0 leading-tight">
                        {isPlaying ? 'SomaFM Groove Salad (Downtempo/Chill)' : 'Click to stream ambient music for deep work'}
                    </p>
                </div>
            </Tooltip>
        </>
    )
}
