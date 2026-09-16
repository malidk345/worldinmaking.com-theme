/** SuperMemo-2 scheduler. Grades 1–4 map onto SM-2 quality 1 / 3 / 4 / 5. */

export type Sm2Grade = 1 | 2 | 3 | 4

export type Sm2Schedule = {
    easiness: number
    intervalDays: number
    repetitions: number
    dueAt: string
}

const MS_PER_DAY = 86_400_000

export function qualityFromGrade(grade: Sm2Grade): number {
    if (grade === 1) return 1
    if (grade === 2) return 3
    if (grade === 4) return 5
    return 4
}

export function defaultSm2Schedule(now = new Date()): Sm2Schedule {
    return {
        easiness: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: now.toISOString(),
    }
}

export function applySm2(schedule: Sm2Schedule, grade: Sm2Grade, now = new Date()): Sm2Schedule {
    const q = qualityFromGrade(grade)
    let easiness = Number.isFinite(schedule.easiness) ? schedule.easiness : 2.5
    let intervalDays = Number.isFinite(schedule.intervalDays) ? Math.max(0, schedule.intervalDays) : 0
    let repetitions = Number.isFinite(schedule.repetitions) ? Math.max(0, Math.floor(schedule.repetitions)) : 0

    if (q < 3) {
        repetitions = 0
        intervalDays = 1
    } else {
        if (repetitions === 0) intervalDays = 1
        else if (repetitions === 1) intervalDays = 6
        else intervalDays = Math.max(1, Math.round(intervalDays * easiness))
        repetitions += 1
    }

    easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if (easiness < 1.3) easiness = 1.3

    return {
        easiness,
        intervalDays,
        repetitions,
        dueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY).toISOString(),
    }
}

export function isDue(dueAt: string, now = new Date()): boolean {
    const due = Date.parse(dueAt)
    if (!Number.isFinite(due)) return true
    return due <= now.getTime()
}
