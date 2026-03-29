export const SITE_NAME = "夜ピク";
export const SITE_DESCRIPTION =
  "ナイトワーカーのための情報メディア。ホスト・キャバ嬢の接客テクニック、業界ニュース、インタビュー、ランキングなど毎日更新。";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nightpicks.jp";

export const CATEGORIES = {
  news: { name: "ニュース", color: "category-news" },
  technique: { name: "テクニック", color: "category-technique" },
  interview: { name: "インタビュー", color: "category-interview" },
  ranking: { name: "ランキング", color: "category-ranking" },
  column: { name: "コラム", color: "category-column" },
  lifestyle: { name: "ライフスタイル", color: "category-lifestyle" },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export const ARTICLES_PER_PAGE = 12;
export const ISR_REVALIDATE_SECONDS = 3600; // 1 hour
