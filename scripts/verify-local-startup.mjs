import { createServer } from "node:http";
import { connect } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { listenServer } from "../server/listener.mjs";

// An owned HTTP listener forces the real bootstrap to take its bind-error path.
const holder = createServer(),
  reservation = createServer();
const directory = await mkdtemp(join(tmpdir(), "vox-startup-proof-"));
try {
  const occupied = await listenServer(holder, 0, "127.0.0.1");
  const reserved = await listenServer(reservation, 0, "127.0.0.1");
  await new Promise((resolve) => reservation.close(resolve));
  let failure;
  try {
    await promisify(execFile)(process.execPath, ["server/bootstrap.mjs"], {
      env: {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        VOX_MODEL_MODE: "local",
        VOX_LOCAL_DATA_DIR: directory,
        VOX_LOCAL_PORT: String(occupied.port),
        VOX_LOCAL_TEMPORAL_PORT: String(reserved.port),
        COOKIE_SECURE: "true",
        PUBLIC_ORIGIN: "https://hosted.example",
      },
      timeout: 45000,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (error) {
    failure = error;
  }
  assert.equal(
    failure?.code,
    1,
    "A bind error must exit unsuccessfully without timing out.",
  );
  assert.match(failure.stderr, /EADDRINUSE/);
  const stillListening = await new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: reserved.port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", (error) => resolve(error.code !== "ECONNREFUSED"));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(true);
    });
  });
  assert.equal(
    stillListening,
    false,
    "The owned Temporal process must be stopped after bind failure.",
  );
  const receipt = {
    checkedAt: new Date().toISOString(),
    mode: "Real local bootstrap and Temporal CLI; forced HTTP bind failure, no model request",
    inheritedHostedSettings: {
      cookieSecure: true,
      publicOrigin: "https://hosted.example",
    },
    applicationPort: occupied.port,
    temporalPort: reserved.port,
    exitCode: failure.code,
    error: "EADDRINUSE",
    ownedTemporalStillListening: stillListening,
    cleanup:
      "Temporary synthetic data and owned HTTP listener removed; no production resources accessed",
    scope:
      "This checks local process cleanup. Cookie/origin isolation and session continuity are covered by the HTTP transport regression test.",
  };
  await writeFile(
    "docs/evidence/local-startup.json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt));
} finally {
  if (holder.listening) await new Promise((resolve) => holder.close(resolve));
  if (reservation.listening)
    await new Promise((resolve) => reservation.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
