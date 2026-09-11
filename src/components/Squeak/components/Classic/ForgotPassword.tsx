import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import { CallToAction } from 'components/CallToAction'
import { useApp } from '../../../../context/App'
import { useWindow } from '../../../../context/Window'
import { SQUEAK_HOST } from 'lib/strapi'

import SecurityHog from '../../../../images/security-hog.png'
import { IconSpinner } from '@posthog/icons'

const Input = ({
    label,
    type = 'text',
    touched,
    error,
    ...props
}: {
    label: string
    type?: string
    touched: boolean
    error?: string
    [key: string]: any
}) => {
    return (
        <div className="flex items-center space-x-2">
            <label htmlFor={props.name} className="w-[90px] font-semibold text-sm">
                {label}
            </label>
            <div>
                <input
                    className={`rounded-md border p-1 ${touched && error ? '!border-red' : '!border-border'}`}
                    type={type}
                    id={props.name}
                    placeholder={label}
                    {...props}
                />
            </div>
        </div>
    )
}

const ForgotPasswordForm: React.FC = () => {
    const { setWindowTitle, openSignIn } = useApp()
    const { appWindow } = useWindow()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [emailSent, setEmailSent] = useState(false)

    const { handleSubmit, submitForm, touched, errors, getFieldProps, isSubmitting } = useFormik({
        initialValues: {
            email: '',
        },
        validate: (values) => {
            const errors: any = {}
            if (!values.email) {
                errors.email = 'Required'
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
                errors.email = 'Invalid email address'
            }
            return errors
        },
        onSubmit: async (values) => {
            setErrorMessage('')

            try {
                const body = {
                    email: values.email,
                }

                const response = await fetch(`${SQUEAK_HOST}/api/auth/forgot-password`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: {
                        'content-type': 'application/json',
                    },
                })

                const { error } = await response.json()

                if (error) {
                    setErrorMessage(
                        error?.message || 'There was an error sending the password reset email. Please try again.'
                    )
                } else {
                    setEmailSent(true)
                }
            } catch (err) {
                setErrorMessage('There was an error sending the password reset email. Please try again.')
            }
        },
    })

    useEffect(() => {
        if (appWindow) {
            setWindowTitle(appWindow, 'Reset your password')
        }
    }, [])

    return (
        <div className="size-full">
            null
        </div>
    )
}

export default ForgotPasswordForm
