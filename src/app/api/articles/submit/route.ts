import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // API key auth for Cowork agent
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ARTICLE_SUBMIT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const draft = await req.json();

    // Resolve category_slug → category_id
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", draft.category_slug)
      .single();

    if (!category) {
      return NextResponse.json(
        { error: `Category not found: ${draft.category_slug}` },
        { status: 400 }
      );
    }

    // Get AI author
    const { data: author } = await supabase
      .from("authors")
      .select("id")
      .eq("is_ai", true)
      .single();

    // Check duplicate slug
    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", draft.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Article already exists: ${draft.slug}`, article_id: existing.id },
        { status: 409 }
      );
    }

    // Append sources to content
    const sourcesSection =
      draft.sources?.length > 0
        ? `\n\n---\n\n## 参考文献・出典\n\n${draft.sources.map((s: any) => `- [${s.title}](${s.url})（${s.accessed_at} アクセス）`).join("\n")}`
        : "";

    // Fetch in-article images from Unsplash for each h2 heading
    let enrichedContent = draft.content;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      const h2Matches = [...draft.content.matchAll(/^## (.+)$/gm)];
      for (const match of h2Matches) {
        const heading = match[1].replace(/[*#]/g, "").trim();
        // Skip utility headings
        if (heading === "この記事のポイント" || heading === "参考文献・出典" || heading === "まとめ") continue;
        try {
          const q = encodeURIComponent(heading.slice(0, 30));
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=landscape`,
            { headers: { Authorization: `Client-ID ${unsplashKey}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const photo = data.results?.[0];
            if (photo) {
              const imgMd = `\n\n![${heading}](${photo.urls.regular})\n*Photo by [${photo.user.name}](${photo.user.links.html}) on [Unsplash](https://unsplash.com)*\n`;
              enrichedContent = enrichedContent.replace(
                match[0],
                match[0] + imgMd
              );
            }
          }
        } catch {
          // Skip this heading's image
        }
      }
    }

    const fullContent = enrichedContent + sourcesSection;

    // Fetch thumbnail from Unsplash
    let thumbnailUrl: string | null = null;
    let ogpImageUrl: string | null = null;
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const query = (draft.seo_keywords?.[0] || draft.topic || draft.title).replace(/[^\w\s\u3000-\u9fff]/g, "");
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: `Client-ID ${unsplashKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results?.[0]) {
            thumbnailUrl = data.results[0].urls.regular;
            ogpImageUrl = data.results[0].urls.regular;
          }
        }
      } catch {
        // Unsplash fetch failed, continue without image
      }
    }

    // Insert article with ai_review status
    const { data: article, error: insertErr } = await supabase
      .from("articles")
      .insert({
        title: draft.title,
        subtitle: draft.subtitle || "",
        slug: draft.slug,
        content: fullContent,
        excerpt: draft.excerpt,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        seo_keywords: draft.seo_keywords,
        thumbnail_url: thumbnailUrl,
        ogp_image_url: ogpImageUrl,
        category_id: category.id,
        author_id: author?.id || null,
        status: "ai_review",
        ai_generated: true,
        ai_prompt: draft.topic,
        ai_model: "claude-cowork",
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Save fact-check review
    if (draft.fact_check) {
      const reviewComments = [
        draft.fact_check.notes,
        "",
        "--- 検証結果 ---",
        ...draft.fact_check.claims_verified.map(
          (c: any) => `[${c.verified ? "OK" : "NG"}] ${c.claim} (出典: ${c.source})`
        ),
        "",
        "[自動ファクトチェック by claude-cowork]",
      ].join("\n");

      await supabase.from("article_reviews").insert({
        article_id: article.id,
        review_type: "fact_check",
        status:
          draft.fact_check.status === "approved" ? "approved" : "needs_revision",
        comments: reviewComments,
      });
    }

    return NextResponse.json({
      success: true,
      article_id: article.id,
      title: article.title,
      slug: article.slug,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
