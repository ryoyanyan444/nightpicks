"use server";

import { generateFullArticle, generateOutline } from "@/lib/ai/pipeline";
import { createArticle } from "./articles";

interface GenerateArticleInput {
  topic: string;
  category_slug: string;
  category_id: string;
  author_id: string;
}

export async function generateAndSaveArticle(input: GenerateArticleInput) {
  try {
    const article = await generateFullArticle(input.topic, input.category_slug);

    const result = await createArticle({
      title: article.title,
      slug: article.slug,
      subtitle: article.subtitle,
      content: article.content,
      excerpt: article.excerpt,
      seo_title: article.seo_title,
      seo_description: article.seo_description,
      seo_keywords: article.seo_keywords,
      category_id: input.category_id,
      author_id: input.author_id,
      status: "ai_review",
      ai_generated: true,
      ai_prompt: input.topic,
      ai_model: "claude-sonnet-4-20250514",
    });

    return result;
  } catch (error: any) {
    return { error: error.message || "記事生成に失敗しました" };
  }
}

export async function generateOutlineAction(topic: string, categorySlug: string) {
  try {
    const outline = await generateOutline(topic, categorySlug);
    return { data: outline };
  } catch (error: any) {
    return { error: error.message || "構成生成に失敗しました" };
  }
}
