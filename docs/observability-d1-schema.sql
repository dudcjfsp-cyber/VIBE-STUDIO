-- Vibe Studio Observability D1 Schema
-- Updated: 2026-04-20
-- Purpose: docs/observability-foundation.md 와 docs/observability-event-taxonomy.md 를 기준으로
--          초기 저비용 관측 저장 구조를 바로 만들 수 있게 하는 SQL 초안

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  entry_surface TEXT NOT NULL,
  client_version TEXT,
  locale TEXT,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  mode_guess TEXT,
  renderer TEXT,
  provider TEXT,
  model TEXT,
  approval_level TEXT,
  next_step TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  run_id TEXT,
  event_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  surface TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS errors (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  run_id TEXT,
  error_type TEXT NOT NULL,
  error_stage TEXT NOT NULL,
  status_code INTEGER,
  message_preview TEXT,
  created_at TEXT NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_session_id
  ON runs(session_id);

CREATE INDEX IF NOT EXISTS idx_runs_started_at
  ON runs(started_at);

CREATE INDEX IF NOT EXISTS idx_runs_renderer_status
  ON runs(renderer, status);

CREATE INDEX IF NOT EXISTS idx_events_session_created
  ON events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_run_created
  ON events(run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_name_created
  ON events(event_name, created_at);

CREATE INDEX IF NOT EXISTS idx_errors_session_created
  ON errors(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_errors_stage_created
  ON errors(error_stage, created_at);

-- Notes
-- 1. 입력 원문 전체는 기본 컬럼으로 두지 않는다.
-- 2. 필요 시 payload_json / metadata_json 에 redacted preview, length, counts 정도만 넣는다.
-- 3. 최초 구현은 sessions / runs / events / errors 네 테이블만 쓴다.
