import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://worldinmaking.com";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const staticRoutes = ["/", "/posts", "/questions"].map((path) => ({
  url: `${siteUrl}${path}`,
  lastModified: new Date(),
  changeFrequency: "weekly" as const,
  priority: path === "/" ? 1 : 0.7,
}));

const fetchPostSlugs = async () => {
  if (!supabaseUrl || !supabaseKey) return [];

  const url = new URL("/rest/v1/posts", supabaseUrl);
  url.searchParams.set("select", "slug,updated_at,created_at");
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
    const data = (await response.json()) as Array<{ slug: string; updated_at?: string; created_at?: string }>;
    return data
      .filter((item) => item.slug)
      .map((item) => ({
        url: `${siteUrl}/posts/${encodeURIComponent(item.slug)}`,
        lastModified: item.updated_at || item.created_at || new Date().toISOString(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchPostSlugs();
  return [...staticRoutes, ...posts];
}
