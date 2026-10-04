"use client";

import React, { useState, useCallback } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ToastProvider } from "@/components/ui/toast";
import { CompanyOnboardingModal } from "@/components/company/CompanyOnboardingModal";
import { InstituteOnboardingModal } from "@/components/institute/InstituteOnboardingModal";
import { PageTransition } from "@/components/providers/PageTransition";

export function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col md:flex-row antialiased selection:bg-neutral-900 selection:text-white">
        <CompanyOnboardingModal />
        <InstituteOnboardingModal />
        <Sidebar className="hidden md:flex" />
        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={closeMobileNav}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen" inert={isMobileNavOpen}>
          <Header onMobileMenuToggle={() => setIsMobileNavOpen(true)} />
          <main className="flex-1 p-4 pb-20 sm:p-6 sm:pb-20 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            <PageTransition>{children}</PageTransition>
          </main>
          <footer className="border-t border-neutral-200 py-4 px-6 text-center text-xs font-mono text-neutral-400">
            Vantory • Career Advantage + Direction
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
