import Link from "next/link";
import type { ReactNode } from "react";

export function InformationPage({title,children}:{title:string;children:ReactNode}) {
  return <main className="max-w-3xl mx-auto px-6 py-12 pb-24 space-y-8">
    <Link href="/" className="font-semibold underline">Vantory</Link>
    <h1 className="text-3xl font-bold">{title}</h1>
    <div className="space-y-6 text-neutral-700 leading-relaxed">{children}</div>
    <nav aria-label="Platform information" className="flex flex-wrap gap-4 border-t pt-6 text-sm underline">
      <Link href="/privacy">Privacy & data use</Link><Link href="/terms">Usage guidelines</Link><Link href="/security">Security</Link><Link href="/cookies">Cookies & local storage</Link>
    </nav>
  </main>;
}
