import React from 'react'

/**
 * Wallpapers — same scenes / colors as wimpos, without 3D / character overlays.
 *
 * Keep: gradients, photo BGs, carpet tiles (the wallpaper itself).
 * Drop: hedge, hogzilla figure, office prop art, etc. stacked on top.
 *
 * Visibility: body[data-wallpaper] (theme-init / App.tsx).
 */

const FADE_OPACITY = 'transition-opacity duration-700 ease-in-out'

/** wimpos Hogzilla base — no hogzilla PNG overlay */
const Hogzilla = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(268.63deg,#E3E1E4_0%,#FDFDFD_80%,#FDFDFD_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const mulberry32 = (seed: number) => {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const blob = (nx: number, ny: number, cx: number, cy: number, rx: number, ry: number) => {
    const dx = (nx - cx) / rx
    const dy = (ny - cy) / ry
    return Math.exp(-(dx * dx + dy * dy))
}

/** 0..1 density field: empty pockets, packed clusters, stronger toward edges/top. */
const densityAt = (nx: number, ny: number) => {
    const edge = Math.max(nx, 1 - nx, ny, 1 - ny)
    const rim = Math.max(0, (edge - 0.38) / 0.62)
    const top = Math.max(0, 1 - ny * 2.4)
    const wave = 0.5 + 0.5 * Math.sin(nx * 8.1 + ny * 3.4) * Math.sin(nx * 2.7 - ny * 7.2)
    const field =
        0.04 +
        rim * 0.5 +
        top * 0.22 +
        blob(nx, ny, 0.16, 0.68, 0.2, 0.26) * 0.72 +
        blob(nx, ny, 0.86, 0.24, 0.18, 0.2) * 0.62 +
        blob(nx, ny, 0.72, 0.78, 0.16, 0.18) * 0.48 +
        blob(nx, ny, 0.38, 0.18, 0.14, 0.12) * 0.38 +
        wave * 0.1
    return Math.min(1, field)
}

/** Full-frame speckle (not a repeating tile) so density clusters stay unique. */
const speckleField = (
    seed: number,
    cols: number,
    rows: number,
    rMin: number,
    rMax: number,
    densityScale = 1
): string => {
    const W = 1600
    const H = 1000
    const rand = mulberry32(seed)
    const circles: string[] = []
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const nx = (x + 0.14 + rand() * 0.72) / cols
            const ny = (y + 0.14 + rand() * 0.72) / rows
            if (rand() > densityAt(nx, ny) * densityScale) continue
            const r = rMin + rand() * (rMax - rMin)
            const o = 0.28 + rand() * 0.62
            circles.push(
                `<circle cx="${(nx * W).toFixed(1)}" cy="${(ny * H).toFixed(1)}" r="${r.toFixed(2)}" fill="#000" fill-opacity="${o.toFixed(2)}"/>`
            )
        }
    }
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${circles.join('')}</svg>`
    )}")`
}

const SPECKLE_FINE = speckleField(11, 86, 54, 0.35, 0.95, 1)
const SPECKLE_LOOSE = speckleField(29, 30, 19, 0.9, 1.85, 0.72)

const speckleLayer = (mask: string, color: string): React.CSSProperties => ({
    backgroundColor: color,
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: 'cover',
    maskSize: 'cover',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
})

/**
 * WIM Agora — Hogzilla field + clustered speckle (own scene; Hogzilla stays plain).
 */
const Agora = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(268.63deg,#E3E1E4_0%,#FDFDFD_80%,#FDFDFD_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#46368B_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />

        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_FINE, 'rgba(44,40,52,0.52)')}
        />
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_LOOSE, 'rgba(44,40,52,0.24)')}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_FINE, 'rgba(200,187,255,0.42)')}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={speckleLayer(SPECKLE_LOOSE, 'rgba(200,187,255,0.2)')}
        />
    </>
)

const BANG_URL = '/images/wallpapers/cobalt-bang.png'

/** Light cobalt field — CSS so it never pixelates when the viewport scales. */
const CobaltField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#2F7ED4_0%,#4A9EE6_42%,#5EB0F0_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#1E5DAD_0%,#2F7ED4_50%,#3D8FDC_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

/** Packed squares clustered into puffs so the band reads as a cloud, not dust. */
const cloudDotPlate = (() => {
    const W = 1920
    const H = 1080
    const cols = 220
    const rows = 70
    const y0 = 0.3
    const y1 = 0.56
    const rand = mulberry32(91)
    const blobs = [
        { cx: 0.1, cy: 0.44, rx: 0.16, ry: 0.08 },
        { cx: 0.22, cy: 0.4, rx: 0.18, ry: 0.1 },
        { cx: 0.34, cy: 0.45, rx: 0.17, ry: 0.09 },
        { cx: 0.46, cy: 0.39, rx: 0.2, ry: 0.11 },
        { cx: 0.58, cy: 0.44, rx: 0.18, ry: 0.09 },
        { cx: 0.7, cy: 0.4, rx: 0.19, ry: 0.1 },
        { cx: 0.82, cy: 0.45, rx: 0.16, ry: 0.085 },
        { cx: 0.93, cy: 0.41, rx: 0.14, ry: 0.075 },
        { cx: 0.28, cy: 0.36, rx: 0.12, ry: 0.06 },
        { cx: 0.62, cy: 0.36, rx: 0.13, ry: 0.055 },
        { cx: 0.5, cy: 0.5, rx: 0.22, ry: 0.06 },
    ]
    const dens = (nx: number, ny: number) => {
        let d = 0
        for (const b of blobs) d += blob(nx, ny, b.cx, b.cy, b.rx, b.ry)
        return Math.min(1, d)
    }
    const rects: string[] = []
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const nx = (col + 0.08 + rand() * 0.84) / cols
            const ny = y0 + ((row + 0.08 + rand() * 0.84) / rows) * (y1 - y0)
            const d = dens(nx, ny)
            if (d < 0.12) continue
            if (rand() > Math.min(1, d * 1.05 + 0.18)) continue
            const core = d > 0.45
            const s = core ? 2.1 + rand() * 1.6 : 1.2 + rand() * 1.3
            const o = core ? 0.72 + rand() * 0.26 : 0.38 + rand() * 0.34
            rects.push(
                `<rect x="${(nx * W).toFixed(2)}" y="${(ny * H).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="#F4FBFF" fill-opacity="${o.toFixed(2)}"/>`
            )
        }
    }
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${rects.join('')}</svg>`
    )}")`
})()

