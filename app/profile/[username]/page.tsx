import type { Metadata } from "next";

export const runtime = 'edge';

type Props = {
    params: Promise<{ username: string }>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getProfile(username: string) {
    if (!supabaseUrl || !supabaseKey || !username) return null;
    const url = new URL("/rest/v1/profiles", supabaseUrl);
    url.searchParams.set("select", "username,bio,avatar_url");
    url.searchParams.set("username", `eq.${username}`);
    url.searchParams.set("limit", "1");

    try {
        const res = await fetch(url.toString(), {
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
            },
            next: { revalidate: 3600 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.[0] || null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username || "");
    const profile = await getProfile(decodedUsername);

    const title = profile?.username || decodedUsername;
    const bio = profile?.bio || `View ${title}'s profile, posts, and contributions on World in Making.`;
    const image = profile?.avatar_url ? profile.avatar_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + (profile.avatar_url.includes('?') ? '&' : '?') + 'width=1200&quality=80&format=webp' : undefined;

    return {
        title: `${title}'s Profile`,
        description: bio,
        alternates: {
            canonical: `/profile/${username}/`,
        },
        openGraph: {
            type: "profile",
            title: `${title} | World in Making`,
            description: bio,
            images: [{ url: image || `${process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com"}/api/og?title=${encodeURIComponent(title + " | Profile")}`, width: 1200, height: 630, alt: title }],
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

import ProfilePageClient from "./page-client";
import { ProfilePageJsonLd } from "components/SEO/JsonLd";

export default async function ProfilePage({ params }: Props) {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username || "");
    const profile = await getProfile(decodedUsername);

    const title = profile?.username || decodedUsername;
    const bio = profile?.bio || `View ${title}'s profile, posts, and contributions on World in Making.`;
    const image = profile?.avatar_url || undefined;
    const profileUrl = `/profile/${username}/`;

    return (
        <>
            <ProfilePageJsonLd
                name={title}
                url={profileUrl}
                description={bio}
                image={image}
            />
            <ProfilePageClient />
        </>
    );
}
