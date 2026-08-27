import { rgbTripletToHex } from './host'
import { FALLBACK_CHROME, WIM_NAVY_SOFT, type ChromeSnapshot } from './tokens'

export function mermaidThemeVariables(snap: ChromeSnapshot = FALLBACK_CHROME): Record<string, string> {
    const paper = rgbTripletToHex(snap.bg)
    const ink = rgbTripletToHex(snap.textPrimary)
    const border = rgbTripletToHex(snap.border)
    const muted = rgbTripletToHex(snap.textMuted)
    const fill = snap.dark ? rgbTripletToHex(snap.accent) : WIM_NAVY_SOFT
    return {
        background: paper,
        primaryColor: fill,
        primaryTextColor: ink,
        primaryBorderColor: snap.navy,
        secondaryColor: rgbTripletToHex(snap.accent),
        tertiaryColor: paper,
        lineColor: rgbTripletToHex(snap.textSecondary),
        textColor: ink,
        mainBkg: paper,
        nodeBorder: snap.navy,
        clusterBkg: rgbTripletToHex(snap.inputBg),
        clusterBorder: border,
        titleColor: ink,
        edgeLabelBackground: paper,
        actorBkg: paper,
        actorBorder: snap.navy,
        actorTextColor: ink,
        signalColor: rgbTripletToHex(snap.textSecondary),
        labelBoxBkgColor: paper,
        labelBoxBorderColor: border,
        labelTextColor: ink,
        noteBkgColor: rgbTripletToHex(snap.accent),
        noteTextColor: ink,
        tertiaryTextColor: muted,
    }
}
