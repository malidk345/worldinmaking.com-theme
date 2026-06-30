import type { Metadata } from "next";
import { ArticleJsonLd } from "components/SEO/JsonLd";
import PostPageClient from "./page-client";

export const runtime = 'edge';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getPost(slug: string) {
  if (!supabaseUrl || !supabaseKey || !slug) return null;

  const url = new URL("/rest/v1/posts", supabaseUrl);
  url.searchParams.set("select", "id,title,slug,excerpt,content,image_url,author,author_avatar,category,tags,created_at,updated_at,language,translations");
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
    
    // Markdown parsing is handled client-side in ReaderView/BlogPostView components
    // using the already-installed react-markdown library.
    
    return postData;
  } catch {
    return null;
  }
}

function stripHtml(htmlStr: string): string {
  return htmlStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  const imageUrl = post.image_url ? post.image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + (post.image_url.includes('?') ? '&' : '?') + 'width=1200&quality=80&format=webp' : undefined;
  const keywords = post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(",")) : [];

  const languages: Record<string, string> = {
    en: `${siteUrl}/posts/${slug}/`,
  };

  if (post.translations) {
    Object.entries(post.translations).forEach(([lang, value]) => {
      const trans = value as Record<string, unknown>;
      if (trans && typeof trans.slug === 'string') {
        languages[lang] = `${siteUrl}/posts/${encodeURIComponent(trans.slug)}/`;
      }
    });
  }

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: postUrl,
      languages: languages,
    },
    openGraph: {
      type: "article",
      url: postUrl,
      title,
      description,
      siteName: "World in Making",
      images: [{ url: imageUrl || `${siteUrl}/api/og?title=${encodeURIComponent(title)}&author=${encodeURIComponent(post.author || "World in Making")}`, width: 1200, height: 630, alt: title }],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: post.author ? [post.author] : undefined,
      section: post.category || "General",
      tags: keywords,
      locale: post.language || "en",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl || `${siteUrl}/api/og?title=${encodeURIComponent(title)}&author=${encodeURIComponent(post.author || "World in Making")}`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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
  const keywords = post.tags ? (Array.isArray(post.tags) ? post.tags : post.tags.split(",")) : [];

  const adaptedPost = {
    ...post,
    date: post.created_at,
    image: post.image_url,
    authors: [{ name: authorName, avatar: post.author_avatar, username: authorName }],
    headings: [],
  };

  return (
    <>
      <ArticleJsonLd
        title={title}
        description={description}
        url={postUrl}
        image={post.image_url || undefined}
        datePublished={post.created_at || new Date().toISOString()}
        dateModified={post.updated_at || post.created_at}
        authorName={authorName}
        keywords={keywords}
      />
      <PostPageClient initialPost={adaptedPost} />
    </>
  );
}
