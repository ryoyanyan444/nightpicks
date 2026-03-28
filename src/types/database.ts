// Supabase Database Types for NIGHTPICKS

export type ArticleStatus = "draft" | "ai_review" | "scheduled" | "published" | "archived";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  is_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  ogp_image_url: string | null;
  thumbnail_url: string | null;
  status: ArticleStatus;
  published_at: string | null;
  category_id: string | null;
  author_id: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  ai_model: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithRelations extends Article {
  category: Category | null;
  author: Author | null;
  tags: Tag[];
}

export interface ArticleTag {
  article_id: string;
  tag_id: string;
}

export interface RelatedArticle {
  article_id: string;
  related_id: string;
  sort_order: number;
}

export interface PageView {
  id: string;
  article_id: string | null;
  path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  worker_id: string | null;
  user_agent: string | null;
  device_type: string | null;
  session_id: string | null;
  scroll_depth: number | null;
  time_on_page: number | null;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  date: string;
  article_id: string | null;
  views: number;
  unique_visitors: number;
  avg_read_time: number | null;
  avg_scroll_depth: number | null;
}

export interface ShareEvent {
  id: string;
  article_id: string | null;
  platform: string;
  created_at: string;
}

// Insert types - only required fields are non-optional
export interface ArticleInsert {
  slug: string;
  title: string;
  content: string;
  subtitle?: string | null;
  excerpt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  ogp_image_url?: string | null;
  thumbnail_url?: string | null;
  status?: ArticleStatus;
  published_at?: string | null;
  category_id?: string | null;
  author_id?: string | null;
  ai_generated?: boolean;
  ai_prompt?: string | null;
  ai_model?: string | null;
}

export interface PageViewInsert {
  path: string;
  article_id?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  worker_id?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  session_id?: string | null;
  scroll_depth?: number | null;
  time_on_page?: number | null;
}

export interface ShareEventInsert {
  platform: string;
  article_id?: string | null;
}

// Supabase Database type map
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Category, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Tag, "id" | "created_at">>;
        Relationships: [];
      };
      authors: {
        Row: Author;
        Insert: Partial<Omit<Author, "slug" | "name">> & { slug: string; name: string };
        Update: Partial<Omit<Author, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      articles: {
        Row: Article;
        Insert: ArticleInsert;
        Update: Partial<ArticleInsert>;
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "articles_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "authors";
            referencedColumns: ["id"];
          }
        ];
      };
      article_tags: {
        Row: ArticleTag;
        Insert: ArticleTag;
        Update: Partial<ArticleTag>;
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey";
            columns: ["tag_id"];
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      page_views: {
        Row: PageView;
        Insert: PageViewInsert;
        Update: Partial<PageViewInsert>;
        Relationships: [];
      };
      daily_metrics: {
        Row: DailyMetric;
        Insert: Omit<DailyMetric, "id"> & { id?: string };
        Update: Partial<Omit<DailyMetric, "id">>;
        Relationships: [];
      };
      share_events: {
        Row: ShareEvent;
        Insert: ShareEventInsert;
        Update: Partial<ShareEventInsert>;
        Relationships: [];
      };
      related_articles: {
        Row: RelatedArticle;
        Insert: RelatedArticle;
        Update: Partial<RelatedArticle>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      article_status: ArticleStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