type CobaltStar = { left: string; top: string; size: number; rotate?: number }

const COBALT_STARS: CobaltStar[] = [
    { left: '7%', top: '8%', size: 11 },
    { left: '14%', top: '18%', size: 7, rotate: 45 },
    { left: '21%', top: '6%', size: 13 },
    { left: '28%', top: '15%', size: 6 },
    { left: '35%', top: '9%', size: 9, rotate: 45 },
    { left: '41%', top: '20%', size: 8 },
    { left: '48%', top: '5%', size: 12 },
    { left: '54%', top: '14%', size: 6, rotate: 45 },
    { left: '61%', top: '8%', size: 10 },
    { left: '67%', top: '19%', size: 7 },
    { left: '11%', top: '27%', size: 5, rotate: 45 },
    { left: '39%', top: '26%', size: 6 },
    { left: '58%', top: '24%', size: 5 },
    { left: '73%', top: '11%', size: 8, rotate: 45 },
    { left: '18%', top: '11%', size: 5 },
    { left: '32%', top: '22%', size: 7 },
    { left: '50%', top: '17%', size: 5 },
    { left: '8%', top: '22%', size: 8 },
]

const PixelStar = ({ size, rotate = 0 }: { size: number; rotate?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 7 7"
        className="block"
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
        aria-hidden
    >
        <rect x="3" y="0" width="1" height="7" fill="#F3E6B4" />
        <rect x="0" y="3" width="7" height="1" fill="#F3E6B4" />
        <rect x="3" y="3" width="1" height="1" fill="#FFF8DC" />
    </svg>
)

const CobaltStarField = () => (
    <div className="absolute inset-0">
        {COBALT_STARS.map((star, i) => (
            <div
                key={i}
                className="absolute"
                style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
            >
                <PixelStar size={star.size} rotate={star.rotate} />
            </div>
        ))}
    </div>
)

const CLOUD_PUFFS =
    'radial-gradient(ellipse 34% 16% at 16% 42%, rgba(244,251,255,0.72) 0%, rgba(244,251,255,0) 72%),' +
    'radial-gradient(ellipse 30% 15% at 38% 40%, rgba(244,251,255,0.7) 0%, rgba(244,251,255,0) 70%),' +
    'radial-gradient(ellipse 36% 17% at 54% 44%, rgba(244,251,255,0.74) 0%, rgba(244,251,255,0) 72%),' +
    'radial-gradient(ellipse 32% 14% at 72% 41%, rgba(244,251,255,0.68) 0%, rgba(244,251,255,0) 70%),' +
    'radial-gradient(ellipse 28% 13% at 88% 45%, rgba(244,251,255,0.64) 0%, rgba(244,251,255,0) 68%),' +
    'radial-gradient(ellipse 22% 10% at 30% 36%, rgba(244,251,255,0.5) 0%, rgba(244,251,255,0) 70%),' +
    'radial-gradient(ellipse 24% 11% at 64% 36%, rgba(244,251,255,0.48) 0%, rgba(244,251,255,0) 70%)'

const CobaltClouds = () => (
    <>
        <div className="absolute inset-0" style={{ backgroundImage: CLOUD_PUFFS }} />
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: cloudDotPlate,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
            }}
        />
        <CobaltStarField />
    </>
)

/** Site bang mark — scales with the viewport, sits in the sky, under desktop icons. */
const CobaltBang = () => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
        src={BANG_URL}
        alt=""
        draggable={false}
        className="absolute top-[22%] right-[6%] w-[min(24vw,10rem)] sm:w-[min(18vw,13rem)] lg:w-[min(16vw,15rem)] h-auto select-none"
    />
)

const CobaltScene = ({ clouds = false, bang = false }: { clouds?: boolean; bang?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <CobaltField />
        {clouds ? <CobaltClouds /> : null}
        {bang ? <CobaltBang /> : null}
    </div>
)

const Cobalt = () => <CobaltScene />
const CobaltCloudsWallpaper = () => <CobaltScene clouds />
const CobaltBangWallpaper = () => <CobaltScene clouds bang />

const MeadowField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#2F6A24_0%,#275820_48%,#1C4518_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#1E4A1A_0%,#173C15_50%,#102A0F_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const grassBladePlate = (() => {
    const S = 64
    const rand = mulberry32(47)
    const greens = ['#2A5C22', '#2E6325', '#275820', '#315F27', '#2C5A23', '#264F1F', '#336428']
    const rects: string[] = []
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${greens[Math.floor(rand() * greens.length)]}"/>`)
        }
    }
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${rects.join('')}</svg>`
    )}")`
})()

