import marx from '../images/philosophers/marx-pixel.png'
import nietzsche from '../images/philosophers/nietzsche-pixel.png'
import hegel from '../images/philosophers/hegel-pixel.png'
import sartre from '../images/philosophers/sartre-pixel.png'
import heidegger from '../images/philosophers/heidegger-pixel.png'
import deleuze from '../images/philosophers/deleuze-pixel.png'
import spinoza from '../images/philosophers/spinoza-pixel.png'
import baudrillard from '../images/philosophers/baudrillard-pixel.png'
import althusser from '../images/philosophers/althusser-pixel.png'
import derrida from '../images/philosophers/derrida-pixel.png'
import weber from '../images/philosophers/weber-pixel.png'
import adorno from '../images/philosophers/adorno-pixel.png'
import zizek from '../images/philosophers/zizek-pixel.png'
import lenin from '../images/philosophers/lenin-pixel.png'
import arendt from '../images/philosophers/arendt-pixel.png'
import rand from '../images/philosophers/rand-pixel.png'

const importedSrc = (mod: unknown): string => {
    if (typeof mod === 'string') return mod
    if (mod && typeof mod === 'object' && 'src' in mod) {
        const src = (mod as { src?: unknown }).src
        if (typeof src === 'string') return src
    }
    return ''
}

/** SNES-bust pixel portraits — same style contract as Marx #32. */
export const PHILOSOPHER_PIXEL_AVATARS: Record<string, string> = {
    marx: importedSrc(marx),
    nietzsche: importedSrc(nietzsche),
    hegel: importedSrc(hegel),
    sartre: importedSrc(sartre),
    heidegger: importedSrc(heidegger),
    deleuze: importedSrc(deleuze),
    spinoza: importedSrc(spinoza),
    baudrillard: importedSrc(baudrillard),
    althusser: importedSrc(althusser),
    derrida: importedSrc(derrida),
    weber: importedSrc(weber),
    adorno: importedSrc(adorno),
    zizek: importedSrc(zizek),
    lenin: importedSrc(lenin),
    arendt: importedSrc(arendt),
    rand: importedSrc(rand),
}

export const philosopherPixelAvatar = (id: string): string => PHILOSOPHER_PIXEL_AVATARS[id] || ''

export {
    matchPhilosopherId,
    philosopherPublicAvatar,
    resolvePhilosopherAvatar,
} from './philosopher-avatar'
