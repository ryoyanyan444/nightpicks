import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ArticleWithRelations } from "@/types/database";
import { CATEGORIES, type CategorySlug } from "@/lib/constants";

interface ArticleCardProps {
  article: ArticleWithRelations;
  size?: "default" | "large" | "compact";
}

export default function ArticleCard({ article, size = "default" }: ArticleCardProps) {
  const categorySlug = article.category?.slug as CategorySlug | undefined;
  const categoryInfo = categorySlug ? CATEGORIES[categorySlug] : null;

  if (size === "large") {
    return (
      <Link href={`/articles/${article.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-2xl bg-dark-900 border border-dark-800 hover:border-night-500/50 transition-all duration-300">
          {/* Thumbnail */}
          <div className="aspect-[16/9] relative overflow-hidden">
            {article.thumbnail_url ? (
              <Image
                src={article.thumbnail_url}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full gradient-night" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {categoryInfo && (
              <span className={`category-badge ${categoryInfo.color} mb-3`}>
                {categoryInfo.name}
              </span>
            )}
            <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-night-300 transition-colors line-clamp-2">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">{article.excerpt}</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              {article.author && <span>{article.author.name}</span>}
              {article.published_at && (
                <time dateTime={article.published_at}>
                  {format(new Date(article.published_at), "yyyy.MM.dd", { locale: ja })}
                </time>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (size === "compact") {
    return (
      <Link href={`/articles/${article.slug}`} className="group block">
        <article className="flex gap-3 py-3">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden">
            {article.thumbnail_url ? (
              <Image
                src={article.thumbnail_url}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full gradient-night" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-200 group-hover:text-night-300 transition-colors line-clamp-2">
              {article.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
              {categoryInfo && (
                <span className={`category-badge ${categoryInfo.color}`}>
                  {categoryInfo.name}
                </span>
              )}
              {article.published_at && (
                <time dateTime={article.published_at}>
                  {format(new Date(article.published_at), "MM.dd")}
                </time>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Default size
  return (
    <Link href={`/articles/${article.slug}`} className="group block">
      <article className="overflow-hidden rounded-xl bg-dark-900 border border-dark-800 hover:border-night-500/50 transition-all duration-300">
        {/* Thumbnail */}
        <div className="aspect-[16/10] relative overflow-hidden">
          {article.thumbnail_url ? (
            <Image
              src={article.thumbnail_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full gradient-night" />
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {categoryInfo && (
            <span className={`category-badge ${categoryInfo.color} mb-2`}>
              {categoryInfo.name}
            </span>
          )}
          <h2 className="text-base font-bold text-gray-100 group-hover:text-night-300 transition-colors line-clamp-2 mt-1">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            {article.author && <span>{article.author.name}</span>}
            {article.published_at && (
              <time dateTime={article.published_at}>
                {format(new Date(article.published_at), "yyyy.MM.dd", { locale: ja })}
              </time>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
