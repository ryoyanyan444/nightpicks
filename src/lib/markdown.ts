import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(gfm).use(html).process(markdown);
  return result.toString();
}

export function extractHeadings(markdown: string): { level: number; text: string; id: string }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, "-")
      .replace(/^-+|-+$/g, "");
    headings.push({ level, text, id });
  }

  return headings;
}
