import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ARTICLES_PER_PAGE } from "@/lib/constants";
import type { ArticleWithRelations } from "@/types/database";
import ArticleCard from "@/components/public/ArticleCard";
import SearchBar from "@/components/public/SearchBar";

export const metadata = {
  title: "検索",
  description: "記事を検索",
};

async function searchArticles(query: string): Promise<ArticleWithRelations[]> {
  if (!query.trim()) return [];

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("status", "published")
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order("published_at", { ascending: false })
    .limit(ARTICLES_PER_PAGE);

  return (data || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || "";
  const articles = await searchArticles(query);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">検索</h1>

      <SearchBar defaultValue={query} />

      {query && (
        <p className="mt-6 text-sm text-gray-500">
          「{query}」の検索結果: {articles.length}件
        </p>
      )}

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-20">
          <p className="text-gray-500">検索結果が見つかりませんでした</p>
        </div>
      ) : null}
    </div>
  );
}
