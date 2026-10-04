import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ContactSupportButton } from "@/components/support/ContactSupportButton";
import SmoothScroll from "@/components/providers/SmoothScroll";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vantory — Career Advantage + Career Direction",
  description:
    "Production-grade career platform for candidates to build ATS resumes, evaluate scores, practice AI mock interviews, and land top tech jobs with Vantory.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-white">
      <head>
      </head>
      <body className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} min-h-full font-sans antialiased text-neutral-950 bg-white`}>
        <SmoothScroll>
          {children}
          <ContactSupportButton />
        </SmoothScroll>
      </body>
    </html>
  );
}
