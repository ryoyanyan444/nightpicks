"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ArticleStatus } from "@/types/database";

interface CreateArticleInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  subtitle?: string;
  category_id?: string;
  author_id?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  ogp_image_url?: string;
  thumbnail_url?: string;
  status?: ArticleStatus;
  published_at?: string;
  ai_generated?: boolean;
  ai_prompt?: string;
  ai_model?: string;
  tag_ids?: string[];
}

export async function createArticle(input: CreateArticleInput) {
  const supabase = createServerSupabaseClient();
  const { tag_ids, ...articleData } = input;

  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      ...articleData,
      status: articleData.status || "draft",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Link tags
  if (tag_ids && tag_ids.length > 0) {
    await supabase.from("article_tags").insert(
      tag_ids.map((tag_id) => ({
        article_id: article.id,
        tag_id,
      }))
    );
  }

  revalidatePath("/admin/articles");
  return { data: article };
}

export async function updateArticle(id: string, input: Partial<CreateArticleInput>) {
  const supabase = createServerSupabaseClient();
  const { tag_ids, ...articleData } = input;

  const { data: article, error } = await supabase
    .from("articles")
    .update(articleData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Update tags if provided
  if (tag_ids !== undefined) {
    await supabase.from("article_tags").delete().eq("article_id", id);
    if (tag_ids.length > 0) {
      await supabase.from("article_tags").insert(
        tag_ids.map((tag_id) => ({
          article_id: id,
          tag_id,
        }))
      );
    }
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/articles/${article.slug}`);
  return { data: article };
}

export async function deleteArticle(id: string) {
  const supabase = createServerSupabaseClient();

  const { data: article } = await supabase
    .from("articles")
    .select("slug")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/articles");
  if (article) {
    revalidatePath(`/articles/${article.slug}`);
  }
  return { success: true };
}

export async function updateArticleStatus(id: string, status: ArticleStatus) {
  const supabase = createServerSupabaseClient();

  const updateData: Record<string, any> = { status };
  if (status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { data: article, error } = await supabase
    .from("articles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/articles/${article.slug}`);
  revalidatePath("/");
  return { data: article };
}

export async function uploadImage(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const file = formData.get("file") as File;
  if (!file) return { error: "ファイルが選択されていません" };

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `articles/${fileName}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (error) {
    return { error: error.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  return { url: publicUrl };
}
