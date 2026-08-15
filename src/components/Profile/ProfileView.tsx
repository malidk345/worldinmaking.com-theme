import React, { ChangeEventHandler, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import SEO from 'components/seo'
import { GitHub, LinkedIn, Twitter } from 'components/Icons'
import Link from 'components/Link'
import Markdown from 'components/Squeak/components/Markdown'
import { Questions } from 'components/Squeak'
import { useUser } from 'hooks/useUser'
import { ProfileData } from 'lib/strapi'
import getAvatarURL from 'components/Squeak/util/getAvatar'
import usePostHog from 'hooks/usePostHog'
import { usePosts } from 'components/Edition/hooks/usePosts'
import { sortOptions } from 'components/Edition/Posts'
import NotFoundPage from 'components/NotFoundPage'
import ScrollArea from 'components/RadixUI/ScrollArea'
import Tooltip from 'components/RadixUI/Tooltip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import OSTabs from 'components/OSTabs'
import {
    IconArrowUpRight,
    IconUpload,
    IconX,
    IconCheck,
    IconExternal,
} from '@posthog/icons'
import { Fieldset } from 'components/OSFieldset'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import RichText from 'components/Squeak/components/RichText'
import { Select } from 'components/RadixUI/Select'
import OSInput from 'components/OSForm/input'
import { useToast } from 'context/Toast'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSButton from 'components/OSButton'
import { IconNoEntry, IconStrapi } from 'components/OSIcons'
import HourglassLoader from 'components/HourglassLoader'
import { ageFromBirthDate, isValidProfileUsername } from 'lib/profile-path'
import ProfileDocumentGrid from 'components/Profile/ProfileDocumentGrid'
import ProfileNotebookGrid, { type ProfileNotebookCard } from 'components/Profile/ProfileNotebookGrid'

import { useWindow } from 'context/Window'

dayjs.extend(relativeTime)

const WebsiteIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
            />
        </svg>
    )
}

const EmailIcon = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
        </svg>
    )
}

const stripUrlPrefix = (url: string) => {
    return url.replace(/^https?:\/\/(www\.)?/, '')
}

const Links = ({
    profile,
    isEditing,
    setFieldValue,
    formValues,
    errors,
}: {
    profile: ProfileData
    isEditing: boolean
    setFieldValue: (field: string, value: string) => void
    formValues: any
    errors: any
}) => {
    return (
        <ul className={`flex m-0 p-0 list-none ${isEditing ? 'flex-col space-y-3' : 'space-x-3'}`}>
            {isEditing ? (
                <li>
                    <Input
                        error={errors.github}
                        label="GitHub"
                        name="github"
                        value={formValues.github}
                        onChange={(e) => setFieldValue('github', e.target.value)}
                    />
                </li>
            ) : (
                profile.github && (
                    <li>
                        <Tooltip
                            delay={0}
                            trigger={
                                <Link href={profile.github} externalNoIcon>
                                    <GitHub className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity" />
                                </Link>
                            }
                        >
                            {stripUrlPrefix(profile.github)}
                        </Tooltip>
                    </li>
                )
            )}
            {isEditing ? (
                <li>
                    <Input
                        error={errors.twitter}
                        label="X"
                        name="twitter"
                        value={formValues.twitter}
                        onChange={(e) => setFieldValue('twitter', e.target.value)}
                    />
                </li>
            ) : (
                profile.twitter && (
                    <li>
                        <Tooltip
                            delay={0}
                            trigger={
                                <Link href={profile.twitter} externalNoIcon>
                                    <Twitter className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity" />
                                </Link>
                            }
                        >
                            {stripUrlPrefix(profile.twitter)}
                        </Tooltip>
                    </li>
                )
            )}
            {isEditing ? (
                <li>
                    <Input
                        error={errors.linkedin}
                        label="LinkedIn"
                        name="linkedin"
                        value={formValues.linkedin}
                        onChange={(e) => setFieldValue('linkedin', e.target.value)}
                    />
                </li>
            ) : (
                profile.linkedin && (
                    <li>
                        <Tooltip
                            delay={0}
                            trigger={
                                <Link href={profile.linkedin} externalNoIcon>
                                    <LinkedIn className="w-6 h-6 opacity-80 hover:opacity-100 transition-opacity" />
                                </Link>
                            }
                        >
                            {stripUrlPrefix(profile.linkedin)}
                        </Tooltip>
                    </li>
                )
            )}
            {isEditing ? (
                <li>
                    <Input
                        error={errors.website}
                        label="Website"
                        name="website"
                        value={formValues.website}
                        onChange={(e) => setFieldValue('website', e.target.value)}
                    />
                </li>
            ) : (
                profile.website && (
                    <li>
                        <Tooltip
                            delay={0}
                            trigger={
                                <Link href={profile.website} externalNoIcon>
                                    <WebsiteIcon />
                                </Link>
                            }
                        >
                            {stripUrlPrefix(profile.website)}
                        </Tooltip>
                    </li>
                )
            )}
            {isEditing ? (
                <li>
                    <Input
                        error={errors.contactEmail}
                        label="Email"
                        name="contactEmail"
                        type="email"
                        value={formValues.contactEmail}
                        onChange={(e) => setFieldValue('contactEmail', e.target.value)}
                    />
                </li>
            ) : (
                profile.contactEmail && (
                    <li>
                        <Tooltip
                            delay={0}
                            trigger={
                                <Link href={`mailto:${profile.contactEmail}`} externalNoIcon>
                                    <EmailIcon />
                                </Link>
                            }
                        >
                            {profile.contactEmail}
                        </Tooltip>
                    </li>
                )
            )}
        </ul>
    )
}

