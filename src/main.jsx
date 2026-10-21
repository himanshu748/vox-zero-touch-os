import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/geist";
const App = lazy(() => import("./App"));
const Landing = lazy(() => import("./Landing"));
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
    </MotionConfig>
  </React.StrictMode>,
);
