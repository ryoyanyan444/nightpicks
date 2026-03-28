"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArticle, updateArticle, deleteArticle, updateArticleStatus, uploadImage } from "@/actions/articles";
import type { Article, Category, Author, Tag } from "@/types/database";
import type { ArticleStatus } from "@/types/database";

interface ArticleFormProps {
  article?: Article & { tags?: Tag[] };
  categories: Category[];
  authors: Author[];
  tags: Tag[];
}

export default function ArticleForm({ article, categories, authors, tags }: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    subtitle: article?.subtitle || "",
    content: article?.content || "",
    excerpt: article?.excerpt || "",
    category_id: article?.category_id || "",
    author_id: article?.author_id || "",
    seo_title: article?.seo_title || "",
    seo_description: article?.seo_description || "",
    seo_keywords: article?.seo_keywords?.join(", ") || "",
    thumbnail_url: article?.thumbnail_url || "",
    ogp_image_url: article?.ogp_image_url || "",
    tag_ids: article?.tags?.map((t) => t.id) || ([] as string[]),
  });

  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    handleChange("slug", slug || `article-${Date.now()}`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "thumbnail_url" | "ogp_image_url") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadImage(formData);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      handleChange(field, result.url);
    }
  };

  const handleSubmit = (status?: ArticleStatus) => {
    setError("");

    if (!form.title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    if (!form.slug.trim()) {
      setError("スラッグは必須です");
      return;
    }
    if (!form.content.trim()) {
      setError("本文は必須です");
      return;
    }

    startTransition(async () => {
      const input = {
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle || undefined,
        content: form.content,
        excerpt: form.excerpt || undefined,
        category_id: form.category_id || undefined,
        author_id: form.author_id || undefined,
        seo_title: form.seo_title || undefined,
        seo_description: form.seo_description || undefined,
        seo_keywords: form.seo_keywords
          ? form.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : undefined,
        thumbnail_url: form.thumbnail_url || undefined,
        ogp_image_url: form.ogp_image_url || undefined,
        tag_ids: form.tag_ids,
        status: status || (article?.status as ArticleStatus) || "draft",
        published_at: status === "published" ? new Date().toISOString() : undefined,
      };

      const result = article
        ? await updateArticle(article.id, input)
        : await createArticle(input);

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/admin/articles");
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!article || !confirm("この記事を削除しますか？")) return;

    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/admin/articles");
        router.refresh();
      }
    });
  };

  const handleStatusChange = (status: ArticleStatus) => {
    if (!article) return;
    startTransition(async () => {
      const result = await updateArticleStatus(article.id, status);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-5xl">
      {error && (
        <div className="mb-6 p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="記事タイトル"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-lg text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-night-500"
            />
          </div>

          {/* Slug */}
          <div className="flex gap-2">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              placeholder="url-slug"
              className="flex-1 px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500"
            />
            <button
              type="button"
              onClick={generateSlug}
              className="px-3 py-2 text-xs text-gray-400 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
            >
              自動生成
            </button>
          </div>

          {/* Subtitle */}
          <div>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              placeholder="サブタイトル（任意）"
              className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500"
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">本文（Markdown）</label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-gray-500 hover:text-night-300 transition-colors"
              >
                {showPreview ? "エディタ" : "プレビュー"}
              </button>
            </div>
            {showPreview ? (
              <div
                className="article-content min-h-[400px] p-4 bg-dark-900 border border-dark-700 rounded-lg overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            ) : (
              <textarea
                value={form.content}
                onChange={(e) => handleChange("content", e.target.value)}
                placeholder="Markdownで記事を書く..."
                rows={20}
                className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500 font-mono resize-y"
              />
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">抜粋</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => handleChange("excerpt", e.target.value)}
              placeholder="記事の要約（一覧表示やOGPで使用）"
              rows={3}
              className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500 resize-y"
            />
          </div>

          {/* SEO Section */}
          <details className="bg-dark-900 border border-dark-800 rounded-xl">
            <summary className="px-4 py-3 text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              SEO設定
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <input
                type="text"
                value={form.seo_title}
                onChange={(e) => handleChange("seo_title", e.target.value)}
                placeholder="SEOタイトル（未設定ならタイトルを使用）"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500"
              />
              <textarea
                value={form.seo_description}
                onChange={(e) => handleChange("seo_description", e.target.value)}
                placeholder="SEOディスクリプション"
                rows={2}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500 resize-y"
              />
              <input
                type="text"
                value={form.seo_keywords}
                onChange={(e) => handleChange("seo_keywords", e.target.value)}
                placeholder="キーワード（カンマ区切り）"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-night-500"
              />
            </div>
          </details>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={isPending}
              className="w-full py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "保存中..." : "下書き保存"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("published")}
              disabled={isPending}
              className="w-full py-2.5 bg-night-600 hover:bg-night-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "保存中..." : "公開する"}
            </button>
            {article && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full py-2 text-red-400 hover:text-red-300 text-xs transition-colors disabled:opacity-50"
              >
                記事を削除
              </button>
            )}
          </div>

          {/* Status (existing article) */}
          {article && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
              <label className="text-xs text-gray-500 block mb-2">ステータス変更</label>
              <select
                value={article.status}
                onChange={(e) => handleStatusChange(e.target.value as ArticleStatus)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-night-500"
              >
                <option value="draft">下書き</option>
                <option value="ai_review">AIレビュー</option>
                <option value="scheduled">予約</option>
                <option value="published">公開</option>
                <option value="archived">アーカイブ</option>
              </select>
            </div>
          )}

          {/* Category */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <label className="text-xs text-gray-500 block mb-2">カテゴリ</label>
            <select
              value={form.category_id}
              onChange={(e) => handleChange("category_id", e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-night-500"
            >
              <option value="">カテゴリを選択</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <label className="text-xs text-gray-500 block mb-2">著者</label>
            <select
              value={form.author_id}
              onChange={(e) => handleChange("author_id", e.target.value)}
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-night-500"
            >
              <option value="">著者を選択</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <label className="text-xs text-gray-500 block mb-2">タグ</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = form.tag_ids.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      handleChange(
                        "tag_ids",
                        isSelected
                          ? form.tag_ids.filter((id) => id !== tag.id)
                          : [...form.tag_ids, tag.id]
                      );
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      isSelected
                        ? "bg-night-600 text-white"
                        : "bg-dark-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
              {tags.length === 0 && (
                <p className="text-xs text-gray-600">タグがありません</p>
              )}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <label className="text-xs text-gray-500 block mb-2">サムネイル画像</label>
            {form.thumbnail_url && (
              <img
                src={form.thumbnail_url}
                alt="Thumbnail"
                className="w-full aspect-video object-cover rounded-lg mb-2"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "thumbnail_url")}
              className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-dark-700 file:text-gray-300 hover:file:bg-dark-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