const Input = ({
    label,
    name,
    value,
    onChange,
    error,
    dataScheme,
    tooltip,
    type = 'text',
}: {
    label: string
    name: string
    value: any
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    error?: string
    tooltip?: string | React.ReactNode
    dataScheme?: 'primary' | 'secondary' | 'tertiary'
    type?: string
}) => {
    return (
        <OSInput
            label={label}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={label}
            direction="column"
            error={error}
            touched={!!error}
            showLabel={true}
            dataScheme="primary"
            tooltip={tooltip}
        />
    )
}

const AvatarBlock = ({
    profile,
    isEditing,
    name,
    setFieldValue,
    values,
    errors,
}: {
    profile: ProfileData
    isEditing: boolean
    name: string
    setFieldValue: (field: string, value: string) => void
    values: any
    errors: any
}) => {
    const { isModerator } = useUser()
    const inputRef = useRef<HTMLInputElement>(null)
    const [imageURL, setImageURL] = useState(values?.avatar)

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

        setImageURL(values.avatar)
    }, [values.avatar])

    return (
        <div className="relative flex flex-col items-center mb-4 bg-primary rounded-md overflow-hidden border border-primary">
            {isEditing && (
                <div className="absolute right-0 top-0 flex items-center">
                    <div className="relative p-2 border-l border-b border-primary rounded-bl-md bg-primary overflow-hidden">
                        <IconUpload className="size-5" />
                        <input
                            ref={inputRef}
                            onChange={handleChange}
                            accept=".jpg, .png, .gif, .jpeg"
                            className="opacity-0 absolute w-full h-full top-0 left-0 cursor-pointer z-10"
                            name="avatar"
                            type="file"
                        />
                    </div>
                    {imageURL && !isModerator && (
                        <button
                            onClick={() => setFieldValue('avatar', null)}
                            className="p-2 border-l border-b border-primary bg-primary"
                        >
                            <IconX className="size-5" />
                        </button>
                    )}
                </div>
            )}
            <Avatar className="w-full border-b border-primary" src={imageURL} />
            {isEditing ? (
                <div className="p-3 w-full space-y-3">
                    <Input
                        label="First name"
                        name="firstName"
                        value={values.firstName}
                        onChange={(e) => setFieldValue('firstName', e.target.value)}
                        error={errors.firstName}
                    />
                    <Input
                        label="Last name"
                        name="lastName"
                        value={values.lastName}
                        onChange={(e) => setFieldValue('lastName', e.target.value)}
                        error={errors.lastName}
                    />
                    <Input
                        label="Username"
                        name="username"
                        value={values.username}
                        onChange={(e) => setFieldValue('username', e.target.value)}
                        error={errors.username}
                    />
                </div>
            ) : (
                <div className="my-2">
                    <div className="flex items-center space-x-2">
                        <h2 className="uppercase">{name}</h2>
                    </div>
                    {profile.username && <p className="text-sm text-muted m-0">@{profile.username}</p>}
                </div>
            )}
            {!isEditing && profile.companyRole && (
                <p className="text-secondary text-sm m-0 mb-2 -mt-2">{profile.companyRole}</p>
            )}
        </div>
    )
}

