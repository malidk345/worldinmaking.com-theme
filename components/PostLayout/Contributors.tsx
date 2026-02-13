"use client"

import Link from 'components/Link'
import Tooltip from 'components/RadixUI/Tooltip'
import React from 'react'
import { IContributor } from './types'
import CloudinaryImage from 'components/CloudinaryImage'

interface ContributorImageProps {
    image?: IContributor['image']
    name: string
    className?: string
    imgClassName?: string
}

export const ContributorImageSmall = ({ image, name, className = '', imgClassName = '' }: ContributorImageProps) => {
    return (
        <div
            className={`relative rounded-full overflow-hidden border-2 border-tan dark:border-primary transition-all ${className}`}
        >
            {typeof image === 'string' ? (
                <CloudinaryImage
                    className={`rounded-full ${imgClassName}`}
                    src={image}
                    width={100}
                />
            ) : (
                <svg width="38" height="38" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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

interface ContributorImageExtendedProps extends ContributorImageProps {
    compact?: boolean
    rounded?: boolean
}

export const ContributorImage = ({ image, name, compact, rounded }: ContributorImageExtendedProps) => {
    return (
        <figure
            className={`${compact
                    ? `flex-shrink-0 relative size-12 ${rounded ? '' : 'self-end'}`
                    : 'm-0 -mt-8 p-0 absolute right-0 bottom-0 rounded-br overflow-hidden [line-height:0]'
                } ${rounded
                    ? `rounded-full overflow-hidden border-2 border-tan dark:border-primary ${compact ? 'mr-1' : ''}`
                    : ''
                } mb-0`}
        >
            {typeof image === 'string' ? (
                <CloudinaryImage
                    width={200}
                    className={compact ? 'absolute size-full' : 'w-24 h-24'}
                    imgClassName={compact ? 'size-full object-cover' : ''}
                    src={image}
                />
            ) : (
                ''
            )}
        </figure>
    )
}

interface ContributorSmallProps {
    image?: IContributor['image']
    name: string
    url?: string
    state?: IContributor['state']
    text?: boolean
}

export const ContributorSmall = ({
    image,
    name,
    url,
    state,
    text = false,
}: ContributorSmallProps) => {
    if (url) {
        return (
            <Link to={url} state={state} className="flex space-x-2 items-center no-underline">
                <ContributorImageSmall
                    className="hover:border-red hover:z-10 dark:hover:border-red"
                    image={image}
                    name={name}
                />
                {text && <span className="author text-[14px] font-semibold">{name}</span>}
            </Link>
        )
    } else {
        return (
            <div className="flex space-x-2 items-center no-underline">
                <ContributorImageSmall
                    className=""
                    image={image}
                    name={name}
                />
                {text && <span className="author text-[14px] font-semibold">{name}</span>}
            </div>
        )
    }
}

interface ContributorProps extends ContributorSmallProps {
    role?: string
    color?: string
    compact?: boolean
    roundedImage?: boolean
}

export const Contributor = ({
    image,
    name,
    url,
    state,
    text = false,
    role,
    color,
    compact = false,
    roundedImage = false,
}: ContributorProps) => {
    const className = `${compact ? 'overflow-hidden' : ''} flex bg-${color ? color : 'accent'} dark:bg-${color ? color : 'accent-dark'
        } border border-primary md:mx-4 rounded relative hover:-translate-y-0.5 active:translate-y-0 hover:transition-all hover:border-b-[4px] active:border-b-1 active:top-[2px] justify-between text-primary dark:text-primary-dark hover:text-primary dark:hover:text-primary-dark ${roundedImage ? 'items-center' : ''
        }`

    if (url) {
        return (
            <Link to={url} state={state} className={className}>
                <div className={compact ? '' : 'pr-20'}>
                    <div className="flex flex-col justify-between px-4 py-2 w-full gap-0.5">
                        <h3 className={`mb-0 leading-tight ${compact ? 'text-[15px]' : 'text-base'}`}>
                            {text && <span>{name}</span>}
                        </h3>
                        {role && (
                            <p
                                className={`text-muted m-0 leading-tight text-sm line-clamp-1 ${compact ? 'text-[13px]' : 'text-sm'
                                    }`}
                            >
                                {role}
                            </p>
                        )}
                    </div>
                </div>
                <ContributorImage image={image} name={name} compact={compact} rounded={roundedImage} />
            </Link>
        )
    } else {
        return (
            <div className={className}>
                <div className={compact ? '' : 'pr-20'}>
                    <div className="flex flex-col justify-between px-4 py-2 w-full gap-0.5">
                        <h3 className={`mb-0 leading-tight ${compact ? 'text-[15px]' : 'text-base'}`}>
                            {text && <span>{name}</span>}
                        </h3>
                        {role && (
                            <p
                                className={`text-muted m-0 leading-tight text-sm line-clamp-1 ${compact ? 'text-[13px]' : 'text-sm'
                                    }`}
                            >
                                {role}
                            </p>
                        )}
                    </div>
                </div>
                <ContributorImage image={image} name={name} compact={compact} rounded={roundedImage} />
            </div>
        )
    }
}

interface ContributorsProps {
    contributors: IContributor[]
    className?: string
}

export default function Contributors({
    contributors,
    className = '',
}: ContributorsProps) {
    const multiple = contributors?.length > 1
    const maxContributorsToShow = 4
    return (
        <div className="flex space-x-2 items-center justify-between">
            {multiple && (
                <h3 className="text-black dark:text-white font-semibold opacity-25 m-0 text-sm flex space-x-1 items-center">
                    <span>contributors</span>
                    <span
                        className={`w-[24px] h-[24px] bg-black/40 dark:bg-white/40 flex items-center justify-center ${contributors.length > maxContributorsToShow ? 'text-xs' : ''
                            }`}
                    >
                        {contributors.length > maxContributorsToShow
                            ? `${maxContributorsToShow}+`
                            : contributors.length}
                    </span>
                </h3>
            )}
            <ul className={`list-none m-0 p-0 flex ${className}`}>
                {contributors.slice(0, maxContributorsToShow).map(({ image, name, url, state }) => {
                    return (
                        <li className="first:-ml-0 -ml-2" key={name}>
                            {multiple ? (
                                <Tooltip
                                    trigger={
                                        <span className="relative">
                                            <ContributorSmall image={image} name={name} url={url} state={state} />
                                        </span>
                                    }
                                >
                                    <div className="flex space-x-1 items-center">
                                        <span className="text-xs font-semibold">{name}</span>
                                    </div>
                                </Tooltip>
                            ) : (
                                <ContributorSmall image={image} name={name} url={url} state={state} text />
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
