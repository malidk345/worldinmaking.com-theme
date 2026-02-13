import React, { useState } from 'react'
import OSButton from 'components/OSButton'

interface ContactFormProps {
    className?: string
}

export default function ContactForm({ className = '' }: ContactFormProps): JSX.Element {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // TODO: Implement form submission
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 3000)
    }

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
            {submitted ? (
                <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded">
                    Thanks for reaching out! We'll get back to you soon.
                </div>
            ) : (
                <>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-input rounded bg-white dark:bg-dark text-primary dark:text-primary-dark"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-1">
                            Message
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-3 py-2 border border-input rounded bg-white dark:bg-dark text-primary dark:text-primary-dark"
                            placeholder="How can we help you?"
                        />
                    </div>
                    <OSButton variant="primary" type="submit" size="sm">
                        Send message
                    </OSButton>
                </>
            )}
        </form>
    )
}
