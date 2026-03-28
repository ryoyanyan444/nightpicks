-- ============================================================
-- NIGHTPICKS - Complete Database Schema v2
-- ============================================================
-- 実行順序に依存関係あり。上から順に実行すること。
-- ============================================================

-- ############################################################
-- ENUM TYPES
-- ############################################################

CREATE TYPE article_status AS ENUM (
  'draft',
  'ai_review',
  'fact_check',
  'editor_review',
  'revision_requested',
  'scheduled',
  'published',
  'archived'
);

CREATE TYPE admin_role AS ENUM ('super_admin', 'editor', 'writer', 'viewer');

CREATE TYPE advertiser_type AS ENUM ('affiliate', 'direct', 'sponsored_article', 'internal');
CREATE TYPE campaign_type AS ENUM ('banner', 'text_link', 'article_ad', 'affiliate', 'internal_cta');
CREATE TYPE cost_model AS ENUM ('cpc', 'cpm', 'cpa', 'flat_rate');
CREATE TYPE ad_position AS ENUM ('header_banner', 'sidebar', 'in_article', 'article_bottom', 'between_articles', 'popup');
CREATE TYPE ad_event_type AS ENUM ('impression', 'click', 'conversion');
CREATE TYPE conversion_type AS ENUM ('purchase', 'signup', 'lead', 'app_install');

CREATE TYPE content_cost_type AS ENUM ('writer_fee', 'ai_token', 'image', 'editing', 'other');
CREATE TYPE revision_type AS ENUM ('ai_generated', 'human_edit', 'fact_check_fix', 'editor_fix');
CREATE TYPE review_type AS ENUM ('fact_check', 'editorial', 'final_approval');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_revision');
CREATE TYPE ai_step AS ENUM ('research', 'outline', 'draft', 'fact_check', 'seo');

CREATE TYPE lead_status AS ENUM ('none', 'potential', 'contacted', 'converted');
CREATE TYPE subscriber_status AS ENUM ('active', 'unsubscribed', 'bounced');
CREATE TYPE newsletter_status AS ENUM ('draft', 'scheduled', 'sending', 'sent');
CREATE TYPE notification_channel AS ENUM ('email', 'push', 'line');
CREATE TYPE membership_tier AS ENUM ('free', 'premium');


