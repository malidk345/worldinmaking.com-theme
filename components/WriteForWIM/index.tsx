"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import Input from 'components/OSForm/input'
import Textarea from 'components/OSForm/textarea'
import { IconCheck, IconX } from '@posthog/icons'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import { sanitizePlainText } from '../../utils/security'
import logger from '../../utils/logger'

interface WriteForWIMProps {
    className?: string
}

const MIN_MESSAGE_LENGTH = 60

const INITIAL_FORM = {
    name: '',
    email: '',
    message: ''
}

export default function WriteForWIM({ className = '' }: WriteForWIMProps) {
    const { addToast } = useToast()
    const [formData, setFormData] = useState(INITIAL_FORM)
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const getError = (field: string) => {
        if (!touched[field]) return ''

        switch (field) {
            case 'name':
                if (formData.name.trim() === '') return 'Name is required'
                if (formData.name.trim().length < 2) return 'Name is too short'
                return ''
            case 'email':
                if (formData.email.trim() === '') return 'Email is required'
                if (!validateEmail(formData.email)) return 'Please enter a valid email'
                return ''
            case 'message':
                if (formData.message.trim() === '') return 'Message is required'
                if (formData.message.trim().length < MIN_MESSAGE_LENGTH) return `Message must be at least ${MIN_MESSAGE_LENGTH} characters`
                return ''
            default:
                return ''
        }
    }

    const isFormValid = () => {
        return (
            formData.name.trim().length >= 2 &&
            formData.email.trim() !== '' &&
            validateEmail(formData.email) &&
            formData.message.trim().length >= MIN_MESSAGE_LENGTH
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Mark all required fields as touched
        setTouched({
            name: true,
            email: true,
            message: true
        })

        if (!isFormValid()) {
            return
        }

        setSubmitting(true)

        const payload = {
            name: sanitizePlainText(formData.name).slice(0, 120),
            email: sanitizePlainText(formData.email).toLowerCase().slice(0, 200),
            message: sanitizePlainText(formData.message).slice(0, 4000),
            source: 'write_for_wim',
            status: 'new'
        }

        const { error } = await supabase
            .from('writer_applications')
            .insert(payload)

        if (error) {
            logger.error('[WriteForWIM] submit failed:', error)

            if (error.code === '42P01') {
                addToast('writer_applications table is missing. run the Supabase migration first.', 'error')
            } else if (error.code === '42501') {
                addToast('database policy blocked this request. check RLS policies for writer_applications.', 'error')
            } else {
                addToast(error.message || 'your message could not be sent. please try again.', 'error')
            }

            setSubmitting(false)
            return
        }

        addToast('your writer application has been sent', 'success')
        setSubmitted(true)
        setSubmitting(false)
    }

    const handleReset = () => {
        setFormData(INITIAL_FORM)
        setTouched({})
    }

    const handleSubmitAnother = () => {
        setSubmitted(false)
        setFormData(INITIAL_FORM)
        setTouched({})
    }

    if (submitted) {
        return (
            <div className={`flex flex-col items-center justify-center h-full p-8 ${className}`}>
                <div className="max-w-md text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-green-500/10 dark:bg-green-400/10 p-4">
                            <IconCheck className="size-12 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-primary">
                        Message received
                    </h2>
                    <p className="text-primary/70">
                        Thanks for reaching out to write for WIM. The editorial team will contact you by email.
                    </p>
                    <div className="pt-4">
                        <OSButton
                            variant="secondary"
                            size="md"
                            onClick={handleSubmitAnother}
                        >
                            Send another message
                        </OSButton>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`h-full overflow-auto ${className}`}>
            <div className="max-w-2xl mx-auto p-6 md:p-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-primary">Write for WIM</h1>
                        <p className="text-primary/70 text-base">
                            If you want to be a writer on World in Making, send a short message and we&apos;ll reach out.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-accent/20 p-4 md:p-5">
                        <Input
                            label="Full Name"
                            direction="column"
                            required
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            onBlur={() => handleBlur('name')}
                            touched={touched.name}
                            error={getError('name')}
                            placeholder="Jane Doe"
                        />

                        <Input
                            label="Email"
                            type="email"
                            direction="column"
                            required
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            onBlur={() => handleBlur('email')}
                            touched={touched.email}
                            error={getError('email')}
                            placeholder="jane@example.com"
                        />

                        <Textarea
                            label="Message"
                            direction="column"
                            required
                            rows={8}
                            value={formData.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            onBlur={() => handleBlur('message')}
                            touched={touched.message}
                            error={getError('message')}
                            placeholder="Tell us who you are, what topics you want to write about, and why WIM."
                            description={`${formData.message.length} characters (minimum ${MIN_MESSAGE_LENGTH})`}
                        />

                        <div className="flex gap-3 pt-2">
                            <OSButton
                                type="submit"
                                variant="primary"
                                size="lg"
                                disabled={submitting || !isFormValid()}
                            >
                                {submitting ? 'Sending...' : 'Send message'}
                            </OSButton>
                            <OSButton
                                type="button"
                                variant="secondary"
                                size="lg"
                                onClick={handleReset}
                                disabled={submitting}
                            >
                                Clear
                            </OSButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
