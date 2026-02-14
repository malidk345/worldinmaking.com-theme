import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import Logo from 'components/Logo'
import {
    IconApp,
    IconBrightness,
    IconMessage,
    IconTextWidth,
    IconUser,
    IconChevronDown,
    IconLetter,
    IconUpload,
    IconLock,
    IconChatHelp,
} from '@posthog/icons'

import { Placement } from '@popperjs/core'
import * as icons from '@posthog/icons'
import { IconExternal } from '@posthog/icons'

declare global {
    interface Window {
        __theme: string
        __setPreferredTheme: (theme: string) => void
    }
}
import { CallToAction } from 'components/CallToAction'
import { useLayoutData } from 'components/Layout/hooks'

import Toggle from 'components/Toggle'
import { useAuth } from 'context/AuthContext'
import { useApp } from 'context/App'
import LoginContent from 'components/Login/LoginContent'
import AdminPanel from 'components/AdminPanel'
import ProfileContent from 'components/Login/ProfileContent'
import dayjs from 'dayjs'
import { Popover } from 'components/RadixUI/Popover'

import usePostHog from 'hooks/usePostHog'

import React, { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { usePopper } from 'react-popper'

export const Avatar = (props: { className?: string; src?: string }) => {
    return (
        <div className={`overflow-hidden rounded-full ${props.className}`}>
            {props.src ? (
                <img className="w-full object-cover" alt="" src={props.src} />
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



export const DarkModeToggle = () => {
    const [websiteTheme, setWebsiteTheme] = useState<'light' | 'dark'>(
        typeof window !== 'undefined' && window.__theme === 'dark' ? 'dark' : 'light'
    )

    const handleClick = () => {
        const newTheme = websiteTheme === 'light' ? 'dark' : 'light'
        window.__setPreferredTheme?.(newTheme)
        setWebsiteTheme(newTheme)
    }

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleThemeChange = () => {
            setWebsiteTheme(window.__theme === 'dark' ? 'dark' : 'light')
        }

        window.addEventListener('theme-change', handleThemeChange)
        return () => window.removeEventListener('theme-change', handleThemeChange)
    }, [])

    return (
        <button
            onClick={handleClick}
            className="group/item text-sm px-2 py-2 rounded-sm hover:bg-border dark:hover:bg-border-dark flex justify-between items-center w-full"
        >
            <div>
                <IconBrightness className="opacity-50 group-hover/item:opacity-75 inline-block mr-2 w-6" />
                <span>dark mode</span>
            </div>
            <Toggle checked={websiteTheme === 'dark'} onChange={handleClick} />
        </button>
    )
}

function Tooltip({
    className = '',
    children,
    content,
    tooltipClassName = '',
    placement = 'bottom',
}: {
    children: React.ReactNode
    content: string | ((setOpen: React.Dispatch<React.SetStateAction<boolean>>) => React.ReactNode)
    tooltipClassName?: string
    placement?: Placement
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [referenceElement, setReferenceElement] = useState<any>(null)
    const [popperElement, setPopperElement] = useState<any>(null)
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement,
        modifiers: [
            {
                name: 'offset',
            },
        ],
    })
    const containerEl = useRef<any>(null)

    useEffect(() => {
        function handleClick(e: any) {
            if (
                containerEl?.current &&
                !containerEl?.current.contains(e.target) &&
                !document.querySelector('#portal-tooltip')?.contains(e.target)
            ) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => {
            document.removeEventListener('mousedown', handleClick)
        }
    }, [containerEl])

    return (
        <span ref={containerEl} className={className}>
            <button
                ref={setReferenceElement}
                onClick={() => setOpen(!open)}
                className={`flex items-center p-2 rounded-full hover:bg-border dark:hover:bg-border-dark relative active:top-[1px] active:scale-[.99] ${open ? 'bg-border dark:bg-border-dark' : ' hover:scale-[1.05]'
                    }`}
            >
                {children}
            </button>
            {open && (
                <div
                    className="z-[10000] pt-1"
                    role="tooltip"
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                >
                    <div className={`rounded-md border-primary border overflow-hidden ${tooltipClassName}`}>
                        <div className={`bg-accent text-primary dark:text-primary-dark text-sm z-20`}>
                            {content && (typeof content === 'string' ? content : content(setOpen))}
                        </div>
                    </div>
                </div>
            )}
        </span>
    )
}

const ActiveBackground = ({ mobile = false }) => {
    return (
        <span
            className={`bg-light dark:bg-dark absolute w-full h-[calc(100%+1px)] left-0 inset-0
                before:absolute before:border-r before:top-0 before:h-full before:border-light dark:before:border-dark before:w-[10px] before:left-0 before:bg-accent dark:before:bg-accent-dark before:z-10
                after:absolute after:border-l after:top-0 after:h-full after:border-light dark:after:border-dark after:w-[10px] after:right-0 after:bg-accent dark:after:bg-accent-dark ${mobile
                    ? 'before:rounded-tr-lg after:rounded-tl-lg top-[-1px] before:border-t after:border-t'
                    : 'before:rounded-br-lg after:rounded-bl-lg before:border-b after:border-b'
                }`}
        >
            <span
                className={`absolute ${mobile ? 'top-0' : 'bottom-0'
                    } left-0 border-b border-bg-light dark:border-bg-dark w-full`}
            />
        </span>
    )
}

export const InternalMenu = ({ className = '', mobile = false, menu, activeIndex, scrollOnRender = true }: any) => {
    const ref = useRef<HTMLUListElement>(null)
    const [firstRef, firstInView] = useInView({ threshold: 1 })
    const [lastRef, lastInView] = useInView({ threshold: 1 })
    const [overflowing, setOverflowing] = useState(false)
    const menuItemsRef = useRef<any>(null)

    const scrollToIndex = (index: any) => {
        const map = getMap()
        const node = map?.get(index)
        node?.scrollIntoView({
            block: 'nearest',
            inline: 'center',
        })
    }

    const getMap = () => {
        if (!menuItemsRef.current) {
            menuItemsRef.current = new Map()
        }
        return menuItemsRef.current as unknown as Map<any, any>
    }

    function handleResize() {
        setOverflowing((ref?.current && ref?.current.scrollWidth > ref?.current.clientWidth) || false)
    }

    useEffect(() => {
        window.addEventListener('resize', handleResize)
        handleResize()
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    useEffect(() => {
        if (scrollOnRender && overflowing) scrollToIndex(activeIndex)
    }, [overflowing])

    return menu?.length > 0 ? (
        <div className="relative">
            {overflowing && (
                <button
                    onDoubleClick={(e) => e.preventDefault()}
                    onClick={() => ref.current?.scrollBy({ left: -75, behavior: 'smooth' })}
                    className={`absolute top-0 left-0 h-[calc(100%-2px)] flex justify-end items-center w-10 pl-2 bg-gradient-to-l from-transparent to-light via-light dark:via-dark dark:to-dark ${firstInView ? '-z-10' : 'z-10'
                        }`}
                >
                    <IconChevronDown className="w-8 h-8 rounded-sm text-secondary hover:text-primary dark:text-primary-dark/60 dark:hover:text-primary-dark/100 rotate-90 hover:bg-accent hover:backdrop-blur-sm active:backdrop-blur-sm border-transparent hover:border relative hover:scale-[1.02] active:top-[.5px] active:scale-[.99]" />
                </button>
            )}
            <ul
                style={{ justifyContent: overflowing ? 'start' : 'center' }}
                ref={ref}
                className={`flex space-x-4 list-none m-0 pt-1 px-4 border-b border-primary relative snap-x snap-mandatory overflow-x-auto overflow-y-hidden ${className}`}
            >
                {menu?.map((menuItem: any, index: any) => {
                    const { url, color, colorDark, icon, name, onClick } = menuItem
                    const Icon = (typeof icon === 'string' && (icons as any)[icon]) || icons.IconApp
                    const active = menu?.[activeIndex]?.name === menuItem.name
                    return (
                        <li
                            key={menuItem.name}
                            ref={(node) => {
                                const map = getMap()
                                if (node) {
                                    map.set(index, node)
                                } else {
                                    map.delete(index)
                                }
                            }}
                        >
                            <div ref={index === 0 ? firstRef : index === menu.length - 1 ? lastRef : null}>
                                <Link
                                    onClick={() => {
                                        scrollToIndex(index)
                                        onClick?.()
                                    }}
                                    to={url || ''}
                                    className={`snap-center group flex items-center relative px-2 pt-1.5 pb-1 mb-1 rounded hover:bg-light/50 hover:dark:bg-dark/50 ${active
                                        ? ''
                                        : 'border border-b-3 border-transparent md:hover:border-primary hover:translate-y-[-1px] active:translate-y-[1px] active:transition-all'
                                        }`}
                                >
                                    <span className={`w-6 h-6 mr-2 text-${color} dark:text-${colorDark}`}>
                                        <Icon />
                                    </span>
                                    <span
                                        className={`text-sm whitespace-nowrap ${active
                                            ? 'font-bold opacity-100'
                                            : 'font-semibold opacity-60 group-hover:opacity-100'
                                            }`}
                                    >
                                        {name}
                                    </span>
                                    <span
                                        className={`absolute ${mobile ? 'top-[-4px]' : '-bottom-2'
                                            } left-0 w-full border-b-[1.5px] rounded-full transition-colors ${active ? `border-${color} dark:border-${colorDark}` : `border-transparent`
                                            }`}
                                    />
                                </Link>
                            </div>
                        </li>
                    )
                })}
            </ul>
            {overflowing && (
                <button
                    onDoubleClick={(e) => e.preventDefault()}
                    onClick={() => ref.current?.scrollBy({ left: 75, behavior: 'smooth' })}
                    className={`absolute top-0 right-0 h-[calc(100%-2px)] flex justify-end items-center w-10 pr-2 bg-gradient-to-r from-transparent to-light via-light dark:via-dark dark:to-dark ${lastInView ? '-z-10' : 'z-10'
                        }`}
                >
                    <IconChevronDown className="w-8 h-8 rounded-sm text-secondary hover:text-primary dark:text-primary-dark/60 dark:hover:text-primary-dark/100 -rotate-90 hover:bg-accent hover:backdrop-blur-sm active:backdrop-blur-sm border-transparent hover:border relative hover:scale-[1.02] active:top-[.5px] active:scale-[.99]" />
                </button>
            )}
        </div>
    ) : null
}

const keyboardShortcut =
    'box-content p-[5px] border border-b-2 border-primary  rounded-[3px] inline-flex text-black/35 dark:text-white/40 text-code text-xs'

const enterpiseModeNames: Record<string, string> = {
    Products: 'Solutions',
    Pricing: 'Plans',
    Docs: 'Developer resources',
    Community: 'Newsroom',
    Company: 'Investor relations',
}



const TheoTooltip = () => {
    return (
        <div className="flex max-w-[350px] space-x-3">
            <img
                src="https://res.cloudinary.com/dmukukwp6/image/upload/theo_tooltip_22f692044d.png"
                alt="Theo"
                className="size-[80px]"
            />
            <div>
                <h4 className="text-base m-0 mb-1">enable theo (clutter-free) mode</h4>
                <p className="text-sm m-0">
                    <Link
                        className="text-red dark:text-yellow font-bold cursor-pointer"
                        to="https://www.x.com/theo"
                        externalNoIcon
                    >
                        Theo - t3.gg
                    </Link>{' '}
                    once{' '}
                    <Link
                        className="text-red dark:text-yellow font-bold cursor-pointer"
                        to="https://youtu.be/zcZZxzkLwOc?si=FD5UJeFvh7uwKYy2&t=883"
                        externalNoIcon
                    >
                        complained
                    </Link>{' '}
                    our blog had too many things on it for making screen recordings.
                </p>
                <p className="text-sm m-0 mt-1">So here's to you, Theo. Film away.</p>
            </div>
        </div>
    )
}

export const Main = () => {
    const {
        menu,
        parent,
        internalMenu,
        activeInternalMenu,
        fullWidthContent,
        setFullWidthContent,
        enterpriseMode,
        setEnterpriseMode,
        theoMode,
        setTheoMode,
        post,
        hedgehogModeEnabled,
        setHedgehogModeEnabled,
        compact,
    } = useLayoutData()
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    const [websiteTheme, setWebsiteTheme] = useState<'light' | 'dark'>(
        typeof window !== 'undefined' && window.__theme === 'dark' ? 'dark' : 'light'
    )
    const [posthogInstance, setPosthogInstance] = useState<string>()
    const posthog = usePostHog()
    const { user, profile, isAdmin, signOut } = useAuth()
    const { addWindow } = useApp()

    useEffect(() => {
        if (typeof window === 'undefined') return

        const instanceCookie = document.cookie
            .split('; ')
            ?.filter((row) => row.startsWith('ph_current_instance='))
            ?.map((c) => c.split('=')?.[1])?.[0]
        if (instanceCookie) {
            setPosthogInstance(instanceCookie)
        }

        const handleThemeChange = () => {
            setWebsiteTheme(window.__theme === 'dark' ? 'dark' : 'light')
        }

        window.addEventListener('theme-change', handleThemeChange)
        return () => window.removeEventListener('theme-change', handleThemeChange)
    }, [])

    const toggleWideMode = () => {
        const wideMode = !fullWidthContent
        setFullWidthContent(wideMode)
        if (posthog) {
            posthog.people.set({ preferred_viewing_mode: wideMode ? 'wide' : 'standard' })
        }
    }

    return (
        <div>
            <div className="border-b border-primary bg-accent mb-1">
                <div
                    className={`flex mx-auto px-2 md:px-0 mdlg:px-5 justify-between transition-all ${fullWidthContent ? 'max-w-full' : 'max-w-screen-3xl box-content'
                        }`}
                >
                    <div className="flex-1 flex">
                        <Link className="py-4 grow-0 shrink-0 basis-[auto] dark:text-primary-dark relative" to="/">
                            {pathname === '/' && <ActiveBackground />}
                            {enterpriseMode ? (
                                <CloudinaryImage
                                    src="https://res.cloudinary.com/dmukukwp6/image/upload/posthog.com/src/components/MainNav/posthog-tm.png"
                                    className="h-5 mx-6 relative"
                                />
                            ) : (
                                <Logo
                                    color={websiteTheme === 'dark' ? 'white' : undefined}
                                    className="h-[24px] fill-current relative px-2 box-content"
                                />
                            )}
                        </Link>
                    </div>
                    <ul className="md:flex hidden list-none m-0 p-0">
                    </ul>
                    <div className="flex items-center justify-end flex-1">
                        {posthogInstance ? (
                            <CallToAction
                                type={'outline'}
                                className={'hidden sm:flex mr-2'}
                                to={posthogInstance.replace(/"/g, '')}
                                size={'sm'}
                                event={{ name: 'clicked Dashboard in main nav' }}
                            >
                                Dashboard
                            </CallToAction>
                        ) : enterpriseMode ? (
                            <CallToAction size="sm" type="outline" className="hidden sm:flex mr-2" to="/demo">
                                Talk to sales
                            </CallToAction>
                        ) : null}


                        <Popover
                            side="bottom"
                            sideOffset={10}
                            dataScheme="secondary"
                            trigger={
                                <div className="cursor-pointer group px-1 py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors flex items-center justify-center min-w-[44px]">
                                    {profile?.avatar_url ? (
                                        <div className="w-7 h-7 rounded-full overflow-hidden border border-black/10 shadow-sm">
                                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
                                        </div>
                                    ) : (
                                        <IconUser className="opacity-70 inline-block w-6 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            }
                        >
                            <ul className="list-none text-left m-0 p-0 pb-[3px] space-y-[2px] w-[200px]">
                                {user && (
                                    <>
                                        <li className="bg-black/5 dark:bg-white/5 border-b border-primary text-[11px] px-3 py-2 text-primary/60 z-20 m-0 !mb-[3px] font-black uppercase tracking-widest">
                                            account
                                        </li>
                                        <li className="px-3 py-3 mb-1">
                                            <p className="m-0 text-[13px] font-bold truncate text-primary">{profile?.username || user.email}</p>
                                        </li>
                                    </>
                                )}

                                <li className="bg-black/5 dark:bg-white/5 border-y border-primary text-[11px] px-3 py-2 text-primary/60 !my-1 z-20 m-0 font-black uppercase tracking-widest">
                                    system
                                </li>

                                {isAdmin && (
                                    <li className="px-1">
                                        <button
                                            className="group/item text-[13px] px-3 py-2.5 rounded-sm hover:bg-black/5 dark:hover:bg-white/5 block w-full text-left font-bold lowercase flex items-center justify-between"
                                            onClick={() => addWindow({
                                                key: 'admin',
                                                path: '/admin',
                                                title: 'Admin Dashboard',
                                                size: { width: 1100, height: 750 },
                                                element: <AdminPanel />
                                            })}
                                        >
                                            <div className="flex items-center gap-2">
                                                <IconApp className="w-5 h-5 opacity-40 group-hover/item:opacity-100 transition-opacity" />
                                                <span>dashboard</span>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-burnt-orange" />
                                        </button>
                                    </li>
                                )}

                                {user && (
                                    <li className="px-1">
                                        <button
                                            className="group/item text-[13px] px-3 py-2.5 rounded-sm hover:bg-black/5 dark:hover:bg-white/5 block w-full text-left font-bold lowercase flex items-center gap-2"
                                            onClick={() => addWindow({
                                                key: 'profile',
                                                path: '/profile',
                                                title: 'My Profile',
                                                size: { width: 450, height: 600 },
                                                element: <ProfileContent />
                                            })}
                                        >
                                            <IconUser className="w-5 h-5 opacity-40 group-hover/item:opacity-100 transition-opacity" />
                                            my profile
                                        </button>
                                    </li>
                                )}

                                <li className="px-1 pt-1 border-t border-primary/10 mt-1">
                                    <button
                                        className={`group/item text-[13px] px-3 py-2.5 rounded-sm hover:bg-black/5 dark:hover:bg-white/5 block w-full text-left font-bold lowercase flex items-center gap-2 ${user ? 'text-red' : ''}`}
                                        onClick={() => {
                                            if (user) {
                                                signOut()
                                            } else {
                                                addWindow({
                                                    key: 'login',
                                                    path: '/login',
                                                    title: 'Member Access',
                                                    size: { width: 450, height: 450 },
                                                    element: <LoginContent />
                                                })
                                            }
                                        }}
                                    >
                                        <IconLock className={`w-5 h-5 opacity-40 group-hover/item:opacity-100 transition-opacity ${user ? 'text-red' : ''}`} />
                                        {user ? 'sign out' : 'sign in'}
                                    </button>
                                </li>
                            </ul>
                        </Popover>
                    </div>
                </div>
            </div>
            <InternalMenu
                menu={internalMenu}
                activeIndex={internalMenu?.findIndex((menu) => menu === activeInternalMenu)}
                className="md:flex hidden"
            />
        </div>
    )
}

export const Mobile = () => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    // Note: state from @reach/router is not available in Next.js
    // For ad tracking, you would need to use Next.js routing state or URL params
    if (pathname === '/newsletter-fbc') {
        return <></>
    }

    const { menu, parent, internalMenu, activeInternalMenu, enterpriseMode, setEnterpriseMode } = useLayoutData()

    return (
        <div id="mobile-nav" className="fixed bottom-0 w-full md:hidden z-[9999998] print:hidden">
            <InternalMenu
                mobile
                className="bg-light dark:bg-dark border-t mb-[-1px]"
                menu={internalMenu}
                activeIndex={internalMenu?.findIndex((menu) => menu === activeInternalMenu)}
            />
            <ul className="grid grid-cols-5 gap-[2px] list-none m-0 px-2 bg-accent border-t border-input">
                {menu?.map((menuItem) => {
                    const active = menuItem.name === parent?.name
                    const { name, url, icon } = menuItem
                    const Icon = (typeof icon === 'string' && (icons as any)[icon]) || icons.IconApp
                    return (
                        <li className="h-full first:hidden" key={name}>
                            <Link
                                to={url || ''}
                                className={`text-[12.5px] font-medium relative px-4 py-4 flex flex-col space-y-1 items-center ${active
                                    ? 'bg-light dark:bg-dark font-bold px-[calc(1rem_+_10px)] mx-[-10px]'
                                    : 'opacity-70 hover:opacity-100'
                                    }`}
                            >
                                {active && <ActiveBackground mobile />}
                                <span className={`w-5 h-5 inline-block relative !m-0`}>
                                    <Icon />
                                </span>
                                <span className="relative">{enterpriseMode ? enterpiseModeNames[name] : name}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
