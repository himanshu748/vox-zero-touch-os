// Schedule from completion so slow responses cannot be invalidated by the next poll.
// refresh owns error reporting; failed requests still allow a later retry.
export function startWorkspacePolling(
  refresh,
  { interval = 1500, setTimer = setTimeout, clearTimer = clearTimeout } = {},
) {
  let stopped = false,
    timer;
  const schedule = () => {
    if (!stopped) timer = setTimer(poll, interval);
  };
  const poll = () =>
    Promise.resolve()
      .then(() => {
        if (!stopped) return refresh();
      })
      .then(schedule, schedule);
  void poll();
  return () => {
    stopped = true;
    clearTimer(timer);
  };
}
