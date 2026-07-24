import React, { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import { CallToAction } from 'components/CallToAction'
import { useApp } from '../../../../context/App'
import { useWindow } from '../../../../context/Window'
import { useUser } from '../../../../hooks/useUser'
import SecurityHog from '../../../../images/security-hog.png'
import { IconSpinner } from '@posthog/icons'
import PostHogButton from './PostHogButton'
import { isPostHogEmail } from 'lib/employee'

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
        <div>
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
            {touched && error && <p className="text-red text-xs m-0 mt-1 ml-[98px]">{error}</p>}
        </div>
    )
}

const errorMessages: Record<string, string> = {
    'Email or Username are already taken': 'An account with this email already exists',
}

const RegisterForm: React.FC = () => {
    const { signUp } = useUser()
    const { setWindowTitle, closeWindow, openSignIn } = useApp()
    const { appWindow } = useWindow()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const { handleSubmit, submitForm, touched, errors, getFieldProps, isSubmitting } = useFormik({
        initialValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
        },
        validate: (values) => {
            const errors: any = {}
            if (!values.firstName) {
                errors.firstName = 'Required'
            }
            if (!values.lastName) {
                errors.lastName = 'Required'
            }
            if (!values.email) {
                errors.email = 'Required'
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
                errors.email = 'Invalid email address'
            } else if (isPostHogEmail(values.email)) {
                errors.email = 'Your employee account is created automatically. Sign in with PostHog instead.'
            }
            if (!values.password) {
                errors.password = 'Required'
            } else if (values.password.length < 6) {
                errors.password = 'Password must be at least 6 characters'
            }
            return errors
        },
        onSubmit: async (values) => {
            setErrorMessage('')
            const user = await signUp({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                password: values.password,
            })

            if (!user) {
                setErrorMessage('There was an error creating your account. Please try again.')
            } else if ('error' in user) {
                setErrorMessage(errorMessages[user?.error] || user?.error)
            } else {
                if (appWindow) {
                    closeWindow(appWindow)
                }
            }
        },
    })

    useEffect(() => {
        if (appWindow) {
            setWindowTitle(appWindow, 'Register for PostHog.com')
        }
    }, [])

    return (
        <div className="size-full">
            null
        </div>
    )
}

export default RegisterForm
