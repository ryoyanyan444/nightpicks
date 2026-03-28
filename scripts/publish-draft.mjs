/**
 * drafts/*.json を読み取り、Supabase articles テーブルに投稿するスクリプト
 * GitHub Actions から呼び出される
 *
 * Usage: node scripts/publish-draft.mjs drafts/some-article.json
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/publish-draft.mjs <path-to-json>");
  process.exit(1);
}

const draft = JSON.parse(readFileSync(filePath, "utf-8"));

// Read .md file for content if not in JSON
let content = draft.content;
if (!content) {
  const mdPath = filePath.replace(/\.json$/, ".md");
  try {
    content = readFileSync(mdPath, "utf-8");
  } catch {
    console.error(`No content in JSON and no .md file found: ${mdPath}`);
    process.exit(1);
  }
}

// Resolve category_slug → category_id
const { data: category, error: catErr } = await supabase
  .from("categories")
  .select("id")
  .eq("slug", draft.category_slug)
  .single();

if (catErr || !category) {
  console.error(`Category not found: ${draft.category_slug}`, catErr?.message);
  process.exit(1);
}

// Get AI author
const { data: author } = await supabase
  .from("authors")
  .select("id")
  .eq("is_ai", true)
  .single();

// Check for duplicate slug
const { data: existing } = await supabase
  .from("articles")
  .select("id")
  .eq("slug", draft.slug)
  .single();

if (existing) {
  console.log(`Article already exists: ${draft.slug} — skipping`);
  process.exit(0);
}

// Append sources to content
const sourcesSection =
  draft.sources && draft.sources.length > 0
    ? `\n\n---\n\n## 参考文献・出典\n\n${draft.sources.map((s) => `- [${s.title}](${s.url})（${s.accessed_at} アクセス）`).join("\n")}`
    : "";

const fullContent = content + sourcesSection;

// Insert article
const { data: article, error: insertErr } = await supabase
  .from("articles")
  .insert({
    title: draft.title,
    subtitle: draft.subtitle || "",
    slug: draft.slug,
    content: fullContent,
    excerpt: draft.excerpt,
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
    seo_keywords: draft.seo_keywords,
    category_id: category.id,
    author_id: author?.id || null,
    status: "published",
    published_at: new Date().toISOString(),
    ai_generated: true,
    ai_prompt: draft.topic,
    ai_model: "claude-cowork",
  })
  .select()
  .single();

if (insertErr) {
  console.error("Failed to insert article:", insertErr.message);
  process.exit(1);
}

// Save fact-check review if available
if (draft.fact_check) {
  const reviewComments = [
    draft.fact_check.notes,
    "",
    "--- 検証結果 ---",
    ...draft.fact_check.claims_verified.map(
      (c) => `[${c.verified ? "OK" : "NG"}] ${c.claim} (出典: ${c.source})`
    ),
    "",
    `[自動ファクトチェック by claude-cowork]`,
  ].join("\n");

  await supabase.from("article_reviews").insert({
    article_id: article.id,
    review_type: "fact_check",
    status: draft.fact_check.status === "approved" ? "approved" : "needs_revision",
    comments: reviewComments,
  });
}

console.log(`Published: "${draft.title}" (${article.id})`);
