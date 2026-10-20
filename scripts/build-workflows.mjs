import { bundleWorkflowCode } from "@temporalio/worker";
import { mkdir, writeFile } from "node:fs/promises";
const bundle = await bundleWorkflowCode({
  workflowsPath: new URL("../server/temporal-workflow.cjs", import.meta.url)
    .pathname,
});
await mkdir(new URL("../dist/server/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../dist/server/temporal-workflow.js", import.meta.url),
  bundle.code,
);
