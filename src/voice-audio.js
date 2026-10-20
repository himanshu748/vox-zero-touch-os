export function pcmWave(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(buffer);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, index) =>
    view.setInt16(
      44 + index * 2,
      Math.round(
        Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767),
      ),
      true,
    ),
  );
  return buffer;
}
// MediaRecorder WebM often has no duration header. Normalize in memory so the
// server can validate a finite duration before sending anything to ElevenLabs.
export async function recordingWave(blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > 60.5)
      throw new Error("Keep voice commands to 60 seconds or less.");
    const renderer = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 16000),
      16000,
    );
    const source = renderer.createBufferSource();
    source.buffer = decoded;
    source.connect(renderer.destination);
    source.start();
    const mono = await renderer.startRendering();
    return new Blob([pcmWave(mono.getChannelData(0), 16000)], {
      type: "audio/wav",
    });
  } finally {
    await context.close();
  }
}
