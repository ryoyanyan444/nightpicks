import { createServerSupabaseClient } from "@/lib/supabase/server";
import ArticleForm from "@/components/admin/ArticleForm";

export default async function NewArticlePage() {
  const supabase = createServerSupabaseClient();

  const [{ data: categories }, { data: authors }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("authors").select("*").order("name"),
    supabase.from("tags").select("*").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">新規記事作成</h1>
      <ArticleForm
        categories={categories || []}
        authors={authors || []}
        tags={tags || []}
      />
    </div>
  );
}
