"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  FileText,
  Bot,
  Building2,
  BarChart3,
  ChevronDown,
  Check,
  Sparkles,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Zap,
  Activity,
} from "lucide-react";

const HERO_PHRASES = [
  "Build Resumes.",
  "Pass AI Interviews.",
  "Recruit Top Talent.",
  "Track Campus Drives.",
];

interface MagicFeature {
  id: "resume" | "interview" | "ats" | "employer";
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
}

const MAGIC_FEATURES: MagicFeature[] = [
  {
    id: "resume",
    icon: FileText,
    title: "A4 ATS Resume Builder",
    subtitle: "Craft clean, ATS-proof resumes with live A4 preview.",
    description:
      "Architected with A4 typography standards. Rearrange sections, enhance bullet points with AI, and export publication-grade PDFs.",
  },
  {
    id: "interview",
    icon: Bot,
    title: "AI Mock Interview Engine",
    subtitle: "Practice technical & system design interview rounds.",
    description:
      "Speech-to-text response evaluation, instant score breakdown, and actionable AI feedback to pass top engineering interviews.",
  },
  {
    id: "ats",
    icon: BarChart3,
    title: "Deterministic ATS Checker",
    subtitle: "Scan your resume against target Job Descriptions.",
    description:
      "Automated critical gate checks, keyword match percentages, missing skill extraction, and formatting recommendations.",
  },
  {
    id: "employer",
    icon: Building2,
    title: "Verified Employer Portal",
    subtitle: "Manage corporate openings & review candidate resumes.",
    description:
      "Direct job publishing with Rupee (₹) salary periods, candidate cover note review, and 5-stage status escalation.",
  },
];

