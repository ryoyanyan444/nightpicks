import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateCategoryMetadata } from "@/lib/seo";
import { CATEGORIES, ARTICLES_PER_PAGE, ISR_REVALIDATE_SECONDS } from "@/lib/constants";
import type { CategorySlug } from "@/lib/constants";
import type { ArticleWithRelations } from "@/types/database";
import ArticleCard from "@/components/public/ArticleCard";
import Pagination from "@/components/ui/Pagination";

export const revalidate = ISR_REVALIDATE_SECONDS;

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const category = CATEGORIES[params.slug as CategorySlug];
  if (!category) return {};
  return generateCategoryMetadata(category.name, params.slug);
}

async function getCategoryArticles(slug: string, page: number) {
  const supabase = createServerSupabaseClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!category) return null;

  const from = (page - 1) * ARTICLES_PER_PAGE;
  const to = from + ARTICLES_PER_PAGE - 1;

  const { data: articles, count } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)", { count: "exact" })
    .eq("category_id", category.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  return {
    category,
    articles: (articles || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[],
    totalCount: count || 0,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const result = await getCategoryArticles(params.slug, page);

  if (!result) notFound();

  const { category, articles, totalCount } = result;
  const totalPages = Math.ceil(totalCount / ARTICLES_PER_PAGE);
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <a href="/" className="hover:text-night-300">トップ</a>
          <span>/</span>
          <span className="text-gray-400">{category.name}</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-gray-400">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">{totalCount}件の記事</p>
      </div>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500">記事がまだありません</p>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={`/category/${params.slug}`}
      />
    </div>
  );
}
