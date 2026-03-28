import { getAnthropicClient } from "./client";
import { SYSTEM_PROMPT, OUTLINE_PROMPT, ARTICLE_PROMPT, SEO_PROMPT } from "./prompts";

export interface GeneratedArticle {
  title: string;
  subtitle: string;
  content: string;
  excerpt: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

function extractJson(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("JSONが見つかりませんでした");
}

export async function generateOutline(
  topic: string,
  category: string
): Promise<{ title: string; subtitle: string; headings: { level: number; text: string }[]; summary: string }> {
  const response = await callClaude(SYSTEM_PROMPT, OUTLINE_PROMPT(topic, category));
  return extractJson(response);
}

export async function generateArticleContent(outline: string): Promise<string> {
  return callClaude(SYSTEM_PROMPT, ARTICLE_PROMPT(outline));
}

export async function generateSeoMeta(
  title: string,
  content: string
): Promise<{
  seo_title: string;
  seo_description: string;
  excerpt: string;
  seo_keywords: string[];
  slug: string;
}> {
  const response = await callClaude(SYSTEM_PROMPT, SEO_PROMPT(title, content));
  return extractJson(response);
}

export async function generateFullArticle(
  topic: string,
  category: string
): Promise<GeneratedArticle> {
  // Step 1: Generate outline
  const outline = await generateOutline(topic, category);

  // Step 2: Generate content from outline
  const outlineText = outline.headings
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");
  const content = await generateArticleContent(outlineText);

  // Step 3: Generate SEO metadata
  const seo = await generateSeoMeta(outline.title, content);

  return {
    title: outline.title,
    subtitle: outline.subtitle || "",
    content,
    excerpt: seo.excerpt,
    slug: seo.slug,
    seo_title: seo.seo_title,
    seo_description: seo.seo_description,
    seo_keywords: seo.seo_keywords,
  };
}
