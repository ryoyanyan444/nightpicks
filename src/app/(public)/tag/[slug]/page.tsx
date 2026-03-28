import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ARTICLES_PER_PAGE, ISR_REVALIDATE_SECONDS } from "@/lib/constants";
import type { ArticleWithRelations } from "@/types/database";
import ArticleCard from "@/components/public/ArticleCard";
import Pagination from "@/components/ui/Pagination";

export const revalidate = ISR_REVALIDATE_SECONDS;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: tag } = await supabase
    .from("tags")
    .select("name")
    .eq("slug", params.slug)
    .single();

  if (!tag) return {};
  return {
    title: `#${tag.name} の記事一覧`,
    description: `「${tag.name}」タグの記事一覧`,
  };
}

async function getTagArticles(slug: string, page: number) {
  const supabase = createServerSupabaseClient();

  const { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tag) return null;

  const from = (page - 1) * ARTICLES_PER_PAGE;
  const to = from + ARTICLES_PER_PAGE - 1;

  const { data: articleTags, count } = await supabase
    .from("article_tags")
    .select("article_id", { count: "exact" })
    .eq("tag_id", tag.id);

  if (!articleTags || articleTags.length === 0) {
    return { tag, articles: [] as ArticleWithRelations[], totalCount: 0 };
  }

  const articleIds = articleTags.map((at) => at.article_id);

  const { data: articles } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .in("id", articleIds)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, to);

  return {
    tag,
    articles: (articles || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[],
    totalCount: count || 0,
  };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const result = await getTagArticles(params.slug, page);

  if (!result) notFound();

  const { tag, articles, totalCount } = result;
  const totalPages = Math.ceil(totalCount / ARTICLES_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <a href="/" className="hover:text-night-300">トップ</a>
          <span>/</span>
          <span className="text-gray-400">#{tag.name}</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold text-white">#{tag.name}</h1>
        <p className="mt-2 text-sm text-gray-500">{totalCount}件の記事</p>
      </div>

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
        basePath={`/tag/${params.slug}`}
      />
    </div>
  );
}
