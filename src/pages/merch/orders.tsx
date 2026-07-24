import React, { useState } from 'react'
import { useFormik } from 'formik'
import SEO from 'components/seo'
import { CallToAction } from 'components/CallToAction'
import Input from 'components/OSForm/input'
import Link from 'components/Link'
import { IconSpinner } from '@posthog/icons'
import CloudinaryImage from 'components/CloudinaryImage'

export default function MerchOrders(): JSX.Element {
    const [errorMessage, setErrorMessage] = useState('')
    const [success, setSuccess] = useState(false)

    const { handleSubmit, submitForm, touched, errors, getFieldProps, isSubmitting } = useFormik({
        initialValues: {
            orderNumber: '',
            email: '',
        },
        validate: (values) => {
            const errors: Record<string, string> = {}
            if (!values.orderNumber.trim()) {
                errors.orderNumber = 'Required'
            }
            if (!values.email.trim()) {
                errors.email = 'Required'
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
                errors.email = 'Invalid email'
            }
            return errors
        },
        onSubmit: async (values) => {
            setErrorMessage('')

            try {
                const res = await fetch(`${process.env.GATSBY_SQUEAK_API_HOST}/api/orders/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderNumber: values.orderNumber.trim(),
                        email: values.email.trim(),
                    }),
                })

                if (res.ok) {
                    const data = await res.json()
                    if (data.statusURL) {
                        setSuccess(true)
                        window.location.href = data.statusURL
                        return
                    }
                }

                if (res.status === 404) {
                    setErrorMessage('No order found. Double check both fields.')
                    return
                }

                if (res.status === 429) {
                    setErrorMessage('Too many attempts. Try again in a minute.')
                    return
                }

                setErrorMessage('Something went wrong. Try again in a moment.')
            } catch {
                setErrorMessage('Something went wrong. Try again in a moment.')
            }
        },
    })

    return (
        <>
            <SEO
                title="Order lookup - PostHog Merch"
                description="Look up your PostHog merch order to check status, request a return, or cancel."
            />
            <div className="size-full">
                null
            </div>
        </>
    )
}
