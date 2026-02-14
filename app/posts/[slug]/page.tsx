"use client";

import React, { useEffect, useMemo, useState } from "react";
import BlogPostView from "components/ReaderView/BlogPostView";
import { getPostBySlug } from "hooks/usePosts";

interface PostPageProps {
  params: { slug: string | string[] };
}

export default function PostPage({ params }: PostPageProps) {
  const slug = useMemo(
    () => (Array.isArray(params.slug) ? params.slug[0] : params.slug),
    [params.slug]
  );
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPost = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);
      const result = await getPostBySlug(slug);
      if (!isMounted) return;
      if (!result) {
        setPost(null);
        setError("Post not found");
      } else {
        setPost(result);
      }
      setLoading(false);
    };

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (!slug) {
    return (
      <main className="min-h-screen bg-light dark:bg-dark flex items-center justify-center">
        <p className="text-sm text-primary/60">Missing post slug.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-light dark:bg-dark flex items-center justify-center">
        <p className="text-sm text-primary/60">Loading post...</p>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="min-h-screen bg-light dark:bg-dark flex items-center justify-center">
        <p className="text-sm text-primary/60">{error || "Post not found."}</p>
      </main>
    );
  }

  const viewPost = {
    ...post,
    authors: [
      {
        name: post.authorName || post.author || "Unknown",
        avatar: post.authorAvatar || "",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-light dark:bg-dark">
      <div className="min-h-screen">
        <BlogPostView post={viewPost} />
      </div>
    </main>
  );
}
