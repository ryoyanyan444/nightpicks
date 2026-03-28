"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { publishArticle, rejectArticle } from "@/actions/review";

interface ReviewArticle {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  excerpt: string;
  content: string;
  category: { name: string; slug: string } | null;
  author: { name: string } | null;
  ai_prompt: string;
  seo_keywords: string[];
  created_at: string;
  fact_check?: {
    status: string;
    comments: string;
  };
}

export default function ReviewPage() {
  const [articles, setArticles] = useState<ReviewArticle[]>([]);
  const [selected, setSelected] = useState<ReviewArticle | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("articles")
      .select("id, title, subtitle, slug, excerpt, content, ai_prompt, seo_keywords, created_at, category:categories(name, slug), author:authors(name)")
      .eq("status", "ai_review")
      .order("created_at", { ascending: false });

    if (!data) return;

    // Load fact-check reviews
    const articlesWithReviews = await Promise.all(
      data.map(async (article: any) => {
        const { data: review } = await supabase
          .from("article_reviews")
          .select("status, comments")
          .eq("article_id", article.id)
          .eq("review_type", "fact_check")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return { ...article, fact_check: review || null };
      })
    );

    setArticles(articlesWithReviews);
    if (articlesWithReviews.length > 0 && !selected) {
      setSelected(articlesWithReviews[0]);
    }
  }

  function handlePublish(id: string) {
    startTransition(async () => {
      const result = await publishArticle(id);
      if (result.error) {
        setMessage(`エラー: ${result.error}`);
      } else {
        setMessage("公開しました");
        setSelected(null);
        loadArticles();
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const result = await rejectArticle(id);
      if (result.error) {
        setMessage(`エラー: ${result.error}`);
      } else {
        setMessage("アーカイブしました");
        setSelected(null);
        loadArticles();
      }
    });
  }

  const readingMinutes = selected
    ? Math.max(1, Math.ceil(selected.content.length / 500))
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">レビュー</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI生成記事を確認してワンクリックで公開
          </p>
        </div>
        <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded-full">
          {articles.length}件 待ち
        </span>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 bg-night-600/20 text-night-300 text-sm rounded-lg">
          {message}
        </div>
      )}

      {articles.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">レビュー待ちの記事はありません</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Article List */}
          <div className="w-80 flex-shrink-0 space-y-2">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => { setSelected(article); setMessage(""); }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  selected?.id === article.id
                    ? "bg-dark-800 border-night-500/50"
                    : "bg-dark-900 border-dark-800 hover:border-dark-700"
                }`}
              >
                <p className="text-sm text-gray-200 line-clamp-2">{article.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">
                    {article.category?.name || "-"}
                  </span>
                  {article.fact_check && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        article.fact_check.status === "approved"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {article.fact_check.status === "approved" ? "検証OK" : "要確認"}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Article Detail */}
          {selected && (
            <div className="flex-1 min-w-0">
              <div className="bg-dark-900 border border-dark-800 rounded-xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-dark-800">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-white">
                        {selected.title}
                      </h2>
                      {selected.subtitle && (
                        <p className="text-sm text-gray-400 mt-1">
                          {selected.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleReject(selected.id)}
                        disabled={isPending}
                        className="px-4 py-2 text-sm text-gray-400 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        却下
                      </button>
                      <button
                        onClick={() => handlePublish(selected.id)}
                        disabled={isPending}
                        className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isPending ? "処理中..." : "公開する"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{selected.category?.name}</span>
                    <span>{readingMinutes}分で読める</span>
                    <span>{selected.author?.name}</span>
                    <span>
                      {new Date(selected.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>

                {/* Fact Check */}
                {selected.fact_check && (
                  <div className="px-6 py-4 border-b border-dark-800">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                      ファクトチェック
                    </h3>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans leading-relaxed bg-dark-950 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {selected.fact_check.comments}
                    </pre>
                  </div>
                )}

                {/* Excerpt */}
                <div className="px-6 py-4 border-b border-dark-800">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    要約
                  </h3>
                  <p className="text-sm text-gray-400">{selected.excerpt}</p>
                </div>

                {/* SEO Keywords */}
                {selected.seo_keywords?.length > 0 && (
                  <div className="px-6 py-4 border-b border-dark-800">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                      SEOキーワード
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.seo_keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 text-xs bg-dark-800 text-gray-400 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Preview */}
                <div className="px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    本文プレビュー
                  </h3>
                  <div className="text-sm text-gray-400 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {selected.content}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