-- ############################################################
-- 1. ADMIN & PERMISSIONS
-- ############################################################

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          admin_role NOT NULL DEFAULT 'writer',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ############################################################
-- 2. CONTENT MANAGEMENT
-- ############################################################

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE authors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  is_ai       BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  content         TEXT NOT NULL,
  excerpt         TEXT,

  -- SEO
  seo_title       TEXT,
  seo_description TEXT,
  seo_keywords    TEXT[],

  -- Images
  ogp_image_url   TEXT,
  thumbnail_url   TEXT,

  -- Status & Publishing
  status          article_status DEFAULT 'draft',
  published_at    TIMESTAMPTZ,

  -- Relations
  category_id     UUID REFERENCES categories(id),
  author_id       UUID REFERENCES authors(id),

  -- AI metadata
  ai_generated    BOOLEAN DEFAULT false,
  ai_prompt       TEXT,
  ai_model        TEXT,

  -- Metrics (denormalized for fast reads)
  view_count      BIGINT DEFAULT 0,

  -- Sponsorship flag (景品表示法対応)
  is_sponsored    BOOLEAN DEFAULT false,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE article_tags (
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE related_articles (
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  related_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  sort_order  INT DEFAULT 0,
  PRIMARY KEY (article_id, related_id)
);


-- ############################################################
-- 3. EDITORIAL WORKFLOW
-- ############################################################

CREATE TABLE article_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  changed_by  UUID REFERENCES admin_users(id),
  change_type revision_type NOT NULL,
  change_note TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE article_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  reviewer_id   UUID REFERENCES admin_users(id),
  review_type   review_type NOT NULL,
  status        review_status NOT NULL DEFAULT 'pending',
  comments      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_generation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id          UUID REFERENCES articles(id) ON DELETE SET NULL,
  step                ai_step NOT NULL,
  model               TEXT NOT NULL,
  prompt_tokens       INT,
  completion_tokens   INT,
  total_cost_usd      NUMERIC(10,6),
  input_summary       TEXT,
  output_summary      TEXT,
  duration_ms         INT,
  status              TEXT NOT NULL DEFAULT 'success',
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE article_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  cost_type   content_cost_type NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  currency    TEXT DEFAULT 'JPY',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ############################################################
-- 4. MONETIZATION
-- ############################################################

CREATE TABLE advertisers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  company_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  type          advertiser_type NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id  UUID NOT NULL REFERENCES advertisers(id),
  name           TEXT NOT NULL,
  type           campaign_type NOT NULL,
  budget_total   NUMERIC(12,2),
  budget_daily   NUMERIC(12,2),
  cost_model     cost_model NOT NULL DEFAULT 'cpc',
  unit_price     NUMERIC(10,2),
  start_date     DATE,
  end_date       DATE,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_creatives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  name          TEXT,
  image_url     TEXT,
  link_url      TEXT NOT NULL,
  alt_text      TEXT,
  size          TEXT,
  html_snippet  TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_placements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id         UUID NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  position            ad_position NOT NULL,
  target_categories   UUID[],
  target_tags         UUID[],
  priority            INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ad_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id   UUID REFERENCES ad_creatives(id),
  campaign_id   UUID REFERENCES ad_campaigns(id),
  article_id    UUID REFERENCES articles(id),
  category_id   UUID REFERENCES categories(id),
  event_type    ad_event_type NOT NULL,
  session_id    TEXT,
  visitor_id    TEXT,
  worker_id     TEXT,
  referrer      TEXT,
  device_type   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_event_id   UUID REFERENCES ad_events(id),
  campaign_id   UUID REFERENCES ad_campaigns(id),
  type          conversion_type NOT NULL,
  revenue       NUMERIC(12,2),
  external_id   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE article_sponsorships (
  article_id    UUID REFERENCES articles(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  is_disclosed  BOOLEAN DEFAULT true,
  PRIMARY KEY (article_id, campaign_id)
);


-- ############################################################
-- 5. ANALYTICS & VISITORS
-- ############################################################

CREATE TABLE visitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id      TEXT UNIQUE NOT NULL,
  first_visit_at  TIMESTAMPTZ DEFAULT now(),
  last_visit_at   TIMESTAMPTZ DEFAULT now(),
  total_sessions  INT DEFAULT 1,
  total_page_views INT DEFAULT 1,
  primary_source  TEXT,
  device_type     TEXT,
  worker_id       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE page_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID REFERENCES articles(id),
  path            TEXT NOT NULL,
  referrer        TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  worker_id       TEXT,
  user_agent      TEXT,
  device_type     TEXT,
  session_id      TEXT,
  visitor_id      TEXT,
  is_new_visitor  BOOLEAN DEFAULT false,
  is_landing_page BOOLEAN DEFAULT false,
  scroll_depth    FLOAT,
  time_on_page    INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE share_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID REFERENCES articles(id),
  platform    TEXT NOT NULL,
  visitor_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE daily_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                  DATE NOT NULL,
  article_id            UUID REFERENCES articles(id),
  category_id           UUID REFERENCES categories(id),
  source_type           TEXT,
  views                 INT DEFAULT 0,
  unique_visitors       INT DEFAULT 0,
  new_visitors          INT DEFAULT 0,
  returning_visitors    INT DEFAULT 0,
  avg_read_time         FLOAT,
  avg_scroll_depth      FLOAT,
  total_shares          INT DEFAULT 0,
  bounce_rate           FLOAT,
  avg_pages_per_session FLOAT,
  UNIQUE(date, article_id, source_type)
);

CREATE TABLE hourly_traffic (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  hour            SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  page_views      INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  UNIQUE(date, hour)
);


-- ############################################################
-- 6. SALOCHECK INTEGRATION
-- ############################################################

CREATE TABLE salocheck_workers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id             TEXT UNIQUE NOT NULL,
  first_seen_at         TIMESTAMPTZ DEFAULT now(),
  last_seen_at          TIMESTAMPTZ DEFAULT now(),
  total_visits          INT DEFAULT 1,
  total_page_views      INT DEFAULT 1,
  category_preferences  JSONB DEFAULT '{}',
  top_articles          UUID[],
  is_heavy_user         BOOLEAN DEFAULT false,
  lead_status           lead_status DEFAULT 'none',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE salocheck_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         TEXT NOT NULL,
  session_id        TEXT NOT NULL,
  entry_path        TEXT,
  entry_article_id  UUID REFERENCES articles(id),
  entry_category_id UUID REFERENCES categories(id),
  pages_viewed      INT DEFAULT 1,
  duration_seconds  INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);


