import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "text-gray-400 bg-gray-800" },
  ai_review: { label: "AIレビュー", color: "text-yellow-400 bg-yellow-900/30" },
  scheduled: { label: "予約", color: "text-blue-400 bg-blue-900/30" },
  published: { label: "公開", color: "text-green-400 bg-green-900/30" },
  archived: { label: "アーカイブ", color: "text-gray-500 bg-gray-800" },
};

async function getArticles(status?: string) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("articles")
    .select("*, category:categories(name, slug), author:authors(name)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data } = await query.limit(50);
  return data || [];
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const currentStatus = searchParams.status || "all";
  const articles = await getArticles(currentStatus);

  const filters = [
    { value: "all", label: "すべて" },
    { value: "draft", label: "下書き" },
    { value: "ai_review", label: "AIレビュー" },
    { value: "published", label: "公開中" },
    { value: "scheduled", label: "予約" },
    { value: "archived", label: "アーカイブ" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">記事管理</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-night-600 hover:bg-night-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          新規作成
        </Link>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/articles${filter.value === "all" ? "" : `?status=${filter.value}`}`}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              currentStatus === filter.value
                ? "bg-night-600 text-white"
                : "bg-dark-800 text-gray-400 hover:text-white"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* Articles Table */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">タイトル</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">カテゴリ</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 hidden md:table-cell">著者</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">ステータス</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">PV</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3 hidden sm:table-cell">作成日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {articles.map((article: any) => {
                const status = statusLabels[article.status] || statusLabels.draft;
                return (
                  <tr key={article.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="text-sm text-gray-200 hover:text-night-300 transition-colors line-clamp-1"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-500">
                        {article.category?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-500">
                        {article.author?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <span className="text-xs text-gray-500">{article.view_count}</span>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <span className="text-xs text-gray-500">
                        {new Date(article.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    記事がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
