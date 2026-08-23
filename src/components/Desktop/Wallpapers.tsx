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

const Cobalt = () => (
    <div className="absolute inset-0 isolate">
        <CobaltField />
    </div>
)

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

const DraftWorldWallpaper = () => <DraftScene grid world />

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

const RainEmbersWallpaper = () => <RainScene fall embers />

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

const PlazaBangWallpaper = () => <PlazaScene carpet bang />

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

export const DEFAULT_WALLPAPER_GLOW: WallpaperGlow = WALLPAPER_GLOW['keyboard-mint']

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
