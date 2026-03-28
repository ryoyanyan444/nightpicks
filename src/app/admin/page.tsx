import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

async function getDashboardStats() {
  const supabase = createServerSupabaseClient();

  const [
    { count: totalArticles },
    { count: publishedArticles },
    { count: draftArticles },
  ] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  const { data: recentArticles } = await supabase
    .from("articles")
    .select("id, title, slug, status, published_at, created_at, view_count")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    totalArticles: totalArticles || 0,
    publishedArticles: publishedArticles || 0,
    draftArticles: draftArticles || 0,
    recentArticles: recentArticles || [],
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "text-gray-400 bg-gray-800" },
  ai_review: { label: "AIレビュー", color: "text-yellow-400 bg-yellow-900/30" },
  scheduled: { label: "予約", color: "text-blue-400 bg-blue-900/30" },
  published: { label: "公開", color: "text-green-400 bg-green-900/30" },
  archived: { label: "アーカイブ", color: "text-gray-500 bg-gray-800" },
};

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-night-600 hover:bg-night-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          新規記事作成
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "総記事数", value: stats.totalArticles, color: "text-white" },
          { label: "公開中", value: stats.publishedArticles, color: "text-green-400" },
          { label: "下書き", value: stats.draftArticles, color: "text-gray-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-dark-900 border border-dark-800 rounded-xl p-6"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Articles */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-800">
          <h2 className="text-sm font-semibold text-gray-300">最近の記事</h2>
        </div>
        <div className="divide-y divide-dark-800">
          {stats.recentArticles.length > 0 ? (
            stats.recentArticles.map((article: any) => {
              const status = statusLabels[article.status] || statusLabels.draft;
              return (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-dark-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 truncate">{article.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(article.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-xs text-gray-500">
                      {article.view_count} PV
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              記事がまだありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
