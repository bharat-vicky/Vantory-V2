"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Request could not be completed.");
      setMessage(
        result.message ||
          "If a verified account exists, a reset link will be sent.",
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Request could not be completed.",
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
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm leading-6 text-neutral-600">
            Enter your verified account email and we will send a one-time reset
            link.
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
          <form onSubmit={requestReset} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Send reset link
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
