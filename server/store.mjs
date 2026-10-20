import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { seedTickets } from "./seed.mjs";
export function createStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL); CREATE TABLE IF NOT EXISTS speech_cache (owner TEXT NOT NULL, run_id TEXT NOT NULL, hash TEXT NOT NULL, audio BLOB NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(owner, run_id, hash));",
  );
  const read = db.prepare("SELECT data FROM workspaces WHERE id=?");
  const write = db.prepare(
    "INSERT INTO workspaces(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
  );
  const fresh = () => ({
    tickets: seedTickets(),
    plans: [],
    runs: [],
    ledger: [],
    receipts: [],
    transcripts: [],
    preferences: { style: "concise", injectFailure: true, scope: "all" },
    createdAt: new Date().toISOString(),
  });
  return {
    path,
    db,
    get(id) {
      const row = read.get(id);
      if (row) return JSON.parse(row.data);
      const s = fresh();
      write.run(id, JSON.stringify(s));
      return s;
    },
    mutate(id, fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const state = this.get(id);
        const result = fn(state);
        write.run(id, JSON.stringify(state));
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    getSpeech(owner, runId, hash) {
      return db
        .prepare(
          "SELECT audio FROM speech_cache WHERE owner=? AND run_id=? AND hash=?",
        )
        .get(owner, runId, hash);
    },
    putSpeech(owner, runId, hash, audio) {
      db.prepare("INSERT OR REPLACE INTO speech_cache VALUES (?,?,?,?,?)").run(
        owner,
        runId,
        hash,
        audio,
        new Date().toISOString(),
      );
      db.prepare(
        "DELETE FROM speech_cache WHERE owner=? AND rowid NOT IN (SELECT rowid FROM speech_cache WHERE owner=? ORDER BY created_at DESC LIMIT 10)",
      ).run(owner, owner);
    },
    owners() {
      return db
        .prepare("SELECT id FROM workspaces")
        .all()
        .map((r) => r.id);
    },
    reset(id) {
      db.prepare("DELETE FROM speech_cache WHERE owner=?").run(id);
      const s = fresh();
      write.run(id, JSON.stringify(s));
      return s;
    },
    close() {
      db.close();
    },
  };
}