-- ############################################################
-- 7. SEO TRACKING
-- ############################################################

CREATE TABLE seo_rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID REFERENCES articles(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,
  search_engine   TEXT DEFAULT 'google',
  rank            INT,
  url             TEXT,
  recorded_at     DATE NOT NULL,
  UNIQUE(article_id, keyword, search_engine, recorded_at)
);


-- ############################################################
-- 8. SUBSCRIBERS & NEWSLETTERS
-- ############################################################

CREATE TABLE subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  visitor_id      TEXT,
  worker_id       TEXT,
  status          subscriber_status DEFAULT 'active',
  preferences     JSONB DEFAULT '{}',
  subscribed_at   TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE newsletters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject           TEXT NOT NULL,
  body_html         TEXT NOT NULL,
  body_text         TEXT,
  status            newsletter_status DEFAULT 'draft',
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  total_recipients  INT DEFAULT 0,
  total_opens       INT DEFAULT 0,
  total_clicks      INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id  TEXT,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       notification_channel NOT NULL,
  reference_id  UUID,
  recipient_id  UUID,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ############################################################
-- 9. MEMBERS (将来用 - 空テーブル)
-- ############################################################

CREATE TABLE members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE,
  display_name    TEXT NOT NULL,
  email           TEXT NOT NULL,
  avatar_url      TEXT,
  worker_id       TEXT,
  visitor_id      TEXT,
  membership_tier membership_tier DEFAULT 'free',
  registered_at   TIMESTAMPTZ DEFAULT now(),
  last_login_at   TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bookmarks (
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (member_id, article_id)
);

CREATE TABLE reading_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID REFERENCES members(id) ON DELETE CASCADE,
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT now(),
  progress    FLOAT DEFAULT 0
);


-- ############################################################
-- INDEXES
-- ############################################################

-- Articles
CREATE INDEX idx_articles_status_published ON articles(status, published_at DESC);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_view_count ON articles(view_count DESC);
CREATE INDEX idx_articles_sponsored ON articles(is_sponsored) WHERE is_sponsored = true;

-- Article Tags
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- Page Views
CREATE INDEX idx_page_views_article ON page_views(article_id, created_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id, created_at);
CREATE INDEX idx_page_views_visitor ON page_views(visitor_id, created_at DESC);
CREATE INDEX idx_page_views_utm ON page_views(utm_source, created_at);
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);

-- Visitors
CREATE INDEX idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX idx_visitors_worker ON visitors(worker_id) WHERE worker_id IS NOT NULL;

-- Daily Metrics
CREATE INDEX idx_daily_metrics_date ON daily_metrics(date DESC, article_id);
CREATE INDEX idx_daily_metrics_category ON daily_metrics(date DESC, category_id);
CREATE INDEX idx_daily_metrics_source ON daily_metrics(date DESC, source_type);

-- Hourly Traffic
CREATE INDEX idx_hourly_traffic_heatmap ON hourly_traffic(day_of_week, hour);

-- Share Events
CREATE INDEX idx_share_events_article ON share_events(article_id, created_at DESC);