const GRASS_PUFFS =
    'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(26,68,24,0.45) 0%, rgba(26,68,24,0) 70%),' +
    'radial-gradient(ellipse 46% 38% at 70% 55%, rgba(20,52,20,0.4) 0%, rgba(20,52,20,0) 70%),' +
    'radial-gradient(ellipse 42% 36% at 40% 80%, rgba(31,79,28,0.38) 0%, rgba(31,79,28,0) 70%),' +
    'radial-gradient(ellipse 48% 34% at 85% 20%, rgba(24,60,22,0.36) 0%, rgba(24,60,22,0) 68%)'

const MeadowGrass = () => (
    <>
        <div className="absolute inset-0" style={{ backgroundImage: GRASS_PUFFS }} />
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: grassBladePlate,
                backgroundSize: '64px 64px',
                backgroundRepeat: 'repeat',
            }}
        />
    </>
)

type MeadowBloom = { left: string; top: string; size: number; kind: 'daisy' | 'dot' }

const MEADOW_BLOOMS: MeadowBloom[] = [
    { left: '8%', top: '14%', size: 12, kind: 'daisy' },
    { left: '18%', top: '28%', size: 8, kind: 'dot' },
    { left: '11%', top: '48%', size: 10, kind: 'daisy' },
    { left: '22%', top: '62%', size: 7, kind: 'dot' },
    { left: '16%', top: '78%', size: 11, kind: 'daisy' },
    { left: '33%', top: '18%', size: 9, kind: 'daisy' },
    { left: '41%', top: '36%', size: 7, kind: 'dot' },
    { left: '38%', top: '54%', size: 12, kind: 'daisy' },
    { left: '29%', top: '72%', size: 8, kind: 'dot' },
    { left: '49%', top: '12%', size: 10, kind: 'daisy' },
    { left: '57%', top: '30%', size: 8, kind: 'daisy' },
    { left: '52%', top: '58%', size: 7, kind: 'dot' },
    { left: '61%', top: '74%', size: 11, kind: 'daisy' },
    { left: '68%', top: '20%', size: 9, kind: 'dot' },
    { left: '74%', top: '42%', size: 12, kind: 'daisy' },
    { left: '81%', top: '16%', size: 8, kind: 'daisy' },
    { left: '88%', top: '34%', size: 10, kind: 'daisy' },
    { left: '78%', top: '66%', size: 7, kind: 'dot' },
    { left: '86%', top: '82%', size: 11, kind: 'daisy' },
    { left: '6%', top: '88%', size: 8, kind: 'dot' },
]

const PixelDaisy = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 7 7" className="block" aria-hidden>
        <rect x="3" y="1" width="1" height="1" fill="#F7F1DC" />
        <rect x="3" y="5" width="1" height="1" fill="#F7F1DC" />
        <rect x="1" y="3" width="1" height="1" fill="#F7F1DC" />
        <rect x="5" y="3" width="1" height="1" fill="#F7F1DC" />
        <rect x="2" y="2" width="1" height="1" fill="#F4E6B8" />
        <rect x="4" y="2" width="1" height="1" fill="#F4E6B8" />
        <rect x="2" y="4" width="1" height="1" fill="#F4E6B8" />
        <rect x="4" y="4" width="1" height="1" fill="#F4E6B8" />
        <rect x="3" y="3" width="1" height="1" fill="#E7B83A" />
    </svg>
)

const PixelClover = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 5 5" className="block" aria-hidden>
        <rect x="2" y="1" width="1" height="1" fill="#5CAD3A" />
        <rect x="1" y="2" width="1" height="1" fill="#4A9A32" />
        <rect x="3" y="2" width="1" height="1" fill="#4A9A32" />
        <rect x="2" y="3" width="1" height="1" fill="#3D8B2E" />
    </svg>
)

const MeadowFlowers = () => (
    <div className="absolute inset-0">
        {MEADOW_BLOOMS.map((bloom, i) => (
            <div
                key={i}
                className="absolute"
                style={{ left: bloom.left, top: bloom.top, width: bloom.size, height: bloom.size }}
            >
                {bloom.kind === 'daisy' ? <PixelDaisy size={bloom.size} /> : <PixelClover size={bloom.size} />}
            </div>
        ))}
    </div>
)

const MeadowScene = ({ grass = false, flowers = false }: { grass?: boolean; flowers?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <MeadowField />
        {grass ? <MeadowGrass /> : null}
        {flowers ? <MeadowFlowers /> : null}
    </div>
)

const Meadow = () => <MeadowScene />
const MeadowGrassWallpaper = () => <MeadowScene grass />
const MeadowFlowersWallpaper = () => <MeadowScene grass flowers />

const DraftField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#F3EFE6_0%,#E8E2D6_55%,#DDD6C8_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#141E40_0%,#1A2748_55%,#121A33_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const draftGrainPlate = (seed: number, colors: string[]) => {
    const S = 64
    const rand = mulberry32(seed)
    const rects: string[] = []
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[Math.floor(rand() * colors.length)]}"/>`)
        }
    }
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${rects.join('')}</svg>`
    )}")`
}

