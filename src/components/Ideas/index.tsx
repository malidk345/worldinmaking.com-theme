import React, { useState } from 'react'
import CuratedDossiers from './CuratedDossiers'
import EphemeralTransmissions from './EphemeralTransmissions'
import Marginalia from './Marginalia'
import AtmosphericStations from './AtmosphericStations'

export default function IdeasHub() {
    const [tab, setTab] = useState<'dossiers' | 'transmissions' | 'marginalia' | 'stations'>('dossiers')

    return (
        <div className="min-h-full p-6 bg-primary text-primary">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="border-b border-primary/20 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-1">WorldInMaking Blueprints & Ideas</h1>
                        <p className="text-sm opacity-70">
                            Curated dossiers, ephemeral transmissions, research marginalia, and atmospheric signals.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/5 p-1 rounded-lg border border-primary/10">
                        <button
                            onClick={() => setTab('dossiers')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                tab === 'dossiers'
                                    ? 'bg-blue text-white shadow-sm'
                                    : 'opacity-70 hover:opacity-100 hover:bg-primary/10'
                            }`}
                        >
                            Curated Dossiers
                        </button>
                        <button
                            onClick={() => setTab('transmissions')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                tab === 'transmissions'
                                    ? 'bg-blue text-white shadow-sm'
                                    : 'opacity-70 hover:opacity-100 hover:bg-primary/10'
                            }`}
                        >
                            Transmissions
                        </button>
                        <button
                            onClick={() => setTab('marginalia')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                tab === 'marginalia'
                                    ? 'bg-blue text-white shadow-sm'
                                    : 'opacity-70 hover:opacity-100 hover:bg-primary/10'
                            }`}
                        >
                            Marginalia
                        </button>
                        <button
                            onClick={() => setTab('stations')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                tab === 'stations'
                                    ? 'bg-blue text-white shadow-sm'
                                    : 'opacity-70 hover:opacity-100 hover:bg-primary/10'
                            }`}
                        >
                            Atmospheric Stations
                        </button>
                    </div>
                </div>

                <div className="mt-6">
                    {tab === 'dossiers' && <CuratedDossiers />}
                    {tab === 'transmissions' && <EphemeralTransmissions />}
                    {tab === 'marginalia' && <Marginalia />}
                    {tab === 'stations' && <AtmosphericStations />}
                </div>
            </div>
        </div>
    )
}
