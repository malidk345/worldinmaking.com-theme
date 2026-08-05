import React, { useState, useRef, useEffect } from 'react'
import { IconHeadphones, IconSpinner } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'

const STATIONS = [
    {
        name: 'Groove Salad',
        desc: 'Downtempo & Ambient Beats',
        url: 'https://ice2.somafm.com/groovesalad-128-mp3',
    },
    {
        name: 'DEF CON Radio',
        desc: 'Hacker & Cyberpunk Beats',
        url: 'https://ice1.somafm.com/defcon-128-mp3',
    },
    {
        name: 'Drone Zone',
        desc: 'Atmospheric Deep Space Ambient',
        url: 'https://ice4.somafm.com/dronezone-128-mp3',
    },
    {
        name: 'Lofi Study Beats',
        desc: 'Relaxing Focus & Chill Beats',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    },
]

export default function AmbientPlayer() {
    const [mounted, setMounted] = useState(false)
    const [shouldPlay, setShouldPlay] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [stationIndex, setStationIndex] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const currentStation = STATIONS[stationIndex]
        const audio = new Audio()
        audio.volume = 0.6
        audio.src = currentStation.url

        const handleError = (e: any) => {
            if (stationIndex < STATIONS.length - 1) {
                setStationIndex((prev) => prev + 1)
            } else {
                setHasError(true)
                setIsLoading(false)
                setIsPlaying(false)
                setShouldPlay(false)
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

        if (shouldPlay) {
            setIsLoading(true)
            audio.play().catch((err) => {
                console.warn('Playback blocked or failed:', err)
                handleError(err)
            })
        }

        return () => {
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('playing', handlePlaying)
            audio.removeEventListener('pause', handlePause)
            audio.removeEventListener('waiting', handleWaiting)
            audio.pause()
            audio.src = ''
        }
    }, [mounted, stationIndex, shouldPlay])

    const togglePlay = () => {
        if (shouldPlay) {
            setShouldPlay(false)
            if (audioRef.current) {
                audioRef.current.pause()
            }
        } else {
            setHasError(false)
            setIsLoading(true)
            setShouldPlay(true)
        }
    }

    const nextStation = (e: React.MouseEvent) => {
        e.stopPropagation()
        setStationIndex((prev) => (prev + 1) % STATIONS.length)
    }

    const eqAnimation = (
        <div className="flex items-end gap-[1px] h-3 mr-1 opacity-80">
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.8s_ease-in-out_infinite_alternate]" style={{ height: '30%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.5s_ease-in-out_infinite_alternate]" style={{ height: '60%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_1.2s_ease-in-out_infinite_alternate]" style={{ height: '40%' }} />
            <span className="w-[2px] bg-primary rounded-t-sm animate-[eq_0.9s_ease-in-out_infinite_alternate]" style={{ height: '80%' }} />
        </div>
    )

    if (!mounted) {
        return (
            <OSButton size="sm" className="!px-1.5 h-7 flex items-center justify-center">
                <IconHeadphones className="size-5 text-primary opacity-60" />
            </OSButton>
        )
    }

    const currentStation = STATIONS[stationIndex]

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
                <div className="flex flex-col items-center gap-1 p-2 max-w-56 text-center">
                    <p className="text-sm font-bold mb-0">
                        {isPlaying ? '♪ Playing Focus Audio' : isLoading ? 'Connecting to Stream...' : 'Ambient Focus Audio'}
                    </p>
                    <p className="text-xs font-semibold text-primary mb-0 leading-tight">
                        {currentStation.name} ({currentStation.desc})
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={togglePlay}
                            className="text-xs px-2 py-0.5 rounded bg-primary text-secondary hover:opacity-90 font-medium"
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button
                            type="button"
                            onClick={nextStation}
                            className="text-xs px-2 py-0.5 rounded bg-accent border border-primary hover:bg-primary/10 font-medium"
                        >
                            Next Station ↻
                        </button>
                    </div>
                </div>
            </Tooltip>
        </>
    )
}
