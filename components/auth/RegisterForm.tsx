"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  AlertCircle,
  Building2,
  GraduationCap,
  User,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordField } from "./PasswordField";
import { RoleSelector, type UserEcosystemRole } from "./RoleSelector";
import { GoogleAuthButton } from "./GoogleAuthButton";
import {
  passwordByteLength,
  MAX_BCRYPT_PASSWORD_BYTES,
} from "@/lib/validation/auth";

export interface RegisterFormProps {
  initialRole?: UserEcosystemRole;
  onSwitchToLogin?: () => void;
  onSuccess?: (redirectUrl?: string) => void;
}

export function RegisterForm({
  initialRole,
  onSwitchToLogin,
  onSuccess,
}: RegisterFormProps) {
  const [role, setRole] = useState<UserEcosystemRole>(
    initialRole || "candidate",
  );

  // Form Fields
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (role === "company" && (!companyName || companyName.trim().length < 2)) {
      setError("Company Name must be at least 2 characters.");
      return;
    }

    if (role === "candidate" && (!name || name.trim().length < 2)) {
      setError("Full Name must be at least 2 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    setIsLoading(true);

    const targetRole =
      role === "company"
        ? "COMPANY_ADMIN"
        : role === "institute"
          ? "INSTITUTE_ADMIN"
          : "CANDIDATE";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole,
          name: role === "company" ? companyName : name,
          companyName,
          instituteName,
          email,
          phone,
          college,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.verificationRequired) {
        setNotice(
          "Account created. Check your inbox for a link to verify your email before signing in.",
        );
        return;
      }

      const dest =
        data.redirectUrl ||
        (role === "company"
          ? "/company/dashboard"
          : role === "institute"
            ? "/institute/dashboard"
            : "/dashboard");

      if (onSuccess) {
        onSuccess(dest);
      } else {
        window.location.href = dest;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Role Selection Tabs */}
      <RoleSelector selectedRole={role} onChange={setRole} />
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
        >
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="bg-neutral-50 border border-neutral-950 text-neutral-950 p-3 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-neutral-900" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Specific Headline Card */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center shrink-0 font-bold text-xs">
            {role === "company" ? (
              <Building2 className="w-4 h-4 text-white" />
            ) : role === "institute" ? (
              <GraduationCap className="w-4 h-4 text-white" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-neutral-950">
              {role === "company"
                ? "Corporate Employer Registration"
                : role === "institute"
                  ? "Institute Partner Registration"
                  : "Candidate Registration"}
            </h4>
            <p className="text-[11px] text-neutral-500 font-mono">
              {role === "company"
                ? "Post jobs & review candidate applications with real Vantory resumes."
                : role === "institute"
                  ? "Manage student placement drives & placement analytics."
                  : "Build ATS resumes, calculate match scores, & practice AI interviews."}
            </p>
          </div>
        </div>

        {/* Name Fields */}
        {role === "company" ? (
          <Input
            label="Company Name"
            type="text"
            placeholder="e.g. Acme Corporation"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        ) : role === "institute" ? (
          <Input
            label="Institute / College Name"
            type="text"
            placeholder="e.g. Stanford University"
            value={instituteName}
            onChange={(e) => setInstituteName(e.target.value)}
            required
          />
        ) : (
          <Input
            label="Full Name"
            type="text"
            placeholder="Alex Morgan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        )}

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={
              role === "company" ? "Corporate Work Email" : "Email Address"
            }
            type="email"
            placeholder={
              role === "company" ? "hr@company.com" : "alex@example.com"
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {role === "candidate" && (
          <Input
            label="College / University"
            type="text"
            placeholder="Stanford University"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
          />
        )}

        {/* Passwords */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PasswordField
            label="Password"
            placeholder="At least 8 chars"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 text-sm font-semibold rounded-xl mt-2 bg-neutral-950 text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>
                {role === "company"
                  ? "Create Company Account"
                  : role === "institute"
                    ? "Create Institute Account"
                    : "Create Candidate Account"}
              </span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>

      <GoogleAuthButton
        role={role}
        isSignup
        organizationName={
          role === "company"
            ? companyName
            : role === "institute"
              ? instituteName
              : undefined
        }
      />

      {onSwitchToLogin && (
        <p className="text-center text-xs text-neutral-500 pt-1 font-mono">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-neutral-950 hover:underline inline-flex items-center gap-0.5"
          >
            Sign In
          </button>
        </p>
      )}
    </div>
  );
}
