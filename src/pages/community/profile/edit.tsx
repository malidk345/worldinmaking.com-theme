import { useRouter } from 'next/router'
import React, { useState, useEffect, useRef, ChangeEventHandler } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useUser } from 'hooks/useUser'
import usePostHog from 'hooks/usePostHog'
import { Avatar as DefaultAvatar } from 'components/Community/Sidebar'
import Layout from 'components/Layout'
import { communityMenu } from '../../../navs'
import Link from 'components/Link'
import { CallToAction } from 'components/CallToAction'
import { useToast } from '../../../context/Toast'
import SEO from 'components/seo'
import { flattenStrapiResponse } from '../../../utils'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { OSInput, OSTextarea } from 'components/OSForm'

function Avatar({ values, setFieldValue, error }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [imageURL, setImageURL] = useState(values?.avatar?.url)

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        const file = e.target.files[0]
        setFieldValue('avatar', file)
        const reader = new FileReader()
        reader.onloadend = () => {
            reader?.result && setImageURL(reader.result)
        }

        reader.readAsDataURL(file)
    }

    useEffect(() => {
        if (!values.avatar && inputRef?.current) {
            inputRef.current.value = null
        }

        setImageURL(values.avatar?.url)
    }, [values.avatar])

    return (
        <div
            className={`relative w-full aspect-square rounded-full flex justify-center items-center border-[1.5px] border-primary text-black/50 dark:text-white/50 overflow-hidden group ${error ? '' : '-mb-2'}`}
        >
            {imageURL ? (
                <img className="w-full absolute inset-0 object-cover" src={imageURL} />
            ) : (
                <DefaultAvatar className="size-full absolute bottom-0" />
            )}
            <div
                className={`grid ${
                    imageURL ? 'grid-cols-2' : 'grid-cols-1'
                } items-center w-full h-full z-10 bg-white/90 dark:bg-black/80 divide divide-x divide-dashed divide-gray-accent-light opacity-0 group-hover:opacity-100 transition-opacity`}
            >
                {imageURL && (
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            setFieldValue('avatar', null)
                        }}
                        className="w-full h-full flex items-center justify-center text-4xl group"
                    >
                        &#215;
                    </button>
                )}
                <div className="relative w-full h-full flex items-center justify-center group">
                    <span className="text-3xl">&#8593;</span>
                    <input
                        ref={inputRef}
                        onChange={handleChange}
                        accept=".jpg, .png, .gif, .jpeg"
                        className="opacity-0 absolute w-full h-full top-0 left-0 cursor-pointer"
                        name="avatar"
                        type="file"
                    />
                </div>
            </div>
        </div>
    )
}

const formSections = [
    {
        title: 'Who are you?',
        fields: {
            avatar: {
                label: 'Avatar',
                component: Avatar,
                hideLabel: true,
                className: 'flex-grow flex items-end',
            },
            firstName: {
                type: 'fname',
                label: 'First name',
                className: 'w-[calc(50%-40px)] grid items-end',
            },
            lastName: {
                type: 'lname',
                label: 'Last name',
                className: 'w-[calc(50%-40px)] grid items-end',
            },
            location: {
                label: 'Location',
                className: 'w-full sm:w-1/2',
            },
            pronouns: {
                className: 'w-full sm:w-1/2',
                component: ({ values, setFieldValue }) => {
                    const [enabled, setEnabled] = useState(!!values.pronouns)
                    return enabled ? (
                        <OSInput
                            name="pronouns"
                            placeholder="Pronouns"
                            type="text"
                            label="Pronouns"
                            onChange={(e) => setFieldValue('pronouns', e.target.value)}
                            value={values['pronouns']}
                            direction="column"
                            size="md"
                        />
                    ) : (
                        <button
                            className="text-red dark:text-yellow font-bold text-sm"
                            onClick={() => setEnabled(true)}
                        >
                            Add pronouns
                        </button>
                    )
                },
            },
            username: {
                type: 'text',
                label: 'Username',
                className: 'w-full',
            },
            birthDate: {
                className: 'w-full sm:w-1/2',
                component: ({ values, setFieldValue, error }) => (
                    <OSInput
                        type="date"
                        name="birthDate"
                        label="Date of birth"
                        value={values.birthDate || ''}
                        onChange={(e) => setFieldValue('birthDate', e.target.value || '')}
                        direction="column"
                        size="md"
                        touched={!!error}
                        error={error}
                    />
                ),
            },
        },
    },
    {
        title: 'About you',
        fields: {
            biography: {
                component: ({ values, setFieldValue, error }) => (
                    <OSTextarea
                        value={values.biography}
                        onChange={(e) => setFieldValue('biography', e.target.value)}
                        rows={6}
                        name="biography"
                        label="Bio"
                        placeholder="Write something interesting but don't try to use us for our SEO, we're on to you..."
                        description="Supports Markdown"
                        direction="column"
                        size="md"
                        touched={!!error}
                        error={error}
                    />
                ),
                className: 'w-full',
            },
        },
    },
    {
        title: 'Links',
        fields: {
            website: {
                label: 'Website',
                placeholder: 'https://',
                type: 'url',
            },
            github: {
                label: 'GitHub',
                placeholder: 'https://github.com',
                type: 'url',
            },
            linkedin: {
                label: 'LinkedIn',
                placeholder: 'https://linkedin.com',
                type: 'url',
            },
            twitter: {
                label: 'X',
                placeholder: 'https://x.com',
                type: 'url',
            },
            contactEmail: {
                label: 'Email',
                placeholder: 'you@example.com',
                type: 'email',
            },
        },
    },
]

