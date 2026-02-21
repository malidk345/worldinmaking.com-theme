import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: `${siteUrl}/posts`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${siteUrl}/questions`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  },
];

async function fetchFromSupabase(table: string, select: string, filters?: Record<string, string>) {
  if (!supabaseUrl || !supabaseKey) return [];

  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("select", select);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

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

async function getPostRoutes(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchFromSupabase(
    "posts",
    "slug,created_at",
    { published: "eq.true" }
  ) as Array<{ slug: string; created_at?: string }>;

  return data
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${siteUrl}/posts/${encodeURIComponent(item.slug)}`,
      lastModified: item.created_at ? new Date(item.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
}

async function getQuestionTopicRoutes(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchFromSupabase(
    "community_channels",
    "slug"
  ) as Array<{ slug: string }>;

  return data
    .filter((item) => item.slug)
    .map((item) => ({
      url: `${siteUrl}/questions/topic/${encodeURIComponent(item.slug)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
}

async function getProfileRoutes(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchFromSupabase(
    "profiles",
    "username"
  ) as Array<{ username: string }>;

  return data
    .filter((item) => item.username)
    .map((item) => ({
      url: `${siteUrl}/profile/${encodeURIComponent(item.username)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, topics, profiles] = await Promise.all([
    getPostRoutes(),
    getQuestionTopicRoutes(),
    getProfileRoutes(),
  ]);

  return [...staticRoutes, ...posts, ...topics, ...profiles];
}
