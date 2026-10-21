import { parseBuffer } from "music-metadata";
import { createHash } from "node:crypto";
import { z } from "zod";

const endpoint = "https://api.elevenlabs.io/v1";
const failure = (message, status = 422) =>
  Object.assign(new Error(message), { status, publicMessage: true });
const requestId = (response) =>
  response.headers.get("request-id") ||
  response.headers.get("x-request-id") ||
  null;
function providerError(response, operation) {
  const advice =
    response.status === 401 || response.status === 403
      ? "Check the ElevenLabs key and endpoint permissions."
      : response.status === 429
        ? "The provider limit has been reached. Check your key's credit cap and account quota."
        : "Try again after checking the provider status.";
  return failure(
    `${operation} failed (HTTP ${response.status}). ${advice}`,
    response.status === 429 ? 429 : 502,
  );
}
export async function inspectAudio(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length)
    throw failure("Record or upload an audio command first.", 400);
  if (buffer.length > 8 * 1024 * 1024)
    throw failure("Audio files must be smaller than 8 MB.", 413);
  let metadata;
  try {
    metadata = await parseBuffer(
      buffer,
      { mimeType: mime },
      { duration: true },
    );
  } catch {
    throw failure(
      "This audio file could not be read. Try WAV, MP3, M4A, Ogg or WebM.",
    );
  }
  const duration = metadata.format.duration;
  if (!Number.isFinite(duration) || duration <= 0)
    throw failure(
      "The audio duration could not be validated. Export a WAV or MP3 file and try again.",
    );
  if (duration > 60.5)
    throw failure("Keep voice commands to 60 seconds or less.");
  return {
    durationSeconds: Math.round(duration * 1000) / 1000,
    bytes: buffer.length,
    mime,
  };
}
export function createVoiceServices({ fetchImpl = fetch } = {}) {
  const pendingSpeech = new Map();
  return {
    async transcribe(buffer, mime, { signal } = {}) {
      if (!process.env.ELEVENLABS_API_KEY)
        throw failure(
          "ElevenLabs is not connected. Use the editable text command instead.",
          503,
        );
      const audio = await inspectAudio(buffer, mime);
      const form = new FormData();
      const extension = mime?.includes("wav")
        ? "wav"
        : mime?.includes("mpeg")
          ? "mp3"
          : mime?.includes("mp4")
            ? "m4a"
            : mime?.includes("ogg")
              ? "ogg"
              : "webm";
      const model = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";
      form.append(
        "file",
        new Blob([buffer], { type: mime }),
        `command.${extension}`,
      );
      form.append("model_id", model);
      form.append("tag_audio_events", "false");
      const start = Date.now();
      const response = await fetchImpl(`${endpoint}/speech-to-text`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
        body: form,
        signal: AbortSignal.any([
          AbortSignal.timeout(60000),
          ...(signal ? [signal] : []),
        ]),
      });
      if (!response.ok) throw providerError(response, "Transcription");
      const result = z
        .object({
          text: z.string().trim().min(1).max(2000),
          language_code: z.string().optional(),
        })
        .passthrough()
        .parse(await response.json());
      return {
        text: result.text,
        language: result.language_code || null,
        receipt: {
          provider: "ElevenLabs",
          operation: "transcription",
          model,
          requestId: requestId(response),
          httpStatus: response.status,
          latencyMs: Date.now() - start,
          ...audio,
          cost: null,
          createdAt: new Date().toISOString(),
        },
      };
    },
    async speak({
      owner,
      runId,
      text,
      store,
      isCurrent = () => true,
      beforeGenerate = async () => {},
    }) {
      if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID)
        throw failure("ElevenLabs voice is not configured.", 503);
      if (!text || text.length > 4000)
        throw failure("The briefing is too long to generate safely.");
      const voiceId = process.env.ELEVENLABS_VOICE_ID,
        model = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";
      const hash = createHash("sha256")
        .update(JSON.stringify({ voiceId, model, text }))
        .digest("hex");
      const saved = store.getSpeech(owner, runId, hash);
      if (saved)
        return { audio: Buffer.from(saved.audio), cached: true, receipt: null };
      const key = `${owner}:${runId}:${hash}`;
      if (pendingSpeech.has(key))
        return {
          ...(await pendingSpeech.get(key)),
          cached: true,
          receipt: null,
        };
      const job = (async () => {
        await beforeGenerate();
        const start = Date.now();
        const response = await fetchImpl(
          `${endpoint}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
              "content-type": "application/json",
              accept: "audio/mpeg",
            },
            body: JSON.stringify({ text, model_id: model }),
            signal: AbortSignal.timeout(60000),
          },
        );
        if (!response.ok) throw providerError(response, "Speech generation");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("audio/"))
          throw failure(
            "The voice provider returned an invalid audio response.",
            502,
          );
        const audio = Buffer.from(await response.arrayBuffer());
        if (!audio.length || audio.length > 8 * 1024 * 1024)
          throw failure("The generated audio response was invalid.", 502);
        const receipt = {
          provider: "ElevenLabs",
          operation: "speech",
          runId,
          model,
          voiceId,
          requestId: requestId(response),
          httpStatus: response.status,
          characters: text.length,
          bytes: audio.length,
          latencyMs: Date.now() - start,
          cost: null,
          createdAt: new Date().toISOString(),
        };
        if (!isCurrent())
          throw failure(
            "The briefing changed while audio was being generated. Play it again to hear the current results.",
            409,
          );
        store.putSpeech(owner, runId, hash, audio);
        return { audio, cached: false, receipt };
      })();
      pendingSpeech.set(key, job);
      try {
        return await job;
      } finally {
        pendingSpeech.delete(key);
      }
    },
  };
}
