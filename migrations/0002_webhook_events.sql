CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT,
  processed_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx ON webhook_events(processed_at);
