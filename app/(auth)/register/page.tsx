"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AuthTabs, type AuthTabMode } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthFooter } from "@/components/auth/AuthFooter";
import type { UserEcosystemRole } from "@/components/auth/RoleSelector";

function RegisterContent() {
  const [mode, setMode] = useState<AuthTabMode>("signup");
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role")?.toLowerCase();

  const initialRole: UserEcosystemRole =
    roleParam === "company" || roleParam === "employer"
      ? "company"
      : roleParam === "institute"
        ? "institute"
        : "candidate";

  return (
    <div className="w-full max-w-md mx-auto my-auto space-y-6 text-left">
      <div className="text-left space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-neutral-950">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal">
          {mode === "signup"
            ? "Select your account type (Candidate, Company, Institute) to register."
            : "Sign in to your account to continue"}
        </p>
      </div>

      <AuthTabs mode={mode} onChange={setMode} />

      {mode === "signup" ? (
        <RegisterForm
          initialRole={initialRole}
          onSwitchToLogin={() => setMode("login")}
          onSuccess={(dest) => {
            window.location.href = dest || "/dashboard";
          }}
        />
      ) : (
        <LoginForm
          initialRole={initialRole}
          onSwitchToSignup={() => setMode("signup")}
          onSuccess={(dest) => {
            window.location.href = dest || "/dashboard";
          }}
        />
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex selection:bg-neutral-950 selection:text-white">
      {/* Left Column: 50% Dark Monolith Sidebar Showcase (Matching Identify Reference Layout) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#09090B] flex-col justify-between p-12 overflow-hidden select-none">
        {/* Dark Architectural Sculpture Background Image */}
        <Image
          src="/auth-sidebar-bg.jpg"
          alt="Vantory Platform Infrastructure"
          fill
          className="object-cover object-center opacity-70"
          priority
        />

        {/* Ambient Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/80 z-10 pointer-events-none" />

        {/* Top Left Brand Header */}
        <div className="relative z-20 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-white text-black font-black flex items-center justify-center text-sm shadow-md group-hover:scale-105 transition-transform">
              V
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              Vantory
            </span>
          </Link>
        </div>

        {/* Bottom Left Text Badge & Headline (Matching Reference Layout) */}
        <div className="relative z-20 space-y-4 max-w-lg text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono font-bold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Enterprise Grade Platform</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.15]">
            Mission-critical career infrastructure and real-time ATS
            verification.
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 font-normal leading-relaxed">
            Designed for scale, security, and sub-second resume parsing across
            high-throughput candidate drives.
          </p>
        </div>
      </div>

      {/* Right Column: 50% Clean Form Viewport */}
      <div className="w-full lg:w-1/2 min-h-screen bg-white flex flex-col justify-between p-6 sm:p-12 overflow-y-auto">
        {/* Mobile Header (Hidden on Large Screens) */}
        <div className="lg:hidden flex items-center justify-between pb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs">
              V
            </div>
            <span className="font-extrabold text-base tracking-tight text-neutral-950">
              Vantory
            </span>
          </Link>
        </div>

        {/* Center Auth Form Block Wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="w-full max-w-md mx-auto my-auto h-96 bg-neutral-100 rounded-2xl animate-pulse" />
          }
        >
          <RegisterContent />
        </Suspense>

        {/* Footer info */}
        <div className="pt-6 border-t border-neutral-100 text-center">
          <AuthFooter />
        </div>
      </div>
    </div>
  );
}
