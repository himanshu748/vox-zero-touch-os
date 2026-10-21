import oidc from "express-openid-connect";
import { createHash } from "node:crypto";
export function configureIdentity(app) {
  const configured = Boolean(
    process.env.AUTH0_ISSUER_BASE_URL &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SESSION_SECRET &&
    process.env.PUBLIC_ORIGIN,
  );
  if (!configured) return false;
  app.set("trust proxy", 1);
  app.use(
    oidc.auth({
      authRequired: false,
      auth0Logout: true,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SESSION_SECRET,
      baseURL: process.env.PUBLIC_ORIGIN,
      getLoginState: () => ({ returnTo: "/app" }),
      authorizationParams: {
        response_type: "code",
        scope: "openid profile email",
      },
      routes: {
        login: "/auth/login",
        logout: "/auth/logout",
        callback: "/auth/callback",
      },
      session: {
        cookie: {
          sameSite: "Lax",
          secure: process.env.PUBLIC_ORIGIN.startsWith("https:"),
        },
      },
    }),
  );
  return true;
}
export function authenticatedOwner(req) {
  if (!req.oidc?.isAuthenticated()) return null;
  if (
    process.env.AUTH0_ALLOWED_EMAIL &&
    (req.oidc.user.email !== process.env.AUTH0_ALLOWED_EMAIL ||
      req.oidc.user.email_verified !== true)
  )
    return null;
  return `auth0:${createHash("sha256").update(`${process.env.AUTH0_ISSUER_BASE_URL}:${req.oidc.user.sub}`).digest("hex")}`;
}
export function requireIdentity(req, res, next) {
  if (req.judgeAccess?.canDecide) return next();
  if (
    process.env.AUTH0_REQUIRE_APPROVAL_LOGIN === "true" &&
    !authenticatedOwner(req)
  )
    return res.status(401).json({
      error:
        "Sign in with an authorized Auth0 account to approve or reject replies.",
      login: "/auth/login",
    });
  next();
}
