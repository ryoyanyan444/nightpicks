import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL, CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categoryEntries: MetadataRoute.Sitemap = Object.keys(CATEGORIES).map((slug) => ({
    url: `${SITE_URL}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  let articleEntries: MetadataRoute.Sitemap = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = createAdminClient();
    const { data: articles } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    articleEntries = (articles || []).map((article: { slug: string; updated_at: string }) => ({
      url: `${SITE_URL}/articles/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  }

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...categoryEntries,
    ...articleEntries,
  ];
}
