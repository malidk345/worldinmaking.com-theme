import React from 'react'
import { t, resolveUiLang } from 'lib/i18n/t'

export default class WindowErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null }

    static getDerivedStateFromError(error: Error) {
        return { error }
    }

    render() {
        if (!this.state.error) return this.props.children

        return (
            <div className="flex size-full min-h-32 flex-col items-center justify-center gap-3 p-6 text-center text-primary">
                <p className="m-0 font-semibold">
                    {t(
                        'window.unavailable',
                        resolveUiLang(typeof document !== 'undefined' ? document.documentElement.lang : 'en')
                    )}
                </p>
                <button
                    type="button"
                    className="rounded border border-primary px-3 py-1 text-sm hover:bg-accent"
                    onClick={() => this.setState({ error: null })}
                >
                    Reload window
                </button>
            </div>
        )
    }
}
