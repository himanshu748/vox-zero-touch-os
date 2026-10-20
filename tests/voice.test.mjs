import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { pcmWave } from "../src/voice-audio.js";
import { inspectAudio, createVoiceServices } from "../server/voice.mjs";
import { createStore } from "../server/store.mjs";
import { createApp } from "../server/app.mjs";
const wave = (seconds) =>
  Buffer.from(pcmWave(new Float32Array(seconds * 16000), 16000));
function voiceEnv(t) {
  const original = {
    key: process.env.ELEVENLABS_API_KEY,
    voice: process.env.ELEVENLABS_VOICE_ID,
  };
  process.env.ELEVENLABS_API_KEY = "test-only";
  process.env.ELEVENLABS_VOICE_ID = "test-voice";
  t.after(() => {
    for (const [name, value] of [
      ["ELEVENLABS_API_KEY", original.key],
      ["ELEVENLABS_VOICE_ID", original.voice],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}
test("recorded WAV has a verifiable duration; long, empty and invalid uploads are rejected", async () => {
  const audio = await inspectAudio(wave(2), "audio/wav");
  assert.equal(audio.durationSeconds, 2);
  await assert.rejects(inspectAudio(wave(61), "audio/wav"), /60 seconds/);
  await assert.rejects(
    inspectAudio(Buffer.alloc(0), "audio/wav"),
    /audio command/,
  );
  await assert.rejects(
    inspectAudio(Buffer.from("not audio"), "audio/wav"),
    /could not be (read|validated)/,
  );
});
test("voice service uses the validated audio and preserves real provider response metadata", async (t) => {
  voiceEnv(t);
  let calls = 0;
  const voice = createVoiceServices({
    fetchImpl: async (url, options) => {
      calls++;
      assert.match(url, /speech-to-text$/);
      assert(options.body.get("file").size > 0);
      assert.equal(options.body.get("model_id"), "scribe_v2");
      return new Response(
        JSON.stringify({ text: "Triage the queue.", language_code: "eng" }),
        {
          headers: {
            "content-type": "application/json",
            "request-id": "test-stt-receipt",
          },
        },
      );
    },
  });
  const result = await voice.transcribe(wave(1), "audio/wav");
  assert.equal(result.text, "Triage the queue.");
  assert.equal(result.receipt.requestId, "test-stt-receipt");
  assert.equal(result.receipt.durationSeconds, 1);
  await assert.rejects(voice.transcribe(wave(61), "audio/wav"));
  assert.equal(calls, 1);
});
test("speech replays use an owner-bound cache, including concurrent requests", async (t) => {
  voiceEnv(t);
  const store = createStore(":memory:");
  t.after(() => store.close());
  let calls = 0;
  const voice = createVoiceServices({
    fetchImpl: async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return new Response(Buffer.from("test-only-audio"), {
        headers: {
          "content-type": "audio/mpeg",
          "request-id": "test-tts-receipt",
        },
      });
    },
  });
  const input = {
    owner: "a",
    runId: "run",
    text: "Two replies need your review.",
    store,
  };
  const [first, second] = await Promise.all([
    voice.speak(input),
    voice.speak(input),
  ]);
  assert.equal(calls, 1);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(second.receipt, null);
  assert.equal((await voice.speak(input)).cached, true);
  assert.equal(calls, 1);
  await voice.speak({ ...input, owner: "b" });
  assert.equal(calls, 2);
  store.reset("a");
  assert.equal((await voice.speak(input)).cached, false);
  assert.equal(calls, 3);
});
test("provider failures are actionable and do not fall back silently", async (t) => {
  voiceEnv(t);
  const voice = createVoiceServices({
    fetchImpl: async () => new Response("{}", { status: 429 }),
  });
  await assert.rejects(
    voice.transcribe(wave(1), "audio/wav"),
    /credit cap and account quota/,
  );
});
test("voice transcripts are linked to plans and cannot cross session boundaries", async (t) => {
  voiceEnv(t);
  const store = createStore(":memory:");
  const voice = {
    transcribe: async () => ({
      text: "Triage the queue and tag urgent tickets.",
      language: "eng",
      receipt: {
        provider: "ElevenLabs",
        operation: "transcription",
        model: "test-stt",
      },
    }),
  };
  const { app, engine } = createApp(store, { delay: 0, voice });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await engine.close();
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + "/api/transcribe", {
    method: "POST",
    headers: { "content-type": "audio/wav" },
    body: wave(1),
  });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const transcript = await response.json();
  assert.equal(response.status, 200);
  const command = { command: transcript.text, transcriptId: transcript.id };
  const makePlan = (headers) =>
    fetch(base + "/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(command),
    });
  const plan = await (await makePlan({ cookie })).json();
  assert.equal(plan.input.kind, "voice");
  assert.equal(plan.input.edited, false);
  assert.equal((await makePlan({})).status, 404);
});

test("a briefing changed during generation is not saved or played as current", async (t) => {
  voiceEnv(t);
  const store = createStore(":memory:");
  t.after(() => store.close());
  const voice = createVoiceServices({
    fetchImpl: async () =>
      new Response(Buffer.from("test-only-audio"), {
        headers: { "content-type": "audio/mpeg" },
      }),
  });
  await assert.rejects(
    voice.speak({
      owner: "a",
      runId: "run",
      text: "Old briefing.",
      store,
      isCurrent: () => false,
    }),
    /briefing changed/,
  );
  assert.equal(
    store.db.prepare("SELECT count(*) AS n FROM speech_cache").get().n,
    0,
  );
});

test("closing an in-flight transcription aborts processing without saving a transcript", async (t) => {
  voiceEnv(t);
  const store = createStore(":memory:");
  let started,
    aborted = false;
  const began = new Promise((resolve) => (started = resolve));
  const voice = {
    transcribe: async (buffer, mime, { signal }) => {
      started();
      return new Promise((resolve, reject) =>
        signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        ),
      );
    },
  };
  const { app, engine } = createApp(store, { delay: 0, voice }),
    server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await engine.close();
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const controller = new AbortController();
  const pending = fetch(
    `http://127.0.0.1:${server.address().port}/api/transcribe`,
    {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: wave(1),
      signal: controller.signal,
    },
  );
  await began;
  controller.abort();
  await assert.rejects(pending);
  for (let i = 0; i < 30 && !aborted; i++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(aborted, true);
  assert.equal(store.get(store.owners()[0]).transcripts.length, 0);
});
