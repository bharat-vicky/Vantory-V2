"use client";

import React, { useState, useEffect, useId } from "react";
import { X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RoleSelector, type UserEcosystemRole } from "./RoleSelector";
import { AuthTabs, type AuthTabMode } from "./AuthTabs";
import { LoginForm } from "./LoginForm";
import { CandidateRegisterForm } from "./CandidateRegisterForm";
import { CompanyRegisterForm } from "./CompanyRegisterForm";
import { InstituteRegisterForm } from "./InstituteRegisterForm";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserEcosystemRole;
  initialMode?: AuthTabMode;
  onSuccess?: (redirectUrl: string) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialRole = "candidate",
  initialMode = "login",
  onSuccess,
}: AuthModalProps) {
  const [role, setRole] = useState<UserEcosystemRole>(initialRole);
  const [mode, setMode] = useState<AuthTabMode>(initialMode);
  const titleId = useId();

  // Use body scroll lock hook
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setMode(initialMode);
    }
  }, [isOpen, initialRole, initialMode]);

  // Dialog layer Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getRoleTitle = () => {
    if (role === "company") return "Company Portal";
    if (role === "institute") return "Institute Portal";
    return "Candidate Ecosystem";
  };

  const getRoleTagline = () => {
    if (role === "company")
      return "Post jobs, search candidates & manage placements.";
    if (role === "institute")
      return "Track student readiness, placement drives & analytics.";
    return "Build resumes, evaluate ATS scores & practice AI interviews.";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs overflow-y-auto p-4 sm:p-6 selection:bg-neutral-900 selection:text-white custom-scrollbar"
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Centering Wrapper */}
          <div className="min-h-full flex items-start justify-center py-6 sm:py-12">
            {/* Centered Modal Container */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "relative w-full max-w-lg bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-neutral-950",
              )}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header / Logo */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white font-black flex items-center justify-center text-base tracking-tighter mb-2 shadow-md">
                  SA
                </div>
                <h3
                  id={titleId}
                  className="text-xl font-extrabold tracking-tight text-neutral-950"
                >
                  {getRoleTitle()}
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5 max-w-xs">
                  {getRoleTagline()}
                </p>
              </div>

              {/* Role Switcher */}
              <RoleSelector
                selectedRole={role}
                onChange={setRole}
                className="mb-5"
              />

              {/* Mode Switcher */}
              <AuthTabs mode={mode} onChange={setMode} className="mb-6" />

              {/* Dynamic Form Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${role}-${mode}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {mode === "login" ? (
                    <LoginForm
                      roleLabel={
                        role === "company"
                          ? "Company"
                          : role === "institute"
                            ? "Institute"
                            : "Candidate"
                      }
                      initialRole={role}
                      hideRoleSelector
                      onSwitchToSignup={() => setMode("signup")}
                      onSuccess={onSuccess}
                    />
                  ) : role === "company" ? (
                    <CompanyRegisterForm
                      onSwitchToLogin={() => setMode("login")}
                      onSuccess={onSuccess}
                    />
                  ) : role === "institute" ? (
                    <InstituteRegisterForm
                      onSwitchToLogin={() => setMode("login")}
                      onSuccess={onSuccess}
                    />
                  ) : (
                    <CandidateRegisterForm
                      onSwitchToLogin={() => setMode("login")}
                      onSuccess={onSuccess}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Security Notice */}
              <div className="mt-6 pt-4 border-t border-neutral-100 text-center text-[11px] text-neutral-400 font-mono flex items-center justify-center gap-1.5 select-none">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                <span>
                  ◉ Secure & Encrypted • Account information protected
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
