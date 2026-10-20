import express from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const grantSchema = z
  .object({
    owner: z.string().max(100),
    runId: z.string().uuid(),
    ticketId: z.string().max(40),
    sessionId: z.string().uuid(),
    expires: z.number().int(),
  })
  .strict();
const signingKey = () => process.env.AUTH0_SESSION_SECRET;
export const browserEnabled = () =>
  Boolean(
    process.env.BROWSERBASE_API_KEY &&
    process.env.BROWSERBASE_PROJECT_ID &&
    process.env.PUBLIC_ORIGIN &&
    signingKey(),
  );
export function signBrowserGrant(payload) {
  if (!signingKey())
    throw new Error("Browser grant signing is not configured.");
  const body = Buffer.from(JSON.stringify(grantSchema.parse(payload))).toString(
    "base64url",
  );
  return (
    body +
    "." +
    createHmac("sha256", signingKey()).update(body).digest("base64url")
  );
}
export function readBrowserGrant(token) {
  try {
    if (!signingKey() || !token || token.length > 1500) return null;
    const [body, signature, ...rest] = token.split(".");
    if (rest.length || !signature) return null;
    const expected = createHmac("sha256", signingKey()).update(body).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    const grant = grantSchema.parse(
      JSON.parse(Buffer.from(body, "base64url").toString()),
    );
    return grant.expires > Date.now() && grant.expires <= Date.now() + 180000
      ? grant
      : null;
  } catch {
    return null;
  }
}
const noteFor = (runId) =>
  `Reviewed by VOX run ${runId.slice(0, 8)}. Human approval is required before any reply.`;
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function configureBrowserOperations(app, store) {
  function authorize(req, res, next) {
    const token = req.headers.cookie
      ?.split("; ")
      .find((item) => item.startsWith("vox_browser="))
      ?.slice(12);
    const grant = readBrowserGrant(token);
    const state = grant && store.get(grant.owner),
      run = state?.runs.find((item) => item.id === grant.runId),
      ticket = state?.tickets.find((item) => item.id === grant.ticketId);
    if (
      !grant ||
      !run ||
      !ticket ||
      run.status !== "running" ||
      !run.plan.actions.includes("tag") ||
      !run.plan.ticketIds.includes(ticket.id)
    )
      return res
        .status(403)
        .send("This browser operation is unavailable or expired.");
    req.browserOperation = { grant, run, ticket };
    next();
  }
  app.get("/browser/operations", authorize, (req, res) => {
    const { grant, ticket } = req.browserOperation;
    res
      .set({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
      })
      .type("html")
      .send(
        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VOX internal helpdesk</title><style>body{font:18px system-ui;background:#f5f2eb;color:#233b32;max-width:720px;margin:6vh auto;padding:24px}label,textarea{display:block}textarea{box-sizing:border-box;width:100%;min-height:120px;margin:16px 0;padding:16px;font:inherit}button{background:#233b32;color:white;border:0;border-radius:10px;padding:16px;font:inherit}</style><h1>Internal ticket review</h1><p>Synthetic ticket ${escapeHTML(ticket.id)} · ${escapeHTML(ticket.title)}</p><p>This grant permits one internal note. Sending and account changes are unavailable.</p><form method="post" action="/browser/operations"><label for="note">Internal review note</label><textarea id="note" name="note" maxlength="220">${escapeHTML(ticket.browserNote || "")}</textarea><button type="submit">Save internal note</button></form><p>Required note: ${escapeHTML(noteFor(grant.runId))}</p></html>`,
      );
  });
  app.post(
    "/browser/operations",
    express.urlencoded({ extended: false, limit: "1kb" }),
    authorize,
    async (req, res, next) => {
      try {
        if (req.headers.origin !== process.env.PUBLIC_ORIGIN)
          return res.status(403).send("Origin rejected.");
        const { grant } = req.browserOperation;
        const input = z
          .object({ note: z.literal(noteFor(grant.runId)) })
          .strict()
          .safeParse(req.body);
        if (!input.success)
          return res
            .status(422)
            .send("Only the approved internal review note can be saved.");
        store.mutate(grant.owner, (state) => {
          const key = `${grant.runId}:browser-note:${grant.ticketId}`;
          if (state.ledger.some((item) => item.key === key)) return;
          const ticket = state.tickets.find(
              (item) => item.id === grant.ticketId,
            ),
            run = state.runs.find((item) => item.id === grant.runId),
            receiptId = randomUUID(),
            at = new Date().toISOString();
          ticket.browserNote = input.data.note;
          state.ledger.push({
            key,
            runId: grant.runId,
            ticketId: ticket.id,
            kind: "browser-note",
            at,
          });
          run.browserOperation = {
            ticketId: ticket.id,
            note: input.data.note,
            sessionId: grant.sessionId,
            receiptId,
            at,
          };
          state.receipts.push({
            id: receiptId,
            runId: run.id,
            provider: "Browserbase",
            sdk: "Stagehand 4.3.0",
            operation: "internal note saved through helpdesk UI",
            sessionId: grant.sessionId,
            createdAt: at,
            cost: null,
          });
        });
        await store.flush?.();
        res
          .type("html")
          .send(
            '<!doctype html><html lang="en"><title>VOX note saved</title><h1>Internal note saved</h1><p>The synthetic ticket was updated. No external message was sent.</p></html>',
          );
      } catch (error) {
        next(error);
      }
    },
  );
}
export async function reviewTicketInBrowser(store, owner, id) {
  const run = store.get(owner).runs.find((item) => item.id === id);
  if (run.browserOperation) return run.browserOperation;
  if (!browserEnabled())
    throw new Error("The approved Browserbase provider is not configured.");
  const { Stagehand, browserbase } = await import("@browserbasehq/stagehand");
  const origin = new URL(process.env.PUBLIC_ORIGIN);
  if (origin.protocol !== "https:")
    throw new Error(
      "Remote browser operations require the hosted HTTPS origin.",
    );
  const ticketId = run.plan.ticketIds[0],
    start = Date.now();
  const browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    timeout: 120,
    clientOptions: { maxRetries: 0, timeout: 30000 },
  });
  let stagehand;
  try {
    await browser.context.setDomainPolicy({
      allowedDomains: [origin.hostname],
    });
    const token = signBrowserGrant({
      owner,
      runId: id,
      ticketId,
      sessionId: browser.sessionId,
      expires: Date.now() + 180000,
    });
    await browser.context.addCookies([
      {
        name: "vox_browser",
        value: token,
        domain: origin.hostname,
        path: "/browser/operations",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        expires: Math.floor(Date.now() / 1000) + 180,
      },
    ]);
    stagehand = await Stagehand.create({
      browser,
      model: {
        modelName: process.env.STAGEHAND_MODEL || "google/gemini-2.5-flash",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      logging: { level: "off" },
    });
    const [page] = await browser.context.pages();
    await page.goto(new URL("/browser/operations", origin).href);
    const fill = await stagehand.act(
      `Fill the Internal review note textarea with exactly: ${noteFor(id)}`,
    );
    const save = await stagehand.act("Click Save internal note.");
    const result = store
      .get(owner)
      .runs.find((item) => item.id === id).browserOperation;
    if (
      !result ||
      result.note !== noteFor(id) ||
      result.sessionId !== browser.sessionId
    )
      throw new Error(
        "Browserbase did not produce the required persisted field update.",
      );
    store.mutate(owner, (state) => {
      const receipt = state.receipts.find(
        (item) => item.id === result.receiptId,
      );
      receipt.latencyMs = Date.now() - start;
      receipt.model = process.env.STAGEHAND_MODEL || "google/gemini-2.5-flash";
      receipt.usage =
        fill.metadata?.usage && save.metadata?.usage
          ? {
              inputTokens:
                fill.metadata.usage.inputTokens +
                save.metadata.usage.inputTokens,
              outputTokens:
                fill.metadata.usage.outputTokens +
                save.metadata.usage.outputTokens,
            }
          : null;
    });
    await store.flush?.();
    return result;
  } finally {
    await stagehand?.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
