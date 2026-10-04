import test from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { signToken } from "../lib/auth/jwt";
import {
  hasPortalAccess,
  validateRegistration,
  validateLogin,
} from "../lib/validation/auth";
import { hasRole } from "../lib/auth/authorization";

test("Employer snapshot download reaches its ownership handler while candidate application APIs remain protected",async()=>{
 const token=await signToken({userId:"507f1f77bcf86cd799439011",role:"COMPANY_ADMIN",email:"company@example.com"});
 const headers={cookie:`vantory_session=${token}`};
 const download=await middleware(new NextRequest("http://localhost:3000/api/applications/507f1f77bcf86cd799439022/resume",{headers}));
 assert.equal(download.headers.get("x-middleware-next"),"1");
 const list=await middleware(new NextRequest("http://localhost:3000/api/applications",{headers}));
 assert.equal(list.status,403);
 const candidateProfile=await middleware(new NextRequest("http://localhost:3000/api/candidate/profile",{headers}));
 assert.equal(candidateProfile.status,403);
});

test("Multi-Role Candidate Validation", () => {
  const candidateReg = validateRegistration({
    role: "CANDIDATE",
    name: "Alex Morgan",
    email: "alex@university.edu",
    phone: "+1 555 000 1111",
    college: "Stanford University",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.strictEqual(candidateReg.isValid, true);
  assert.strictEqual(Object.keys(candidateReg.errors).length, 0);
});

test("Multi-Role Company Validation", () => {
  const companyReg = validateRegistration({
    role: "COMPANY_ADMIN",
    companyName: "Acme Corp",
    email: "hiring@acme.com",
    phone: "+1 555 222 3333",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.strictEqual(companyReg.isValid, true);

  const invalidCompanyReg = validateRegistration({
    role: "COMPANY_ADMIN",
    companyName: "",
    email: "hiring@acme.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.strictEqual(invalidCompanyReg.isValid, false);
  assert.ok(invalidCompanyReg.errors.companyName);
});

test("Multi-Role Institute Validation", () => {
  const instituteReg = validateRegistration({
    role: "INSTITUTE_ADMIN",
    instituteName: "MIT Institute",
    email: "admin@mit.edu",
    phone: "+1 555 444 5555",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.strictEqual(instituteReg.isValid, true);

  const invalidInstituteReg = validateRegistration({
    role: "INSTITUTE_ADMIN",
    instituteName: "",
    email: "admin@mit.edu",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.strictEqual(invalidInstituteReg.isValid, false);
  assert.ok(invalidInstituteReg.errors.instituteName);
});

test("Public registration rejects privileged and unknown roles", () => {
  const baseInput = {
    name: "Alex Morgan",
    email: "alex@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
  };

  const superAdminReg = validateRegistration({
    ...baseInput,
    role: "SUPER_ADMIN",
  });
  assert.strictEqual(superAdminReg.isValid, false);
  assert.ok(superAdminReg.errors.role);

  const unknownRoleReg = validateRegistration({
    ...baseInput,
    role: "ROOT",
  });
  assert.strictEqual(unknownRoleReg.isValid, false);
  assert.ok(unknownRoleReg.errors.role);
});

test("Multi-Role Authorization Boundaries", () => {
  // Candidate role check
  assert.strictEqual(hasRole("CANDIDATE", ["CANDIDATE"]), true);
  assert.strictEqual(
    hasRole("CANDIDATE", ["COMPANY_ADMIN", "INSTITUTE_ADMIN"]),
    false,
  );

  // Company role check
  assert.strictEqual(
    hasRole("COMPANY_ADMIN", ["COMPANY_ADMIN", "SUPER_ADMIN"]),
    true,
  );
  assert.strictEqual(hasRole("COMPANY_ADMIN", ["INSTITUTE_ADMIN"]), false);

  // Institute role check
  assert.strictEqual(
    hasRole("INSTITUTE_ADMIN", ["INSTITUTE_ADMIN", "SUPER_ADMIN"]),
    true,
  );
  assert.strictEqual(hasRole("INSTITUTE_ADMIN", ["COMPANY_ADMIN"]), false);
});

test("Selected portal only accepts matching roles", () => {
  assert.strictEqual(hasPortalAccess("CANDIDATE", "CANDIDATE"), true);
  assert.strictEqual(hasPortalAccess("COMPANY_ADMIN", "CANDIDATE"), false);
  assert.strictEqual(
    hasPortalAccess("INSTITUTE_ADMIN", "COMPANY_ADMIN"),
    false,
  );
  assert.strictEqual(hasPortalAccess("SUPER_ADMIN", "COMPANY_ADMIN"), true);
  assert.strictEqual(hasPortalAccess("SUPER_ADMIN", "INSTITUTE_ADMIN"), true);
  assert.strictEqual(hasPortalAccess("SUPER_ADMIN", "CANDIDATE"), false);
});

test("Middleware keeps accounts inside their assigned portal", async () => {
  const cases = [
    ["COMPANY_ADMIN", "/dashboard", "/company/dashboard"],
    ["COMPANY_ADMIN", "/jobs/saved", "/company/dashboard"],
    ["INSTITUTE_ADMIN", "/resume", "/institute/dashboard"],
    ["INSTITUTE_ADMIN", "/jobs/applications", "/institute/dashboard"],
    ["CANDIDATE", "/company/dashboard", "/dashboard"],
    ["CANDIDATE", "/institute/dashboard", "/dashboard"],
  ] as const;

  for (const [role, path, expectedPath] of cases) {
    const token = await signToken({
      userId: "507f1f77bcf86cd799439011",
      role,
      email: "portal@example.com",
    });
    const request = new NextRequest(`http://localhost:3000${path}`, {
      headers: { cookie: `vantory_session=${token}` },
    });
    const response = await middleware(request);

    assert.strictEqual(
      new URL(response.headers.get("location") || "http://localhost").pathname,
      expectedPath,
    );
  }

  const companyToken = await signToken({
    userId: "507f1f77bcf86cd799439011",
    role: "COMPANY_ADMIN",
    email: "company@example.com",
  });
  const apiResponse = await middleware(
    new NextRequest("http://localhost:3000/api/resumes", {
      headers: { cookie: `vantory_session=${companyToken}` },
    }),
  );
  assert.strictEqual(apiResponse.status, 403);
  assert.strictEqual(
    (await apiResponse.json()).error,
    "Candidate access required.",
  );

  const unauthenticatedResponse = await middleware(
    new NextRequest("http://localhost:3000/jobs/applications"),
  );
  assert.strictEqual(unauthenticatedResponse.status, 307);
  assert.strictEqual(
    new URL(
      unauthenticatedResponse.headers.get("location") || "http://localhost",
    ).pathname,
    "/login",
  );

  const signedInLoginResponse = await middleware(
    new NextRequest("http://localhost:3000/login", {
      headers: { cookie: `vantory_session=${companyToken}` },
    }),
  );
  assert.strictEqual(
    signedInLoginResponse.headers.get("x-middleware-next"),
    "1",
  );
});
