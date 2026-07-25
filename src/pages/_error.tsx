import React from 'react'
import { NextPageContext } from 'next'

interface ErrorProps {
    statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-light dark:bg-dark text-primary p-4">
            <h1 className="text-4xl font-bold mb-4">
                {statusCode ? `${statusCode} - An Error Occurred` : 'An Error Occurred'}
            </h1>
            <p className="text-gray-500 mb-6">
                {statusCode === 404
                    ? 'The requested page could not be found.'
                    : 'An unexpected error occurred on the server.'}
            </p>
            <a
                href="/"
                className="px-4 py-2 bg-red text-white rounded font-semibold hover:bg-red/90 transition-colors"
            >
                Back to Home
            </a>
        </div>
    )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}

export default Error