-- Ad Events
CREATE INDEX idx_ad_events_campaign ON ad_events(campaign_id, created_at DESC);
CREATE INDEX idx_ad_events_creative ON ad_events(creative_id, event_type);
CREATE INDEX idx_ad_events_category ON ad_events(category_id, event_type);
CREATE INDEX idx_ad_events_article ON ad_events(article_id, created_at DESC);

-- Conversions
CREATE INDEX idx_conversions_campaign ON conversions(campaign_id, created_at DESC);

-- SaloCheck
CREATE INDEX idx_salocheck_workers_lead ON salocheck_workers(lead_status) WHERE lead_status != 'none';
CREATE INDEX idx_salocheck_workers_heavy ON salocheck_workers(is_heavy_user) WHERE is_heavy_user = true;
CREATE INDEX idx_salocheck_sessions_worker ON salocheck_sessions(worker_id, created_at DESC);

-- SEO
CREATE INDEX idx_seo_rankings_keyword ON seo_rankings(keyword, recorded_at DESC);
CREATE INDEX idx_seo_rankings_article ON seo_rankings(article_id, recorded_at DESC);

-- Editorial
CREATE INDEX idx_article_revisions_article ON article_revisions(article_id, version DESC);
CREATE INDEX idx_article_reviews_pending ON article_reviews(status, article_id) WHERE status = 'pending';
CREATE INDEX idx_ai_gen_logs_article ON ai_generation_logs(article_id, created_at DESC);
CREATE INDEX idx_article_costs_article ON article_costs(article_id);

-- Audit
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(admin_user_id, created_at DESC);

-- Subscribers
CREATE INDEX idx_subscribers_status ON subscribers(status) WHERE status = 'active';

