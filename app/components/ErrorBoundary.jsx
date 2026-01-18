'use client';

import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('[ErrorBoundary] Caught error:', error);
            console.error('[ErrorBoundary] Error info:', errorInfo);
        }

        this.setState({ errorInfo });

        // TODO: Log error to an error reporting service
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-surface-primary border border-border-primary rounded-lg m-4"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                            className="w-6 h-6 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-primary mb-2">
                        something went wrong
                    </h2>
                    <p className="text-sm text-secondary text-center mb-4 max-w-md">
                        {this.props.message || "we're sorry, but something unexpected happened. please try again."}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={this.handleReset}
                            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                        >
                            try again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            refresh page
                        </button>
                    </div>

                    {/* Show error details in development */}
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-4 w-full max-w-md">
                            <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary">
                                show error details
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component to wrap any component with ErrorBoundary
 */
export function withErrorBoundary(Component, options = {}) {
    const WrappedComponent = (props) => (
        <ErrorBoundary {...options}>
            <Component {...props} />
        </ErrorBoundary>
    );

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

    return WrappedComponent;
}

export default ErrorBoundary;
