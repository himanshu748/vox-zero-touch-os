import React, { useState } from "react";

// Opt-in, development-only diagnostics. The production bundle excludes this module.
export default function AccessibilityAudit() {
  const [report, setReport] = useState(null),
    [running, setRunning] = useState(false);
  async function audit() {
    setReport(null);
    setRunning(true);
    try {
      const { default: axe } = await import("axe-core");
      const result = await axe.run(
        { exclude: [["#vox-qa-audit"]] },
        {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
          },
        },
      );
      setReport({
        checkedAt: new Date().toISOString(),
        tool: `axe-core ${axe.version}`,
        url: location.href,
        viewport: {
          width: innerWidth,
          height: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
        },
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        rulesPassed: result.passes.length,
        violations: result.violations.map(
          ({ id, impact, description, helpUrl, nodes }) => ({
            id,
            impact,
            description,
            helpUrl,
            nodes: nodes.map(({ target, failureSummary }) => ({
              target,
              failureSummary,
            })),
          }),
        ),
        incomplete: result.incomplete.map(({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((n) => n.target),
        })),
        motion: [...document.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .filter((el) => {
            const s = getComputedStyle(el);
            return s.animationName !== "none" && s.animationDuration !== "0s";
          })
          .slice(0, 20)
          .map((el) => ({
            tag: el.tagName,
            className: String(el.className),
            animation: getComputedStyle(el).animationName,
          })),
      });
    } catch (error) {
      setReport({ error: String(error.message) });
    } finally {
      setRunning(false);
    }
  }
  return (
    <details
      id="vox-qa-audit"
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 99999,
        background: "white",
        color: "#171b25",
        border: "1px solid #777",
        padding: 8,
        maxWidth: "min(600px, 95vw)",
        maxHeight: "65vh",
        overflow: "auto",
      }}
    >
      <summary>Development accessibility audit</summary>
      <button onClick={audit} disabled={running}>
        {running ? "Auditing…" : "Run accessibility audit"}
      </button>
      {report && (
        <pre
          id="vox-audit-report"
          style={{ whiteSpace: "pre-wrap", fontSize: 12 }}
        >
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </details>
  );
}
