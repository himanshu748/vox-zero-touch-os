const {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
} = require("@temporalio/workflow");
const wake = defineSignal("ownerDecision");
const { executePipeline } = proxyActivities({
  startToCloseTimeout: "10 minutes",
  heartbeatTimeout: "20 seconds",
  retry: {
    initialInterval: "1 second",
    maximumAttempts: 2,
    nonRetryableErrorTypes: ["ProviderFailure"],
  },
});

exports.voxWorkflow = async function voxWorkflow(input) {
  let decisions = 0;
  setHandler(wake, () => {
    decisions += 1;
  });
  for (;;) {
    const before = decisions;
    const result = await executePipeline(input);
    if (!["awaiting_approval", "cancelled"].includes(result.status))
      return result;
    await condition(() => decisions > before);
  }
};
