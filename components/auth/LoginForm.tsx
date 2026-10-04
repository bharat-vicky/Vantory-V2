"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "./PasswordField";
import { RoleSelector, type UserEcosystemRole } from "./RoleSelector";
import { GoogleAuthButton } from "./GoogleAuthButton";

export interface LoginFormProps {
  roleLabel?: string;
  initialRole?: UserEcosystemRole;
  hideRoleSelector?: boolean;
  onSwitchToSignup?: () => void;
  onSuccess?: (redirectUrl: string) => void;
}

const roleValues: Record<UserEcosystemRole, string> = {
  candidate: "CANDIDATE",
  company: "COMPANY_ADMIN",
  institute: "INSTITUTE_ADMIN",
};

export function LoginForm({
  initialRole = "candidate",
  hideRoleSelector = false,
  onSwitchToSignup,
  onSuccess,
}: LoginFormProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] =
    useState<UserEcosystemRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailNeedsVerification, setEmailNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setEmailNeedsVerification(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          expectedRole: roleValues[selectedRole],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setEmailNeedsVerification(true);
        }
        throw new Error(data.error || "Invalid email or password.");
      }

      let dest = data.user?.redirectUrl;
      if (!dest) {
        if (selectedRole === "company") dest = "/company/dashboard";
        else if (selectedRole === "institute") dest = "/institute/dashboard";
        else dest = "/dashboard";
      }

      if (onSuccess) {
        onSuccess(dest);
      } else {
        router.push(dest);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setIsResending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/email-verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setNotice(data.message || "Check your email for a verification link.");
    } catch {
      setError("We could not send a link right now. Please try again shortly.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-neutral-50 border border-neutral-950 text-neutral-950 p-3 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-neutral-900" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
        >
          {notice}
        </p>
      )}
      {emailNeedsVerification && (
        <button
          type="button"
          onClick={resendVerification}
          disabled={isResending || !email}
          className="text-xs font-semibold text-neutral-900 underline underline-offset-2 disabled:opacity-50"
        >
          {isResending
            ? "Sending verification link..."
            : "Resend verification email"}
        </button>
      )}

      {/* Role Selection Tabs for Candidate, Employer, and Institute */}
      {!hideRoleSelector && (
        <RoleSelector selectedRole={selectedRole} onChange={setSelectedRole} />
      )}

      <Input
        label="Email Address / User ID"
        type="email"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <PasswordField
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <div className="-mt-2 text-right">
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full h-11 text-sm font-semibold rounded-xl"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        {selectedRole === "candidate" && "Candidate Log In"}
        {selectedRole === "company" && "Employer Log In"}
        {selectedRole === "institute" && "Institute Log In"}
      </Button>

      <GoogleAuthButton role={selectedRole} />

      {onSwitchToSignup && (
        <p className="text-center text-xs text-neutral-500 pt-2">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-bold text-neutral-950 hover:underline"
          >
            Create Account
          </button>
        </p>
      )}
    </form>
  );
}
