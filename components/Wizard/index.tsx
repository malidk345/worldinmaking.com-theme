import React from 'react'

interface WizardProps {
    children: React.ReactNode
    currentStep?: number
    totalSteps?: number
}

export default function Wizard({ children, currentStep = 1, totalSteps = 3 }: WizardProps): JSX.Element {
    return (
        <div className="wizard">
            <div className="mb-6">
                <div className="flex justify-between items-center text-sm text-muted mb-2">
                    <span>step {currentStep} of {totalSteps}</span>
                </div>
                <div className="flex gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <div
                            key={index}
                            className={`h-1 flex-1 rounded ${
                                index < currentStep
                                    ? 'bg-red dark:bg-yellow'
                                    : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                        />
                    ))}
                </div>
            </div>
            {children}
        </div>
    )
}
