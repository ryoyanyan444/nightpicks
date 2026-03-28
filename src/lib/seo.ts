import type { Metadata } from "next";
import type { ArticleWithRelations } from "@/types/database";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export function generateArticleMetadata(article: ArticleWithRelations): Metadata {
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.excerpt || "";
  const ogImage = article.ogp_image_url || `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}`;

  return {
    title,
    description,
    keywords: article.seo_keywords?.join(", "),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.published_at || undefined,
      authors: article.author?.name ? [article.author.name] : undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export function generateCategoryMetadata(categoryName: string, categorySlug: string): Metadata {
  const title = `${categoryName}の記事一覧`;
  const description = `${SITE_NAME}の${categoryName}カテゴリの記事一覧。ナイトワーカー向けの最新${categoryName}情報をお届けします。`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/category/${categorySlug}`,
    },
  };
}
