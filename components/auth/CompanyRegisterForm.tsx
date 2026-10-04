"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "./PasswordField";
import { GoogleAuthButton } from "./GoogleAuthButton";
import {
  passwordByteLength,
  MAX_BCRYPT_PASSWORD_BYTES,
} from "@/lib/validation/auth";

export interface CompanyRegisterFormProps {
  onSwitchToLogin?: () => void;
  onSuccess?: (redirectUrl: string) => void;
}

export function CompanyRegisterForm({
  onSwitchToLogin,
  onSuccess,
}: CompanyRegisterFormProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

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

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "COMPANY_ADMIN",
          companyName,
          email,
          phone,
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

      const dest = data.user?.redirectUrl || "/company/dashboard";
      if (onSuccess) {
        onSuccess(dest);
      } else {
        router.push(dest);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Company registration failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
        >
          {notice}
        </p>
      )}
      {error && (
        <div className="bg-neutral-50 border border-neutral-950 text-neutral-950 p-3 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-neutral-900" />
          <span>{error}</span>
        </div>
      )}

      <Input
        label="Company Name"
        type="text"
        placeholder="Acme Corp / TechLabs Inc."
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
        leftIcon={<Building2 className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Official Email Address"
          type="email"
          placeholder="hiring@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Contact Number"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

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

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full h-11 text-sm font-semibold rounded-xl mt-2"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Register Company & Post Jobs
      </Button>

      <GoogleAuthButton
        role="company"
        isSignup
        organizationName={companyName}
      />

      {onSwitchToLogin && (
        <p className="text-center text-xs text-neutral-500 pt-1">
          Already have a company account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-neutral-950 hover:underline inline-flex items-center gap-0.5"
          >
            Log In
          </button>
        </p>
      )}
    </form>
  );
}