const DRAFT_GRAIN_LIGHT = draftGrainPlate(11, ['#EDE8DC', '#E8E2D6', '#E3DDD0', '#F0EBE1', '#E6E0D4', '#EBE5D9'])
const DRAFT_GRAIN_DARK = draftGrainPlate(13, ['#141E40', '#182444', '#121A36', '#1C2A4C', '#162040', '#10182E'])

const DraftGrid = () => (
    <>
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{ backgroundImage: DRAFT_GRAIN_LIGHT, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{ backgroundImage: DRAFT_GRAIN_DARK, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div className="absolute left-1/2 top-1/2 h-[min(72vw,72vh)] w-[min(72vw,72vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1E4A86]/20 dark:border-[#F3E6B4]/20" />
        <div className="absolute left-1/2 top-1/2 h-[min(42vw,42vh)] w-[min(42vw,42vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1E4A86]/12 dark:border-[#F3E6B4]/12" />
    </>
)

type DraftMark = { left: string; top: string; size: number; kind: 'ink' | 'ember' }

const DRAFT_MARKS: DraftMark[] = [
    { left: '9%', top: '12%', size: 8, kind: 'ink' },
    { left: '17%', top: '31%', size: 5, kind: 'ember' },
    { left: '6%', top: '48%', size: 7, kind: 'ink' },
    { left: '22%', top: '62%', size: 6, kind: 'ink' },
    { left: '12%', top: '78%', size: 5, kind: 'ember' },
    { left: '34%', top: '16%', size: 6, kind: 'ink' },
    { left: '41%', top: '38%', size: 5, kind: 'ember' },
    { left: '29%', top: '54%', size: 8, kind: 'ink' },
    { left: '38%', top: '84%', size: 6, kind: 'ink' },
    { left: '52%', top: '10%', size: 7, kind: 'ink' },
    { left: '58%', top: '27%', size: 5, kind: 'ember' },
    { left: '63%', top: '71%', size: 8, kind: 'ink' },
    { left: '71%', top: '18%', size: 6, kind: 'ink' },
    { left: '78%', top: '44%', size: 5, kind: 'ember' },
    { left: '84%', top: '63%', size: 7, kind: 'ink' },
    { left: '88%', top: '82%', size: 5, kind: 'ink' },
    { left: '74%', top: '88%', size: 6, kind: 'ember' },
    { left: '47%', top: '58%', size: 5, kind: 'ink' },
]

const InkMark = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 7 7" className="block" aria-hidden>
        <rect x="3" y="0" width="1" height="7" fill="#1E4A86" />
        <rect x="0" y="3" width="7" height="1" fill="#1E4A86" />
    </svg>
)

const EmberMark = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 3 3" className="block" aria-hidden>
        <rect x="1" y="0" width="1" height="1" fill="#D08A3A" />
        <rect x="0" y="1" width="3" height="1" fill="#C47A2E" />
        <rect x="1" y="2" width="1" height="1" fill="#D08A3A" />
    </svg>
)

