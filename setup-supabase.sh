#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/wakabayashiryoya/nightpicks"
PROJECT_REF="boyqhaiimgiatytlpdoi"
SCHEMA_FILE="${PROJECT_DIR}/supabase/schema.sql"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "========================================="
echo "  nightpicks Supabase セットアップ"
echo "========================================="
echo ""

# Step 1: Supabase CLI
if command -v supabase &> /dev/null; then
  log "Supabase CLI: $(supabase --version)"
else
  warn "Supabase CLI をインストールします..."
  if command -v brew &> /dev/null; then
    brew install supabase/tap/supabase
  elif command -v npm &> /dev/null; then
    npm install -g supabase
  else
    error "brew も npm も見つかりません"
  fi
fi

# Step 2: ログイン
echo ""
echo "--- Step 2: ログイン確認 ---"
if ! supabase projects list &> /dev/null; then
  warn "ログインしてください"
  supabase login
fi
log "ログイン済み"

# Step 3: init
echo ""
echo "--- Step 3: プロジェクト初期化 ---"
cd "$PROJECT_DIR" || error "ディレクトリが見つかりません: $PROJECT_DIR"
if [ -d "supabase" ]; then
  log "supabase/ は既に存在（init スキップ）"
else
  supabase init
  log "supabase init 完了"
fi

# Step 4: schema.sql 確認
echo ""
echo "--- Step 4: schema.sql 確認 ---"
if [ ! -f "$SCHEMA_FILE" ]; then
  error "schema.sql が見つかりません: $SCHEMA_FILE"
fi
log "schema.sql 確認OK"

# Step 5: リンク
echo ""
echo "--- Step 5: プロジェクトリンク ---"
echo "  ※ DBパスワードの入力を求められます"
supabase link --project-ref "$PROJECT_REF"
log "リンク完了"

# Step 6: スキーマ適用
echo ""
echo "--- Step 6: スキーマ適用 ---"
MIGRATION_DIR="${PROJECT_DIR}/supabase/migrations"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_FILE="${MIGRATION_DIR}/${TIMESTAMP}_initial_schema.sql"
mkdir -p "$MIGRATION_DIR"

EXISTING=$(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$EXISTING" -gt 0 ]; then
  warn "既存マイグレーション ${EXISTING} 個あり。そのまま push します"
else
  cp "$SCHEMA_FILE" "$MIGRATION_FILE"
  log "マイグレーションファイル作成: $MIGRATION_FILE"
fi

if supabase db push; then
  log "スキーマ適用完了 (db push)"
else
  warn "db push 失敗。psql で試みます..."
  DB_URL=$(supabase db url --linked 2>/dev/null || true)
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -f "$SCHEMA_FILE"
    log "スキーマ適用完了 (psql)"
  else
    error "DB URL 取得失敗"
  fi
fi

# Step 7: 確認
echo ""
echo "--- Step 7: 適用確認 ---"
DB_URL=$(supabase db url --linked 2>/dev/null || true)
if [ -n "$DB_URL" ]; then
  TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null | tr -d ' ' || echo "0")
  psql "$DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;" 2>/dev/null || true
  [ "$TABLE_COUNT" -ge 27 ] && log "テーブル: ${TABLE_COUNT} 個 ✓" || warn "テーブル: ${TABLE_COUNT} 個 (期待: 27以上)"

  VIEW_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM information_schema.views WHERE table_schema='public';" 2>/dev/null | tr -d ' ' || echo "0")
  psql "$DB_URL" -c "SELECT table_name FROM information_schema.views WHERE table_schema='public' ORDER BY table_name;" 2>/dev/null || true
  [ "$VIEW_COUNT" -ge 4 ] && log "ビュー: ${VIEW_COUNT} 個 ✓" || warn "ビュー: ${VIEW_COUNT} 個 (期待: 4)"

  CAT_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM public.categories;" 2>/dev/null | tr -d ' ' || echo "0")
  AUTH_COUNT=$(psql "$DB_URL" -t -c "SELECT count(*) FROM public.authors;" 2>/dev/null | tr -d ' ' || echo "0")
  [ "$CAT_COUNT" -ge 6 ] && log "categories: ${CAT_COUNT} 行 ✓" || warn "categories: ${CAT_COUNT} 行 (期待: 6)"
  [ "$AUTH_COUNT" -ge 2 ] && log "authors: ${AUTH_COUNT} 行 ✓" || warn "authors: ${AUTH_COUNT} 行 (期待: 2)"
else
  warn "DB URL取得失敗。手動で確認してください"
fi

# Step 8: Storage
echo ""
echo "--- Step 8: Storage バケット ---"
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL "${PROJECT_DIR}/.env.local" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" || true)
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY "${PROJECT_DIR}/.env.local" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" || true)

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
  BUCKET_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    "${SUPABASE_URL}/storage/v1/bucket/images" 2>/dev/null || echo "000")
  if [ "$BUCKET_EXISTS" = "200" ]; then
    log "images バケット既存"
  else
    CREATE_RESULT=$(curl -s -X POST \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "apikey: $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"id":"images","name":"images","public":true}' \
      "${SUPABASE_URL}/storage/v1/bucket" 2>/dev/null || echo "error")
    echo "$CREATE_RESULT" | grep -q '"name":"images"' && log "images バケット作成完了" || warn "バケット作成失敗: $CREATE_RESULT"
  fi
else
  warn ".env.local からキーを読めませんでした。ダッシュボードで手動作成してください"
fi

echo ""
echo "========================================="
echo "  セットアップ完了!"
echo "========================================="
echo "  ダッシュボード: https://supabase.com/dashboard/project/${PROJECT_REF}"
echo ""
