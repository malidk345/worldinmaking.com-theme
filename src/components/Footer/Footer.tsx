import Link from 'components/Link'
import WimLogo from 'components/WimLogo'
import React from 'react'
import { IProps, LinkListItem } from './LinkList'
import { Instagram, Telegram } from 'components/Icons/Icons'
import { SHOW_SOCIAL_LINKS, SOCIAL_LINKS } from 'lib/social-links'

const linklist: IProps[] = [
    {
        title: 'Explore',
        url: '/community',
        items: [
            { title: 'Community', url: '/community' },
            { title: 'Notebooks', url: '/notebooks' },
            { title: 'Posts', url: '/posts' },
            { title: 'Directory', url: '/community/directory' },
        ],
    },
    {
        title: 'Company',
        url: '/about',
        items: [
            { title: 'About', url: '/about' },
            { title: 'Contact', url: '/contact' },
            { title: 'Study', url: '/pricing' },
        ],
    },
    {
        title: 'Legal',
        url: '/privacy',
        items: [
            { title: 'Privacy', url: '/privacy' },
            { title: 'Terms', url: '/terms' },
            { title: 'Cookies', url: '/cookies' },
            { title: 'Guidelines', url: '/guidelines' },
        ],
    },
]

type Social = {
    name: (typeof SOCIAL_LINKS)[number]['name']
    url: string
    Icon: React.ReactNode
}

const socialIcons: Record<(typeof SOCIAL_LINKS)[number]['name'], React.ReactNode> = {
    Instagram: <Instagram className="w-5 h-5 box-border fill-current" />,
    Telegram: <Telegram className="w-5 h-5 box-border fill-current" />,
}

export function Footer(): JSX.Element {
    const social: Social[] = SOCIAL_LINKS.map(({ name, url }) => ({
        name,
        url,
        Icon: socialIcons[name],
    }))

    return (
        <footer className="bg-accent border-y border-primary print:hidden">
            <div className="relative -top-6">
                <Link
                    to="/"
                    className="left-[calc(50%-40px)] w-20 h-12 inline-flex justify-center items-center absolute z-10 rounded bg-light dark:bg-dark px-2 pt-1.5 pb-1 mb-1 border border-b-3 border-primary hover:bg-accent hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all"
                >
                    <span className="inline-block">
                        <WimLogo className="size-8" />
                    </span>
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 w-full max-w-screen-2xl mx-auto">
                {linklist.map((item) => (
                    <LinkListItem {...item} key={item.url} />
                ))}
            </div>

            {SHOW_SOCIAL_LINKS && (
                <div className="flex justify-center">
                    <ul className="list-none px-0 py-2 flex space-x-4 items-center">
                        {social.map(({ Icon, url, name }: Social) => {
                            return (
                                <li key={name}>
                                    <Link
                                        to={url}
                                        className="flex items-center relative px-2.5 pt-2 pb-1.5 mb-1 rounded border border-b-3 border-transparent opacity-70 hover:opacity-100 hover:border hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all"
                                        aria-label={name}
                                    >
                                        {Icon}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
            <div className="py-5 border-l-0 border-r-0">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-baseline text-lg px-5">
                    <small className="font-semibold dark:text-gray">
                        &copy; {new Date().getFullYear()} WorldInMaking
                    </small>
                    <ul className="m-0 pl-0 pb-32 mdlg:pb-0 list-none sm:ml-auto flex flex-col mdlg:flex-row items-baseline sm:space-x-8 mdlg:space-x-4 mt-2 sm:mt-0 gap-2 mdlg:gap-0">
                        <li>
                            <Link to="/privacy" className="font-bold text-sm text-secondary hover:text-primary">
                                Privacy
                            </Link>
                        </li>
                        <li>
                            <Link to="/terms" className="font-bold text-sm text-secondary hover:text-primary">
                                Terms
                            </Link>
                        </li>
                        <li>
                            <Link to="/cookies" className="font-bold text-sm text-secondary hover:text-primary">
                                Cookies
                            </Link>
                        </li>
                        <li>
                            <Link to="/guidelines" className="font-bold text-sm text-secondary hover:text-primary">
                                Guidelines
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </footer>
    )
}
