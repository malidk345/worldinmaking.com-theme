import React from 'react'
import SafeImage from 'components/SafeImage'

export default function Contributors({ contributors, className }) {
    return (
        <ul className={className}>
            {contributors &&
                contributors.map((contributor, index) => {
                    const { avatar, url, username } = contributor
                    const imageUrl = avatar?.publicURL || avatar?.url || avatar || ''
                    return (
                        <li key={index}>
                            <a href={url}>
                                {imageUrl && (
                                    <SafeImage
                                        className="rounded-full max-w-[37px]"
                                        src={imageUrl}
                                        alt={username}
                                        title={username}
                                        width={37}
                                        height={37}
                                    />
                                )}
                            </a>
                        </li>
                    )
                })}
        </ul>
    )
}
