import { useCallback, useEffect, useRef, useState } from "react";
// A finite, user-controlled illustration. These phases never execute tools.
export function useWorkflowPreview(example, reduced) {
  const [phase, setPhase] = useState(-1),
    [status, setStatus] = useState("idle");
  const timers = useRef([]),
    elapsed = useRef(0),
    started = useRef(0);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => {
    clear();
    elapsed.current = 0;
    setPhase(-1);
    setStatus("idle");
    return clear;
  }, [example, clear]);
  const toggle = () => {
    if (reduced) {
      setPhase(4);
      setStatus("complete");
      return;
    }
    if (status === "playing") {
      elapsed.current += performance.now() - started.current;
      clear();
      setStatus("paused");
      return;
    }
    const resuming = status === "paused";
    if (!resuming) {
      elapsed.current = 0;
      setPhase(0);
    }
    started.current = performance.now();
    setStatus("playing");
    [0, 1600, 3200, 4800, 6400].forEach((at, i) => {
      if (at >= elapsed.current)
        timers.current.push(
          setTimeout(
            () => {
              setPhase(i);
              if (i === 4) {
                setStatus("complete");
                elapsed.current = 0;
              }
            },
            Math.max(0, at - elapsed.current),
          ),
        );
    });
  };
  return { phase, status, toggle };
}