-- Members
CREATE INDEX idx_members_worker ON members(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_reading_history_member ON reading_history(member_id, read_at DESC);


-- ############################################################
-- RPC FUNCTIONS
-- ############################################################

-- Atomic view count increment
CREATE OR REPLACE FUNCTION increment_view_count(target_article_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE articles SET view_count = view_count + 1 WHERE id = target_article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at auto trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ############################################################
-- TRIGGERS
-- ############################################################

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER authors_updated_at
  BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER advertisers_updated_at
  BEFORE UPDATE ON advertisers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ad_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER salocheck_workers_updated_at
  BEFORE UPDATE ON salocheck_workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ############################################################
-- RLS POLICIES
-- ############################################################

-- Admin Users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read admin_users"
  ON admin_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages admin_users"
  ON admin_users FOR ALL USING (auth.role() = 'service_role');

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read audit_logs"
  ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages audit_logs"
  ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories"
  ON categories FOR SELECT USING (true);
CREATE POLICY "Auth can manage categories"
  ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tags"
  ON tags FOR SELECT USING (true);
CREATE POLICY "Auth can manage tags"
  ON tags FOR ALL USING (auth.role() = 'authenticated');

-- Authors
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read authors"
  ON authors FOR SELECT USING (true);
CREATE POLICY "Auth can manage authors"
  ON authors FOR ALL USING (auth.role() = 'authenticated');

-- Articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT
  USING (status = 'published' AND published_at <= now());
CREATE POLICY "Auth can manage articles"
  ON articles FOR ALL
  USING (auth.role() = 'authenticated');

-- Article Tags
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read article_tags"
  ON article_tags FOR SELECT USING (true);
CREATE POLICY "Auth can manage article_tags"
  ON article_tags FOR ALL USING (auth.role() = 'authenticated');

-- Related Articles
ALTER TABLE related_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read related_articles"
  ON related_articles FOR SELECT USING (true);
CREATE POLICY "Auth can manage related_articles"
  ON related_articles FOR ALL USING (auth.role() = 'authenticated');

-- Article Revisions
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage article_revisions"
  ON article_revisions FOR ALL USING (auth.role() = 'authenticated');

-- Article Reviews
ALTER TABLE article_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage article_reviews"
  ON article_reviews FOR ALL USING (auth.role() = 'authenticated');

-- AI Generation Logs
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read ai_generation_logs"
  ON ai_generation_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages ai_generation_logs"
  ON ai_generation_logs FOR ALL USING (auth.role() = 'service_role');

-- Article Costs
ALTER TABLE article_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage article_costs"
  ON article_costs FOR ALL USING (auth.role() = 'authenticated');

-- Advertisers
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage advertisers"
  ON advertisers FOR ALL USING (auth.role() = 'authenticated');

-- Ad Campaigns
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage ad_campaigns"
  ON ad_campaigns FOR ALL USING (auth.role() = 'authenticated');

-- Ad Creatives
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage ad_creatives"
  ON ad_creatives FOR ALL USING (auth.role() = 'authenticated');

-- Ad Placements
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active ad_placements"
  ON ad_placements FOR SELECT USING (is_active = true);
CREATE POLICY "Auth can manage ad_placements"
  ON ad_placements FOR ALL USING (auth.role() = 'authenticated');

-- Ad Events (service role only writes)
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read ad_events"
  ON ad_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages ad_events"
  ON ad_events FOR ALL USING (auth.role() = 'service_role');

-- Conversions
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read conversions"
  ON conversions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages conversions"
  ON conversions FOR ALL USING (auth.role() = 'service_role');

-- Article Sponsorships
ALTER TABLE article_sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read article_sponsorships"
  ON article_sponsorships FOR SELECT USING (true);
CREATE POLICY "Auth can manage article_sponsorships"
  ON article_sponsorships FOR ALL USING (auth.role() = 'authenticated');

-- Visitors
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages visitors"
  ON visitors FOR ALL USING (auth.role() = 'service_role');

-- Page Views
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages page_views"
  ON page_views FOR ALL USING (auth.role() = 'service_role');

-- Share Events
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages share_events"
  ON share_events FOR ALL USING (auth.role() = 'service_role');

-- Daily Metrics
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read daily_metrics"
  ON daily_metrics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages daily_metrics"
  ON daily_metrics FOR ALL USING (auth.role() = 'service_role');

-- Hourly Traffic
ALTER TABLE hourly_traffic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read hourly_traffic"
  ON hourly_traffic FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages hourly_traffic"
  ON hourly_traffic FOR ALL USING (auth.role() = 'service_role');

-- SaloCheck Workers
ALTER TABLE salocheck_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage salocheck_workers"
  ON salocheck_workers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages salocheck_workers"
  ON salocheck_workers FOR ALL USING (auth.role() = 'service_role');

-- SaloCheck Sessions
ALTER TABLE salocheck_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read salocheck_sessions"
  ON salocheck_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages salocheck_sessions"
  ON salocheck_sessions FOR ALL USING (auth.role() = 'service_role');

-- SEO Rankings
ALTER TABLE seo_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage seo_rankings"
  ON seo_rankings FOR ALL USING (auth.role() = 'authenticated');

-- Subscribers
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages subscribers"
  ON subscribers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Auth can read subscribers"
  ON subscribers FOR SELECT USING (auth.role() = 'authenticated');

-- Newsletters
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can manage newsletters"
  ON newsletters FOR ALL USING (auth.role() = 'authenticated');

-- Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages push_subscriptions"
  ON push_subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Notification Logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can read notification_logs"
  ON notification_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role manages notification_logs"
  ON notification_logs FOR ALL USING (auth.role() = 'service_role');

-- Members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read own data"
  ON members FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Auth can manage members"
  ON members FOR ALL USING (auth.role() = 'authenticated');

-- Bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own bookmarks"
  ON bookmarks FOR ALL USING (
    member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "Auth can read bookmarks"
  ON bookmarks FOR SELECT USING (auth.role() = 'authenticated');

-- Reading History
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages reading_history"
  ON reading_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Auth can read reading_history"
  ON reading_history FOR SELECT USING (auth.role() = 'authenticated');


-- ############################################################
-- VIEWS (集計用)
-- ############################################################

CREATE OR REPLACE VIEW weekly_metrics AS
SELECT
  date_trunc('week', date)::DATE AS week_start,
  article_id,
  category_id,
  source_type,
  SUM(views) AS views,
  SUM(unique_visitors) AS unique_visitors,
  SUM(new_visitors) AS new_visitors,
  SUM(returning_visitors) AS returning_visitors,
  AVG(avg_read_time) AS avg_read_time,
  AVG(avg_scroll_depth) AS avg_scroll_depth,
  SUM(total_shares) AS total_shares
FROM daily_metrics
GROUP BY week_start, article_id, category_id, source_type;

CREATE OR REPLACE VIEW monthly_metrics AS
SELECT
  date_trunc('month', date)::DATE AS month_start,
  article_id,
  category_id,
  source_type,
  SUM(views) AS views,
  SUM(unique_visitors) AS unique_visitors,
  SUM(new_visitors) AS new_visitors,
  SUM(returning_visitors) AS returning_visitors,
  AVG(avg_read_time) AS avg_read_time,
  AVG(avg_scroll_depth) AS avg_scroll_depth,
  SUM(total_shares) AS total_shares
FROM daily_metrics
GROUP BY month_start, article_id, category_id, source_type;

CREATE OR REPLACE VIEW campaign_performance AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.type AS campaign_type,
  a.name AS advertiser_name,
  c.cost_model,
  c.unit_price,
  COUNT(CASE WHEN ae.event_type = 'impression' THEN 1 END) AS impressions,
  COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END) AS clicks,
  COUNT(CASE WHEN ae.event_type = 'conversion' THEN 1 END) AS conversions,
  CASE
    WHEN COUNT(CASE WHEN ae.event_type = 'impression' THEN 1 END) > 0
    THEN ROUND(COUNT(CASE WHEN ae.event_type = 'click' THEN 1 END)::NUMERIC /
         COUNT(CASE WHEN ae.event_type = 'impression' THEN 1 END) * 100, 2)
    ELSE 0
  END AS ctr_percent,
  COALESCE(SUM(cv.revenue), 0) AS total_revenue
FROM ad_campaigns c
JOIN advertisers a ON a.id = c.advertiser_id
LEFT JOIN ad_events ae ON ae.campaign_id = c.id
LEFT JOIN conversions cv ON cv.campaign_id = c.id
GROUP BY c.id, c.name, c.type, a.name, c.cost_model, c.unit_price;

CREATE OR REPLACE VIEW content_roi AS
SELECT
  ar.id AS article_id,
  ar.title,
  ar.slug,
  cat.name AS category_name,
  ar.ai_generated,
  ar.view_count,
  ar.published_at,
  COALESCE(SUM(ac.amount), 0) AS total_cost,
  CASE
    WHEN ar.view_count > 0 AND COALESCE(SUM(ac.amount), 0) > 0
    THEN ROUND(COALESCE(SUM(ac.amount), 0) / ar.view_count, 2)
    ELSE 0
  END AS cost_per_view
FROM articles ar
LEFT JOIN categories cat ON cat.id = ar.category_id
LEFT JOIN article_costs ac ON ac.article_id = ar.id
WHERE ar.status = 'published'
GROUP BY ar.id, ar.title, ar.slug, cat.name, ar.ai_generated, ar.view_count, ar.published_at;


-- ############################################################
-- SEED DATA
-- ############################################################

INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('news',       'ニュース',       '風営法改正、業界動向、摘発情報',           1),
  ('technique',  'テクニック',     '接客術、盛り上がるゲーム、初回トーク',     2),
  ('interview',  'インタビュー',   '有名ホスト/キャバ嬢の取材記事',           3),
  ('ranking',    'ランキング',     '売上、指名、SNSフォロワー',               4),
  ('column',     'コラム',         'マインドセット、キャリア、お金の話',       5),
  ('lifestyle',  'ライフスタイル', '美容、ファッション、不動産、食事',         6);

INSERT INTO authors (slug, name, bio, is_ai) VALUES
  ('nightpicks-ai', 'NIGHTPICKS AI', 'AIが最新のナイトワーク情報をお届けします。', true),
  ('editorial',     '編集部',        'NIGHTPICKS編集部',                         false);
