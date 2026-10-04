"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Users,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  User,
  Settings,
  LogOut,
  X,
  Plus,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateJobModal } from "@/components/company/CreateJobModal";
import { CompanyOnboardingModal } from "@/components/company/CompanyOnboardingModal";
import { InstituteOnboardingModal } from "@/components/institute/InstituteOnboardingModal";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export const primaryNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs & Careers", href: "/jobs", icon: Briefcase },
  { name: "My Applications", href: "/jobs/applications", icon: FileCheck },
  { name: "Preparation", href: "/preparation", icon: BarChart3 },
  { name: "Career Studio", href: "/career-studio", icon: FileText },
  { name: "Opportunity Tracker", href: "/opportunities", icon: Briefcase },
  { name: "Resume Builder", href: "/resume", icon: FileText },
  { name: "ATS Score Checker", href: "/ats-checker", icon: BarChart3 },
  { name: "AI Mock Interview", href: "/mock-interview", icon: Bot },
];

export const companyNavItems: NavItem[] = [
  { name: "Dashboard", href: "/company/dashboard", icon: Building2 },
  { name: "Manage Openings", href: "/company/jobs", icon: Briefcase },
  { name: "Candidate Applicants", href: "/company/applications", icon: Users },
  { name: "Hiring Analytics", href: "/company/analytics", icon: BarChart3 },
  { name: "Company Profile", href: "/company/profile", icon: Settings },
];

