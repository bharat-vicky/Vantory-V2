"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    setToken(hashParams.get("token") || queryParams.get("token") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const verifyEmail = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/email-verification/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "This verification link is invalid or expired.",
        );
      }
      setMessage("Your email is verified. You can now sign in.");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Email verification is temporarily unavailable.",
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
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-sm leading-6 text-neutral-600">
            Confirm that you own this email address to activate your account.
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
        {message && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          >
            {message}
          </p>
        )}
        {!message && (
          <Button
            type="button"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={!token}
            onClick={verifyEmail}
          >
            Confirm email address
          </Button>
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

export default function VerifyEmailPage() {
  return <VerifyEmailContent />;
}