export default function Home() {
  // Hero Browser Showcase Tab State
  const [heroDashboardTab, setHeroDashboardTab] = useState<
    "candidate" | "employer" | "institute"
  >("candidate");
  const [isAutoHeroDashboard, setIsAutoHeroDashboard] = useState(true);

  // Auto-rotate Hero Showcase Mockup every 4 seconds
  useEffect(() => {
    if (!isAutoHeroDashboard) return;
    const timer = setInterval(() => {
      setHeroDashboardTab((prev) => {
        if (prev === "candidate") return "employer";
        if (prev === "employer") return "institute";
        return "candidate";
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoHeroDashboard]);

  const selectHeroDashboardTab = (
    tab: "candidate" | "employer" | "institute",
  ) => {
    setIsAutoHeroDashboard(false);
    setHeroDashboardTab(tab);
  };
  // Hero Auto-Changing Phrase Index
  const [heroIndex, setHeroIndex] = useState(0);

  // Magic Feature Section Active Index
  const [activeMagicId, setActiveMagicId] = useState<
    "resume" | "interview" | "ats" | "employer"
  >("resume");
  const [isAutoRotatingMagic, setIsAutoRotatingMagic] = useState<boolean>(true);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Scroll State for Navbar Glassmorphic Effect
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);

  // Scroll listener for smart hide-on-scroll-down / show-on-scroll-up navbar
  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsScrolled(currentScrollY > 20);

      // Hide navbar on scroll down (> 100px), show navbar on scroll up
      if (currentScrollY > previousScrollY && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate Hero Phrases every 3 seconds
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_PHRASES.length);
    }, 3000);
    return () => clearInterval(heroTimer);
  }, []);

  // Auto-rotate Magic Features every 4 seconds
  useEffect(() => {
    if (!isAutoRotatingMagic) return;
    const timer = setInterval(() => {
      setActiveMagicId((prev) => {
        if (prev === "resume") return "interview";
        if (prev === "interview") return "ats";
        if (prev === "ats") return "employer";
        return "resume";
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoRotatingMagic]);

  const handleMagicSelect = (
    id: "resume" | "interview" | "ats" | "employer",
  ) => {
    setIsAutoRotatingMagic(false);
    setActiveMagicId(id);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-950 font-sans selection:bg-neutral-950 selection:text-white overflow-x-hidden">
      {/* Floating Pill Header Bar (Smart Hide on Scroll Down / Show on Scroll Up) */}
      <header
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4 sm:px-8 transition-all duration-300 pointer-events-auto ${
          isNavVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-28 opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`rounded-full px-6 sm:px-8 py-3.5 flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? "bg-white/90 backdrop-blur-xl border border-neutral-200 shadow-xl shadow-black/5"
              : "bg-white/80 backdrop-blur-lg border border-neutral-200/90 shadow-md"
          }`}
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-sm tracking-tight shadow-md group-hover:scale-105 transition-transform">
              V
            </div>
            <span className="font-extrabold tracking-tight text-lg sm:text-xl text-neutral-950 font-sans">
              Vantory
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 sm:gap-10 text-sm font-bold text-neutral-600">
            <a
              href="#magic-section"
              className="hover:text-neutral-950 transition-colors"
            >
              Features
            </a>
            <a
              href="#portals"
              className="hover:text-neutral-950 transition-colors"
            >
              Solutions
            </a>
            <a
              href="#pricing"
              className="hover:text-neutral-950 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#docs"
              className="hover:text-neutral-950 transition-colors"
            >
              Documentation
            </a>
            <a href="#faq" className="hover:text-neutral-950 transition-colors">
              Contact
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-neutral-700 hover:text-neutral-950 transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-extrabold bg-neutral-950 text-white hover:bg-neutral-800 transition-all px-6 py-2.5 rounded-full shadow-md hover:shadow-lg hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Floating Top Announcement Pill */}
      <div className="pt-28 sm:pt-32 mb-6 flex justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/90 text-xs font-medium text-neutral-600 shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-neutral-950 inline-block" />
          <span>
            Introducing Vantory Enterprise 2.0 — Career Advantage + Career
            Direction
          </span>
        </motion.div>
      </div>

      {/* Hero Section */}
      <section className="pt-2 pb-16 px-6 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
        {/* Main Title - Clean, Crisp & Auto-Changing (Matching Image 2 Reference) */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-neutral-950 leading-[1.1] max-w-5xl flex flex-col items-center text-center"
        >
          <span className="flex items-center justify-center gap-2 h-14 sm:h-20 sm:min-h-[80px] overflow-hidden relative w-full">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={heroIndex}
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -28, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="inline-block text-neutral-950 font-semibold whitespace-nowrap"
              >
                {HERO_PHRASES[heroIndex]}
              </motion.span>
            </AnimatePresence>
            <span className="inline-block w-1.5 h-8 sm:h-12 bg-neutral-950 align-middle animate-pulse shrink-0" />
          </span>
          <span className="block text-neutral-950 font-semibold text-3xl sm:text-5xl md:text-6xl lg:text-7xl whitespace-nowrap mt-1">
            Accelerate Your Career.
          </span>
          <span className="block text-neutral-950 font-semibold text-2xl sm:text-4xl md:text-5xl lg:text-6xl whitespace-nowrap mt-1 text-neutral-800">
            All From One Platform.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-neutral-500 max-w-xl mx-auto font-normal leading-relaxed text-center"
        >
          The premium career acceleration platform for ATS resume building,
          realistic AI mock interviews, employer candidate matching, and
          real-time placement analytics.
        </motion.p>

        {/* Single Main CTA Action Button (Matching Identify Layout) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pt-2 flex justify-center"
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-neutral-950 text-white hover:bg-neutral-800 font-bold text-sm px-8 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>
        </motion.div>

        {/* Browser Window Mockup Frame (Matching Identify Reference App Layout) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-14 w-full bg-white border border-neutral-200/90 rounded-3xl sm:rounded-4xl shadow-2xl overflow-hidden text-left"
        >
          {/* Top Browser Control Bar */}
          <div className="bg-neutral-100/90 border-b border-neutral-200 px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neutral-300" />
              <div className="w-3 h-3 rounded-full bg-neutral-300" />
              <div className="w-3 h-3 rounded-full bg-neutral-300" />
            </div>

            {/* Address Bar */}
            <div className="bg-white border border-neutral-200/90 rounded-full px-8 py-1 text-xs font-mono text-neutral-500 shadow-2xs font-medium text-center">
              {heroDashboardTab === "candidate" && "vantory.com/dashboard"}
              {heroDashboardTab === "employer" &&
                "vantory.com/company/dashboard"}
              {heroDashboardTab === "institute" &&
                "vantory.com/institute/dashboard"}
            </div>

            <div className="w-12" />
          </div>

          {/* Inner Dashboard Viewport: Sidebar + Main App Canvas */}
          <div className="flex flex-col md:flex-row items-stretch bg-white min-h-[420px]">
            {/* Left Sidebar Nav (Matching Reference Layout) */}
            <div className="w-full md:w-64 border-r border-neutral-200/80 bg-[#FAFAFA] p-6 space-y-6 shrink-0 text-left">
              {/* Brand Header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                  V
                </div>
                <span className="text-base font-extrabold text-neutral-950 tracking-tight font-sans">
                  Vantory
                </span>
              </div>

              {/* Sidebar Navigation Items */}
              <div className="space-y-2">
                <button
                  onClick={() => selectHeroDashboardTab("candidate")}
                  className={`w-full p-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all cursor-pointer select-none ${
                    heroDashboardTab === "candidate"
                      ? "bg-neutral-950 text-white shadow-md"
                      : "text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Candidate Workspace</span>
                </button>

                <button
                  onClick={() => selectHeroDashboardTab("employer")}
                  className={`w-full p-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all cursor-pointer select-none ${
                    heroDashboardTab === "employer"
                      ? "bg-neutral-950 text-white shadow-md"
                      : "text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Employer Portal</span>
                </button>

                <button
                  onClick={() => selectHeroDashboardTab("institute")}
                  className={`w-full p-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all cursor-pointer select-none ${
                    heroDashboardTab === "institute"
                      ? "bg-neutral-950 text-white shadow-md"
                      : "text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Institute Roster</span>
                </button>

                <div className="w-full p-3.5 rounded-2xl flex items-center gap-3 font-medium text-sm text-neutral-400 opacity-60">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </div>
            </div>

            {/* Right Main Dashboard Panel */}
            <div className="flex-1 p-6 sm:p-8 bg-white text-left min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                {heroDashboardTab === "candidate" && (
                  <motion.div
                    key="candidate"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 w-full"
                  >
                    {/* Top Workspace Header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-neutral-950 tracking-tight">
                          Candidate Workspace 2.0
                        </h3>
                        <p className="text-xs text-neutral-400 font-normal mt-0.5">
                          ● Live • Anupam Singh (Software Engineer)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔍
                        </div>
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔔
                        </div>
                        <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                          AS
                        </div>
                      </div>
                    </div>

                    {/* Main Inner Directory Card Container (Matching Reference Layout) */}
                    <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-neutral-900">
                          Assessment & Application Roster
                        </h4>
                        <Link
                          href="/resume"
                          className="px-4 py-2 bg-neutral-950 text-white font-extrabold text-xs rounded-full shadow-xs hover:bg-neutral-800 transition-colors"
                        >
                          + New Candidate
                        </Link>
                      </div>

                      {/* Candidate Directory Items Stack */}
                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-800 font-extrabold flex items-center justify-center text-xs">
                              SJ
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Candidate workflow
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                sarah@example.com • A4 ATS 94%
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-950 text-white text-[10px] font-extrabold rounded-full">
                            VIP
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-800 font-extrabold flex items-center justify-center text-xs">
                              DC
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                David Chen
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                david.c@startup.io • Mock Interview 88/100
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Checked In
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-800 font-extrabold flex items-center justify-center text-xs">
                              EW
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Emily Watson
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                emilyw@enterprise.com • Vector PDF Ready
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Checked In
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {heroDashboardTab === "employer" && (
                  <motion.div
                    key="employer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 w-full"
                  >
                    {/* Top Workspace Header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-neutral-950 tracking-tight">
                          Employer Control Plane
                        </h3>
                        <p className="text-xs text-neutral-400 font-normal mt-0.5">
                          ● Active Corporate Session • Acme Tech
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔍
                        </div>
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔔
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                          AC
                        </div>
                      </div>
                    </div>

                    {/* Main Inner Directory Card Container */}
                    <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-neutral-900">
                          Corporate Openings & Recruitment Pipeline
                        </h4>
                        <Link
                          href="/company/jobs"
                          className="px-4 py-2 bg-neutral-950 text-white font-extrabold text-xs rounded-full shadow-xs hover:bg-neutral-800 transition-colors"
                        >
                          + Post New Opening
                        </Link>
                      </div>

                      {/* Employer Items Stack */}
                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                              FE
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Senior Frontend Engineer
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                ₹12,00,000 - ₹18,00,000/yr • 42 Applicants
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-950 text-white text-[10px] font-extrabold rounded-full">
                            RECRUITING
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                              BE
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Backend System Architect
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                ₹18,00,000 - ₹28,00,000/yr • 28 Applicants
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Shortlisting
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                              AI
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                AI & NLP Specialist
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                ₹15,00,000 - ₹24,00,000/yr • 19 Applicants
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {heroDashboardTab === "institute" && (
                  <motion.div
                    key="institute"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 w-full"
                  >
                    {/* Top Workspace Header */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-neutral-950 tracking-tight">
                          Institutional Placement Roster
                        </h3>
                        <p className="text-xs text-neutral-400 font-normal mt-0.5">
                          ● Academic Session • Batch 2026 Drive
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔍
                        </div>
                        <div className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 text-xs font-bold shadow-2xs">
                          🔔
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                          UNI
                        </div>
                      </div>
                    </div>

                    {/* Main Inner Directory Card Container */}
                    <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-neutral-900">
                          Campus Placement Batch Roster
                        </h4>
                        <Link
                          href="/institute/dashboard"
                          className="px-4 py-2 bg-neutral-950 text-white font-extrabold text-xs rounded-full shadow-xs hover:bg-neutral-800 transition-colors"
                        >
                          + Issue QR Badge
                        </Link>
                      </div>

                      {/* Institute Items Stack */}
                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs">
                              CS
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Computer Science Batch A
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                140 Students • 92% Placement Rate
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-950 text-white text-[10px] font-extrabold rounded-full">
                            VERIFIED QR
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs">
                              IT
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                Information Technology Batch B
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                120 Students • 86% Placement Rate
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Active Drive
                          </span>
                        </div>

                        <div className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs">
                              AI
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-neutral-950">
                                AI & Data Engineering Roster
                              </div>
                              <div className="text-xs text-neutral-400 font-normal">
                                80 Students • 88% Placement Rate
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-neutral-200/70 text-neutral-700 text-[10px] font-bold rounded-full">
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>

      {/* MAGIC FEATURE SHOWCASE SECTION (MATCHING IMAGE 1 EXACTLY) */}
      <section
        id="magic-section"
        className="py-36 sm:py-48 border-t border-neutral-200/80 bg-white px-6"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Title, Subtitle, and Feature Accordion Stack */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-600 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
                <span>Next Generation Platform</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tight leading-[1.1]">
                Everything works <br />
                like magic<span className="text-neutral-400 font-light">.</span>
              </h2>

              <p className="text-neutral-500 text-sm sm:text-base leading-relaxed max-w-lg">
                We&apos;ve reimagined career preparation and recruitment from
                the ground up, stripping away the complexity to leave you with
                pure, unadulterated power.
              </p>
            </div>

            {/* Interactive Feature Accordion Cards - Fixed Height Prevents Page Dribble */}
            <div className="space-y-3">
              {MAGIC_FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isActive = activeMagicId === feature.id;

                return (
                  <div
                    key={feature.id}
                    onClick={() => handleMagicSelect(feature.id)}
                    className={`p-4 rounded-2xl transition-all duration-300 cursor-pointer select-none h-[82px] flex items-center justify-between ${
                      isActive
                        ? "bg-neutral-950 text-white shadow-xl border border-neutral-900 scale-[1.01]"
                        : "bg-[#FAFAFA] text-neutral-900 border border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-neutral-900 border border-neutral-800 text-white"
                            : "bg-white border border-neutral-200 text-neutral-950 shadow-2xs"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-0.5 min-w-0 text-left">
                        <h4
                          className={`text-sm font-extrabold tracking-tight ${isActive ? "text-white" : "text-neutral-950"}`}
                        >
                          {feature.title}
                        </h4>
                        <p
                          className={`text-xs font-mono truncate max-w-xs sm:max-w-md ${isActive ? "text-neutral-300 font-medium" : "text-neutral-500"}`}
                        >
                          {feature.subtitle}
                        </p>
                      </div>
                    </div>

                    {isActive && (
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dark Preview Browser Mockup Display - Fixed Aspect Height Prevents Page Shake */}
          <div className="lg:col-span-6">
            <div className="bg-[#09090B] text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-800 space-y-4 relative font-sans min-h-[540px] flex flex-col justify-between">
              {/* Top Address Bar */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neutral-800" />
                  <div className="w-3 h-3 rounded-full bg-neutral-800" />
                  <div className="w-3 h-3 rounded-full bg-neutral-800" />
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-full px-6 py-1 text-[11px] font-mono text-neutral-400">
                  vantory.live/preview
                </div>
                <div className="w-12" />
              </div>

              {/* Dynamic Feature Content Box - Advanced Interactive Sandbox */}
              <div className="min-h-[440px] flex-1 flex flex-col justify-between relative">
                <AnimatePresence mode="popLayout" initial={false}>
                  {activeMagicId === "resume" && (
                    <motion.div
                      key="resume"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 font-mono text-xs text-left h-full flex flex-col justify-between"
                    >
                      {/* Live Compiler Status Pill */}
                      <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[11px] text-neutral-300 font-bold">
                            LATEX 2.0 COMPILER ACTIVE
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          Vector PDF READY
                        </span>
                      </div>

                      {/* Live Mini A4 Document Mockup */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 space-y-2.5 shadow-inner flex-1 flex flex-col justify-between">
                        <div className="border-b border-neutral-800 pb-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-white">
                              Anupam Singh
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Fullstack Software Engineer • Bangalore, KA
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white text-black font-extrabold flex items-center justify-center text-xs shrink-0">
                            A4
                          </div>
                        </div>

                        <div className="space-y-1 pt-0.5">
                          <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                            CORE SKILLS
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              "React",
                              "TypeScript",
                              "Next.js 15",
                              "Node.js",
                              "Prisma",
                              "PostgreSQL",
                            ].map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 bg-neutral-800 text-white rounded text-[10px] font-bold border border-neutral-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1 pt-0.5">
                          <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                            HIGHLIGHTED EXPERIENCE
                          </div>
                          <div className="text-[11px] text-neutral-300 space-y-1">
                            <p className="flex items-start gap-1.5">
                              <span className="text-emerald-400 font-bold">
                                ✓
                              </span>
                              <span>
                                Architected real-time candidate recruitment
                                pipeline with sub-150ms latency.
                              </span>
                            </p>
                            <p className="flex items-start gap-1.5">
                              <span className="text-emerald-400 font-bold">
                                ✓
                              </span>
                              <span>
                                Optimized Next.js 15 bundle size and static page
                                generation for 37 routes.
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive CTA Link */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between shadow-sm mt-2">
                        <div>
                          <div className="text-[10px] text-neutral-400 uppercase font-bold">
                            OUTPUT PREVIEW
                          </div>
                          <div className="font-bold text-white text-xs mt-0.5">
                            Publication-Grade A4 PDF
                          </div>
                        </div>
                        <Link
                          href="/resume"
                          className="px-4 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <span>Build Resume</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}

                  {activeMagicId === "interview" && (
                    <motion.div
                      key="interview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 font-mono text-xs text-left h-full flex flex-col justify-between"
                    >
                      {/* Live Audio Visualizer Banner */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[11px] text-white font-bold">
                            RECORDING • SYSTEM DESIGN ROUND
                          </span>
                        </div>

                        {/* Animated Speech Waveform Bars */}
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-1 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                          <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>

                      {/* Live Transcribed Speech Bubble */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5 flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold">
                          CANDIDATE SPEECH INPUT
                        </div>
                        <p className="text-[11px] text-neutral-200 italic leading-relaxed bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                          &quot;For high-concurrency event handling in Next.js
                          15, we utilize optimistic UI state combined with
                          MongoDB transactions via Prisma ORM to protect
                          concurrent updates.&quot;
                        </p>
                      </div>

                      {/* AI Scoring Meter & Breakdown Chips */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-0.5">
                          <div className="text-[10px] text-neutral-400 uppercase font-bold">
                            SPEECH PACE
                          </div>
                          <div className="text-base font-extrabold text-white">
                            142 WPM
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            OPTIMAL VELOCITY
                          </div>
                        </div>

                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-0.5">
                          <div className="text-[10px] text-neutral-400 uppercase font-bold">
                            AI EVALUATION
                          </div>
                          <div className="text-base font-extrabold text-white">
                            92 / 100
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            EXCELLENT DEPTH
                          </div>
                        </div>
                      </div>

                      {/* Interactive CTA Link */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between shadow-sm mt-2">
                        <span className="text-[11px] text-neutral-300 font-bold">
                          Ready to test your interview score?
                        </span>
                        <Link
                          href="/mock-interview"
                          className="px-4 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <span>Start Mock Interview</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}

                  {activeMagicId === "ats" && (
                    <motion.div
                      key="ats"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 font-mono text-xs text-left h-full flex flex-col justify-between"
                    >
                      {/* ATS Gauge Display */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 text-center space-y-2">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">
                          DETERMINISTIC ATS GAUGE
                        </div>
                        <div className="text-4xl font-black text-white tracking-tight">
                          94% MATCH
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          Target Role: Senior Fullstack Architect
                        </div>

                        <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mt-1.5">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "94%" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="bg-white h-full"
                          />
                        </div>
                      </div>

                      {/* Gates Checklist Box */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-1.5 flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-neutral-400 uppercase font-bold">
                          GATE CHECK RESULTS (8/8 PASSED)
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Skill Density</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Layout Standard</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Action Verb Ratio</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>PDF Compliance</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive CTA Link */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between shadow-sm mt-2">
                        <span className="text-[11px] text-neutral-300 font-bold">
                          Analyze your resume against any Job Description
                        </span>
                        <Link
                          href="/ats-checker"
                          className="px-4 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <span>Run ATS Scan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}

                  {activeMagicId === "employer" && (
                    <motion.div
                      key="employer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3 font-mono text-xs text-left h-full flex flex-col justify-between"
                    >
                      {/* Active Job Card */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-white text-sm">
                            Senior Frontend Engineer
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded">
                            ACTIVE RECRUITMENT
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          ₹12,00,000 - ₹18,00,000/yr • Full-Time Remote
                        </div>
                      </div>

                      {/* Applicant Evaluation Card */}
                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5 flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-xs shrink-0">
                              AS
                            </div>
                            <div>
                              <div className="font-bold text-white">
                                Anupam Singh
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                Applied 12s ago • 94% ATS Match
                              </div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-white text-black text-[10px] font-extrabold rounded shrink-0">
                            SHORTLISTED
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-neutral-400 font-bold">
                            HIRING ACTION:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-neutral-800 text-white rounded text-[10px] font-bold border border-neutral-700">
                              Schedule Interview
                            </span>
                            <span className="px-2.5 py-1 bg-neutral-800 text-white rounded text-[10px] font-bold border border-neutral-700">
                              View A4 Resume
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive CTA Link */}
                      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between shadow-sm mt-2">
                        <span className="text-[11px] text-neutral-300 font-bold">
                          Manage applicant pipelines & inspect resumes
                        </span>
                        <Link
                          href="/company/applications"
                          className="px-4 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <span>Employer Pipeline</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: ROLE CAPABILITIES & ACCOUNT REGISTRATION */}
      <section
        id="portals"
        className="py-36 sm:py-48 bg-white border-t border-neutral-200/80 px-6 relative overflow-hidden"
      >
        {/* Ambient Subtle Background Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          {/* Section 1 Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-extrabold uppercase tracking-widest text-neutral-600 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ENTERPRISE ECOSYSTEM MATRIX v2.0</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight leading-tight">
              Comprehensive Role Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
              Evaluate role-based workflows, recruitment pipelines, and security
              standards available across candidate, employer, and institutional
              workspaces.
            </p>
          </motion.div>

          {/* Industrial Role Header Cards Grid - Directly Routing to Signup with Pre-Selected Role */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, staggerChildren: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch"
          >
            {/* Candidate Card */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg space-y-6 flex flex-col justify-between hover:border-neutral-950 hover:shadow-2xl transition-all group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neutral-950 via-emerald-500 to-neutral-950 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-950 rounded-full font-mono text-[10px] font-extrabold border border-neutral-200 tracking-wider">
                    JOB SEEKER SUITE
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-neutral-950 tracking-tight">
                    Candidate Workspace
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Full access to A4 Resume Builder, AI Mock Interviews, ATS
                    Keyword Scanner, and 1-Click Applications.
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 pt-3 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>A4 Resume & Vector PDF Export</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Real-time Deterministic ATS Scanner</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>AI Voice Mock Interview Simulator</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1-Click Verified Job Applications</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=candidate"
                className="w-full py-4 bg-neutral-950 text-white font-extrabold text-xs rounded-full hover:bg-neutral-800 transition-all text-center flex items-center justify-center gap-2.5 shadow-lg cursor-pointer group-hover:shadow-xl"
              >
                <span>Register Candidate Account</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Employer Card */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg space-y-6 flex flex-col justify-between hover:border-emerald-600 hover:shadow-2xl transition-all group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-neutral-950 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-full font-mono text-[10px] font-extrabold border border-emerald-500/20 tracking-wider">
                    VERIFIED EMPLOYER
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-neutral-950 tracking-tight">
                    Employer Control Plane
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Corporate opening creation, Indian Rupee (₹) salary ranges,
                    candidate application review & status escalation.
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 pt-3 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Verified Corporate Company Profile</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Custom Openings & ₹ Salary Ranges</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>A4 Resume & Full-Screen Viewer</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>6-Stage Application Pipeline Escalation</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=company"
                className="w-full py-4 bg-neutral-950 text-white font-extrabold text-xs rounded-full hover:bg-neutral-800 transition-all text-center flex items-center justify-center gap-2.5 shadow-lg cursor-pointer group-hover:shadow-xl"
              >
                <span>Register Corporate Account</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Institute Card */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg space-y-6 flex flex-col justify-between hover:border-blue-600 hover:shadow-2xl transition-all group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-neutral-950 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-700 rounded-full font-mono text-[10px] font-extrabold border border-blue-500/20 tracking-wider">
                    ACADEMIC PARTNER
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-neutral-950 tracking-tight">
                    Institute Portal
                  </h3>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Student batch onboarding, placement readiness analytics, QR
                    code verification badges, and campus drive sync.
                  </p>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 pt-3 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Student Roster & QR Verification Badges</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Batch Placement Readiness Analytics</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Campus Placement Drive Sync</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Enterprise Audit Log & Security Stream</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=institute"
                className="w-full py-4 bg-neutral-950 text-white font-extrabold text-xs rounded-full hover:bg-neutral-800 transition-all text-center flex items-center justify-center gap-2.5 shadow-lg cursor-pointer group-hover:shadow-xl"
              >
                <span>Register Institute Account</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: ANIMATED ENTERPRISE PERFORMANCE & VELOCITY ENGINE */}
      <section
        id="metrics"
        className="py-36 sm:py-48 bg-[#F8F9FA] border-t border-neutral-200/80 px-6 relative overflow-hidden"
      >
        {/* Ambient Subtle Background Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          {/* Section 2 Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-neutral-200 text-[10px] font-mono font-extrabold uppercase tracking-widest text-neutral-600 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SYSTEM PERFORMANCE & THROUGHPUT</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight leading-tight">
              Real-Time Platform Velocity
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
              Engineered natively on Next.js 15, Prisma ORM, and Web Speech APIs
              with zero mock fallbacks and instant state synchronization.
            </p>
          </motion.div>

          {/* Animated Enterprise Velocity & Performance Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, staggerChildren: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left items-stretch"
          >
            {/* Card 1: Sub-150ms A4 Engine */}
            <motion.div
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg hover:border-neutral-950 hover:shadow-2xl transition-all space-y-6 flex flex-col justify-between group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-neutral-950 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-full font-mono text-[10px] font-extrabold border border-emerald-500/20 tracking-wider">
                    SUB-150MS RENDER
                  </span>
                </div>

                <div>
                  <div className="text-4xl font-extrabold text-neutral-950 tracking-tight">
                    A4 PDF
                  </div>
                  <h4 className="text-base font-extrabold text-neutral-950 mt-1">
                    A4 PDF Document Engine
                  </h4>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Compiles publication-grade A4 resumes with structured sections and A4 margins. Review the exported PDF
                    before sharing it.
                  </p>
                </div>

                {/* Animated Progress Gauge */}
                <div className="space-y-2 pt-3 border-t border-neutral-100 font-mono text-xs">
                  <div className="flex justify-between text-[11px] font-bold text-neutral-600">
                    <span>ATS COMPLIANCE SCORE</span>
                    <span className="text-emerald-600 font-bold">94/100</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "94%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="bg-neutral-950 h-full rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 text-[11px] font-mono text-neutral-400 flex items-center justify-between border-t border-neutral-100">
                <span>PDF EXPORT DEMO</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>EXAMPLE PREVIEW</span>
                </span>
              </div>
            </motion.div>

            {/* Card 2: Voice AI Mock Interviewer */}
            <motion.div
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg hover:border-purple-600 hover:shadow-2xl transition-all space-y-6 flex flex-col justify-between group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-neutral-950 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                    <Activity className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-700 rounded-full font-mono text-[10px] font-extrabold border border-purple-500/20 tracking-wider">
                    SPEECH TO TEXT
                  </span>
                </div>

                <div>
                  <div className="text-4xl font-extrabold text-neutral-950 tracking-tight">
                    142 WPM
                  </div>
                  <h4 className="text-base font-extrabold text-neutral-950 mt-1">
                    Real-Time AI Speech Matrix
                  </h4>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Evaluates technical depth, speech velocity, filler word
                    frequency, and system design clarity in real-time practice
                    rounds.
                  </p>
                </div>

                {/* Animated Equalizer Visualizer */}
                <div className="p-4 bg-neutral-950 text-white rounded-2xl space-y-2.5 font-mono shadow-inner">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                    <span>AUDIO FREQUENCY INPUT</span>
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      RECORDING
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 h-9 justify-center pt-1">
                    <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.25s]" />
                    <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.35s]" />
                    <span className="w-1.5 h-7 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>

              <div className="pt-3 text-[11px] font-mono text-neutral-400 flex items-center justify-between border-t border-neutral-100">
                <span>AI SPEECH EVALUATION</span>
                <span className="text-purple-600 font-bold">
                  VERIFIED DEPTH
                </span>
              </div>
            </motion.div>

            {/* Card 3: Prisma ORM Real-Time Database Sync */}
            <motion.div
              whileHover={{ y: -8, scale: 1.015 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-lg hover:border-blue-600 hover:shadow-2xl transition-all space-y-6 flex flex-col justify-between group overflow-hidden"
            >
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-neutral-950 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-extrabold shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-700 rounded-full font-mono text-[10px] font-extrabold border border-blue-500/20 tracking-wider">
                    REAL-TIME SYNC
                  </span>
                </div>

                <div>
                  <div className="text-4xl font-extrabold text-neutral-950 tracking-tight">
                    Zero Latency
                  </div>
                  <h4 className="text-base font-extrabold text-neutral-950 mt-1">
                    Prisma ORM Database Flow
                  </h4>
                  <p className="text-xs text-neutral-500 font-normal mt-1.5 leading-relaxed">
                    Candidate applications, company openings, institutional
                    student rosters, and hiring statuses sync instantly across
                    all workspaces.
                  </p>
                </div>

                {/* Live Activity Stream */}
                <div className="space-y-2 pt-3 border-t border-neutral-100 font-mono text-xs">
                  <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-bold">
                      <span>LATEST PIPELINE EVENT</span>
                      <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        JUST NOW
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-950 font-extrabold truncate flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span>
                      <span>Application shortlisted by Acme Corp</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 text-[11px] font-mono text-neutral-400 flex items-center justify-between border-t border-neutral-100">
                <span>SECURITY PROTOCOL</span>
                <span className="text-blue-600 font-bold">
                  JWT SESSION SECURE
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid Section - Matches Identify Reference Design */}
      <section
        id="features"
        className="py-28 max-w-6xl mx-auto px-6 space-y-16"
      >
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
            CORE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight">
            Enterprise grade by default.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
            Built natively on Next.js 15, Prisma ORM, and modern web standards
            with zero mock fallbacks.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: Bot,
              title: "AI Mock Interviewer",
              description:
                "Practice tailored interviews for technical, system design, and behavioral roles with real-time speech evaluation.",
            },
            {
              icon: FileText,
              title: "A4 Resume Builder",
              description:
                "Craft clean, ATS-formatted resumes with live A4 preview, section reordering, and instant PDF download.",
            },
            {
              icon: BarChart3,
              title: "ATS Score Checker",
              description:
                "Scan your resume against target Job Descriptions to analyze keyword density and missing skills.",
            },
            {
              icon: Building2,
              title: "Verified Employer Portal",
              description:
                "Create corporate openings with ₹ salary periods, inspect applicant resumes, and advance hiring statuses.",
            },
            {
              icon: Briefcase,
              title: "Jobs Marketplace",
              description:
                "Filter openings by tech stack, location, work mode, and salary. Apply with 1-click using your resume.",
            },
            {
              icon: ShieldCheck,
              title: "Institutional Verification",
              description:
                "QR code verification badges for candidate credentials, university rosters, and campus hiring drives.",
            },
          ].map((cap, idx) => {
            const IconComponent = cap.icon;
            const isHighlight = idx === 1; // Default highlight second card like reference image
            return (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: "easeOut" },
                  },
                }}
                className={`group relative bg-white border rounded-3xl p-8 transition-all duration-300 flex flex-col justify-between space-y-6 cursor-pointer hover:-translate-y-1 ${
                  isHighlight
                    ? "border-neutral-300 shadow-xl"
                    : "border-neutral-200/80 shadow-xs hover:border-neutral-400 hover:shadow-xl"
                }`}
              >
                <div className="space-y-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:bg-neutral-950 group-hover:text-white group-hover:scale-105 group-hover:shadow-xl ${
                      isHighlight
                        ? "bg-neutral-950 text-white shadow-lg scale-105"
                        : "bg-neutral-100/90 text-neutral-950"
                    }`}
                  >
                    <IconComponent className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                  </div>

                  <h3 className="text-xl font-extrabold text-neutral-950 tracking-tight">
                    {cap.title}
                  </h3>

                  <p className="text-xs text-neutral-500 font-normal leading-relaxed">
                    {cap.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400 group-hover:text-neutral-950 transition-colors">
                  <span>EXPLORE FEATURE</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-neutral-950" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Animated Brand Marquee Section (Matching Image 2 Reference Layout) */}
      <section
        id="brands"
        className="py-20 sm:py-24 border-y border-neutral-200/80 bg-white overflow-hidden relative"
      >
        {/* Left & Right Edge Gradient Fades */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center space-y-10">
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-400 font-bold block">
            ILLUSTRATIVE COMPANY EXAMPLES
          </span>

          {/* Continuous Animated Horizontal Marquee Ticker */}
          <div className="flex overflow-hidden select-none">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="flex items-center gap-12 sm:gap-16 shrink-0 min-w-full"
            >
              {[
                { name: "Acme Corp", initial: "A" },
                { name: "GlobalBank", initial: "G" },
                { name: "TechNova", initial: "T" },
                { name: "Pinnacle", initial: "P" },
                { name: "Vanguard", initial: "V" },
                { name: "Nexus", initial: "N" },
                { name: "Apex Systems", initial: "A" },
                { name: "Starlight Bio", initial: "S" },
                { name: "Acme Corp", initial: "A" },
                { name: "GlobalBank", initial: "G" },
                { name: "TechNova", initial: "T" },
                { name: "Pinnacle", initial: "P" },
                { name: "Vanguard", initial: "V" },
                { name: "Nexus", initial: "N" },
                { name: "Apex Systems", initial: "A" },
                { name: "Starlight Bio", initial: "S" },
              ].map((brand, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 shrink-0 group cursor-default"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-400/90 text-white font-black flex items-center justify-center text-xs shadow-2xs group-hover:bg-neutral-950 transition-colors">
                    {brand.initial}
                  </div>
                  <span className="text-base sm:text-lg font-extrabold text-neutral-400 group-hover:text-neutral-950 transition-colors tracking-tight">
                    {brand.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Quote Cards Section (Matching Identify Reference Layout Exactly) */}
      <section
        id="testimonials"
        className="py-36 sm:py-44 border-t border-neutral-200/80 bg-[#FAFAFA] px-6 text-left"
      >
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 font-bold block">
              ILLUSTRATIVE WORKFLOWS
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tight leading-[1.12]">
              One workspace for career preparation
            </h2>
            <p className="text-neutral-500 text-sm sm:text-base font-normal leading-relaxed">
              Examples of how candidates and teams can use the platform.
              These examples are illustrative, not customer endorsements.
            </p>
          </div>

          {/* 3-Column Quote Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              {
                quote:
                  '"Build a resume, compare its evidence with a target job, and practise explaining the skills that need more preparation."',
                author: "Candidate workflow",
                role: "Illustrative example",
                initial: "S",
              },
              {
                quote:
                  '"Review submitted applications and track their status through the employer workspace."',
                author: "Employer workflow",
                role: "Illustrative example",
                initial: "M",
                highlighted: true,
              },
              {
                quote:
                  '"Organize candidate preparation and review the summaries candidates choose to share with their institute."',
                author: "Institute workflow",
                role: "Illustrative example",
                initial: "E",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`bg-white rounded-3xl p-8 sm:p-9 border flex flex-col justify-between space-y-8 transition-all duration-300 ${
                  testimonial.highlighted
                    ? "border-neutral-300 shadow-2xl scale-[1.02] relative z-10"
                    : "border-neutral-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5"
                }`}
              >
                {/* Quote Content */}
                <div className="space-y-6">
                  {/* Modern Minimal Quote Symbol */}
                  <div className="text-neutral-300 text-2xl font-mono font-bold leading-none select-none">
                    “ ”
                  </div>

                  <p className="text-neutral-700 text-sm sm:text-base font-normal leading-relaxed font-sans">
                    {testimonial.quote}
                  </p>
                </div>

                {/* Author Info Row */}
                <div className="flex items-center gap-3.5 pt-4 border-t border-neutral-100">
                  <div
                    className={`w-10 h-10 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0 ${
                      testimonial.highlighted ? "ring-4 ring-neutral-100" : ""
                    }`}
                  >
                    {testimonial.initial}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-neutral-950 tracking-tight">
                      {testimonial.author}
                    </h4>
                    <p className="text-xs text-neutral-400 font-normal mt-0.5">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section
        id="pricing"
        className="py-36 sm:py-48 bg-white border-t border-neutral-200/80 px-6 relative overflow-hidden"
      >
        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-extrabold uppercase tracking-widest text-neutral-600 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>TRANSPARENT PRICING & PLANS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight leading-tight">
              Flexible Plans for Every Career Goal
            </h2>
            <p className="text-sm text-neutral-600">Plan details are previews. Online purchases and subscriptions are not enabled.</p>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
              Start building publication-ready A4 resumes and practicing AI
              interviews for free, or scale with enterprise employer tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Free Plan */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md hover:border-neutral-400 hover:shadow-xl transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-5">
                <span className="px-3 py-1 bg-neutral-100 text-neutral-800 rounded-full font-mono text-[10px] font-extrabold border border-neutral-200 tracking-wider">
                  CANDIDATE STARTER
                </span>
                <div>
                  <div className="text-4xl font-extrabold text-neutral-950 tracking-tight font-mono">
                    ₹0
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Free Forever • No Credit Card Required
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1 A4 Resume & A4 Vector Export</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>ATS Keyword Match Scanner (5 scans/mo)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>3 AI Voice Interview Practice Rounds</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1-Click Verified Applications</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=candidate"
                className="w-full py-3.5 bg-neutral-100 text-neutral-950 font-extrabold text-xs rounded-full hover:bg-neutral-200 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 text-neutral-950" />
              </Link>
            </motion.div>

            {/* Pro Candidate Plan (Popular) */}
            <motion.div
              whileHover={{ y: -6 }}
              className="relative bg-neutral-950 text-white rounded-3xl p-8 shadow-2xl transition-all flex flex-col justify-between space-y-6 border border-neutral-800"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-mono text-[10px] font-extrabold border border-emerald-500/30 tracking-wider">
                    PLANNED PRO FEATURES
                  </span>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>

                <div>
                  <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
                    ₹499{" "}
                    <span className="text-xs text-neutral-400 font-sans font-normal">
                      / month
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    For Ambitious Job Seekers & Engineers
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-neutral-800 text-xs font-mono text-neutral-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited A4 Resumes & Custom Templates</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-Time Unlimited ATS Keyword Scans</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Voice AI Mock Interviews</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Speech Equalizer & 7-Day Prep Roadmap</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Candidate Verified Recruiter Badge</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=candidate"
                className="w-full py-3.5 bg-white text-neutral-950 font-extrabold text-xs rounded-full hover:bg-neutral-100 transition-all text-center flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Create candidate account</span>
                <ArrowRight className="w-4 h-4 text-neutral-950" />
              </Link>
            </motion.div>

            {/* Enterprise & Institute Plan */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md hover:border-neutral-400 hover:shadow-xl transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-5">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-700 rounded-full font-mono text-[10px] font-extrabold border border-blue-500/20 tracking-wider">
                  ENTERPRISE & CAMPUS
                </span>
                <div>
                  <div className="text-4xl font-extrabold text-neutral-950 tracking-tight font-mono">
                    ₹4,999{" "}
                    <span className="text-xs text-neutral-500 font-sans font-normal">
                      / month
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    For Verified Corporate Employers & Universities
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-neutral-100 text-xs font-mono text-neutral-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Employer Control Plane & Job Posting</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>6-Stage Candidate Pipeline Escalation</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Institute Batch Roster & QR Badges</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Campus Placement Drive Synchronization</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Prompt-Guard Security Audit Stream</span>
                  </div>
                </div>
              </div>

              <Link
                href="/register?role=company"
                className="w-full py-3.5 bg-neutral-950 text-white font-extrabold text-xs rounded-full hover:bg-neutral-800 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Register Corporate Portal</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DOCUMENTATION & ARCHITECTURE SECTION */}
      <section
        id="docs"
        className="py-36 sm:py-48 bg-[#F8F9FA] border-t border-neutral-200/80 px-6"
      >
        <div className="max-w-6xl mx-auto space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-neutral-200 text-[10px] font-mono font-extrabold uppercase tracking-widest text-neutral-600 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>PLATFORM DOCUMENTATION & ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight leading-tight">
              Built on Modern Monolithic Standards
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
              Explore the technical architecture, zero-fallback APIs, and
              deterministic engines powering Vantory.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Doc Card 1 */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md space-y-4 hover:border-neutral-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-xs">
                01
              </div>
              <h3 className="text-xl font-extrabold text-neutral-950">
                A4 PDF Vector Compilation
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                The document compiler uses strict A4 margin mathematics to
                eliminate text truncation and font overlap. PDF output is
                generated from structured resume data with PDFKit. Review the
                exported PDF before submitting it; employer parsing can vary.
              </p>
              <div className="p-3 bg-neutral-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                <code>{`Structured resume data → PDFKit → A4 PDF`}</code>
              </div>
            </div>

            {/* Doc Card 2 */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md space-y-4 hover:border-neutral-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-xs">
                02
              </div>
              <h3 className="text-xl font-extrabold text-neutral-950">
                Voice AI Speech Matrix & WPM
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Where supported by your browser, speech input creates a
                transcript. Interview feedback assesses answer content; voice
                measurements do not establish technical skill or hiring readiness.
              </p>
              <div className="p-3 bg-neutral-950 text-purple-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                <code>{`Transcript → answer evaluation → practice suggestions`}</code>
              </div>
            </div>

            {/* Doc Card 3 */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md space-y-4 hover:border-neutral-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-xs">
                03
              </div>
              <h3 className="text-xl font-extrabold text-neutral-950">
                ATS Taxonomical Keyword Matching
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Scans job descriptions against candidate skills using exact
                matching, alias normalization, and related skill taxonomy
                evaluation. Built-in Prompt Guard neutralizes prompt injection
                attacks embedded in job listings.
              </p>
              <div className="p-3 bg-neutral-950 text-blue-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                <code>{`scanAtsCompliance(resumeText, jobDescription) => { score: 94, missingKeywords: [...] }`}</code>
              </div>
            </div>

            {/* Doc Card 4 */}
            <div className="bg-white border border-neutral-200/90 rounded-3xl p-8 shadow-md space-y-4 hover:border-neutral-400 transition-all">
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-xs">
                04
              </div>
              <h3 className="text-xl font-extrabold text-neutral-950">
                Prisma ORM & Full-Viewport React Portals
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Database queries execute through Prisma ORM on MongoDB Atlas.
                All interactive modals use React{" "}
                <code className="text-neutral-950 font-bold">
                  createPortal(..., document.body)
                </code>{" "}
                for full viewport overlay rendering free of z-index clipping.
              </p>
              <div className="p-3 bg-neutral-950 text-amber-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                <code>{`createPortal(<ModalContent />, document.body)`}</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section (Matching Identify Reference Layout Exactly) */}
      <section
        id="faq"
        className="py-36 sm:py-48 border-t border-neutral-200/80 bg-white px-6"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16 items-start">
          {/* Left Column: Headline & Subtitle */}
          <div className="lg:col-span-5 space-y-4 text-left">
            <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-[1.12]">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-sm font-normal">
              Everything you need to know about the product and workflows. Have
              more questions? Reach out to our team.
            </p>
          </div>

          {/* Right Column: Stack of Interactive Accordion Cards */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {[
              {
                q: "How does the A4 ATS Resume Builder work?",
                a: "Our resume builder enforces A4 publication standards in real-time. As you enter your summary, experience, and skills, the engine generates an structured document layout with live A4 preview and downloadable A4 PDF export.",
              },
              {
                q: "How realistic is the AI Mock Interviewer?",
                a: "The AI interviewer simulates actual technical, system design, and behavioral engineering rounds using speech-to-text input. It evaluates your response velocity (WPM), keyword depth, and structural clarity, providing a score out of 100 with actionable feedback.",
              },
              {
                q: "How do verified companies post jobs and review applicants?",
                a: "Verified corporate employers log into the Employer Portal, create job listings with Indian Rupee (₹) salary ranges, receive applicant profiles in real-time, inspect formatted A4 candidate resumes, attach internal hiring notes, and advance candidate statuses.",
              },
              {
                q: "What level of ATS keyword matching is available?",
                a: "Our ATS Checker performs deterministic gate scans against target Job Descriptions. It extracts matching core competencies, flags missing critical keywords, verifies formatting compliance, and calculates a percentage match score to maximize callback rates.",
              },
              {
                q: "Can universities and bootcamps manage campus placement drives?",
                a: "Yes. The Institutional Placement Dashboard enables universities to onboard student batches, track placement readiness metrics, issue QR code verified digital credentials, and coordinate campus hiring drives directly with partner employers.",
              },
              {
                q: "Is candidate and corporate data synchronized in real-time?",
                a: "Absolutely. All user profiles, corporate job listings, resume templates, mock interview scores, and applicant statuses are persisted in MongoDB Atlas via Prisma ORM with strict JWT authentication and cookie session management.",
              },
            ].map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className="bg-white border border-neutral-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs hover:border-neutral-300 transition-all p-6 sm:p-7"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left flex items-center justify-between gap-6 font-bold text-base sm:text-[17px] text-neutral-900 tracking-tight cursor-pointer select-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-neutral-900" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence mode="popLayout">
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-sm sm:text-base text-neutral-500 font-normal leading-relaxed border-t border-neutral-100/90 pt-4 mt-4"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section (Light Mode matching Identify reference) */}
      <section className="py-32 sm:py-44 bg-white px-6">
        <div className="max-w-5xl mx-auto bg-[#F9FAFB] border border-neutral-200/90 rounded-3xl sm:rounded-4xl p-12 sm:p-16 text-center space-y-6 shadow-xl relative overflow-hidden">
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tight max-w-xl mx-auto leading-[1.15]">
            Get Started with Vantory Today.
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base max-w-md mx-auto font-normal leading-relaxed">
            Join candidate applicants, verified employers, and educational
            institutions on a unified career engine.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-neutral-950 text-white font-extrabold text-xs sm:text-sm rounded-full hover:bg-neutral-800 transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
          </div>
        </div>
      </section>

      {/* Ultra-Premium Dark Enterprise Footer (Matching Identify Reference Layout Exactly) */}
      <footer className="bg-black text-white pt-28 pb-16 border-t border-neutral-900 overflow-hidden font-sans">
        <div className="max-w-7xl mx-auto px-8 sm:px-12 space-y-20">
          {/* Top 5-Column Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 sm:gap-16 items-start text-left">
            {/* Column 1: Brand Info & Bare Social Icons */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white text-black font-black flex items-center justify-center text-sm shadow-md">
                  V
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  Vantory
                </span>
              </div>
              <p className="text-[13px] text-neutral-400 font-normal leading-relaxed max-w-[250px]">
                The premium enterprise platform for career acceleration, ATS
                resume building, AI mock interviews, and corporate recruitment.
              </p>
              <div className="flex items-center gap-5 pt-3">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: PRODUCT */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                PRODUCT
              </h4>
              <ul className="space-y-3.5 text-[13px] text-neutral-400 font-normal">
                <li>
                  <Link
                    href="/resume"
                    className="hover:text-white transition-colors block"
                  >
                    A4 Resume Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mock-interview"
                    className="hover:text-white transition-colors block"
                  >
                    AI Mock Interview
                  </Link>
                </li>
                <li>
                  <Link
                    href="/ats-checker"
                    className="hover:text-white transition-colors block"
                  >
                    ATS Checker
                  </Link>
                </li>
                <li>
                  <Link
                    href="/company/dashboard"
                    className="hover:text-white transition-colors block"
                  >
                    Employer Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/institute/dashboard"
                    className="hover:text-white transition-colors block"
                  >
                    Institute Roster
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: RESOURCES */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                RESOURCES
              </h4>
              <ul className="space-y-3.5 text-[13px] text-neutral-400 font-normal">
                <li>
                  <Link
                    href="/resume"
                    className="hover:text-white transition-colors block"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="hover:text-white transition-colors block"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/resume"
                    className="hover:text-white transition-colors block"
                  >
                    A4 Templates
                  </Link>
                </li>
                <li>
                  <Link
                    href="/ats-checker"
                    className="hover:text-white transition-colors block"
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href="/jobs"
                    className="hover:text-white transition-colors block"
                  >
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: COMPANY */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                COMPANY
              </h4>
              <ul className="space-y-3.5 text-[13px] text-neutral-400 font-normal">
                <li>
                  <Link
                    href="/"
                    className="hover:text-white transition-colors block"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/jobs"
                    className="hover:text-white transition-colors block"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/"
                    className="hover:text-white transition-colors block"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="hover:text-white transition-colors block"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/company/dashboard"
                    className="hover:text-white transition-colors block"
                  >
                    Enterprise Partners
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: LEGAL */}
            <div className="space-y-4">
              <h4 className="text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                LEGAL
              </h4>
              <ul className="space-y-3.5 text-[13px] text-neutral-400 font-normal">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors block"
                  >
                    Privacy & data use
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors block"
                  >
                    Usage guidelines
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="hover:text-white transition-colors block"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies"
                    className="hover:text-white transition-colors block"
                  >
                    Cookies & local storage
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Gigantic Premium Architectural Typography Header & Subtitle */}
          <div className="pt-12 pb-6 text-center select-none pointer-events-none overflow-hidden relative border-t border-neutral-900/80 my-8 px-4">
            <h1 className="text-[13.5vw] sm:text-[15vw] md:text-[15.5vw] font-black tracking-tight uppercase leading-none bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-950 bg-clip-text text-transparent drop-shadow-2xl">
              VANTORY
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm font-mono tracking-[0.25em] text-neutral-500 uppercase mt-2">
              Career Advantage • Career Direction • Verified Ecosystem
            </p>
          </div>

          {/* Bottom Status Bar */}
          <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] font-mono text-neutral-500">
            <div>© 2026 Vantory Inc. All rights reserved.</div>

            <div className="flex items-center gap-2 text-[11px] font-mono font-bold tracking-widest uppercase text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
