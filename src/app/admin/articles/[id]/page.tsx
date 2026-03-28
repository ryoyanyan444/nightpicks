import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ArticleForm from "@/components/admin/ArticleForm";

export default async function EditArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();

  const [
    { data: article },
    { data: categories },
    { data: authors },
    { data: tags },
  ] = await Promise.all([
    supabase.from("articles").select("*").eq("id", params.id).single(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("authors").select("*").order("name"),
    supabase.from("tags").select("*").order("name"),
  ]);

  if (!article) notFound();

  // Get article tags
  const { data: articleTags } = await supabase
    .from("article_tags")
    .select("tag_id, tags:tags(*)")
    .eq("article_id", article.id);

  const articleWithTags = {
    ...article,
    tags: articleTags?.map((at: any) => at.tags).filter(Boolean) || [],
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">記事編集</h1>
      <ArticleForm
        article={articleWithTags}
        categories={categories || []}
        authors={authors || []}
        tags={tags || []}
      />
    </div>
  );
}
