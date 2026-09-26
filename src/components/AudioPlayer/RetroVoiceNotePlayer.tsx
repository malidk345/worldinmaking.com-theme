import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
    IconPlayFilled,
    IconPauseFilled,
    IconSpinner,
    IconDownload,
    IconCheck,
    IconNotebook,
} from '@posthog/icons'

export interface RetroVoiceNotePlayerProps {
    src: string
    title?: string
    notebookText?: string
    fullText?: string
    onAddToNotebook?: (title: string, src: string, from?: HTMLElement) => void
    className?: string
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function cleanTitle(raw?: string): string {
    if (!raw) return 'Voice Note'
    return raw
        .replace(/^\[?🔊?\s*(Dinle|Listen|Audio|Sesli Not|Voice Note)?:\s*"?/i, '')
        .replace(/"?\]?$/i, '')
        .trim() || 'Voice Note'
}

function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '') // remove code blocks
        .replace(/<[^>]+>/g, '') // remove HTML tags
        .replace(/\[🔊[^\]]*\]\([^)]+\)/g, '') // remove audio links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown link to plain text
        .replace(/^#+\s+/gm, '') // header hashes
        .replace(/[*_~`>]/g, '') // bold/italic/code/quotes
        .replace(/^[-*+]\s+/gm, '') // list bullets
        .replace(/\s+/g, ' ') // normalize spaces
        .trim()
}

export const RetroVoiceNotePlayer: React.FC<RetroVoiceNotePlayerProps> = ({
    src,
    title,
    notebookText,
    fullText,
    onAddToNotebook,
    className = '',
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const progressBarRef = useRef<HTMLDivElement | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [playbackRate, setPlaybackRate] = useState<number>(1)
    const [isLoading, setIsLoading] = useState(false)
    const [addedNotebook, setAddedNotebook] = useState(false)
    // Default to natural neural voice mode when notebookText is present or user requested natural voice
    const [voiceMode, setVoiceMode] = useState<'natural' | 'r2'>('natural')
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

    const labelTitle = cleanTitle(title)
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

    // Load and cache browser's natural speech voices
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
        const updateVoices = () => {
            const v = window.speechSynthesis.getVoices()
            if (v && v.length > 0) {
                setAvailableVoices(v)
            }
        }
        updateVoices()
        window.speechSynthesis.onvoiceschanged = updateVoices
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.onvoiceschanged = null
                if (speechTimerRef.current) clearInterval(speechTimerRef.current)
                window.speechSynthesis.cancel()
            }
        }
    }, [])

    // HTML5 audio event handling for R2 mode
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const handleLoadedMetadata = () => {
            if (voiceMode === 'r2' && Number.isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration)
            }
            setIsLoading(false)
        }

        const handleTimeUpdate = () => {
            if (voiceMode === 'r2') {
                setCurrentTime(audio.currentTime)
            }
        }

        const handleEnded = () => {
            setIsPlaying(false)
            setCurrentTime(0)
        }

        const handleWaiting = () => {
            if (voiceMode === 'r2') setIsLoading(true)
        }

        const handleCanPlay = () => {
            setIsLoading(false)
        }

        const handleError = () => {
            setIsLoading(false)
            // If R2 audio fails, fallback to natural voice
            setVoiceMode('natural')
        }

        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('waiting', handleWaiting)
        audio.addEventListener('canplay', handleCanPlay)
        audio.addEventListener('error', handleError)

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('waiting', handleWaiting)
            audio.removeEventListener('canplay', handleCanPlay)
            audio.removeEventListener('error', handleError)
            audio.pause()
        }
    }, [src, voiceMode])

    // Natural Neural Voice playback engine
    const startNaturalSpeech = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

        window.speechSynthesis.cancel()
        if (speechTimerRef.current) clearInterval(speechTimerRef.current)

        // Strict priority: notebook text first, then fullText, then labelTitle
        const rawContent = notebookText?.trim() || fullText?.trim() || labelTitle
        const textToRead = stripMarkdown(rawContent)
        if (!textToRead) return

        const utterance = new SpeechSynthesisUtterance(textToRead)
        utteranceRef.current = utterance

        const isTurkish = /[ğüşıöçĞÜŞİÖÇ]/.test(textToRead) || /not|ve|ile|bir|için|bu|da|de/i.test(textToRead)
        utterance.lang = isTurkish ? 'tr-TR' : 'en-US'
        utterance.rate = playbackRate

        // Pick best natural voice (Microsoft Tolga/Emel Online Natural, Google Türkçe, etc.)
        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
        let chosenVoice: SpeechSynthesisVoice | undefined

        if (isTurkish) {
            chosenVoice = voices.find((v) =>
                v.lang.toLowerCase().startsWith('tr') &&
                (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Tolga') || v.name.includes('Emel') || v.name.includes('Ahmet'))
            ) || voices.find((v) => v.lang.toLowerCase().startsWith('tr') || v.lang.toLowerCase().includes('tr'))
        } else {
            chosenVoice = voices.find((v) =>
                v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Neural') || v.name.includes('Google')
            )
        }

        if (chosenVoice) {
            utterance.voice = chosenVoice
        }

        // Calculate expected duration based on reading speed (~130 words per minute)
        const words = textToRead.split(/\s+/).filter(Boolean).length
        const estimatedSeconds = Math.max(3, Math.round((words / (130 * playbackRate)) * 60))
        setDuration(estimatedSeconds)
        setCurrentTime(0)

        const startTime = Date.now()
        speechTimerRef.current = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000) * playbackRate
            if (elapsed >= estimatedSeconds) {
                if (speechTimerRef.current) clearInterval(speechTimerRef.current)
                setCurrentTime(estimatedSeconds)
                setIsPlaying(false)
            } else {
                setCurrentTime(elapsed)
            }
        }, 150)

        utterance.onend = () => {
            if (speechTimerRef.current) clearInterval(speechTimerRef.current)
            setIsPlaying(false)
            setCurrentTime(0)
        }

        utterance.onerror = (err) => {
            console.warn('Natural voice playback notice:', err)
            if (speechTimerRef.current) clearInterval(speechTimerRef.current)
            setIsPlaying(false)
            setIsLoading(false)
        }

        setIsPlaying(true)
        setIsLoading(false)
        window.speechSynthesis.speak(utterance)
    }, [notebookText, fullText, labelTitle, playbackRate, availableVoices])

    const togglePlay = useCallback(async () => {
        if (voiceMode === 'natural') {
            if (isPlaying) {
                window.speechSynthesis.cancel()
                if (speechTimerRef.current) clearInterval(speechTimerRef.current)
                setIsPlaying(false)
            } else {
                startNaturalSpeech()
            }
            return
        }

        // R2 Audio Mode
        const audio = audioRef.current
        if (!audio) {
            startNaturalSpeech()
            return
        }

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            try {
                setIsLoading(true)
                await audio.play()
                setIsPlaying(true)
                setIsLoading(false)
            } catch (err) {
                console.warn('R2 playback failed, switching to natural voice:', err)
                setIsLoading(false)
                setVoiceMode('natural')
                startNaturalSpeech()
            }
        }
    }, [isPlaying, voiceMode, startNaturalSpeech])

    const toggleVoiceMode = useCallback(() => {
        // Stop currently playing audio
        if (isPlaying) {
            if (voiceMode === 'natural') {
                window.speechSynthesis.cancel()
                if (speechTimerRef.current) clearInterval(speechTimerRef.current)
            } else if (audioRef.current) {
                audioRef.current.pause()
            }
            setIsPlaying(false)
            setCurrentTime(0)
        }
        setVoiceMode((prev) => (prev === 'natural' ? 'r2' : 'natural'))
    }, [isPlaying, voiceMode])

    const handleSeek = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const bar = progressBarRef.current
            if (!bar || !duration) return

            const rect = bar.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const ratio = Math.min(1, Math.max(0, clickX / rect.width))
            const targetTime = ratio * duration

            if (voiceMode === 'r2' && audioRef.current) {
                audioRef.current.currentTime = targetTime
            }
            setCurrentTime(targetTime)
        },
        [duration, voiceMode]
    )

    const cyclePlaybackRate = useCallback(() => {
        const rates = [1, 1.25, 1.5, 2]
        const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
        const nextRate = rates[nextIndex]
        setPlaybackRate(nextRate)
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate
        }
    }, [playbackRate])

    const handleDownload = useCallback(() => {
        if (!src) return
        const a = document.createElement('a')
        a.href = src
        a.download = `${labelTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }, [src, labelTitle])

    const handleAddNotebook = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        if (onAddToNotebook) {
            onAddToNotebook(labelTitle, src, event.currentTarget)
            return
        }
        const md = `[🔊 ${labelTitle}](${src})`
        navigator.clipboard.writeText(md)
        setAddedNotebook(true)
        setTimeout(() => setAddedNotebook(false), 2000)
    }, [onAddToNotebook, labelTitle, src])

