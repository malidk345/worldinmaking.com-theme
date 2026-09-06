import React, { useEffect, useMemo, useState } from 'react'
import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight } from '@posthog/icons'
import OSButton from 'components/OSButton'
import {
    addCalendarMonths,
    buildMonthWeeks,
    CALENDAR_DAY_LABELS,
    dateFromKey,
    todayKey,
} from './notebookOrganize'

export function NotebookDailyCalendar({
    selected,
    markedDates,
    onSelect,
}: {
    selected: string
    markedDates?: Iterable<string>
    onSelect: (key: string) => void
}): JSX.Element {
    const selectedDate = dateFromKey(selected) || new Date()
    const [month, setMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12))

    useEffect(() => {
        const next = dateFromKey(selected)
        if (!next) return
        setMonth((current) => {
            if (current.getFullYear() === next.getFullYear() && current.getMonth() === next.getMonth()) {
                return current
            }
            return new Date(next.getFullYear(), next.getMonth(), 1, 12, 0, 0)
        })
    }, [selected])
    const today = todayKey()
    const marked = useMemo(() => new Set(markedDates ? [...markedDates] : []), [markedDates])
    const [mobileOpen, setMobileOpen] = useState(false)
    const weeks = useMemo(() => buildMonthWeeks(month), [month])
    const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

    const pickDay = (key: string) => {
        onSelect(key)
        setMobileOpen(false)
    }

    return (
        <div className="px-0.5 pt-1 pb-1" data-attr="notebook-daily-calendar">
            <div className="@2xl:hidden">
                <OSButton
                    size="sm"
                    width="full"
                    hover="background"
                    icon={<IconCalendar />}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((open) => !open)}
                >
                    <span className="flex-1 truncate text-left">Calendar</span>
                    <IconChevronDown className={`size-4 shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
                </OSButton>
            </div>
            <div className={mobileOpen ? 'block pt-1' : 'hidden @2xl:block'}>
            <table className="w-full border-collapse table-fixed">
                <thead>
                    <tr>
                        <th className="p-0 w-[14.28%]">
                            <OSButton
                                size="xs"
                                hover="background"
                                width="full"
                                aria-label="Previous month"
                                onClick={() => setMonth((current) => addCalendarMonths(current, -1))}
                                icon={<IconChevronLeft />}
                            />
                        </th>
                        <th colSpan={5} className="p-0">
                            <p className="m-0 px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted tabular-nums">
                                {monthLabel}
                            </p>
                        </th>
                        <th className="p-0 w-[14.28%]">
                            <OSButton
                                size="xs"
                                hover="background"
                                width="full"
                                aria-label="Next month"
                                onClick={() => setMonth((current) => addCalendarMonths(current, 1))}
                                icon={<IconChevronRight />}
                            />
                        </th>
                    </tr>
                    <tr>
                        {CALENDAR_DAY_LABELS.map((label) => (
                            <th
                                key={label}
                                className="py-1 text-[11px] font-bold uppercase text-muted text-center"
                            >
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, weekIndex) => (
                        <tr key={weekIndex}>
                            {week.map((date) => {
                                const key = todayKey(date)
                                const inMonth = date.getMonth() === month.getMonth()
                                const isSelected = key === selected
                                const isToday = key === today
                                const hasNote = marked.has(key)
                                return (
                                    <td key={key} className="p-px">
                                        <button
                                            type="button"
                                            data-attr="notebook-calendar-day"
                                            aria-label={key}
                                            aria-pressed={isSelected}
                                            onClick={() => pickDay(key)}
                                            className={`relative flex w-full aspect-square items-center justify-center rounded-sm text-xs tabular-nums border ${
                                                isSelected
                                                    ? 'bg-navy text-white border-navy font-semibold'
                                                    : hasNote
                                                      ? 'border-navy text-navy bg-navy/10 font-semibold'
                                                      : 'border-transparent text-primary hover:bg-accent'
                                            } ${inMonth ? '' : 'opacity-25'}`}
                                        >
                                            {date.getDate()}
                                            {isToday && !isSelected ? (
                                                <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-navy" />
                                            ) : null}
                                        </button>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    )
}
