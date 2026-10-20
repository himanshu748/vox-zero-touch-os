import { MongoClient } from "mongodb";

// SQLite is the local transaction cache; Atlas is the acknowledged operational snapshot.
// A revision comparison rejects concurrent writers rather than silently losing updates.
export async function connectAtlas(store, { client } = {}) {
  if (!process.env.MONGODB_URI && !client) return null;
  const mongo =
    client ||
    new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DATABASE || "vox_hf26");
  await db.command({ ping: 1 });
  const collection = db.collection("workspaces"),
    sessions = db.collection("sessions"),
    speech = db.collection("speech_cache");
  await speech.createIndex({ created_at: 1 }, { expireAfterSeconds: 604800 });
  const revisions = new Map(),
    dirty = new Map();
  for await (const item of collection.find({})) {
    store.db
      .prepare(
        "INSERT INTO workspaces(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(item._id, JSON.stringify(item.state));
    revisions.set(item._id, item.revision);
  }
  for await (const item of sessions.find({}))
    store.db
      .prepare("INSERT OR REPLACE INTO sessions VALUES (?,?)")
      .run(item._id, item.owner);
  for await (const item of speech.find({}).sort({ created_at: -1 }).limit(100))
    store.db
      .prepare("INSERT OR REPLACE INTO speech_cache VALUES (?,?,?,?,?)")
      .run(
        item.owner,
        item.run_id,
        item.hash,
        Buffer.from(item.audio.buffer),
        item.created_at.toISOString(),
      );
  const dirtySpeech = new Map(),
    resetOwners = new Set();
  const originalPutSpeech = store.putSpeech.bind(store);
  store.putSpeech = (owner, runId, hash, audio) => {
    originalPutSpeech(owner, runId, hash, audio);
    dirtySpeech.set(`${owner}:${runId}:${hash}`, {
      owner,
      run_id: runId,
      hash,
      audio,
      created_at: new Date(),
    });
  };
  const originalGet = store.get.bind(store),
    originalMutate = store.mutate.bind(store),
    originalReset = store.reset.bind(store);
  function mark(owner) {
    dirty.set(owner, JSON.stringify(originalGet(owner)));
  }
  store.get = (owner) => {
    const state = originalGet(owner);
    if (!revisions.has(owner)) mark(owner);
    return state;
  };
  store.mutate = (owner, fn) => {
    const result = originalMutate(owner, fn);
    mark(owner);
    return result;
  };
  store.reset = (owner) => {
    const result = originalReset(owner);
    mark(owner);
    resetOwners.add(owner);
    for (const [key, item] of dirtySpeech)
      if (item.owner === owner) dirtySpeech.delete(key);
    return result;
  };
  let flushing = Promise.resolve();
  store.flush = () => {
    const job = flushing
      .catch(() => {})
      .then(async () => {
        for (const [owner, data] of [...dirty]) {
          const revision = revisions.get(owner);
          const filter =
            revision === undefined
              ? { _id: owner, revision: { $exists: false } }
              : { _id: owner, revision };
          try {
            const result = await collection.replaceOne(
              filter,
              {
                _id: owner,
                revision: (revision || 0) + 1,
                state: JSON.parse(data),
                updatedAt: new Date(),
              },
              {
                upsert: revision === undefined,
                writeConcern: { w: "majority" },
              },
            );
            if (!result.matchedCount && !result.upsertedCount)
              throw new Error("Concurrent workspace update");
          } catch {
            throw new Error(
              "Atlas could not acknowledge this workspace update. Retry after restoring database access.",
            );
          }
          revisions.set(owner, (revision || 0) + 1);
          if (dirty.get(owner) === data) dirty.delete(owner);
        }
        for (const owner of [...resetOwners]) {
          await speech.deleteMany({ owner });
          resetOwners.delete(owner);
        }
        for (const [key, item] of [...dirtySpeech]) {
          await speech.replaceOne(
            { _id: key },
            { _id: key, ...item },
            { upsert: true },
          );
          if (dirtySpeech.get(key) === item) dirtySpeech.delete(key);
        }
      });
    flushing = job;
    return job;
  };
  store.saveSession = async (token, owner) => {
    await sessions.updateOne(
      { _id: token },
      { $setOnInsert: { owner, createdAt: new Date() } },
      { upsert: true },
    );
  };
  store.storageMode = "MongoDB Atlas with SQLite transaction cache";
  return {
    async close() {
      await store.flush();
      await mongo.close();
    },
    async proof(owner) {
      const item = await collection.findOne(
        { _id: owner },
        { projection: { revision: 1, updatedAt: 1, "state.runs.id": 1 } },
      );
      return {
        database: db.databaseName,
        collection: "workspaces",
        revision: item?.revision,
        updatedAt: item?.updatedAt,
      };
    },
  };
}
