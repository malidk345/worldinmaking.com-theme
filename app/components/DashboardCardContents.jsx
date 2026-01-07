"use client";
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Data for Charts
const dauData = [
    { date: '21 Dec', value: 1200 },
    { date: '22 Dec', value: 1350 },
    { date: '23 Dec', value: 1100 },
    { date: '24 Dec', value: 1400 },
    { date: '25 Dec', value: 1000 },
    { date: '26 Dec', value: 1500 },
    { date: '27 Dec', value: 1600 },
    { date: '28 Dec', value: 1450 },
    { date: '29 Dec', value: 1550 },
    { date: '30 Dec', value: 1700 },
    { date: '31 Dec', value: 1300 },
    { date: '1 Jan', value: 1200 },
    { date: '2 Jan', value: 1400 },
    { date: '3 Jan', value: 1600 },
    { date: '4 Jan', value: 1800 },
];

const wauData = [
    { date: 'Week 1', value: 5000 },
    { date: 'Week 2', value: 5200 },
    { date: 'Week 3', value: 4800 },
    { date: 'Week 4', value: 5500 },
    { date: 'Week 5', value: 6000 },
];

// Extracted Content Components

const DAUGraph = () => (
    <div className="InsightVizDisplay__content h-full w-full">
        <div className="InsightCard__viz h-full w-full">
            <div className="LineGraph w-full h-full grow relative overflow-hidden" data-attr="trend-line-graph">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <AreaChart data={dauData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1d4aff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1d4aff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#1d4aff" strokeWidth={2} fillOpacity={1} fill="url(#colorDau)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const WAUGraph = () => (
    <div className="InsightVizDisplay__content h-full w-full">
        <div className="InsightCard__viz h-full w-full">
            <div className="LineGraph w-full h-full grow relative overflow-hidden" data-attr="trend-line-graph">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <AreaChart data={wauData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorWau" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#388600" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#388600" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#388600" strokeWidth={2} fillOpacity={1} fill="url(#colorWau)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const RetentionTable = () => (
    <div className="InsightVizDisplay__content">
        <div className="RetentionContainer">
            <div className="RetentionContainer__table overflow-x-auto">
                <table className="RetentionTable w-full text-left border-collapse" data-attr="retention-table" style={{ '--retention-table-color': '#1d4aff' }}>
                    <tbody>
                        <tr>
                            <th className="bg whitespace-nowrap p-2 font-medium text-secondary">Cohort</th>
                            <th className="bg p-2 font-medium text-secondary">Size</th>
                            <th className="p-2 font-medium text-secondary" style={{ cursor: 'default' }}>Week 0</th>
                            <th className="p-2 font-medium text-secondary" style={{ cursor: 'default' }}>Week 1</th>
                        </tr>
                        <tr className="cursor-pointer border-t border-border">
                            <td className="pr-2 whitespace-nowrap p-2">
                                <div className="flex items-center gap-2">
                                    <svg className="LemonIcon size-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path clipRule="evenodd" d="M7.47 9.47a.75.75 0 0 1 1.06 0L12 12.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-3.646 3.647a1.25 1.25 0 0 1-1.768 0L7.47 10.53a.75.75 0 0 1 0-1.06Z" fillRule="evenodd"></path>
                                    </svg>
                                    <span className="font-semibold">Mean</span>
                                </div>
                            </td>
                            <td className="p-2"><span className="RetentionTable__TextTab">2</span></td>
                            <td className="p-2"><div className="RetentionTable__Tab rounded p-1 text-center text-xs font-semibold" style={{ backgroundColor: 'rgb(97,29,165)', color: 'rgb(255,255,255)' }}>100.0%</div></td>
                            <td className="p-2"><div className="RetentionTable__Tab rounded p-1 text-center text-xs font-semibold" style={{ backgroundColor: 'rgba(97,29,165,0.1)', color: 'var(--text-3000)' }}>0.0%</div></td>
                        </tr>
                        <tr className="border-t border-border">
                            <td className="pl-2 whitespace-nowrap p-2">Dec 28 to Jan 3</td>
                            <td className="p-2"><span className="RetentionTable__TextTab">4</span></td>
                            <td className="p-2"><div className="RetentionTable__Tab RetentionTable__Tab--clickable rounded p-1 text-center text-xs font-semibold" style={{ backgroundColor: 'rgb(31,75,255)', color: 'rgb(255,255,255)' }}>100.0%</div></td>
                            <td className="p-2"><div className="RetentionTable__Tab RetentionTable__Tab--clickable RetentionTable__Tab--period rounded p-1 text-center text-xs font-semibold" style={{ backgroundColor: 'rgba(31,75,255,0.25)', color: 'var(--text-3000)' }}>25.0%</div></td>
                        </tr>
                        <tr className="border-t border-border">
                            <td className="pl-2 whitespace-nowrap p-2">Jan 4 to Jan 10</td>
                            <td className="p-2"><span className="RetentionTable__TextTab">0</span></td>
                            <td className="p-2"><div className="RetentionTable__Tab RetentionTable__Tab--clickable RetentionTable__Tab--period rounded p-1 text-center text-xs font-semibold" style={{ backgroundColor: 'rgba(31,75,255,0.05)', color: 'var(--text-3000)' }}>0.0%</div></td>
                            <td className="p-2"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const GrowthAccountingEmptyState = () => (
    <div className="InsightVizDisplay__content h-full w-full">
        <div className="InsightCard__viz h-full w-full">
            <div className="flex flex-col flex-1 rounded p-4 w-full items-center justify-center text-center text-balance h-full" data-attr="insight-empty-state">
                <div className="flex items-center justify-center text-5xl mb-2 text-tertiary">
                    <svg className="LemonIcon size-12" fill="currentColor" viewBox="0 0 24 24" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">
                        <path clipRule="evenodd" d="M21 13.748V4.75A1.75 1.75 0 0 0 19.25 3H4.75A1.75 1.75 0 0 0 3 4.75v14.5c0 .966.784 1.75 1.75 1.75h14.5A1.75 1.75 0 0 0 21 19.25v-5.502ZM19.25 4.5H4.75a.25.25 0 0 0-.25.25V13h3.57c.36 0 .67.256.737.61a3.251 3.251 0 0 0 6.386 0 .75.75 0 0 1 .737-.61h3.57V4.75a.25.25 0 0 0-.25-.25Z" fillRule="evenodd"></path>
                    </svg>
                </div>
                <h2 className="text-xl leading-tight font-bold">There are no matching events for this query</h2>
                <p className="text-sm text-tertiary mt-2">Try changing the date range, or pick another action, event or breakdown.</p>
            </div>
        </div>
    </div>
);

// Map titles to content
export const CardContents = {
    'Daily active users (DAUs)': DAUGraph,
    'Weekly active users (WAUs)': WAUGraph,
    'Growth accounting': GrowthAccountingEmptyState,
    'Retention': RetentionTable
};

