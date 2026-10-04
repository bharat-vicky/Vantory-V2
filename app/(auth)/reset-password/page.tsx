"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  MAX_BCRYPT_PASSWORD_BYTES,
  passwordByteLength,
} from "@/lib/validation/auth";

function ResetPasswordContent() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    setToken(hashParams.get("token") || queryParams.get("token") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES) {
      setError("Password must not exceed 72 UTF-8 bytes.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "This reset link is invalid or expired.",
        );
      }
      setMessage("Your password was changed. Sign in with your new password.");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Password reset failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-neutral-950">
      <section className="mx-auto mt-16 w-full max-w-md space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase text-neutral-500">
            Vantory account
          </p>
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm leading-6 text-neutral-600">
            Use at least 8 characters. Passwords are limited to 72 UTF-8 bytes.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {message ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          >
            {message}
          </p>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={!token}
            >
              Update password
            </Button>
          </form>
        )}
        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-neutral-700 hover:underline"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordContent />;
}
