/**
 * ファクトチェック済み記事をSupabaseに保存するCLIスクリプト
 * Claude Coworkエージェントから呼び出される
 *
 * Usage:
 *   npx tsx scripts/save-factchecked-article.ts < article.json
 *
 * 入力JSON形式:
 * {
 *   "title": "記事タイトル",
 *   "subtitle": "サブタイトル",
 *   "content": "Markdown本文",
 *   "excerpt": "要約",
 *   "slug": "url-slug",
 *   "seo_title": "SEOタイトル",
 *   "seo_description": "メタディスクリプション",
 *   "seo_keywords": ["kw1", "kw2"],
 *   "category_slug": "news",
 *   "topic": "元のトピック",
 *   "sources": [
 *     { "url": "https://...", "title": "ソース名", "accessed_at": "2026-03-28" }
 *   ],
 *   "fact_check": {
 *     "status": "approved" | "needs_revision",
 *     "notes": "ファクトチェックの詳細",
 *     "claims_verified": [
 *       { "claim": "主張内容", "source": "根拠URL", "verified": true }
 *     ]
 *   }
 * }
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ArticleInput {
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  category_slug: string;
  topic: string;
  sources: { url: string; title: string; accessed_at: string }[];
  fact_check: {
    status: "approved" | "needs_revision";
    notes: string;
    claims_verified: { claim: string; source: string; verified: boolean }[];
  };
}

async function main() {
  // Read JSON from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input: ArticleInput = JSON.parse(Buffer.concat(chunks).toString());

  // Get category ID
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", input.category_slug)
    .single();

  if (!category) {
    console.error(`Category not found: ${input.category_slug}`);
    process.exit(1);
  }

  // Get AI author
  const { data: author } = await supabase
    .from("authors")
    .select("id")
    .eq("is_ai", true)
    .single();

  if (!author) {
    console.error("AI author not found");
    process.exit(1);
  }

  // Ensure unique slug
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", input.slug)
    .single();

  const slug = existing
    ? `${input.slug}-${Date.now().toString(36)}`
    : input.slug;

  // Append sources section to content
  const sourcesSection = input.sources.length > 0
    ? `\n\n---\n\n## 参考文献・出典\n\n${input.sources.map((s) => `- [${s.title}](${s.url})（${s.accessed_at} アクセス）`).join("\n")}`
    : "";

  const contentWithSources = input.content + sourcesSection;

  // Save article
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .insert({
      title: input.title,
      subtitle: input.subtitle || "",
      slug,
      content: contentWithSources,
      excerpt: input.excerpt,
      seo_title: input.seo_title,
      seo_description: input.seo_description,
      seo_keywords: input.seo_keywords,
      category_id: category.id,
      author_id: author.id,
      status: "ai_review",
      ai_generated: true,
      ai_prompt: input.topic,
      ai_model: "claude-cowork-factcheck",
    })
    .select()
    .single();

  if (articleError) {
    console.error("Failed to save article:", articleError.message);
    process.exit(1);
  }

  // Save fact-check review
  const reviewComments = [
    input.fact_check.notes,
    "",
    "--- 検証結果 ---",
    ...input.fact_check.claims_verified.map(
      (c) => `[${c.verified ? "OK" : "NG"}] ${c.claim} (出典: ${c.source})`
    ),
    "",
    "--- ソース ---",
    ...input.sources.map((s) => `- ${s.title}: ${s.url}`),
    "",
    "[自動ファクトチェック by claude-cowork]",
  ].join("\n");

  const { error: reviewError } = await supabase
    .from("article_reviews")
    .insert({
      article_id: article.id,
      review_type: "fact_check",
      status: input.fact_check.status === "approved" ? "approved" : "needs_revision",
      comments: reviewComments,
    });

  if (reviewError) {
    console.error("Warning: Failed to save review:", reviewError.message);
  }

  // Save AI generation log
  await supabase.from("ai_generation_logs").insert({
    article_id: article.id,
    step: "fact_check",
    model: "claude-cowork",
    prompt_tokens: 0,
    completion_tokens: 0,
    total_cost_usd: 0,
  });

  console.log(JSON.stringify({
    success: true,
    article_id: article.id,
    slug,
    fact_check_status: input.fact_check.status,
    claims_count: input.fact_check.claims_verified.length,
    verified_count: input.fact_check.claims_verified.filter((c) => c.verified).length,
  }));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
