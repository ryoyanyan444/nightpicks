import { notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markdownToHtml, extractHeadings } from "@/lib/markdown";
import { generateArticleMetadata } from "@/lib/seo";
import { generateArticleJsonLd, generateBreadcrumbJsonLd } from "@/lib/structured-data";
import { SITE_URL, ISR_REVALIDATE_SECONDS, CATEGORIES } from "@/lib/constants";
import type { CategorySlug } from "@/lib/constants";
import type { ArticleWithRelations } from "@/types/database";
import TableOfContents from "@/components/public/TableOfContents";
import ShareButtons from "@/components/public/ShareButtons";
import RelatedArticles from "@/components/public/RelatedArticles";

export const revalidate = ISR_REVALIDATE_SECONDS;

async function getArticle(slug: string): Promise<ArticleWithRelations | null> {
  const supabase = createServerSupabaseClient();

  const { data: article } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) return null;

  // Get tags
  const { data: articleTags } = await supabase
    .from("article_tags")
    .select("tag_id, tags:tags(*)")
    .eq("article_id", article.id);

  const tags = articleTags?.map((at: any) => at.tags).filter(Boolean) || [];

  return { ...article, tags } as ArticleWithRelations;
}

async function getRelatedArticles(article: ArticleWithRelations): Promise<ArticleWithRelations[]> {
  if (!article.category_id) return [];

  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from("articles")
    .select("*, category:categories(*), author:authors(*)")
    .eq("category_id", article.category_id)
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return (data || []).map((a: any) => ({ ...a, tags: [] })) as ArticleWithRelations[];
}

export const dynamicParams = true;

export async function generateStaticParams() {
  // At build time env vars may not be available.
  // Return empty array and rely on ISR to generate pages on first request.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "published");

  return (data || []).map((article: { slug: string }) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return generateArticleMetadata(article);
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const [htmlContent, relatedArticles] = await Promise.all([
    markdownToHtml(article.content),
    getRelatedArticles(article),
  ]);

  const headings = extractHeadings(article.content);
  const categorySlug = article.category?.slug as CategorySlug | undefined;
  const categoryInfo = categorySlug ? CATEGORIES[categorySlug] : null;

  const breadcrumbItems = [
    { name: "トップ", url: SITE_URL },
    ...(article.category
      ? [{ name: article.category.name, url: `${SITE_URL}/category/${article.category.slug}` }]
      : []),
    { name: article.title, url: `${SITE_URL}/articles/${article.slug}` },
  ];

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateArticleJsonLd(article)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateBreadcrumbJsonLd(breadcrumbItems)),
        }}
      />

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6 overflow-x-auto">
          <a href="/" className="hover:text-night-300 whitespace-nowrap">トップ</a>
          {article.category && (
            <>
              <span>/</span>
              <a href={`/category/${article.category.slug}`} className="hover:text-night-300 whitespace-nowrap">
                {article.category.name}
              </a>
            </>
          )}
          <span>/</span>
          <span className="text-gray-600 truncate">{article.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {categoryInfo && (
            <span className={`category-badge ${categoryInfo.color} mb-4`}>
              {categoryInfo.name}
            </span>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mt-2">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="mt-3 text-lg text-gray-400">{article.subtitle}</p>
          )}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {article.author && (
                <div className="flex items-center gap-2">
                  {article.author.avatar_url && (
                    <Image
                      src={article.author.avatar_url}
                      alt={article.author.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-400">{article.author.name}</span>
                </div>
              )}
              {article.published_at && (
                <time
                  dateTime={article.published_at}
                  className="text-sm text-gray-500"
                >
                  {format(new Date(article.published_at), "yyyy年MM月dd日", { locale: ja })}
                </time>
              )}
            </div>
            <ShareButtons title={article.title} slug={article.slug} />
          </div>
        </header>

        {/* Hero Image */}
        {article.ogp_image_url && (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8">
            <Image
              src={article.ogp_image_url}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="lg:flex lg:gap-8">
          {/* Sidebar - TOC (desktop) */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-20">
              <TableOfContents headings={headings} />
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* TOC (mobile) */}
            <div className="lg:hidden">
              <TableOfContents headings={headings} />
            </div>

            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-dark-800">
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <a
                      key={tag.id}
                      href={`/tag/${tag.slug}`}
                      className="px-3 py-1 text-xs text-gray-400 bg-dark-800 rounded-full hover:bg-dark-700 hover:text-night-300 transition-colors"
                    >
                      #{tag.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="mt-8 pt-6 border-t border-dark-800 flex justify-center">
              <ShareButtons title={article.title} slug={article.slug} />
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <RelatedArticles articles={relatedArticles} />
      </article>
    </>
  );
}
