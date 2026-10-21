import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist";
const App = lazy(() => import("./App"));
const Landing = lazy(() => import("./Landing"));
const AccessibilityAudit =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("qa")
    ? lazy(() => import("./qa-audit"))
    : null;
import "./styles.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Suspense
        fallback={
          <div className="loading-screen">
            <p>Getting your workspace ready…</p>
          </div>
        }
      >
        {/^\/(app|judge)(\/|$)/.test(window.location.pathname) ? (
          <App />
        ) : (
          <Landing />
        )}
      </Suspense>
      {AccessibilityAudit && (
        <Suspense fallback={null}>
          <AccessibilityAudit />
        </Suspense>
      )}
    </MotionConfig>
  </React.StrictMode>,
);
