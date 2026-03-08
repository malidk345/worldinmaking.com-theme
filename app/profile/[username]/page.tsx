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
    const image = profile?.avatar_url || undefined;

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
            ...(image && { images: [{ url: image }] }),
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export { default } from "./page-client";
