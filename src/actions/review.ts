"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishArticle(id: string) {
  const supabase = createServerSupabaseClient();

  const { data: article, error } = await supabase
    .from("articles")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/articles");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/articles/${article.slug}`);
  return { success: true };
}

export async function rejectArticle(id: string) {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("articles")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/articles");
  revalidatePath("/admin");
  return { success: true };
}
