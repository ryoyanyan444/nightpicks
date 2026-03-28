import ArticleCard from "./ArticleCard";
import type { ArticleWithRelations } from "@/types/database";

interface PopularArticlesProps {
  articles: ArticleWithRelations[];
}

export default function PopularArticles({ articles }: PopularArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-gold-500 rounded-full" />
        人気記事
      </h2>
      <div className="space-y-1 divide-y divide-dark-800">
        {articles.map((article, i) => (
          <div key={article.id} className="flex items-start gap-3 py-3">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-dark-800 text-xs font-bold text-gold-400">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <ArticleCard article={article} size="compact" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
