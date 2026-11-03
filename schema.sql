-- Cloudflare D1 建表语句
-- 执行方式：
-- npx wrangler d1 execute qm-sync --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS qm_sync (
  space_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  order_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_updated ON qm_sync(updated_at);
