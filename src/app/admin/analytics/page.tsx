import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getAnalyticsData() {
  const supabase = createServerSupabaseClient();

  // Total views (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { count: totalViews },
    { data: topArticles },
    { data: recentViews },
    ,
    { data: deviceData },
  ] = await Promise.all([
    supabase
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("articles")
      .select("id, title, slug, view_count, category:categories(name)")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(10),
    supabase
      .from("page_views")
      .select("created_at, path, referrer, device_type, utm_source")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("page_views")
      .select("referrer, utm_source")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .not("referrer", "is", null),
    supabase
      .from("page_views")
      .select("device_type")
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  // Aggregate referrer sources
  const sources: Record<string, number> = {};
  (recentViews || []).forEach((v: any) => {
    let source = "直接流入";
    if (v.utm_source === "salocheck") source = "SaloCheck";
    else if (v.referrer?.includes("google")) source = "Google";
    else if (v.referrer?.includes("yahoo")) source = "Yahoo";
    else if (v.referrer?.includes("x.com") || v.referrer?.includes("twitter")) source = "X";
    else if (v.referrer?.includes("instagram")) source = "Instagram";
    else if (v.referrer?.includes("line")) source = "LINE";
    else if (v.referrer) source = "その他";
    sources[source] = (sources[source] || 0) + 1;
  });

  // Aggregate device types
  const devices: Record<string, number> = {};
  (deviceData || []).forEach((v: any) => {
    const type = v.device_type || "unknown";
    devices[type] = (devices[type] || 0) + 1;
  });

  // Unique sessions
  const uniqueSessions = new Set((recentViews || []).map((v: any) => v.session_id || v.created_at)).size;

  return {
    totalViews: totalViews || 0,
    uniqueSessions,
    topArticles: topArticles || [],
    sources,
    devices,
  };
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">アナリティクス</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <p className="text-sm text-gray-500">PV（30日間）</p>
          <p className="text-3xl font-bold text-white mt-1">{data.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <p className="text-sm text-gray-500">UU（30日間）</p>
          <p className="text-3xl font-bold text-white mt-1">{data.uniqueSessions.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Articles */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-800">
            <h2 className="text-sm font-semibold text-gray-300">人気記事 Top 10</h2>
          </div>
          <div className="divide-y divide-dark-800">
            {data.topArticles.map((article: any, i: number) => (
              <div key={article.id} className="px-6 py-3 flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-dark-800 text-xs font-bold text-gold-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-200 truncate">{article.title}</p>
                  <p className="text-xs text-gray-600">{article.category?.name}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {article.view_count.toLocaleString()} PV
                </span>
              </div>
            ))}
            {data.topArticles.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                データがありません
              </div>
            )}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="space-y-6">
          <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-800">
              <h2 className="text-sm font-semibold text-gray-300">流入元</h2>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(data.sources)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => {
                  const total = Object.values(data.sources).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{source}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-night-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(data.sources).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">データがありません</p>
              )}
            </div>
          </div>

          {/* Device Types */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-dark-800">
              <h2 className="text-sm font-semibold text-gray-300">デバイス比率</h2>
            </div>
            <div className="p-6">
              <div className="flex gap-4">
                {Object.entries(data.devices)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(data.devices).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const labels: Record<string, string> = {
                      mobile: "モバイル",
                      desktop: "デスクトップ",
                      tablet: "タブレット",
                    };
                    return (
                      <div key={type} className="flex-1 text-center">
                        <p className="text-2xl font-bold text-white">{pct}%</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {labels[type] || type}
                        </p>
                      </div>
                    );
                  })}
              </div>
              {Object.keys(data.devices).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">データがありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
