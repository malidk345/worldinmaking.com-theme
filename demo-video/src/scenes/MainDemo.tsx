import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, staticFile, Video } from 'remotion'
import clicks from '../data/clicks.json'

type ClickEvent = { t: number; label: string; x: number; y: number }

const CAPTIONS: { label: string; note: string; after: string }[] = [
    { after: 'Notebooks', label: 'Notebooks', note: 'Write and publish on the same surface.' },
    { after: 'Thread', label: 'Community', note: 'Live threads, including the philosopher bots.' },
    { after: 'Community', label: 'Community', note: 'Live threads, including the philosopher bots.' },
    { after: 'WIM AI', label: 'WIM AI', note: 'Ask about the open notebook.' },
    { after: 'Ask', label: 'WIM AI', note: 'Ask about the open notebook.' },
]

function cameraAt(t: number, events: ClickEvent[], vw: number, vh: number) {
    let scale = 1
    let ox = 0.5
    let oy = 0.5
    for (const ev of events) {
        const start = ev.t - 0.12
        const peakIn = ev.t + 0.35
        const peakOut = ev.t + 2.1
        const end = ev.t + 2.7
        if (t < start || t > end) continue
        const s = interpolate(t, [start, peakIn, peakOut, end], [1, 1.16, 1.16, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        })
        if (s > scale) {
            scale = s
            ox = ev.x / vw
            oy = ev.y / vh
        }
    }
    return { scale, ox, oy }
}

function Caption() {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const t = frame / fps
    const events = (clicks as { events: ClickEvent[] }).events || []
    const ev = [...events].reverse().find((e) => t >= e.t && t < e.t + 3.2)
    if (!ev) {
        if (t > 0.8 && t < 4.2) {
            return (
                <CaptionCard
                    opacity={interpolate(t, [0.8, 1.2, 3.6, 4.2], [0, 1, 1, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp',
                    })}
                    label="Home"
                    note="A desktop for writing."
                />
            )
        }
        return null
    }
    const cap = CAPTIONS.find((c) => c.after === ev.label)
    if (!cap) return null
    const opacity = interpolate(t, [ev.t, ev.t + 0.25, ev.t + 2.6, ev.t + 3.2], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    })
    return <CaptionCard opacity={opacity} label={cap.label} note={cap.note} />
}

function CaptionCard({ opacity, label, note }: { opacity: number; label: string; note: string }) {
    return (
        <div
            style={{
                position: 'absolute',
                left: 48,
                bottom: 48,
                opacity,
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#1d1f27',
                fontSize: 16,
                lineHeight: 1.35,
                maxWidth: 440,
                boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
            }}
        >
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ opacity: 0.68, fontSize: 13.5, marginTop: 3 }}>{note}</div>
        </div>
    )
}

export const MainDemo: React.FC = () => {
    const frame = useCurrentFrame()
    const { fps, width, height, durationInFrames } = useVideoConfig()
    const t = frame / fps
    const meta = clicks as { width: number; height: number; events: ClickEvent[] }
    const { scale, ox, oy } = cameraAt(t, meta.events || [], meta.width || 1920, meta.height || 1080)

    const intro = interpolate(frame, [0, 16], [1, 0], { extrapolateRight: 'clamp' })
    const outroStart = durationInFrames - 80
    const outro = interpolate(frame, [outroStart, durationInFrames - 8], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    })

    const pad = 56
    const cardW = width - pad * 2
    const cardH = height - pad * 2

    return (
        <AbsoluteFill style={{ background: '#b7c0ae' }}>
            <div
                style={{
                    position: 'absolute',
                    left: pad,
                    top: pad,
                    width: cardW,
                    height: cardH,
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 28px 80px rgba(0,0,0,0.28)',
                    background: '#c9d0be',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `scale(${scale})`,
                        transformOrigin: `${ox * 100}% ${oy * 100}%`,
                    }}
                >
                    <Video
                        src={staticFile('recordings/real-site-demo.webm')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
            </div>

            <Caption />

            {intro > 0 && <AbsoluteFill style={{ background: '#b7c0ae', opacity: intro }} />}

            {outro > 0 && (
                <AbsoluteFill
                    style={{
                        background: 'rgba(183,192,174,0.96)',
                        opacity: outro,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{ textAlign: 'center', color: '#1d1f27' }}>
                        <div style={{ fontSize: 13, letterSpacing: '0.16em', fontWeight: 650, opacity: 0.5 }}>
                            WORLDINMAKING
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 12 }}>A desktop for writing</div>
                        <div style={{ fontSize: 17, opacity: 0.65, marginTop: 12 }}>worldinmaking.com</div>
                    </div>
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    )
}
