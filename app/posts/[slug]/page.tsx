import type { Metadata } from "next";
import { ArticleJsonLd } from "components/SEO/JsonLd";

export const runtime = 'edge';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getPost(slug: string) {
  if (!supabaseUrl || !supabaseKey || !slug) return null;

  const url = new URL("/rest/v1/posts", supabaseUrl);
  url.searchParams.set("select", "title,slug,excerpt,content,image_url,author,author_avatar,category,created_at,language,translations");
  url.searchParams.set("published", "eq.true");
  url.searchParams.set("or", `(slug.eq.${slug},translations->en->>slug.eq.${slug},translations->tr->>slug.eq.${slug},translations->de->>slug.eq.${slug},translations->es->>slug.eq.${slug})`);
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
    let postData = data?.[0] || null;

    if (postData && postData.slug !== slug && postData.translations) {
      for (const lang of Object.keys(postData.translations)) {
        if (postData.translations[lang]?.slug === slug) {
          postData = {
            ...postData,
            title: postData.translations[lang].title || postData.title,
            content: postData.translations[lang].content || postData.content,
            excerpt: postData.translations[lang].excerpt || postData.excerpt,
            language: lang,
            originalLanguage: postData.language,
          };
          break;
        }
      }
    }
    return postData;
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface Post {
  title?: string;
  excerpt?: string;
  content?: string;
}

function getExcerpt(post: Post): string {
  if (post.excerpt) return stripHtml(post.excerpt).slice(0, 160);
  if (post.content) return stripHtml(post.content).slice(0, 160) + "...";
  return "Read this article on World in Making.";
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "This post could not be found on World in Making.",
    };
  }

  const title = post.title || slug;
  const description = getExcerpt(post);
  const postUrl = `${siteUrl}/posts/${slug}/`;
  const imageUrl = post.image_url || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      type: "article",
      url: postUrl,
      title,
      description,
      siteName: "World in Making",
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
      publishedTime: post.created_at,
      authors: post.author ? [post.author] : undefined,
      section: post.category || "General",
      locale: post.language || "en",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

import PostPageClient from "./page-client";

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return <PostPageClient />;
  }

  const title = post.title || slug;
  const description = getExcerpt(post);
  const postUrl = `${siteUrl}/posts/${slug}/`;
  const authorName = post.author || "World in Making";

  return (
    <>
      <ArticleJsonLd
        title={title}
        description={description}
        url={postUrl}
        image={post.image_url || undefined}
        datePublished={post.created_at || new Date().toISOString()}
        authorName={authorName}
      />
      <PostPageClient />
    </>
  );
}
