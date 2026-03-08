import type { Metadata } from "next";
import { DiscussionForumPostingJsonLd } from "components/SEO/JsonLd";

export const runtime = 'edge';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getQuestion(permalink: string) {
    if (!supabaseUrl || !supabaseKey || !permalink) return null;

    const url = new URL("/rest/v1/community_posts", supabaseUrl);
    url.searchParams.set("select", "id,title,content,created_at,profiles(username)");
    url.searchParams.set("id", `eq.${permalink}`);
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

function stripHtml(html: string): string {
    return html ? html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

type Props = {
    params: Promise<{ permalink: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { permalink } = await params;
    const question = await getQuestion(permalink);

    if (!question) {
        return {
            title: "Question Not Found",
            description: "This discussion could not be found on World in Making.",
        };
    }

    const title = question.title || "Discussion";
    // The description is the start of the question
    const contentSnippet = stripHtml(question.content || "").slice(0, 160) + "...";

    // Try to find an author, supabase join with profiles returns an array or object
    const profiles = Array.isArray(question.profiles) ? question.profiles[0] : question.profiles;
    const authorName = profiles?.username || "World in Making Community";

    const description = `${authorName} asked: ${contentSnippet}`;
    const questionUrl = `${siteUrl}/questions/${permalink}/`;

    return {
        title,
        description,
        alternates: {
            canonical: questionUrl,
        },
        openGraph: {
            type: "article",
            url: questionUrl,
            title,
            description,
            siteName: "World in Making",
            publishedTime: question.created_at,
            section: "Community Questions",
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

import QuestionPermalinkPageClient from "./page-client";

export default async function QuestionPermalinkPage({ params }: Props) {
    const { permalink } = await params;
    const question = await getQuestion(permalink);

    if (!question) {
        return <QuestionPermalinkPageClient />;
    }

    const title = question.title || "Discussion";
    const contentSnippet = stripHtml(question.content || "");
    const profiles = Array.isArray(question.profiles) ? question.profiles[0] : question.profiles;
    const authorName = profiles?.username || "World in Making Community";
    const questionUrl = `${siteUrl}/questions/${permalink}/`;

    return (
        <>
            <DiscussionForumPostingJsonLd
                title={title}
                description={contentSnippet}
                url={questionUrl}
                authorName={authorName}
                datePublished={question.created_at || new Date().toISOString()}
            />
            <QuestionPermalinkPageClient />
        </>
    );
}
