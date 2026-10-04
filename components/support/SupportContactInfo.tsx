import React from "react";
import { Phone, Mail, ShieldCheck } from "lucide-react";

export function SupportContactInfo() {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  return (
    <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-900" />
          <span>DIRECT CONTACT & SUPPORT</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {phone && <a
          href={`tel:${phone}`}
          className="p-3 bg-white border border-neutral-200 hover:border-neutral-950 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-neutral-400 block font-bold">CALL OR WHATSAPP</span>
            <span className="font-extrabold text-neutral-950 font-mono text-xs">{phone}</span>
          </div>
        </a>}

        {email && <a
          href={`mailto:${email}`}
          className="p-3 bg-white border border-neutral-200 hover:border-neutral-950 rounded-xl transition-all flex items-center gap-2.5 group cursor-pointer shadow-2xs"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <span className="text-[10px] font-mono text-neutral-400 block font-bold">EMAIL ADDRESS</span>
            <span className="font-extrabold text-neutral-950 font-mono text-xs truncate block">{email}</span>
          </div>
        </a>}
      </div>
      {!phone && !email && <p>Use the support form to create a ticket and receive a reference number.</p>}
    </div>
  );
}
