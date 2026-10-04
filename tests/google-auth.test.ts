import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as startGoogleAuth } from "../app/api/auth/google/route";
import { parseVerifiedGoogleProfile } from "../lib/auth/google-profile";
import {
  decodeGoogleAuthContext,
  encodeGoogleAuthContext,
  getGoogleRedirectUri,
  googleRoleMatchesPortal,
} from "../lib/auth/google-oauth";

test("Google callback URI can be explicitly pinned per environment", () => {
  assert.strictEqual(
    getGoogleRedirectUri(
      "https://vantory.example.com/api/auth/google/callback",
      "http://localhost:3000",
      "http://localhost:3000",
    ),
    "https://vantory.example.com/api/auth/google/callback",
  );

  assert.throws(
    () =>
      getGoogleRedirectUri(
        "http://vantory.example.com/api/auth/google/callback",
        undefined,
        "http://localhost:3000",
      ),
    /HTTPS callback URL/,
  );
});

test("Google profile parser requires a verified, valid email", () => {
  assert.deepStrictEqual(
    parseVerifiedGoogleProfile({
      sub: "google-user-1",
      email: "  CANDIDATE@EXAMPLE.COM ",
      email_verified: true,
      name: "Candidate Example",
    }),
    {
      subject: "google-user-1",
      email: "candidate@example.com",
      name: "Candidate Example",
    },
  );

  assert.strictEqual(
    parseVerifiedGoogleProfile({
      sub: "google-user-2",
      email: "candidate@example.com",
      email_verified: false,
      name: "Candidate Example",
    }),
    null,
  );
  assert.strictEqual(
    parseVerifiedGoogleProfile({
      sub: "google-user-3",
      email: "not-an-email",
      email_verified: true,
    }),
    null,
  );
});

test("Google OAuth context preserves role and validates organization signup", () => {
  const encoded = encodeGoogleAuthContext({
    state: "state-123",
    role: "COMPANY_ADMIN",
    mode: "signup",
    organizationName: "Acme Corporation",
  });

  assert.deepStrictEqual(decodeGoogleAuthContext(encoded), {
    state: "state-123",
    role: "COMPANY_ADMIN",
    mode: "signup",
    organizationName: "Acme Corporation",
  });
  assert.strictEqual(
    decodeGoogleAuthContext(
      Buffer.from(
        JSON.stringify({
          state: "state-123",
          role: "INSTITUTE_ADMIN",
          mode: "signup",
        }),
      ).toString("base64url"),
    ),
    null,
  );
});

test("Google account access is restricted to the selected portal", () => {
  assert.strictEqual(googleRoleMatchesPortal("CANDIDATE", "CANDIDATE"), true);
  assert.strictEqual(
    googleRoleMatchesPortal("CANDIDATE", "COMPANY_ADMIN"),
    false,
  );
  assert.strictEqual(
    googleRoleMatchesPortal("SUPER_ADMIN", "COMPANY_ADMIN"),
    true,
  );
  assert.strictEqual(
    googleRoleMatchesPortal("SUPER_ADMIN", "INSTITUTE_ADMIN"),
    true,
  );
});

test("Google configuration errors preserve the selected role and mode", async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  try {
    const response = await startGoogleAuth(
      new NextRequest(
        "http://localhost:3000/api/auth/google?role=INSTITUTE_ADMIN&mode=signup&organizationName=North%20Institute",
      ),
    );
    const destination = new URL(response.headers.get("location") || "");

    assert.strictEqual(destination.pathname, "/register");
    assert.strictEqual(destination.searchParams.get("role"), "institute");
    assert.strictEqual(
      destination.searchParams.get("error"),
      "google_unavailable",
    );
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousClientSecret === undefined)
      delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
  }
});

test("Google auth start creates a state-bound authorization redirect", async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const previousRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  delete process.env.GOOGLE_REDIRECT_URI;

  try {
    const response = await startGoogleAuth(
      new NextRequest(
        "http://localhost:3000/api/auth/google?role=COMPANY_ADMIN&mode=signup&organizationName=Acme%20Corporation",
      ),
    );
    const redirectUrl = new URL(response.headers.get("location") || "");
    const stateCookie = response.cookies.get("vantory_google_oauth_state");
    const contextCookie = response.cookies.get("vantory_google_oauth_context");

    assert.strictEqual(response.status, 307);
    assert.strictEqual(redirectUrl.origin, "https://accounts.google.com");
    assert.strictEqual(
      redirectUrl.searchParams.get("client_id"),
      "test-google-client-id",
    );
    assert.strictEqual(
      redirectUrl.searchParams.get("redirect_uri"),
      "http://localhost:3000/api/auth/google/callback",
    );
    assert.ok(redirectUrl.searchParams.get("state"));
    assert.strictEqual(
      redirectUrl.searchParams.get("state"),
      stateCookie?.value,
    );
    assert.strictEqual(stateCookie?.httpOnly, true);
    assert.strictEqual(stateCookie?.sameSite, "lax");
    assert.strictEqual(contextCookie?.httpOnly, true);
    assert.deepStrictEqual(decodeGoogleAuthContext(contextCookie?.value), {
      state: stateCookie?.value,
      role: "COMPANY_ADMIN",
      mode: "signup",
      organizationName: "Acme Corporation",
    });
  } finally {
    if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previousClientId;
    if (previousClientSecret === undefined)
      delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previousClientSecret;
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    if (previousRedirectUri === undefined)
      delete process.env.GOOGLE_REDIRECT_URI;
    else process.env.GOOGLE_REDIRECT_URI = previousRedirectUri;
  }
});
