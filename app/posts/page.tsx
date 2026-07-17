import type { Metadata } from "next";
import PostsPageClient from "./page-client";

export const metadata: Metadata = {
    title: "Posts",
    description:
        "Read articles on product, engineering, and community — stories, tools, and insights from World in Making.",
    alternates: {
        canonical: "/posts/",
    },
    openGraph: {
        type: "website",
        title: "Posts | World in Making",
        description:
            "Read articles on product, engineering, and community — stories, tools, and insights from World in Making.",
    },
};

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function fetchFromSupabase(table: string, select: string, filters?: Record<string, string>) {
  if (!supabaseUrl || !supabaseKey) return [];

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("select", select);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Also only fetch published posts
  url.searchParams.set("published", "eq.true");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

import Link from 'next/link'

export default async function PostsPage() {
    const posts = await fetchFromSupabase("posts", "id,title,slug,translations,excerpt") as Array<{ id: number, title?: string, slug: string, excerpt?: string, translations?: Record<string, { slug?: string, title?: string }> }>;
    return (
        <>
            <PostsPageClient />
            <ul className="sr-only">
                {posts.map(post => (
                    <li key={post.id}>
                        <Link href={`/posts/${encodeURIComponent(post.slug)}`}>{post.title || post.slug}</Link>
                        {post.excerpt && <p>{post.excerpt}</p>}
                    </li>
                ))}
            </ul>
        </>
    )
}
