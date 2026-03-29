import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateWebSiteJsonLd } from "@/lib/structured-data";
import { CATEGORIES, ISR_REVALIDATE_SECONDS } from "@/lib/constants";
import type { ArticleWithRelations } from "@/types/database";
import ArticleCard from "@/components/public/ArticleCard";
import PopularArticles from "@/components/public/PopularArticles";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import Link from "next/link";

export const revalidate = ISR_REVALIDATE_SECONDS;

async function getLatestArticles(): Promise<ArticleWithRelations[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(6);

  return (data || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[];
}

async function getArticlesByCategory(categorySlug: string, limit = 4): Promise<ArticleWithRelations[]> {
  const supabase = createServerSupabaseClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) return [];

  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("category_id", category.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[];
}

async function getPopularArticles(): Promise<ArticleWithRelations[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("status", "published")
    .order("view_count", { ascending: false })
    .limit(5);

  return (data || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[];
}

export default async function HomePage() {
  const [latestArticles, popularArticles] = await Promise.all([
    getLatestArticles(),
    getPopularArticles(),
  ]);

  const categoryArticles = await Promise.all(
    (["technique", "interview", "column"] as const).map(async (slug) => ({
      slug,
      ...CATEGORIES[slug],
      articles: await getArticlesByCategory(slug),
    }))
  );

  const featuredArticle = latestArticles[0];
  const recentArticles = latestArticles.slice(1);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebSiteJsonLd()),
          }}
        />

        {/* Hero */}
        <section className="gradient-night py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-5xl font-bold">
                <span className="text-white">夜ピク</span>
              </h1>
              <p className="mt-3 text-gray-400 text-sm md:text-base">
                ナイトワーカーのためのえりすぐり情報メディア
              </p>
            </div>

            {featuredArticle ? (
              <div className="max-w-4xl mx-auto">
                <ArticleCard article={featuredArticle} size="large" />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-gray-500 text-lg">Coming Soon...</p>
                <p className="text-gray-600 text-sm mt-2">記事を準備中です</p>
              </div>
            )}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="lg:flex lg:gap-10">
            {/* Main */}
            <div className="flex-1 min-w-0">
              {recentArticles.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-night-500 rounded-full" />
                    新着記事
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              )}

              {categoryArticles.map(({ slug, name, articles }) =>
                articles.length > 0 ? (
                  <section key={slug} className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                        <span className="w-1 h-5 bg-night-500 rounded-full" />
                        {name}
                      </h2>
                      <Link
                        href={`/category/${slug}`}
                        className="text-xs text-gray-500 hover:text-night-300 transition-colors"
                      >
                        もっと見る →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {articles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  </section>
                ) : null
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0 mt-12 lg:mt-0">
              <div className="sticky top-20 space-y-8">
                <PopularArticles articles={popularArticles} />
                <section>
                  <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-night-500 rounded-full" />
                    カテゴリ
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CATEGORIES).map(([slug, { name }]) => (
                      <Link
                        key={slug}
                        href={`/category/${slug}`}
                        className="px-4 py-3 text-sm text-gray-300 bg-dark-900 border border-dark-800 rounded-lg hover:border-night-500/50 hover:text-white transition-all text-center"
                      >
                        {name}
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
