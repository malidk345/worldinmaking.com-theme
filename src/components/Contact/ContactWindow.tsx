import React, { useState, useEffect } from 'react'
import SEO from 'components/seo'
import OSInput from 'components/OSForm/input'
import OSTextarea from 'components/OSForm/textarea'
import OSSelect from 'components/OSForm/select'
import OSButton from 'components/OSButton'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { AppIcon } from 'components/OSIcons/AppIcon'
import { useUser } from 'hooks/useUser'
import { useToast } from 'context/Toast'
import { IconSend, IconCheck, IconSpinner, IconWarning } from '@posthog/icons'

const TOPICS = [
    { value: 'General', label: 'General Inquiry' },
    { value: 'Feedback', label: 'Feedback & Suggestions' },
    { value: 'Bug Report', label: 'Bug Report' },
    { value: 'Collaboration', label: 'Collaboration / Partnership' },
    { value: 'Account & Security', label: 'Account & Security' },
]

export default function ContactWindow() {
    const { user } = useUser()
    const { addToast } = useToast()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [topic, setTopic] = useState('General')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (user) {
            if (!name && user.profile?.firstName) {
                setName([user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || user.profile.username || '')
            }
            if (!email && user.email) {
                setEmail(user.email)
            }
        }
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!name.trim()) {
            setError('Please enter your name.')
            return
        }
        if (!email.trim() || !email.includes('@') || !email.includes('.')) {
            setError('Please enter a valid email address.')
            return
        }
        if (!message.trim()) {
            setError('Please enter your message.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    topic,
                    message: message.trim(),
                }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit contact message')
            }

            setSubmitted(true)
            setMessage('')
            addToast({ description: 'Message sent successfully!' })
        } catch (err: any) {
            const msg = err.message || 'An unexpected error occurred. Please try again.'
            setError(msg)
            addToast({ description: msg, error: true })
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setSubmitted(false)
        setError(null)
        setMessage('')
    }

    return (
        <>
            <SEO title="Contact - World in Making" />
            <ScrollArea className="h-full w-full">
                <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 pb-4 border-b border-primary">
                        <div className="p-2.5 rounded-lg bg-accent/40 border border-primary shrink-0">
                            <AppIcon name="envelope" className="size-8" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
                                Get in Touch
                            </h1>
                            <p className="text-sm text-secondary mt-1">
                                Send a direct message to the team. Every submission lands instantly in our inbox.
                            </p>
                        </div>
                    </div>

                    {/* Success State */}
                    {submitted ? (
                        <div
                            data-scheme="secondary"
                            className="p-6 rounded-lg border border-green/40 bg-green/5 text-center space-y-4"
                        >
                            <div className="size-12 mx-auto rounded-full bg-green/20 text-green flex items-center justify-center">
                                <IconCheck className="size-6 text-green" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-primary">Message Sent!</h3>
                                <p className="text-sm text-secondary max-w-md mx-auto">
                                    Thank you for reaching out. We have received your message and will get back to you as soon as possible.
                                </p>
                            </div>
                            <div className="pt-2">
                                <OSButton onClick={handleReset} size="md" variant="primary">
                                    Send Another Message
                                </OSButton>
                            </div>
                        </div>
                    ) : (
                        /* Contact Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded bg-red/10 border border-red/30 text-red text-sm flex items-center gap-2">
                                    <IconWarning className="size-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <OSInput
                                    label="Name"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                    required
                                    direction="column"
                                    size="md"
                                />

                                <OSInput
                                    label="Email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e: any) => setEmail(e.target.value)}
                                    required
                                    direction="column"
                                    size="md"
                                />
                            </div>

                            <OSSelect
                                label="Topic"
                                value={topic}
                                onChange={(e: any) => setTopic(e.target.value)}
                                options={TOPICS}
                                direction="column"
                                size="md"
                            />

                            <OSTextarea
                                label="Message"
                                placeholder="Write your message, feedback, or question here..."
                                value={message}
                                onChange={(e: any) => setMessage(e.target.value)}
                                required
                                rows={6}
                                direction="column"
                                size="md"
                            />

                            <div className="flex items-center justify-end pt-2">
                                <OSButton
                                    type="submit"
                                    size="md"
                                    variant="primary"
                                    disabled={submitting}
                                    icon={submitting ? <IconSpinner className="animate-spin size-4" /> : <IconSend className="size-4" />}
                                >
                                    {submitting ? 'Sending...' : 'Send Message'}
                                </OSButton>
                            </div>
                        </form>
                    )}
                </div>
            </ScrollArea>
        </>
    )
}
