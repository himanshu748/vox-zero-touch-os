// Mirror the public capability snapshot for UX only. The server owns all limits.
export function voiceAvailability(capabilities, isJudge) {
  if (capabilities.modelMode === "local")
    return {
      allowed: false,
      label: "Voice skipped in local mode",
      message:
        "Local mode uses text instructions. No voice provider is called.",
    };
  if (isJudge) {
    const pass = capabilities.judge;
    if (pass?.mode !== "live")
      return {
        allowed: false,
        label:
          pass?.mode === "expired"
            ? "Live pass expired"
            : "Text demo available",
        message:
          pass?.mode === "expired"
            ? "This live pass has expired. Your saved work remains available; switch to the rules-only demo to try another instruction."
            : "Voice requires an unused live pass. The rules-only demo accepts text instructions.",
      };
    if (
      Number.isFinite(pass.limits?.transcribe) &&
      pass.used.transcribe >= pass.limits.transcribe
    )
      return {
        allowed: false,
        label: "Voice upload already used",
        message:
          "This pass has used its one voice upload. Saved transcripts and runs remain available. You can type an instruction if its planning attempt is unused, or switch to the rules-only demo.",
      };
    if (
      Number.isFinite(pass.limits?.plan) &&
      pass.used.plan >= pass.limits.plan
    )
      return {
        allowed: false,
        label: "Planning attempt already used",
        message:
          "This pass has used its planning attempt. Open your saved plan or run, or switch to the rules-only demo. Another recording would not start a new plan.",
      };
  }
  if (!capabilities.elevenlabs)
    return {
      allowed: false,
      label: "Voice unavailable",
      message:
        "ElevenLabs is not connected in this workspace. Use a text instruction.",
    };
  return { allowed: true, label: "Ready when you are", message: null };
}
