import React, { useState, useRef, useEffect } from 'react'
import { IconHeadphones, IconSpinner } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

const STREAMS = [
    'https://ice6.somafm.com/groovesalad-128-mp3',
    'https://ice2.somafm.com/groovesalad-128-mp3',
    'https://ice1.somafm.com/groovesalad-128-mp3',
    'https://ice4.somafm.com/groovesalad-128-mp3',
    'https://stream.zeno.fm/f3v6ch180d0uv',
]

export default function AmbientPlayer() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [streamIndex, setStreamIndex] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const audio = new Audio()
        audio.volume = 0.5
        audio.src = STREAMS[streamIndex]

        const handleError = () => {
            console.warn('Stream failed:', STREAMS[streamIndex])
            if (streamIndex < STREAMS.length - 1) {
                setStreamIndex((prev) => prev + 1)
            } else {
                setHasError(true)
                setIsLoading(false)
                setIsPlaying(false)
            }
        }

        const handlePlaying = () => {
            setIsLoading(false)
            setIsPlaying(true)
            setHasError(false)
        }

        const handlePause = () => {
            setIsPlaying(false)
        }

        const handleWaiting = () => {
            setIsLoading(true)
        }

        audio.addEventListener('error', handleError)
        audio.addEventListener('playing', handlePlaying)
        audio.addEventListener('pause', handlePause)
        audio.addEventListener('waiting', handleWaiting)

        audioRef.current = audio

        return () => {
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('playing', handlePlaying)
            audio.removeEventListener('pause', handlePause)
            audio.removeEventListener('waiting', handleWaiting)
            audio.pause()
            audio.src = ''
        }
    }, [streamIndex])

    const togglePlay = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            setHasError(false)
            setIsLoading(true)
            audioRef.current.play().catch((err) => {
                console.warn('Playback error, trying next mirror stream:', err)
                if (streamIndex < STREAMS.length - 1) {
                    setStreamIndex((prev) => prev + 1)
                } else {
                    setHasError(true)
                    setIsLoading(false)
                    setIsPlaying(false)
                }
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