const ValidationSchema = Yup.object().shape({
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().nullable(),
    username: Yup.string()
        .required('Required')
        .matches(/^[A-Za-z0-9_-]{2,32}$/, '2–32 letters, numbers, _ or -'),
    birthDate: Yup.string().nullable(),
    website: Yup.string().url('Invalid URL').nullable(),
    github: Yup.string().url('Invalid URL').nullable(),
    linkedin: Yup.string().url('Invalid URL').nullable(),
    twitter: Yup.string().url('Invalid URL').nullable(),
    contactEmail: Yup.string().transform((v) => (v === '' ? null : v)).email('Invalid email').nullable(),
    biography: Yup.string().max(3000, 'Please limit your bio to 3,000 characters, you wordsmith!').nullable(),
    avatar: Yup.mixed()
        .nullable()
        .test('fileType', 'Images only', (value) => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
            if (!value) return true
            if (typeof value === 'string') return true
            return value && (allowedTypes.includes(value.type) || allowedTypes.includes(value.mime))
        }),
})

function EditProfile({ profile, mutate }) {
    const { addToast } = useToast()
    const { fetchUser, user } = useUser()
    const posthog = usePostHog()

    const onSubmit = async ({ avatar, ...values }, { setSubmitting }) => {
        const id = String(profile?.id || user?.id || '')
        setSubmitting(true)

        try {
            posthog?.capture('wim profile update start', { profileId: id, ...values })

            const { resolveProfileFileField } = await import('lib/profile-media')
            const avatarUrl = await resolveProfileFileField(id, avatar, 'avatar')

            const { updateWimProfile } = await import('lib/wim-auth')
            const patch: Record<string, string | null> = {
                username: String(values.username || '').trim() || null,
                first_name: String(values.firstName || '').trim() || null,
                last_name: String(values.lastName || '').trim() || null,
                bio: values.biography ?? null,
                location: values.location ?? null,
                website: values.website ?? null,
                github: values.github ?? null,
                linkedin: values.linkedin ?? null,
                twitter: values.twitter ?? null,
                contact_email: values.contactEmail?.trim() || null,
                pronouns: values.pronouns ?? null,
                birth_date: values.birthDate ? String(values.birthDate).slice(0, 10) : null,
            }
            if (avatarUrl !== undefined) {
                patch.avatar_url = avatarUrl || null
            }

            const { error } = await updateWimProfile(id, patch as any)
            if (error) throw new Error(error)

            await fetchUser()
            await mutate?.()

            posthog?.capture('wim profile update', { profileId: id })
            addToast({ description: 'Profile updated!' })
        } catch (error) {
            posthog?.capture('wim error', {
                source: 'EditProfile.handleSubmit',
                error: JSON.stringify(error),
                profileId: id,
            })
            addToast({ description: error instanceof Error ? error.message : 'Profile update failed' })
            throw error
        } finally {
            setSubmitting(false)
        }
    }

    const { values, setFieldValue, handleChange, submitForm, handleSubmit, isSubmitting, errors } = useFormik({
        validationSchema: ValidationSchema,
        onSubmit,
        initialValues: formSections.reduce((acc, section) => {
            Object.keys(section.fields).forEach((key) => {
                acc[key] = profile[key]
            })
            return acc
        }, {}),
    })

    return (
        <ScrollArea>
            <div data-scheme="primary" className="bg-primary min-h-full">
                <SEO noindex title="Edit profile - PostHog" />
                <section className="max-w-2xl mx-auto py-12 px-4 bg-primary/90 backdrop-blur-sm rounded-lg">
                    <form className="m-0 space-y-6" onSubmit={handleSubmit}>
                        {formSections.map((section, index) => {
                            if (section.modOnly && user?.role?.type !== 'moderator') return null
                            return (
                                <div key={index}>
                                    <h2>{section.title}</h2>
                                    {section.subtitle && <p className="opacity-70 mb-4">{section.subtitle}</p>}
                                    <div className="flex flex-wrap items-center">
                                        {Object.keys(section.fields).map((key) => {
                                            const field = section.fields[key]
                                            const error = errors[key]
                                            return (
                                                <div key={key} className={`${field.className ?? 'w-1/2'} p-2 relative`}>
                                                    {(field.component &&
                                                        field.component({ values, setFieldValue, error })) || (
                                                        <OSInput
                                                            type={field.type}
                                                            name={key}
                                                            placeholder={field.placeholder}
                                                            label={field.label}
                                                            value={values[key]}
                                                            onChange={handleChange}
                                                            touched={!!error}
                                                            error={error}
                                                            direction="column"
                                                            size="md"
                                                        />
                                                    )}
                                                    {error && (
                                                        <p className="absolute text-red bottom-1.5 text-xs m-0 translate-y-full left-2 font-bold">
                                                            {error}
                                                        </p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                        <CallToAction onClick={submitForm} className="mt-6" disabled={isSubmitting}>
                            Update
                        </CallToAction>
                    </form>
                </section>
            </div>
        </ScrollArea>
    )
}

export default function EditProfilePage({ location }) {
    const router = useRouter()
    const [ready, setReady] = useState(false)
    const [profile, setProfile] = useState<any>()
    const { fetchUser } = useUser()

    const getProfile = async () => {
        const user = await fetchUser()
        if (user) {
            // Supabase session profile (moderator remote edit not yet on WIM)
            setProfile(user.profile)
            setReady(true)
        } else {
            router.push('/community')
        }
    }

    useEffect(() => {
        getProfile()
    }, [])

    return ready ? (
        <EditProfile profile={profile} mutate={getProfile} />
    ) : (
        <div data-scheme="secondary" className="h-full bg-primary" />
    )
}
