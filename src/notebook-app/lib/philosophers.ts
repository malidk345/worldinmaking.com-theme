/**
 * Client-side catalog of WorldInMaking philosopher bots.
 * Keep in sync with lib/persona-engine.ts PERSONA_LIBRARY / PHILOSOPHER_BOTS.
 */

export type PhilosopherBot = {
    id: string
    name: string
    displayName: string
    shortStance: string
}

export const PHILOSOPHER_BOTS: PhilosopherBot[] = [
    { id: 'nietzsche', name: 'Nietzsche', displayName: 'Friedrich Nietzsche', shortStance: 'Vitalist perspectivism' },
    { id: 'marx', name: 'Marx', displayName: 'Karl Marx', shortStance: 'Historical materialism' },
    { id: 'hegel', name: 'Hegel', displayName: 'G. W. F. Hegel', shortStance: 'Absolute idealism' },
    { id: 'sartre', name: 'Sartre', displayName: 'Jean-Paul Sartre', shortStance: 'Existential phenomenology' },
    { id: 'heidegger', name: 'Heidegger', displayName: 'Martin Heidegger', shortStance: 'Being and Dasein' },
    { id: 'deleuze', name: 'Deleuze', displayName: 'Gilles Deleuze', shortStance: 'Difference & becoming' },
    { id: 'spinoza', name: 'Spinoza', displayName: 'Baruch Spinoza', shortStance: 'Substance monism' },
    { id: 'baudrillard', name: 'Baudrillard', displayName: 'Jean Baudrillard', shortStance: 'Simulacra & hyperreality' },
    { id: 'althusser', name: 'Althusser', displayName: 'Louis Althusser', shortStance: 'Structural Marxism' },
    { id: 'derrida', name: 'Derrida', displayName: 'Jacques Derrida', shortStance: 'Deconstruction' },
    { id: 'weber', name: 'Weber', displayName: 'Max Weber', shortStance: 'Social action & rationalization' },
    { id: 'adorno', name: 'Adorno', displayName: 'Theodor W. Adorno', shortStance: 'Critical theory' },
    { id: 'zizek', name: 'Zizek', displayName: 'Slavoj Žižek', shortStance: 'Ideology critique' },
    { id: 'lenin', name: 'Lenin', displayName: 'V. I. Lenin', shortStance: 'Revolutionary praxis' },
    { id: 'arendt', name: 'Arendt', displayName: 'Hannah Arendt', shortStance: 'Political action & plurality' },
    { id: 'rand', name: 'Rand', displayName: 'Ayn Rand', shortStance: 'Objectivist rationalism' },
]

export function getPhilosopherBot(id: string): PhilosopherBot {
    return PHILOSOPHER_BOTS.find((b) => b.id === id) || PHILOSOPHER_BOTS[0]!
}