const Details = ({ profile, isEditing, setFieldValue, values, errors }) => {
    const [showPronounsInput, setShowPronounsInput] = useState(!!values.pronouns)

    // Update showPronounsInput when values.pronouns changes
    useEffect(() => {
        setShowPronounsInput(!!values.pronouns)
    }, [values.pronouns])
    return (
        <div className="text-sm space-y-3">
            {!isEditing && (
                <p className="flex justify-between m-0">
                    <span className="font-semibold">Community member since</span>
                    <span suppressHydrationWarning>{dayjs(profile.createdAt).format('MMMM D, YYYY')}</span>
                </p>
            )}
            {isEditing ? (
                <Input
                    label="Date of birth"
                    name="birthDate"
                    type="date"
                    value={values.birthDate || ''}
                    onChange={(e) => setFieldValue('birthDate', e.target.value || null)}
                    error={errors.birthDate}
                />
            ) : (
                profile.birthDate && (
                    <p className="flex justify-between m-0">
                        <span className="font-semibold">Age:</span>
                        <span>
                            {ageFromBirthDate(profile.birthDate) ?? '—'}
                            <span className="text-muted">
                                {' '}
                                ({dayjs(profile.birthDate).format('MMM D, YYYY')})
                            </span>
                        </span>
                    </p>
                )
            )}
            {isEditing ? (
                <Input
                    label="Location"
                    name="location"
                    value={values.location}
                    onChange={(e) => setFieldValue('location', e.target.value)}
                    error={errors.location}
                />
            ) : (
                profile.location && (
                    <p className="flex justify-between m-0">
                        <span className="font-semibold">Location:</span>
                        <span>{profile.location}</span>
                    </p>
                )
            )}
            {isEditing ? (
                showPronounsInput ? (
                    <Input
                        label="Pronouns"
                        name="pronouns"
                        value={values.pronouns}
                        onChange={(e) => setFieldValue('pronouns', e.target.value)}
                        error={errors.pronouns}
                    />
                ) : (
                    <OSButton
                        size="sm"
                        variant="default"
                        onClick={() => {
                            setShowPronounsInput(true)
                            // Focus the input after it renders
                            setTimeout(() => {
                                const input = document.querySelector('input[name="pronouns"]') as HTMLInputElement
                                if (input) {
                                    input.focus()
                                }
                            }, 0)
                        }}
                        className="text-secondary font-medium"
                        hover="background"
                    >
                        add pronouns
                    </OSButton>
                )
            ) : (
                profile.pronouns && (
                    <p className="flex justify-between m-0">
                        <span className="font-semibold">Pronouns:</span>
                        <span>{profile.pronouns}</span>
                    </p>
                )
            )}
        </div>
    )
}