export const instituteNavItems: NavItem[] = [
  { name: "Dashboard", href: "/institute/dashboard", icon: LayoutDashboard },
  { name: "Student Roster", href: "/institute/students", icon: Users },
  { name: "Campus Jobs", href: "/institute/jobs", icon: Briefcase },
  { name: "Applications", href: "/institute/applications", icon: FileText },
  { name: "Resume Reviews", href: "/institute/resume-reviews", icon: FileCheck },
  {
    name: "Placement Analytics & Reports",
    href: "/institute/analytics",
    icon: BarChart3,
  },
  { name: "Institute Settings", href: "/institute/settings", icon: Settings },
];

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState<boolean>(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] =
    useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isInstituteContext =
    pathname.startsWith("/institute") || user?.role === "INSTITUTE_ADMIN";
  const isCompanyContext =
    pathname.startsWith("/company") || user?.role === "COMPANY_ADMIN";
  const navItems = isInstituteContext
    ? instituteNavItems
    : isCompanyContext
      ? companyNavItems
      : primaryNavItems;

  const handleJobCreated = () => {
    setIsCreateJobModalOpen(false);
    try {
      window.dispatchEvent(new Event("job-created"));
    } catch {
      // Handle silently
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Handle silently
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {
        // Handle silently
      }
      return next;
    });
  };

  useEffect(() => {
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
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    setSignOutError(null);
    try {
      const response = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!response.ok) throw new Error("Unable to revoke active sessions.");
      window.location.href = "/login";
    } catch {
      setSignOutError("Could not sign out all devices. Please retry.");
      setIsSigningOutAll(false);
    }
  };

  return (
    <>
      <aside
        className={cn(
          "bg-white text-neutral-950 flex flex-col h-screen border-r border-neutral-200 select-none sticky top-0 z-40 shrink-0 font-sans transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64",
          className,
        )}
      >
        {/* Brand Header with Cross / Shrink Toggle Button */}
        <div
          className={cn(
            "p-4 border-b border-neutral-200 flex items-center justify-between gap-2 h-16",
            isCollapsed && "justify-center px-2",
          )}
        >
          <Link
            href={
              isInstituteContext
                ? "/institute/dashboard"
                : isCompanyContext
                  ? "/company/dashboard"
                  : "/dashboard"
            }
            className="flex items-center gap-3 group min-w-0"
            title="Vantory Portal"
          >
            <div className="w-9 h-9 rounded-lg bg-neutral-950 text-white font-semibold flex items-center justify-center text-base tracking-tighter shadow-sm group-hover:scale-105 transition-transform shrink-0">
              {isInstituteContext ? "IN" : isCompanyContext ? "CO" : "VT"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="font-semibold tracking-tight text-sm text-neutral-950 group-hover:text-neutral-700 transition-colors block truncate">
                  {isInstituteContext
                    ? "Institute Portal"
                    : isCompanyContext
                      ? "Company Portal"
                      : "Vantory"}
                </span>
                <p className="text-[10px] text-neutral-500 font-sans font-medium tracking-tight truncate">
                  {isInstituteContext
                    ? "Campus Ecosystem"
                    : isCompanyContext
                      ? "Verified Employer"
                      : "Career Advantage + Direction"}
                </p>
              </div>
            )}
          </Link>

          {/* Cross / Shrink Toggle Icon */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-all cursor-pointer shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Shrink Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Shrink Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            ) : (
              <X className="w-4 h-4 text-neutral-600" />
            )}
          </button>
        </div>

        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <div>
            {!isCollapsed ? (
              <h4 className="px-3 text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-2 font-medium">
                {isInstituteContext
                  ? "CAMPUS CONTROL PLANE"
                  : isCompanyContext
                    ? "EMPLOYER CONTROL PLANE"
                    : "MAIN MENU"}
              </h4>
            ) : (
              <div className="h-px bg-neutral-200 my-2 mx-2" />
            )}

            {/* Company Portal Post New Job Button */}
            {isCompanyContext && (
              <div className="mb-3 px-1">
                <button
                  onClick={() => setIsCreateJobModalOpen(true)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all shadow-sm cursor-pointer",
                    isCollapsed && "px-0 py-2.5",
                  )}
                  title="Post New Corporate Opening"
                >
                  <Plus className="w-4 h-4 text-white shrink-0" />
                  {!isCollapsed && (
                    <span className="tracking-tight">Post New Job</span>
                  )}
                </button>
              </div>
            )}

            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/company/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 relative group",
                        isCollapsed && "justify-center px-0 py-2.5",
                        isActive
                          ? "bg-neutral-100 text-neutral-950 font-semibold shadow-xs border-l-2 border-neutral-950"
                          : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors shrink-0",
                          isActive
                            ? "text-neutral-950"
                            : "text-neutral-400 group-hover:text-neutral-950",
                        )}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 tracking-tight truncate">
                            {item.name}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neutral-950 text-white rounded shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Footer Area: User Profile Dropdown Trigger */}
        <div
          className="p-3 border-t border-neutral-200 bg-white relative"
          ref={dropdownRef}
        >
          {/* User Profile Card Dropdown Trigger */}
          <div className="relative">
            {/* Dropdown Popover Menu */}
            {isUserDropdownOpen && (
              <div
                className={cn(
                  "absolute bottom-full left-0 mb-2 bg-white border border-neutral-200 shadow-xl rounded-2xl p-2 space-y-1 z-50 text-xs animate-in fade-in slide-in-from-bottom-2",
                  isCollapsed ? "w-48 left-full ml-2 bottom-0" : "w-full",
                )}
              >
                {!isCompanyContext && (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-medium text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50"
                    >
                      <User className="w-4 h-4 text-neutral-500 shrink-0" />
                      <span>View Full Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-medium text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-950 hover:bg-neutral-100 font-semibold transition-all cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-neutral-950 shrink-0" />
                  <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
                <button
                  onClick={handleSignOutAll}
                  disabled={isSigningOutAll}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-neutral-700 hover:bg-neutral-100 font-medium transition-all cursor-pointer text-left disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>
                    {isSigningOutAll
                      ? "Revoking sessions..."
                      : "Sign out all devices"}
                  </span>
                </button>
                {signOutError && (
                  <p
                    role="alert"
                    className="px-3 py-2 text-[11px] text-red-700"
                  >
                    {signOutError}
                  </p>
                )}
              </div>
            )}

            {/* Trigger Card */}
            <div
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className={cn(
                "p-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all select-none",
                isCollapsed && "justify-center p-2",
              )}
              title={isCollapsed ? user?.name || "User Account" : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-semibold flex items-center justify-center text-xs shadow-inner shrink-0">
                  {user?.name?.charAt(0).toUpperCase() ||
                    (isCompanyContext ? "E" : "C")}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-neutral-950 truncate">
                      {user?.name ||
                        (isCompanyContext ? "Corporate Employer" : "Candidate")}
                    </h5>
                    <p className="text-[10px] text-neutral-500 truncate font-mono">
                      {user?.email ||
                        (isCompanyContext
                          ? "hr@company.com"
                          : "candidate@vantory.com")}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed &&
                (isUserDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Onboarding & Action Modals */}
      <CompanyOnboardingModal />
      <InstituteOnboardingModal />
      <CreateJobModal
        isOpen={isCreateJobModalOpen}
        onClose={() => setIsCreateJobModalOpen(false)}
        onJobCreated={handleJobCreated}
      />
    </>
  );
}
