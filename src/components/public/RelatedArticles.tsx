import ArticleCard from "./ArticleCard";
import type { ArticleWithRelations } from "@/types/database";

interface RelatedArticlesProps {
  articles: ArticleWithRelations[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-gray-100 mb-6">関連記事</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
