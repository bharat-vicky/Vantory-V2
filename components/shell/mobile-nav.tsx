"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown, ChevronUp, User, Settings, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { primaryNavItems, companyNavItems, instituteNavItems } from "./sidebar";
import { cn } from "@/lib/utils";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') || []).filter(element=>element.getClientRects().length>0);
      const first = controls[0], last = controls[controls.length-1];
      if (!first) return;
      if (!drawerRef.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement===first)) {event.preventDefault(); (event.shiftKey ? last : first).focus();}
      else if (!event.shiftKey && document.activeElement===last) {event.preventDefault(); first.focus();}
    };
    document.addEventListener("keydown",handleKeyDown);
    return ()=>{document.removeEventListener("keydown",handleKeyDown);previousFocus?.focus();};
  },[isOpen,onClose]);

  const isCompanyContext = pathname.startsWith("/company") || user?.role === "COMPANY_ADMIN";
  const isInstituteContext=pathname.startsWith("/institute") || user?.role==="INSTITUTE_ADMIN" || user?.role==="SUPER_ADMIN";
  const navItems = isInstituteContext ? instituteNavItems : isCompanyContext ? companyNavItems : primaryNavItems;

  // Close drawer when pathname changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.user) {
            setUser(json.user);
          }
        }
      } catch {
        // Handle silently
      }
    }
    loadUser();
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Handle silently
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dark Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Drawer Sheet */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed top-0 left-0 bottom-0 w-4/5 max-w-xs bg-white text-neutral-950 flex flex-col z-50 border-r border-neutral-200 shadow-2xl font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white font-semibold flex items-center justify-center text-xs">
                  {isCompanyContext ? "CO" : "VT"}
                </div>
                <div>
                  <span className="font-semibold tracking-tight text-neutral-950 text-sm block">
                    {isCompanyContext ? "Company Portal" : "Vantory"}
                  </span>
                  <p className="text-[10px] text-neutral-500 font-sans font-medium">
                    Career Advantage + Direction
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close navigation drawer"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
              <div>
                <h4 className="px-3 text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2 font-semibold">
                  {isCompanyContext ? "EMPLOYER MENU" : "MENU"}
                </h4>
                <ul className="space-y-1 font-medium">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && item.href !== "/company/dashboard" && pathname.startsWith(item.href));

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                            isActive
                              ? "bg-neutral-100 text-neutral-950 font-bold border-l-2 border-neutral-950"
                              : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50"
                          )}
                        >
                          <Icon className="w-4 h-4 text-neutral-950" />
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Footer User Profile & Actions Dropdown */}
            <div className="p-4 border-t border-neutral-200 bg-white relative">
              <div className="relative">
                {isUserDropdownOpen && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-neutral-200 shadow-xl rounded-2xl p-2 space-y-1 z-50 text-xs animate-in fade-in slide-in-from-bottom-2">
                    {!isCompanyContext && (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-neutral-500 shrink-0" />
                          <span>View Full Profile</span>
                        </Link>

                        <Link
                          href="/settings"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-neutral-500 shrink-0" />
                          <span>Account Settings</span>
                        </Link>

                        <div className="border-t border-neutral-100 my-1"></div>
                      </>
                    )}

                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-950 hover:bg-neutral-100 font-bold transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-neutral-950 shrink-0" />
                      <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={isUserDropdownOpen}
                  aria-label="Account menu"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-full text-left p-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs shadow-inner shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || (isCompanyContext ? "E" : "C")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-neutral-950 truncate">
                        {user?.name || (isCompanyContext ? "Corporate Employer" : "Candidate")}
                      </h5>
                      <p className="text-[10px] text-neutral-500 truncate font-mono">
                        {user?.email || "Loading account…"}
                      </p>
                    </div>
                  </div>

                  {isUserDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
