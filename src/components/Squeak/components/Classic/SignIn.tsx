import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import { CallToAction } from 'components/CallToAction'
import { useApp } from '../../../../context/App'
import { useWindow } from '../../../../context/Window'
import { User, useUser } from '../../../../hooks/useUser'
import Input from '../../../../components/OSForm/input'

import SecurityHog from '../../../../images/security-hog.png'
import { IconSpinner } from '@posthog/icons'
import { useToast } from '../../../../context/Toast'
import Link from 'components/Link'
import PostHogButton from './PostHogButton'
import { isPostHogEmail } from 'lib/employee'

const errorMessages: Record<string, string> = {
    'Invalid identifier or password': 'Invalid email or password',
}

interface SignInFormProps {
    onSuccess?: (user: User) => void
}

const SignInForm: React.FC<SignInFormProps> = ({ onSuccess }) => {
    const { addToast } = useToast()
    const { login } = useUser()
    const { setWindowTitle, closeWindow, openRegister, openForgotPassword } = useApp()
    const { appWindow } = useWindow()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const { handleSubmit, submitForm, touched, errors, getFieldProps, isSubmitting } = useFormik({
        initialValues: {
            email: '',
            password: '',
        },
        validate: (values) => {
            const errors: any = {}
            if (!values.email) {
                errors.email = 'Required'
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
                errors.email = 'Invalid email address'
            } else if (isPostHogEmail(values.email)) {
                errors.email = 'PostHog employees sign in with PostHog above.'
            }
            // The password field is hidden for @posthog.com (OAuth-only) emails, so
            // don't require it — otherwise the form is permanently invalid for them.
            if (!isPostHogEmail(values.email) && !values.password) {
                errors.password = 'Required'
            }
            return errors
        },
        onSubmit: async (values) => {
            setErrorMessage('')
            const user = await login({
                email: values.email,
                password: values.password,
            })
            if (!user) {
                setErrorMessage('There was an error signing in. Please try again.')
            } else if ('error' in user) {
                setErrorMessage(errorMessages[user?.error] || user?.error)
            } else {
                addToast({
                    title: 'Successfully signed in to PostHog.com',
                    description: (
                        <Link to="https://app.posthog.com" className="text-red dark:text-yellow font-semibold">
                            Looking for the app?
                        </Link>
                    ),
                })
                onSuccess?.(user)
                if (appWindow) {
                    closeWindow(appWindow)
                }
            }
        },
    })

    useEffect(() => {
        if (appWindow) {
            setWindowTitle(appWindow, 'Log on to PostHog.com')
        }
    }, [])

    return (
        <div className="size-full">
            null
        </div>
    )
}

export default SignInForm
