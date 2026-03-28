"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAndSaveArticle, generateOutlineAction } from "@/actions/ai-generate";
import { createClient } from "@/lib/supabase/client";
import type { Category, Author } from "@/types/database";

export default function AiGeneratePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [step, setStep] = useState<"input" | "outline" | "generating" | "done">("input");
  const [outline, setOutline] = useState<any>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("authors").select("*").order("name"),
    ]).then(([catRes, authRes]) => {
      setCategories(catRes.data || []);
      setAuthors(authRes.data || []);
      // Default to AI author
      const aiAuthor = authRes.data?.find((a) => a.is_ai);
      if (aiAuthor) setAuthorId(aiAuthor.id);
    });
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleGenerateOutline = () => {
    if (!topic.trim() || !categoryId) {
      setError("テーマとカテゴリを入力してください");
      return;
    }
    setError("");
    setStep("outline");

    startTransition(async () => {
      const res = await generateOutlineAction(topic, selectedCategory?.slug || "");
      if (res.error) {
        setError(res.error);
        setStep("input");
      } else {
        setOutline(res.data);
      }
    });
  };

  const handleGenerate = () => {
    setError("");
    setStep("generating");

    startTransition(async () => {
      const res = await generateAndSaveArticle({
        topic,
        category_slug: selectedCategory?.slug || "",
        category_id: categoryId,
        author_id: authorId,
      });

      if ("error" in res && res.error) {
        setError(res.error);
        setStep("outline");
      } else if ("data" in res) {
        setResult(res.data);
        setStep("done");
      }
    });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">AI記事生成</h1>
      <p className="text-sm text-gray-500 mb-8">
        テーマを入力するとAIが自動で記事を生成します。生成後は「AIレビュー」ステータスで保存されます。
      </p>

      {error && (
        <div className="mb-6 p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Input */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">テーマ設定</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">テーマ / キーワード</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: ホスト初心者が最初の1ヶ月で指名を取るコツ"
              disabled={step !== "input"}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-night-500 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">カテゴリ</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={step !== "input"}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-night-500 disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">著者</label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                disabled={step !== "input"}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-night-500 disabled:opacity-50"
              >
                <option value="">選択してください</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {step === "input" && (
            <button
              onClick={handleGenerateOutline}
              disabled={isPending}
              className="w-full py-3 bg-night-600 hover:bg-night-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              構成を生成する
            </button>
          )}
        </div>
      </div>

      {/* Step 2: Outline Preview */}
      {(step === "outline" || step === "generating" || step === "done") && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">生成された構成</h2>
          {outline ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500">タイトル:</span>
                <p className="text-white font-bold">{outline.title}</p>
              </div>
              {outline.subtitle && (
                <div>
                  <span className="text-xs text-gray-500">サブタイトル:</span>
                  <p className="text-gray-300">{outline.subtitle}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">構成:</span>
                <ul className="mt-1 space-y-1">
                  {outline.headings?.map((h: any, i: number) => (
                    <li
                      key={i}
                      className={`text-sm text-gray-300 ${h.level === 3 ? "ml-4" : ""}`}
                    >
                      {h.level === 2 ? "■" : "└"} {h.text}
                    </li>
                  ))}
                </ul>
              </div>
              {outline.summary && (
                <div>
                  <span className="text-xs text-gray-500">概要:</span>
                  <p className="text-sm text-gray-400">{outline.summary}</p>
                </div>
              )}

              {step === "outline" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setStep("input");
                      setOutline(null);
                    }}
                    className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    やり直す
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-night-600 hover:bg-night-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    記事を生成する
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-night-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-gray-400">構成を生成中...</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Generating */}
      {step === "generating" && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-night-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-gray-400">記事を生成中...</span>
          </div>
          <p className="text-xs text-gray-600 text-center">
            構成生成 → 本文生成 → SEO情報生成の3ステップで処理しています
          </p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="bg-dark-900 border border-green-800/50 rounded-xl p-6">
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">記事が生成されました</h3>
            <p className="text-sm text-gray-400 mt-1">
              「AIレビュー」ステータスで保存されています
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => {
                  setStep("input");
                  setOutline(null);
                  setResult(null);
                  setTopic("");
                }}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                別の記事を生成
              </button>
              <button
                onClick={() => router.push(`/admin/articles/${result.id}`)}
                className="px-4 py-2 bg-night-600 hover:bg-night-500 text-white text-sm rounded-lg transition-colors"
              >
                記事を編集する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
