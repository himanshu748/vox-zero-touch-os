import test from "node:test";
import assert from "node:assert/strict";
import { voiceAvailability } from "../shared/voice-access.mjs";

const capabilities = (overrides = {}) => ({
  modelMode: "hosted",
  elevenlabs: true,
  judge: {
    mode: "live",
    limits: { transcribe: 1, plan: 1 },
    used: { transcribe: 0, plan: 0 },
    ...overrides,
  },
});

test("voice controls block used uploads and used planning attempts before recording", () => {
  const uploaded = capabilities({ used: { transcribe: 1, plan: 0 } });
  const before = structuredClone(uploaded);
  const access = voiceAvailability(uploaded, true);
  assert.equal(access.allowed, false);
  assert.equal(access.label, "Voice upload already used");
  assert.match(access.message, /type an instruction/);
  assert.deepEqual(uploaded, before); // Displaying access never renews quota.
  const planned = voiceAvailability(
    capabilities({ used: { plan: 1, transcribe: 0 } }),
    true,
  );
  assert.equal(planned.allowed, false);
  assert.match(planned.message, /Another recording would not start a new plan/);
});

test("voice access distinguishes local, expired, rules-only and disconnected modes", () => {
  assert.equal(
    voiceAvailability({ modelMode: "local", elevenlabs: true }, false).allowed,
    false,
  );
  for (const mode of ["expired", "unclaimed", "sandbox"])
    assert.equal(
      voiceAvailability(capabilities({ mode }), true).allowed,
      false,
    );
  assert.equal(
    voiceAvailability({ modelMode: "hosted", elevenlabs: false }, false)
      .allowed,
    false,
  );
  assert.equal(voiceAvailability(capabilities(), true).allowed, true);
  assert.equal(
    voiceAvailability({ modelMode: "hosted", elevenlabs: true }, false).allowed,
    true,
  );
});

test("repeat-request sessions remain usable after the former voice and plan ceilings", () => {
  const access = voiceAvailability(
    capabilities({
      limits: { transcribe: null, plan: null },
      used: { transcribe: 7, plan: 4 },
    }),
    true,
  );
  assert.equal(access.allowed, true);
  assert.equal(access.message, null);
});
