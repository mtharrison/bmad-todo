CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_namespace TEXT NOT NULL,
  text TEXT NOT NULL CHECK (length(text) <= 10000),
  completed_at INTEGER NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_namespace_created
  ON tasks (user_namespace, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  user_namespace TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idem_created
  ON idempotency_keys (created_at);