    return (
        <span
            className={`my-2 inline-flex items-center gap-2 sm:gap-2.5 w-full max-w-xl rounded border border-primary/40 bg-accent/40 hover:border-primary/60 px-3 py-2 text-primary not-prose select-none transition-colors ${className}`}
        >
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                type="button"
                onClick={togglePlay}
                className="size-7 rounded-full border border-primary/60 bg-primary flex items-center justify-center text-primary hover:bg-accent transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isLoading ? (
                    <IconSpinner className="size-3.5 animate-spin text-primary" />
                ) : isPlaying ? (
                    <IconPauseFilled className="size-3 text-primary" />
                ) : (
                    <IconPlayFilled className="size-3 text-primary ml-0.5" />
                )}
            </button>

            {/* Title / Label */}
            <span
                className="truncate max-w-[100px] sm:max-w-[140px] text-[12px] font-medium text-primary leading-tight shrink-0"
                title={labelTitle}
            >
                {labelTitle}
            </span>

            {/* Stylish Audio Scrubber Line (Same row) */}
            <span
                ref={progressBarRef}
                onClick={handleSeek}
                className="group relative flex-1 min-w-[60px] sm:min-w-[100px] h-1.5 cursor-pointer rounded-full bg-primary/15 hover:bg-primary/25 dark:bg-white/15 dark:hover:bg-white/25 flex items-center transition-all hover:h-2"
                title="Click to seek"
            >
                <span
                    className="block h-full rounded-full bg-primary transition-all duration-75"
                    style={{ width: `${progress * 100}%` }}
                />
                <span
                    className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border border-primary shadow-xs transition-transform duration-100 group-hover:scale-125 pointer-events-none"
                    style={{ left: `calc(${progress * 100}% - 5px)` }}
                />
            </span>

            {/* Time Display */}
            <span className="shrink-0 font-mono text-[10.5px] text-muted tabular-nums">
                {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
            </span>

            {/* Voice Mode Toggle (Natural vs Audio) */}
            <button
                type="button"
                onClick={toggleVoiceMode}
                className={`rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
                    voiceMode === 'natural'
                        ? 'border-primary/60 bg-primary/20 text-primary font-semibold'
                        : 'border-primary/40 bg-primary text-muted hover:text-primary'
                }`}
                title={voiceMode === 'natural' ? 'Natural voice active (Click for AI audio)' : 'AI audio active (Click for natural voice)'}
            >
                {voiceMode === 'natural' ? 'Natural' : 'Audio'}
            </button>

            {/* Speed Toggle Pill */}
            <button
                type="button"
                onClick={cyclePlaybackRate}
                className="rounded border border-primary/40 bg-primary px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary hover:bg-accent transition-colors cursor-pointer shrink-0"
                title="Playback speed"
            >
                {playbackRate}x
            </button>

            {/* Action: Add to Notebook */}
            <button
                type="button"
                onClick={handleAddNotebook}
                className="p-1 text-muted hover:text-primary transition-colors cursor-pointer rounded shrink-0"
                title="Add to notebook"
            >
                {addedNotebook ? (
                    <IconCheck className="size-3.5 text-primary" />
                ) : (
                    <IconNotebook className="size-3.5" />
                )}
            </button>

            {/* Action: Download Audio */}
            <button
                type="button"
                onClick={handleDownload}
                className="p-1 text-muted hover:text-primary transition-colors cursor-pointer rounded shrink-0"
                title="Download audio"
            >
                <IconDownload className="size-3.5" />
            </button>
        </span>
    )
}

export default RetroVoiceNotePlayer
