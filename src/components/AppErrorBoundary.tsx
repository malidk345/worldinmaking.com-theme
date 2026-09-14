import React from 'react'

export class AppErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null }

    static getDerivedStateFromError(error: Error) {
        return { error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('AppErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.error) {
            return (
                <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center gap-4 text-primary p-6 text-center bg-light dark:bg-dark">
                    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-primary p-8">
                        <h1 className="m-0 text-lg font-semibold">Bir şeyler bozuldu</h1>
                        <button
                            type="button"
                            className="rounded-full border border-primary px-4 py-2 hover:bg-accent transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            Sayfayı yenile
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