const DraftMarks = () => (
    <div className="absolute inset-0">
        {DRAFT_MARKS.map((mark, i) => (
            <div
                key={i}
                className="absolute"
                style={{ left: mark.left, top: mark.top, width: mark.size, height: mark.size }}
            >
                {mark.kind === 'ink' ? <InkMark size={mark.size} /> : <EmberMark size={mark.size} />}
            </div>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src={BANG_URL}
            alt=""
            draggable={false}
            className="absolute bottom-[10%] right-[8%] w-[min(22vw,9.5rem)] sm:w-[min(17vw,12rem)] h-auto select-none"
        />
    </div>
)

const DraftScene = ({ grid = false, world = false }: { grid?: boolean; world?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <DraftField />
        {grid ? <DraftGrid /> : null}
        {world ? <DraftMarks /> : null}
    </div>
)

const Draft = () => <DraftScene />
const DraftGridWallpaper = () => <DraftScene grid />
const DraftWorldWallpaper = () => <DraftScene grid world />

const HaloField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#1B2748_0%,#243356_48%,#15203A_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#0E1528_0%,#162038_50%,#0B1220_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const HALO_GRAIN = draftGrainPlate(29, ['#1B2748', '#1E2C4E', '#182444', '#223254', '#162040', '#1A284A'])

const HaloDisc = () => (
    <>
        <div
            className="absolute inset-0"
            style={{ backgroundImage: HALO_GRAIN, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div className="absolute left-1/2 top-[46%] h-[min(78vmin,34rem)] w-[min(78vmin,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F3E6B4]/88 dark:bg-[#F3E6B4]/78 shadow-[0_0_120px_40px_rgba(243,230,180,0.28)]" />
    </>
)

const HALO_SPARKS = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const r = 38
    return {
        left: `${50 + Math.cos(a) * r}%`,
        top: `${46 + Math.sin(a) * r}%`,
        size: i % 3 === 0 ? 9 : 6,
        ember: i % 4 === 0,
    }
})

const HaloSpark = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 7 7" className="block" aria-hidden>
        <rect x="3" y="0" width="1" height="7" fill="#F3E6B4" />
        <rect x="0" y="3" width="7" height="1" fill="#F3E6B4" />
        <rect x="3" y="3" width="1" height="1" fill="#FFF8DC" />
    </svg>
)

const HaloSparks = () => (
    <div className="absolute inset-0">
        {HALO_SPARKS.map((spark, i) => (
            <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: spark.left, top: spark.top, width: spark.size, height: spark.size }}
            >
                {spark.ember ? <EmberMark size={spark.size} /> : <HaloSpark size={spark.size} />}
            </div>
        ))}
    </div>
)

const HaloScene = ({ disc = false, sparks = false }: { disc?: boolean; sparks?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <HaloField />
        {disc ? <HaloDisc /> : null}
        {sparks ? <HaloSparks /> : null}
    </div>
)

const Halo = () => <HaloScene />
const HaloDiscWallpaper = () => <HaloScene disc />
const HaloSparksWallpaper = () => <HaloScene disc sparks />

const RainField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#1A3350_0%,#23486A_52%,#163044_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#0F2236_0%,#17324A_50%,#0C1A28_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

type RainDrop = { left: string; top: string; h: number; w: number; o: number; ember: boolean }

const RAIN_DROPS: RainDrop[] = (() => {
    const rand = mulberry32(73)
    const drops: RainDrop[] = []
    for (let i = 0; i < 96; i++) {
        drops.push({
            left: `${(rand() * 96 + 2).toFixed(2)}%`,
            top: `${(rand() * 92 + 2).toFixed(2)}%`,
            h: 10 + Math.floor(rand() * 22),
            w: rand() > 0.82 ? 2 : 1,
            o: 0.35 + rand() * 0.5,
            ember: false,
        })
    }
    return drops
})()

const RAIN_EMBERS: RainDrop[] = (() => {
    const rand = mulberry32(101)
    const drops: RainDrop[] = []
    for (let i = 0; i < 18; i++) {
        drops.push({
            left: `${(rand() * 94 + 3).toFixed(2)}%`,
            top: `${(rand() * 90 + 4).toFixed(2)}%`,
            h: 6 + Math.floor(rand() * 10),
            w: 2,
            o: 0.7 + rand() * 0.3,
            ember: true,
        })
    }
    return drops
})()

const RainStreak = ({ drop }: { drop: RainDrop }) => (
    <div
        className="absolute rounded-full"
        style={{
            left: drop.left,
            top: drop.top,
            width: drop.w,
            height: drop.h,
            opacity: drop.o,
            background: drop.ember ? '#D08A3A' : '#D7E7F4',
        }}
    />
)

const RainFall = () => (
    <div className="absolute inset-0">
        {RAIN_DROPS.map((drop, i) => (
            <RainStreak key={i} drop={drop} />
        ))}
    </div>
)

const RainEmbers = () => (
    <div className="absolute inset-0">
        {RAIN_EMBERS.map((drop, i) => (
            <RainStreak key={i} drop={drop} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src={BANG_URL}
            alt=""
            draggable={false}
            className="absolute bottom-[18%] left-[10%] w-[min(20vw,9rem)] sm:w-[min(15vw,11rem)] h-auto select-none opacity-90"
        />
    </div>
)

const RainScene = ({ fall = false, embers = false }: { fall?: boolean; embers?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <RainField />
        {fall ? <RainFall /> : null}
        {embers ? <RainEmbers /> : null}
    </div>
)

const Rain = () => <RainScene />
const RainFallWallpaper = () => <RainScene fall />
const RainEmbersWallpaper = () => <RainScene fall embers />

const DawnField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#FDE6D2_0%,#F8F1E6_48%,#F0D9C4_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#E8C9B0_0%,#C9A894_50%,#8F7368_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const DAWN_GRAIN_LIGHT = draftGrainPlate(41, ['#F8F0E4', '#F3E8D8', '#EFE4D4', '#F6EDE0', '#EADCC8', '#F4E9DB'])
const DAWN_GRAIN_DARK = draftGrainPlate(43, ['#E8C9B0', '#D4B49C', '#C9A894', '#E0C0AA', '#B89682', '#DCC4B0'])

const DawnGrain = () => (
    <>
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{ backgroundImage: DAWN_GRAIN_LIGHT, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{ backgroundImage: DAWN_GRAIN_DARK, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
    </>
)

const DawnSun = () => (
    <div className="absolute left-[62%] top-[38%] h-[min(52vmin,22rem)] w-[min(52vmin,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F3D7A0]/80 dark:bg-[#E8C98A]/70 shadow-[0_0_90px_30px_rgba(243,215,160,0.35)]" />
)

const DAWN_SPARKS = [
    { left: '8%', top: '14%', size: 8 },
    { left: '16%', top: '28%', size: 5 },
    { left: '12%', top: '52%', size: 7 },
    { left: '24%', top: '18%', size: 6 },
    { left: '31%', top: '40%', size: 5 },
    { left: '22%', top: '68%', size: 8 },
    { left: '38%', top: '12%', size: 6 },
    { left: '44%', top: '78%', size: 7 },
    { left: '58%', top: '8%', size: 5 },
    { left: '72%', top: '16%', size: 8 },
    { left: '81%', top: '32%', size: 6 },
    { left: '88%', top: '54%', size: 7 },
    { left: '76%', top: '72%', size: 5 },
    { left: '64%', top: '86%', size: 6 },
    { left: '9%', top: '84%', size: 5 },
]

const DawnSpark = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 7 7" className="block" aria-hidden>
        <rect x="3" y="0" width="1" height="7" fill="#E8C98A" />
        <rect x="0" y="3" width="7" height="1" fill="#E8C98A" />
        <rect x="3" y="3" width="1" height="1" fill="#FFF4D6" />
    </svg>
)

const DawnSparks = () => (
    <div className="absolute inset-0">
        {DAWN_SPARKS.map((spark, i) => (
            <div key={i} className="absolute" style={{ left: spark.left, top: spark.top, width: spark.size, height: spark.size }}>
                <DawnSpark size={spark.size} />
            </div>
        ))}
    </div>
)

const DawnScene = ({ grain = false, sun = false }: { grain?: boolean; sun?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <DawnField />
        {grain ? <DawnGrain /> : null}
        {sun ? (
            <>
                <DawnSun />
                <DawnSparks />
            </>
        ) : null}
    </div>
)

const Dawn = () => <DawnScene />
const DawnGrainWallpaper = () => <DawnScene grain />
const DawnSunWallpaper = () => <DawnScene grain sun />

const IceField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#E7F3FB_0%,#D4E8F6_48%,#C2DCF0_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(180deg,#6A8AAA_0%,#5A7A98_50%,#4A6A86_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

const ICE_GRAIN_LIGHT = draftGrainPlate(59, ['#D8ECF7', '#D0E6F3', '#C8E0EF', '#DEEEF8', '#CCE4F2', '#D4E8F5'])
const ICE_GRAIN_DARK = draftGrainPlate(61, ['#6A8AAA', '#6282A2', '#5A7A98', '#7290B0', '#547292', '#6486A6'])

const IceGrain = () => (
    <>
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{ backgroundImage: ICE_GRAIN_LIGHT, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{ backgroundImage: ICE_GRAIN_DARK, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div className="absolute left-[12%] top-[18%] h-[min(38vmin,16rem)] w-[min(38vmin,16rem)] rounded-[1.25rem] border border-[#1E4A86]/15 bg-white/25 dark:border-white/15 dark:bg-white/10" />
        <div className="absolute right-[10%] bottom-[14%] h-[min(28vmin,12rem)] w-[min(28vmin,12rem)] rounded-[1.25rem] border border-[#1E4A86]/12 bg-white/18 dark:border-white/12 dark:bg-white/8" />
    </>
)

const ICE_MARKS = [
    { left: '8%', top: '12%', size: 8 },
    { left: '18%', top: '44%', size: 6 },
    { left: '10%', top: '72%', size: 7 },
    { left: '32%', top: '22%', size: 5 },
    { left: '40%', top: '58%', size: 8 },
    { left: '36%', top: '86%', size: 6 },
    { left: '54%', top: '16%', size: 7 },
    { left: '62%', top: '38%', size: 5 },
    { left: '58%', top: '70%', size: 8 },
    { left: '74%', top: '24%', size: 6 },
    { left: '82%', top: '48%', size: 7 },
    { left: '78%', top: '78%', size: 5 },
    { left: '88%', top: '14%', size: 8 },
    { left: '90%', top: '86%', size: 6 },
]

const IcePlus = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 7 7" className="block" aria-hidden>
        <rect x="3" y="0" width="1" height="7" fill="#1E4A86" />
        <rect x="0" y="3" width="7" height="1" fill="#1E4A86" />
    </svg>
)

const IceMarks = () => (
    <div className="absolute inset-0">
        {ICE_MARKS.map((mark, i) => (
            <div key={i} className="absolute" style={{ left: mark.left, top: mark.top, width: mark.size, height: mark.size }}>
                <IcePlus size={mark.size} />
            </div>
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src={BANG_URL}
            alt=""
            draggable={false}
            className="absolute top-[22%] right-[8%] w-[min(20vw,9rem)] sm:w-[min(16vw,11rem)] h-auto select-none"
        />
    </div>
)

const IceScene = ({ grain = false, marks = false }: { grain?: boolean; marks?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <IceField />
        {grain ? <IceGrain /> : null}
        {marks ? <IceMarks /> : null}
    </div>
)

const Ice = () => <IceScene />
const IceGrainWallpaper = () => <IceScene grain />
const IceMarksWallpaper = () => <IceScene grain marks />

const plazaTile = (id: string, bg: string, fg: string) =>
    `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <defs>
                <pattern id="${id}a" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="16" height="32" fill="${fg}"/>
                </pattern>
                <pattern id="${id}b" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                    <rect width="16" height="32" fill="${fg}"/>
                </pattern>
            </defs>
            <rect width="200" height="200" fill="${bg}"/>
            <rect width="100" height="100" fill="url(#${id}a)"/>
            <rect x="100" width="100" height="100" fill="url(#${id}b)"/>
            <rect y="100" width="100" height="100" fill="url(#${id}b)"/>
            <rect x="100" y="100" width="100" height="100" fill="url(#${id}a)"/>
        </svg>`
    )}")`

const PLAZA_LIGHT = plazaTile('pl', '#E6DFD2', '#CFC6B6')
const PLAZA_DARK = plazaTile('pd', '#141E40', '#1E2C4A')

const PlazaField = () => (
    <>
        <div className={`absolute inset-0 bg-[#E6DFD2] opacity-100 dark:opacity-0 ${FADE_OPACITY}`} />
        <div className={`absolute inset-0 bg-[#141E40] opacity-0 dark:opacity-100 ${FADE_OPACITY}`} />
    </>
)

const PlazaCarpet = () => (
    <>
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{ backgroundImage: PLAZA_LIGHT, backgroundSize: '200px 200px', backgroundRepeat: 'repeat' }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{ backgroundImage: PLAZA_DARK, backgroundSize: '200px 200px', backgroundRepeat: 'repeat' }}
        />
    </>
)

const PlazaBang = () => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
        src={BANG_URL}
        alt=""
        draggable={false}
        className="absolute bottom-[8%] right-[8%] w-[min(28vw,12rem)] sm:w-[min(22vw,16rem)] h-auto select-none drop-shadow-xl"
    />
)

const PlazaScene = ({ carpet = false, bang = false }: { carpet?: boolean; bang?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <PlazaField />
        {carpet ? <PlazaCarpet /> : null}
        {bang ? <PlazaBang /> : null}
    </div>
)

const Plaza = () => <PlazaScene />
const PlazaCarpetWallpaper = () => <PlazaScene carpet />
const PlazaBangWallpaper = () => <PlazaScene carpet bang />

const LawnField = () => (
    <>
        <div
            className={`absolute inset-0 bg-[linear-gradient(200deg,#86B85A_0%,#6FA04A_48%,#588C3A_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(200deg,#3F6A32_0%,#325628_50%,#274420_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
    </>
)

type LawnTuft = { left: string; top: string; size: number; rotate: number }

const LAWN_TUFTS: LawnTuft[] = (() => {
    const rand = mulberry32(19)
    const tufts: LawnTuft[] = []
    for (let i = 0; i < 64; i++) {
        const depth = rand()
        tufts.push({
            left: `${(rand() * 94 + 2).toFixed(2)}%`,
            top: `${(18 + depth * 78).toFixed(2)}%`,
            size: 14 + Math.floor(rand() * 22) + Math.floor(depth * 10),
            rotate: -18 + rand() * 36,
        })
    }
    return tufts
})()

const GrassTuft = ({ size, rotate }: { size: number; rotate: number }) => (
    <svg
        width={size}
        height={size * 1.15}
        viewBox="0 0 12 14"
        className="block"
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-hidden
    >
        <ellipse cx="6" cy="12.4" rx="3.6" ry="1" className="fill-black/15 dark:fill-black/35" />
        <path
            d="M6 12.2 L4.1 2.4 M6 12.2 L6.2 1.1 M6 12.2 L8.1 2.6 M6 12.2 L2.4 5.4 M6 12.2 L9.4 5.1"
            fill="none"
            stroke="#3F6E2C"
            className="dark:stroke-[#8FBC62]"
            strokeWidth="1.05"
            strokeLinecap="round"
        />
    </svg>
)

const LawnTufts = () => (
    <div className="absolute inset-0">
        {LAWN_TUFTS.map((tuft, i) => (
            <div
                key={i}
                className="absolute"
                style={{ left: tuft.left, top: tuft.top, width: tuft.size, height: tuft.size * 1.15 }}
            >
                <GrassTuft size={tuft.size} rotate={tuft.rotate} />
            </div>
        ))}
    </div>
)

const LawnScene = ({ tufts = false }: { tufts?: boolean }) => (
    <div className="absolute inset-0 isolate">
        <LawnField />
        {tufts ? <LawnTufts /> : null}
    </div>
)

const Lawn = () => <LawnScene />
const LawnTuftsWallpaper = () => <LawnScene tufts />

/** wimpos Keyboard garden field — cream, not the green grass photo. */
const KeyboardGardenField = () => (
    <>
        <div
            className={`absolute inset-0 bg-gradient-to-b from-[#FDEECD] to-[#FFFEF4] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div className={`absolute inset-0 bg-[#1e1f23] opacity-0 dark:opacity-100 ${FADE_OPACITY}`} />
    </>
)

/** Transparent speckle tile from wimpos Korean desktop (100px light / 200px dark). */
const KeyboardGardenDots = () => (
    <>
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{
                backgroundImage: "url('/images/wallpapers/keyboard-garden-dots-light.png')",
                backgroundSize: '100px 100px',
                backgroundRepeat: 'repeat',
            }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{
                backgroundImage: "url('/images/wallpapers/keyboard-garden-dots-dark.png')",
                backgroundSize: '200px 200px',
                backgroundRepeat: 'repeat',
            }}
        />
    </>
)

const KeyboardGarden = () => (
    <div className="absolute inset-0 isolate">
        <KeyboardGardenField />
        <KeyboardGardenDots />
    </div>
)

const MINT_FELT_LIGHT = draftGrainPlate(61, ['#D4D8CA', '#CCD2C2', '#C4CCB8', '#DCE0D2', '#C8D0C0', '#D0D6C6'])
const MINT_FELT_DARK = draftGrainPlate(67, ['#141E18', '#18241C', '#121A14', '#1C2820', '#161E1A', '#101814'])

const MINT_PATCHES =
    'radial-gradient(ellipse 38% 28% at 62% 72%, rgba(74,84,64,0.16) 0%, rgba(74,84,64,0) 70%),' +
    'radial-gradient(ellipse 24% 20% at 28% 58%, rgba(74,84,64,0.12) 0%, rgba(74,84,64,0) 68%),' +
    'radial-gradient(ellipse 20% 16% at 78% 38%, rgba(74,84,64,0.1) 0%, rgba(74,84,64,0) 70%)'

type MintBlade = { left: string; top: string; size: number; rotate: number }

const MINT_BLADES: MintBlade[] = (() => {
    const rand = mulberry32(47)
    const blades: MintBlade[] = []
    for (let i = 0; i < 42; i++) {
        const nx = rand()
        const ny = 0.22 + rand() * 0.74
        const cluster = Math.exp(-((nx - 0.62) ** 2) / 0.18 - ((ny - 0.7) ** 2) / 0.22)
        if (rand() > 0.28 + cluster * 0.7) continue
        blades.push({
            left: `${(nx * 94 + 2).toFixed(2)}%`,
            top: `${(ny * 100).toFixed(2)}%`,
            size: 10 + Math.floor(rand() * 16) + Math.floor(cluster * 8),
            rotate: -22 + rand() * 44,
        })
    }
    return blades
})()

const MintBlade = ({ size, rotate }: { size: number; rotate: number }) => (
    <svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 12 14"
        className="block"
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-hidden
    >
        <path
            d="M6 12.4 L4.2 3.1 M6 12.4 L6.15 1.4 M6 12.4 L7.9 3.2 M6 12.4 L2.8 6.2 M6 12.4 L9.2 5.9"
            fill="none"
            stroke="#4A5440"
            className="dark:stroke-[#A8B89A]"
            strokeWidth="1"
            strokeLinecap="round"
        />
    </svg>
)

/**
 * Inspired by wimpos Keyboard garden grass — pale felt lawn + sparse tufts.
 * Own CSS layers, not the photo.
 */
const KeyboardMint = () => (
    <div className="absolute inset-0 isolate">
        <div
            className={`absolute inset-0 bg-[linear-gradient(200deg,#D8DCCE_0%,#C9D0BE_48%,#BDC6B0_100%)] opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 bg-[linear-gradient(200deg,#141E18_0%,#18241C_52%,#121A14_100%)] opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
        />
        <div
            className={`absolute inset-0 opacity-100 dark:opacity-0 ${FADE_OPACITY}`}
            style={{ backgroundImage: MINT_FELT_LIGHT, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div
            className={`absolute inset-0 opacity-0 dark:opacity-100 ${FADE_OPACITY}`}
            style={{ backgroundImage: MINT_FELT_DARK, backgroundSize: '64px 64px', backgroundRepeat: 'repeat' }}
        />
        <div className={`absolute inset-0 opacity-100 dark:opacity-40 ${FADE_OPACITY}`} style={{ backgroundImage: MINT_PATCHES }} />
        <div className="absolute inset-0">
            {MINT_BLADES.map((blade, i) => (
                <div
                    key={i}
                    className="absolute"
                    style={{ left: blade.left, top: blade.top, width: blade.size, height: blade.size * 1.2 }}
                >
                    <MintBlade size={blade.size} rotate={blade.rotate} />
                </div>
            ))}
        </div>
    </div>
)

const SCENES: { key: string; Scene: React.FC; visible: string }[] = [
    { key: 'cobalt', Scene: Cobalt, visible: 'wallpaper-cobalt:block' },
    { key: 'hogzilla', Scene: Hogzilla, visible: 'wallpaper-hogzilla:block' },
    { key: 'keyboard-garden', Scene: KeyboardGarden, visible: 'wallpaper-keyboard-garden:block' },
    { key: 'keyboard-mint', Scene: KeyboardMint, visible: 'wallpaper-keyboard-mint:block' },
    { key: 'draft-world', Scene: DraftWorldWallpaper, visible: 'wallpaper-draft-world:block' },
    { key: 'rain-embers', Scene: RainEmbersWallpaper, visible: 'wallpaper-rain-embers:block' },
    { key: 'plaza-bang', Scene: PlazaBangWallpaper, visible: 'wallpaper-plaza-bang:block' },
]

export interface WallpaperGlow {
    light: string
    dark: string
}

export const WALLPAPER_GLOW: Record<string, WallpaperGlow> = {
    cobalt: { light: '#4A9EE6', dark: '#2F7ED4' },
    hogzilla: { light: '#FF9528', dark: '#9370F0' },
    'keyboard-garden': { light: '#53FFCB', dark: '#49BAC5' },
    'keyboard-mint': { light: '#8FA882', dark: '#6B8B70' },
    'draft-world': { light: '#C4A574', dark: '#9370F0' },
    'rain-embers': { light: '#7EB4D4', dark: '#D08A3A' },
    'plaza-bang': { light: '#CFC6B6', dark: '#9370F0' },
}

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW['draft-world']

export const getWallpaperGlow = (wallpaper: string): WallpaperGlow =>
    WALLPAPER_GLOW[wallpaper] ?? DEFAULT_WALLPAPER_GLOW

export { WALLPAPER_THEME_COLORS, getWallpaperThemeColor } from '../../lib/wallpaperChrome'

export default function Wallpapers(_props?: {
    wallpaper?: string
    reduceMotion?: boolean
}): JSX.Element {
    return (
        <div className="fixed inset-0 -z-10 select-none overflow-hidden pointer-events-none">
            {SCENES.map(({ key, Scene, visible }) => (
                <div key={key} className={`hidden ${visible} absolute inset-0`}>
                    <Scene />
                </div>
            ))}
        </div>
    )
}
