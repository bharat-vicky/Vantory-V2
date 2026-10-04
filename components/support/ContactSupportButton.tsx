"use client";

import React, { useState } from "react";
import { PhoneCall } from "lucide-react";
import { ContactSupportModal } from "./ContactSupportModal";
import { cn } from "@/lib/utils";

export function ContactSupportButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Industrial Floating Call / Support Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 bg-neutral-950 text-white hover:bg-neutral-800 border border-neutral-700 shadow-2xl rounded-full px-4 py-3 flex items-center gap-2.5 text-xs font-black tracking-tight transition-all duration-200 active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 cursor-pointer group",
          className
        )}
        aria-label="Call or Contact Support"
      >
        <div className="relative flex items-center justify-center">
          <PhoneCall className="w-4 h-4 text-white shrink-0 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
        </div>
        <span className="hidden sm:inline">Contact Us</span>
      </button>

      {/* Support & Direct Contact Modal */}
      <ContactSupportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