const ProfileSkeleton = () => {
    return (
        <div data-scheme="secondary" className="h-full bg-primary">
            <ScrollArea>
                <div data-scheme="primary" className="mx-auto max-w-screen-xl px-4 pb-4 @container">
                    <div className="flex flex-col @2xl:flex-row gap-6 p-6">
                        {/* Left sidebar skeleton */}
                        <div className="@2xl:max-w-xs w-full flex-shrink-0 pb-4">
                            {/* Avatar section skeleton */}
                            <div className="flex flex-col items-center mb-6 bg-primary rounded-md overflow-hidden border border-primary">
                                <div className="w-full aspect-square bg-accent animate-pulse border-b border-primary" />
                                <div className="flex items-center space-x-2 my-2">
                                    <div className="h-6 w-32 bg-accent animate-pulse rounded" />
                                </div>
                                <div className="h-4 w-24 bg-accent animate-pulse rounded mb-2" />
                            </div>

                            {/* Details block skeleton */}
                            <Fieldset data-scheme="secondary" className="bg-primary mb-6" legend="Details">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <div className="h-4 w-24 bg-accent animate-pulse rounded" />
                                        <div className="h-4 w-16 bg-accent animate-pulse rounded" />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-4 w-20 bg-accent animate-pulse rounded" />
                                        <div className="h-4 w-12 bg-accent animate-pulse rounded" />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="h-4 w-16 bg-accent animate-pulse rounded" />
                                        <div className="h-4 w-20 bg-accent animate-pulse rounded" />
                                    </div>
                                </div>
                            </Fieldset>

                            {/* Links block skeleton */}
                            <Fieldset data-scheme="secondary" className="bg-primary mb-6" legend="Links">
                                <div className="flex space-x-3">
                                    <div className="w-6 h-6 bg-accent animate-pulse rounded" />
                                    <div className="w-6 h-6 bg-accent animate-pulse rounded" />
                                    <div className="w-6 h-6 bg-accent animate-pulse rounded" />
                                </div>
                            </Fieldset>

                            {/* Achievements block skeleton */}
                            <Fieldset data-scheme="secondary" className="bg-primary mb-6" legend="Achievements">
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={i} className="aspect-square bg-accent animate-pulse rounded" />
                                    ))}
                                </div>
                            </Fieldset>
                        </div>

                        {/* Right content skeleton */}
                        <div className="flex-grow @container">
                            {/* Tabs skeleton */}
                            <div className="bg-primary rounded-md border border-primary mb-6">
                                <div className="p-6 space-y-4">
                                    <div className="h-4 w-full bg-accent animate-pulse rounded" />
                                    <div className="h-4 w-3/4 bg-accent animate-pulse rounded" />
                                    <div className="h-4 w-1/2 bg-accent animate-pulse rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

const Avatar = (props: { className?: string; src?: string; color?: string }) => {
    return (
        <div className={`overflow-hidden aspect-square bg-${props.color} ${props.className}`}>
            {props.src ? (
                <img className="w-full object-fill" alt="" src={props.src} />
            ) : (
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M20.0782 41.0392H5.42978C4.03134 41.0392 3.1173 40.1642 3.09386 38.7736C3.07823 37.7814 3.07042 36.797 3.10948 35.8048C3.15636 34.6329 3.72668 33.7345 4.74228 33.1798C8.0782 31.3595 11.4299 29.5783 14.7659 27.7658C15.0081 27.633 15.1565 27.758 15.3362 27.8517C18.1878 29.3439 21.0942 29.4689 24.0626 28.2267C24.1485 28.1955 24.2423 28.1721 24.3126 28.1096C24.9298 27.5861 25.4845 27.7971 26.1251 28.1486C29.1173 29.7971 32.1331 31.4143 35.1487 33.0238C36.4534 33.7191 37.094 34.766 37.0706 36.2426C37.0549 37.0785 37.0706 37.9067 37.0706 38.7426C37.0628 40.1254 36.1409 41.0395 34.7659 41.0395H20.0783L20.0782 41.0392Z"
                        fill="#BFBFBC"
                    />
                    <path
                        d="M19.8359 27.0625C17.0859 26.9687 14.8047 25.6094 13.1251 23.1953C10.3751 19.2344 10.7032 13.6093 13.8516 10.0001C17.2735 6.08599 22.9452 6.10943 26.336 10.0469C29.9376 14.2345 29.711 20.8437 25.8126 24.6405C24.2188 26.1952 22.3126 27.0312 19.8362 27.0624L19.8359 27.0625Z"
                        fill="#BFBFBC"
                    />
                </svg>
            )}
        </div>
    )
}

const SavedPosts = () => {
    const { user, isLoading } = useUser()
    const bookmarks = user?.profile?.bookmarks || []

    if (isLoading) {
        return <HourglassLoader title="Loading saved posts..." />
    }

    if (bookmarks.length === 0) {
        return (
            <p className="prose dark:prose-invert prose-sm max-w-full text-primary m-0">
                You haven't saved any posts yet
            </p>
        )
    }

    return (
        <ProfileDocumentGrid
            items={bookmarks.map((bookmark) => ({
                key: bookmark.url,
                title: bookmark.title || bookmark.url,
                href: bookmark.url,
                excerpt: bookmark.description,
            }))}
        />
    )
}

