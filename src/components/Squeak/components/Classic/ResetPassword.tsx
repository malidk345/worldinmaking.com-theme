import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import { CallToAction } from 'components/CallToAction'
import { useApp } from '../../../../context/App'
import { useWindow } from '../../../../context/Window'
import { useUser } from '../../../../hooks/useUser'
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

const ResetPasswordForm: React.FC = () => {
    const { login } = useUser()
    const { setWindowTitle, closeWindow, openSignIn } = useApp()
    const { appWindow } = useWindow()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [code, setCode] = useState<string | null>(null)

    const { handleSubmit, submitForm, touched, errors, getFieldProps, isSubmitting } = useFormik({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validate: (values) => {
            const errors: any = {}
            if (!values.password) {
                errors.password = 'Required'
            } else if (values.password.length < 6) {
                errors.password = 'Password must be at least 6 characters'
            }
            if (!values.confirmPassword) {
                errors.confirmPassword = 'Required'
            } else if (values.password !== values.confirmPassword) {
                errors.confirmPassword = 'Passwords must match'
            }
            return errors
        },
        onSubmit: async (values) => {
            if (!code) {
                setErrorMessage('Invalid password reset token')
                return
            }

            setErrorMessage('')

            try {
                const body = {
                    code,
                    password: values.password,
                    passwordConfirmation: values.password,
                }

                const response = await fetch(`${SQUEAK_HOST}/api/auth/reset-password`, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: {
                        'content-type': 'application/json',
                    },
                })

                const { error, user } = await response.json()

                if (error) {
                    setErrorMessage(error?.message || 'There was an error resetting your password. Please try again.')
                } else {
                    // Log in the user with their new password
                    await login({
                        email: user.email,
                        password: values.password,
                    })

                    if (appWindow) {
                        closeWindow(appWindow)
                    }
                    router.push('/community')
                }
            } catch (err) {
                setErrorMessage('There was an error resetting your password. Please try again.')
            }
        },
    })

    useEffect(() => {
        if (appWindow) {
            setWindowTitle(appWindow, 'Reset your password')
        }

        // Get the reset code from URL parameters
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window?.location?.search)
            const resetCode = params.get('code')
            if (resetCode) {
                setCode(resetCode)
            }
        }
    }, [])

    return (
        <div className="size-full">
            null
        </div>
    )
}

export default ResetPasswordForm
