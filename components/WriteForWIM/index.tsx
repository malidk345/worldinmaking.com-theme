"use client"

import React, { useState } from 'react'
import OSButton from 'components/OSButton'
import Input from 'components/OSForm/input'
import Textarea from 'components/OSForm/textarea'
import { IconCheck, IconX } from '@posthog/icons'

interface WriteForWIMProps {
    className?: string
}

export default function WriteForWIM({ className = '' }: WriteForWIMProps): JSX.Element {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        title: '',
        content: '',
        bio: '',
        twitter: '',
        linkedin: ''
    })
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
                return formData.name.trim() === '' ? 'Name is required' : ''
            case 'email':
                if (formData.email.trim() === '') return 'Email is required'
                if (!validateEmail(formData.email)) return 'Please enter a valid email'
                return ''
            case 'title':
                return formData.title.trim() === '' ? 'Title is required' : ''
            case 'content':
                if (formData.content.trim() === '') return 'Content is required'
                if (formData.content.trim().length < 100) return 'Content must be at least 100 characters'
                return ''
            default:
                return ''
        }
    }

    const isFormValid = () => {
        return (
            formData.name.trim() !== '' &&
            formData.email.trim() !== '' &&
            validateEmail(formData.email) &&
            formData.title.trim() !== '' &&
            formData.content.trim().length >= 100
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Mark all required fields as touched
        setTouched({
            name: true,
            email: true,
            title: true,
            content: true
        })

        if (!isFormValid()) {
            return
        }

        setSubmitting(true)

        // TODO: Implement actual form submission to backend
        // For now, simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))

        setSubmitted(true)
        setSubmitting(false)

        // Reset form after 4 seconds
        setTimeout(() => {
            setSubmitted(false)
            setFormData({
                name: '',
                email: '',
                title: '',
                content: '',
                bio: '',
                twitter: '',
                linkedin: ''
            })
            setTouched({})
        }, 4000)
    }

    const handleReset = () => {
        setFormData({
            name: '',
            email: '',
            title: '',
            content: '',
            bio: '',
            twitter: '',
            linkedin: ''
        })
        setTouched({})
        setSubmitted(false)
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
                    <h2 className="text-2xl font-bold text-primary-text">
                        Thank you for your submission!
                    </h2>
                    <p className="text-primary-text/70">
                        We've received your article proposal. Our editorial team will review it and get back to you within 5-7 business days.
                    </p>
                    <div className="pt-4">
                        <OSButton
                            variant="secondary"
                            size="md"
                            onClick={handleReset}
                        >
                            Submit another article
                        </OSButton>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`h-full overflow-auto ${className}`}>
            <div className="max-w-3xl mx-auto p-6 md:p-8">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-primary-text">
                            Write for World in Making
                        </h1>
                        <p className="text-primary-text/70 text-lg">
                            Share your insights, experiences, and expertise with our community. We're looking for thoughtful, well-researched articles on technology, innovation, and the future.
                        </p>
                    </div>

                    {/* Guidelines */}
                    <div className="bg-accent/30 border border-border rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-primary-text">Submission Guidelines:</h3>
                        <ul className="text-sm text-primary-text/70 space-y-1 list-disc list-inside">
                            <li>Articles should be original and not published elsewhere</li>
                            <li>Minimum 100 characters for initial submission (full article can be drafted later)</li>
                            <li>Focus on actionable insights and clear explanations</li>
                            <li>Include relevant examples and case studies where possible</li>
                            <li>Proper attribution for any referenced sources</li>
                        </ul>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Author Information */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-primary-text border-b border-border pb-2">
                                Author Information
                            </h3>
                            
                            <Input
                                label="Full Name"
                                direction="column"
                                required
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                onBlur={() => handleBlur('name')}
                                touched={touched.name}
                                error={getError('name')}
                                placeholder="John Doe"
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
                                placeholder="john@example.com"
                                description="We'll use this to contact you about your submission"
                            />

                            <Textarea
                                label="Short Bio"
                                direction="column"
                                rows={3}
                                value={formData.bio}
                                onChange={(e) => handleChange('bio', e.target.value)}
                                placeholder="Brief description about yourself (optional)"
                                description="This will be displayed with your article if published"
                            />
                        </div>

                        {/* Article Details */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-primary-text border-b border-border pb-2">
                                Article Details
                            </h3>

                            <Input
                                label="Article Title"
                                direction="column"
                                required
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                onBlur={() => handleBlur('title')}
                                touched={touched.title}
                                error={getError('title')}
                                placeholder="Your Compelling Article Title"
                            />

                            <Textarea
                                label="Content / Outline"
                                direction="column"
                                required
                                rows={12}
                                value={formData.content}
                                onChange={(e) => handleChange('content', e.target.value)}
                                onBlur={() => handleBlur('content')}
                                touched={touched.content}
                                error={getError('content')}
                                placeholder="Share your article content or a detailed outline. You can submit the full article now or provide an outline for review first. Minimum 100 characters."
                                description={`${formData.content.length} characters (minimum 100 required)`}
                            />
                        </div>

                        {/* Social Links (Optional) */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-primary-text border-b border-border pb-2">
                                Social Links <span className="text-sm font-normal text-primary-text/50">(Optional)</span>
                            </h3>

                            <Input
                                label="Twitter/X Handle"
                                direction="column"
                                value={formData.twitter}
                                onChange={(e) => handleChange('twitter', e.target.value)}
                                placeholder="@username"
                            />

                            <Input
                                label="LinkedIn Profile"
                                direction="column"
                                value={formData.linkedin}
                                onChange={(e) => handleChange('linkedin', e.target.value)}
                                placeholder="https://linkedin.com/in/username"
                            />
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-border">
                            <OSButton
                                type="submit"
                                variant="primary"
                                size="lg"
                                disabled={submitting || !isFormValid()}
                            >
                                {submitting ? 'Submitting...' : 'Submit Article'}
                            </OSButton>
                            <OSButton
                                type="button"
                                variant="secondary"
                                size="lg"
                                onClick={handleReset}
                                disabled={submitting}
                            >
                                Reset Form
                            </OSButton>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-primary-text/50 pt-2">
                            By submitting this form, you agree to our editorial guidelines and grant us the right to publish your article with proper attribution.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