const Block = ({ title, children, url, className }) => {
    return (
        <Fieldset
            data-scheme="secondary"
            className={`bg-primary ${className}`}
            legend={
                url ? (
                    <Link className="font-semibold group" to={url} state={{ newWindow: true }}>
                        {title}
                        <IconArrowUpRight className="size-4 -mt-px inline-block text-muted group-hover:text-secondary" />
                    </Link>
                ) : (
                    title
                )
            }
        >
            <div>{children}</div>
        </Fieldset>
    )
}

const BodyEditor = ({ values, setFieldValue, bodyKey, initialValue, maxLength }) => {
    return (
        <div className="bg-white dark:bg-accent-dark rounded-md border border-primary overflow-hidden">
            <RichText
                values={values}
                initialValue={initialValue}
                setFieldValue={setFieldValue}
                bodyKey={bodyKey}
                className="h-[400px]"
                maxLength={maxLength}
            />
        </div>
    )
}

const ProfileTabs = ({ profile, firstName, id, username }) => {
    const { appWindow } = useWindow()
    const { user } = useUser()
    const [sort, setSort] = useState(sortOptions[0].label)
    const [notebooks, setNotebooks] = useState<ProfileNotebookCard[]>([])
    const [notebooksLoading, setNotebooksLoading] = useState(true)
    const authorId = id ? String(id) : undefined
    const authorName = username || profile?.username || firstName

    useEffect(() => {
        const handle = String(authorName || '').replace(/^@/, '').trim()
        if (!handle) {
            setNotebooks([])
            setNotebooksLoading(false)
            return
        }
        let cancelled = false
        setNotebooksLoading(true)
        fetch(`/api/notebooks?username=${encodeURIComponent(handle)}&public=1`, { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : { notebooks: [] }))
            .then((body) => {
                if (cancelled) return
                const rows = Array.isArray(body?.notebooks) ? body.notebooks : []
                setNotebooks(
                    rows.map((row: any) => ({
                        id: row.id,
                        short_id: row.short_id,
                        title: row.title || 'Untitled notebook',
                        excerpt: row.excerpt || '',
                        category: row.category,
                        coverUrl: row.coverUrl,
                        updatedAt: row.updatedAt || row.updated_at,
                    }))
                )
                setNotebooksLoading(false)
            })
            .catch(() => {
                if (cancelled) return
                setNotebooks([])
                setNotebooksLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [authorName])

    const posts = usePosts({
        authorId,
        author: authorName,
        includeBody: true,
        params: {
            sort: sortOptions.find((option) => option.label === sort)?.sort,
        },
    })

    const tabs = [
        {
            value: 'posts',
            label: 'Posts',
            content: (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold m-0">Posts</h4>
                        <Select
                            groups={[
                                {
                                    items: sortOptions.map((option) => ({
                                        label: option.label,
                                        value: option.label,
                                    })),
                                    label: 'Sort by',
                                },
                            ]}
                            value={sort}
                            onValueChange={(value) => setSort(value)}
                        />
                    </div>
                    <ProfileDocumentGrid
                        loading={posts.isLoading}
                        items={posts.posts.map((post: any) => ({
                            key: post.id,
                            title: post.attributes?.title || 'Untitled',
                            href: post.attributes?.slug || '#',
                            excerpt: post.attributes?.body || '',
                            imageUrl: post.attributes?.featuredImage?.url,
                            date: post.attributes?.date,
                            kind: 'md' as const,
                        }))}
                        empty={
                            <p className="prose dark:prose-invert prose-sm max-w-full text-primary m-0">
                                {firstName} hasn't published any posts yet
                            </p>
                        }
                    />
                    {posts.hasMore && (
                        <div className="mt-6">
                            {posts.isValidating ? (
                                <HourglassLoader title="Loading more posts..." />
                            ) : (
                                <OSButton size="sm" width="full" hover="background" onClick={() => posts.fetchMore()}>
                                    Load more
                                </OSButton>
                            )}
                        </div>
                    )}
                </>
            ),
        },
        {
            value: 'notebooks',
            label: 'Notebooks',
            content: (
                <>
                    <h4 className="text-lg font-bold m-0 mb-4">Notebooks</h4>
                    <ProfileNotebookGrid
                        loading={notebooksLoading}
                        items={notebooks}
                        empty={
                            <p className="prose dark:prose-invert prose-sm max-w-full text-primary m-0">
                                {firstName} hasn&apos;t published any notebooks yet
                            </p>
                        }
                    />
                </>
            ),
        },
        {
            value: 'discussions',
            label: 'Discussions',
            content: (
                <>
                    <Questions
                        profileId={authorId}
                        disclaimer={false}
                        showForm={false}
                        noQuestionsMessage={
                            <p className="prose dark:prose-invert prose-sm max-w-full text-primary m-0">
                                {firstName} hasn't started any discussions yet
                            </p>
                        }
                    />
                </>
            ),
        },
        ...(user?.profile?.id === id || user?.id === id
            ? [
                  {
                      value: 'saved',
                      label: 'Saved posts',
                      content: (
                          <>
                              <h4 className="text-lg font-bold mb-4">Saved</h4>
                              <SavedPosts />
                          </>
                      ),
                  },
              ]
            : []),
    ]

    const initialTab = useMemo(() => {
        const params = new URLSearchParams(appWindow?.location?.search)
        return tabs.find((tab) => tab.value === params.get('tab'))?.value || tabs[0].value
    }, [])

    return (
        <div data-scheme="secondary">
            <OSTabs tabs={tabs} defaultValue={initialTab} className="h-auto" triggerDataScheme="primary" />
        </div>
    )
}

const ValidationSchema = Yup.object().shape({
    firstName: Yup.string().required('Required'),
    lastName: Yup.string().nullable(),
    username: Yup.string()
        .required('Required')
        .test('username', '2–32 letters, numbers, _ or -', (value) => isValidProfileUsername(value)),
    birthDate: Yup.string().nullable(),
    website: Yup.string().url('Invalid URL').nullable(),
    github: Yup.string().url('Invalid URL').nullable(),
    linkedin: Yup.string().url('Invalid URL').nullable(),
    twitter: Yup.string().url('Invalid URL').nullable(),
    contactEmail: Yup.string().transform((v) => (v === '' ? null : v)).email('Invalid email').nullable(),
    biography: Yup.string().max(3000, 'Please limit your bio to 3,000 characters, you wordsmith!').nullable(),
    location: Yup.string().nullable(),
})

import { useProfileData } from 'hooks/useProfileData'

interface ProfileViewProps {
    profileIdOrUsername?: string | number
}

export default function ProfileView({ profileIdOrUsername }: ProfileViewProps = {}) {
    let router: any = null
    try {
        router = useRouter()
    } catch {
        router = null
    }
    const isReady = router?.isReady ?? true
    const params = router?.query
    const rawId = profileIdOrUsername || (params?.id || params?.username || params?.['*']) as string
    const id = /^\d+$/.test(String(rawId)) ? parseInt(String(rawId)) : rawId || ''

    const posthog = usePostHog()
    const { addToast } = useToast()
    const { user, getJwt, fetchUser } = useUser()
    const [isEditing, setIsEditing] = useState(false)

    const { profileData: data, error, isLoading, isCurrentUser, isModerator, mutate } = useProfileData(rawId)

    if (error) {
        posthog?.capture('squeak error', {
            source: 'ProfilePage',
            error: JSON.stringify(error),
        })
    }

    const handleBlock = async (blockUser: boolean) => {
        if (blockUser) {
            if (confirm('Are you sure you want to block this user and remove all of their posts and replies?')) {
                try {
                    const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
                    if (!host) {
                        addToast({
                            description: 'User moderation is not available yet on WorldInMaking',
                            error: true,
                            duration: 3000,
                        })
                        return
                    }
                    const jwt = await getJwt()
                    const response = await fetch(`${host}/api/profile/block/${id}`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    })

                    if (response.ok) {
                        await mutate()
                        addToast({
                            description: (
                                <>
                                    <IconCheck className="text-green size-4 inline-block mr-1" />
                                    User blocked successfully
                                </>
                            ),
                            duration: 3000,
                        })
                    } else {
                        console.error('Failed to block user:', response.status)
                        addToast({
                            description: 'Failed to block user',
                            error: true,
                            duration: 3000,
                        })
                    }
                } catch (err) {
                    console.error(err)
                    addToast({
                        description: 'Failed to block user',
                        error: true,
                        duration: 3000,
                    })
                }
            } else {
                return
            }
        } else {
            try {
                const host = process.env.NEXT_PUBLIC_SQUEAK_API_HOST
                if (!host) {
                    addToast({
                        description: 'User moderation is not available yet on WorldInMaking',
                        error: true,
                        duration: 3000,
                    })
                    return
                }
                const jwt = await getJwt()
                const response = await fetch(`${host}/api/profile/unblock/${id}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                    },
                })

                if (response.ok) {
                    await mutate()
                    addToast({
                        description: (
                            <>
                                <IconCheck className="text-green size-4 inline-block mr-1" />
                                User unblocked successfully
                            </>
                        ),
                        duration: 3000,
                    })
                } else {
                    console.error('Failed to unblock user:', response.status)
                    addToast({
                        description: 'Failed to unblock user',
                        error: true,
                        duration: 3000,
                    })
                }
            } catch (err) {
                console.error(err)
                addToast({
                    description: 'Failed to unblock user',
                    error: true,
                    duration: 3000,
                })
            }
        }
    }

    const { attributes: profile } = data || {}
    const { firstName, lastName } = profile || {}

    const name = [firstName, lastName].filter(Boolean).join(' ') || profile?.username || 'Profile'

    const { submitForm, isSubmitting, setFieldValue, values, resetForm, errors } = useFormik({
        validationSchema: ValidationSchema,
        enableReinitialize: true,
        initialValues: {
            website: profile?.website,
            contactEmail: profile?.contactEmail || '',
            twitter: profile?.twitter,
            linkedin: profile?.linkedin,
            github: profile?.github,
            avatar: getAvatarURL(profile),
            firstName: profile?.firstName,
            lastName: profile?.lastName,
            username: profile?.username || '',
            birthDate: profile?.birthDate ? String(profile.birthDate).slice(0, 10) : '',
            location: profile?.location,
            pronouns: profile?.pronouns,
            biography: profile?.biography,
            images: [],
            companyRole: profile?.companyRole,
        },
        onSubmit: async ({ avatar, images, ...values }) => {
            try {
                const userId = String(data?.id || user?.id || '')
                if (!userId) throw new Error('Not signed in')
                if (!isValidProfileUsername(values.username)) {
                    throw new Error('Username must be 2–32 letters, numbers, _ or -')
                }

                let avatarUrl: string | undefined
                if (avatar instanceof File) {
                    avatarUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(String(reader.result || ''))
                        reader.onerror = reject
                        reader.readAsDataURL(avatar)
                    })
                } else if (avatar === null) {
                    avatarUrl = ''
                }

                const { updateWimProfile } = await import('lib/wim-auth')
                const patch: Record<string, string | null> = {
                    username: String(values.username).trim(),
                    first_name: String(values.firstName || '').trim() || null,
                    last_name: String(values.lastName || '').trim() || null,
                    bio: values.biography ?? null,
                    location: values.location ?? null,
                    website: values.website ?? null,
                    contact_email: values.contactEmail?.trim() || null,
                    github: values.github ?? null,
                    linkedin: values.linkedin ?? null,
                    twitter: values.twitter ?? null,
                    pronouns: values.pronouns ?? null,
                    birth_date: values.birthDate ? String(values.birthDate).slice(0, 10) : null,
                }
                if (avatarUrl !== undefined) {
                    patch.avatar_url = avatarUrl || null
                }

                const { error } = await updateWimProfile(userId, patch as any)
                if (error) throw new Error(error)

                await fetchUser()
                await mutate()
                addToast({
                    description: (
                        <>
                            <IconCheck className="text-green size-4 inline-block mr-1" />
                            Profile saved
                        </>
                    ),
                    duration: 3000,
                })
                posthog?.capture('wim profile update', { profileId: userId })
            } catch (error) {
                addToast({
                    description: error instanceof Error ? error.message : 'Profile update failed',
                    error: true,
                    duration: 4000,
                })
                throw error
            } finally {
                setIsEditing(false)
            }
        },
    })

    if (!profile && (isLoading || !isReady)) {
        return <ProfileSkeleton />
    } else if (!profile && !isLoading && isReady) {
        return <NotFoundPage />
    }

    return (
        <div data-scheme="secondary" className="pt-4 h-full bg-primary text-primary flex flex-col">
            <SEO title={`${name}'s profile - PostHog`} />

            <ScrollArea className="min-h-0 h-full">
                <div data-scheme="primary" className="mx-auto max-w-screen-xl px-4 pb-4 @container">
                    <div className="flex flex-col @2xl:flex-row gap-6 p-4">
                        <div className="@2xl:max-w-xs w-full flex-shrink-0 pb-4">
                            <AvatarBlock
                                profile={profile}
                                isEditing={isEditing}
                                name={name}
                                setFieldValue={setFieldValue}
                                values={values}
                                errors={errors}
                            />

                            {(isEditing || profile.pronouns || profile.location || profile.birthDate) && (
                                <Block title="Details">
                                    <Details
                                        profile={profile}
                                        isEditing={isEditing}
                                        setFieldValue={setFieldValue}
                                        values={values}
                                        errors={errors}
                                    />
                                </Block>
                            )}

                            {(isEditing || profile.biography) && (
                                <Block title="Bio">
                                    {isEditing ? (
                                        <div className="space-y-1">
                                            <textarea
                                                name="biography"
                                                value={values.biography || ''}
                                                onChange={(e) => setFieldValue('biography', e.target.value)}
                                                rows={6}
                                                maxLength={3000}
                                                className="w-full text-sm rounded-md border border-primary bg-primary text-primary p-2 resize-y min-h-[8rem] focus:outline-none focus:ring-1 focus:ring-primary"
                                                placeholder="A short bio"
                                            />
                                            {errors.biography && (
                                                <p className="text-red text-xs font-bold m-0">{errors.biography}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <Markdown className="prose dark:prose-invert prose-sm max-w-full m-0">
                                            {profile.biography}
                                        </Markdown>
                                    )}
                                </Block>
                            )}

                            {(isEditing ||
                                profile.github ||
                                profile.twitter ||
                                profile.linkedin ||
                                profile.website ||
                                profile.contactEmail) && (
                                <Block title="Links">
                                    <Links
                                        errors={errors}
                                        setFieldValue={setFieldValue}
                                        formValues={values}
                                        profile={profile}
                                        isEditing={isEditing}
                                    />
                                </Block>
                            )}

                            {(isCurrentUser || (isModerator && user?.webmaster)) && (
                                <div className="flex gap-2 mt-4">
                                    {isEditing ? (
                                        <>
                                            <OSButton
                                                size="md"
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    resetForm()
                                                }}
                                            >
                                                Cancel
                                            </OSButton>
                                            <OSButton
                                                size="md"
                                                variant="primary"
                                                onClick={submitForm}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Saving...' : 'Save'}
                                            </OSButton>
                                        </>
                                    ) : (
                                        <OSButton
                                            size="md"
                                            variant="secondary"
                                            width="full"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Edit profile
                                        </OSButton>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex-grow @container">
                            <ProfileTabs
                                profile={profile}
                                firstName={firstName}
                                id={data?.id || id}
                                username={profile?.username}
                            />
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <div className="border-primary sticky border-t bottom-0">
                <HeaderBar
                    rightActionButtons={
                        <>
                            {isModerator && (
                                <div className="flex gap-px">
                                    <OSButton
                                        asLink
                                        size="md"
                                        to={`${process.env.NEXT_PUBLIC_SQUEAK_API_HOST}/admin/content-manager/collection-types/plugin::users-permissions.user/${profile?.user?.data?.id}`}
                                        tooltip={
                                            <>
                                                View in Strapi{' '}
                                                <IconExternal className="size-4 text-secondary inline-block relative -top-px" />
                                            </>
                                        }
                                        icon={<IconStrapi />}
                                        iconClassName="size-5"
                                        external
                                    />

                                    <OSButton
                                        size="md"
                                        tooltip={
                                            profile?.user?.data?.attributes?.blocked ? 'Unblock user?' : 'Block user'
                                        }
                                        icon={
                                            profile?.user?.data?.attributes?.blocked ? <IconNoEntry /> : <IconNoEntry />
                                        }
                                        iconClassName="size-5"
                                        className={`${
                                            profile?.user?.data?.attributes?.blocked ? '!bg-red !text-white' : ''
                                        }`}
                                        onClick={() => handleBlock(!profile?.user?.data?.attributes?.blocked)}
                                    />
                                </div>
                            )}
                        </>
                    }
                />
            </div>
        </div>
    )
}
