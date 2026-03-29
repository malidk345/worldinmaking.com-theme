"use client"

import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import Tooltip from 'components/RadixUI/Tooltip'

export default function Clock() {
    const [time, setTime] = useState(dayjs())

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(dayjs())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <Tooltip
            delay={100}
            trigger={
                <div className="flex flex-col items-center justify-center px-1 font-mono text-[11px] font-bold leading-tight text-primary select-none opacity-60 hover:opacity-100 transition-opacity translate-y-[1px]">
                    <div className="flex gap-0.5">
                        <span className="tabular-nums">{time.format('HH:mm')}</span>
                        {/* {time.format('ss')} */}
                    </div>
                    <div className="text-[8.5px] tracking-tighter opacity-40 -mt-0.5">
                        {time.format('YY.MM.DD')}
                    </div>
                </div>
            }
        >
            <div className="p-2 text-center lowercase space-y-1">
                <p className="text-sm font-bold m-0 p-0 text-primary">System Clock</p>
                <div className="text-[12px] opacity-70 p-0 m-0 leading-tight">
                    <p>{time.format('dddd, MMMM D, YYYY')}</p>
                    <p className="text-[10px] opacity-40 font-mono italic">UTC {time.format('Z')}</p>
                </div>
            </div>
        </Tooltip>
    )
}
