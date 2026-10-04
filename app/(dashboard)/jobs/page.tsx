"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  SlidersHorizontal,
  Info,
  Send,
  Globe,
  ExternalLink,
} from "lucide-react";
import { ApplyJobModal } from "@/components/jobs/ApplyJobModal";

interface JobPostingItem {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workMode: string;
  type: string;
  experience: string;
  salary?: string;
  description: string;
  skills: string;
  verificationStatus: string;
  postedAt: string;
  companyUrl?: string;
  isSaved?: boolean;
  hasApplied?: boolean;
}

export default function JobsMarketplacePage() {
  const [jobs, setJobs] = useState<JobPostingItem[]>([]);
  const [activeOpeningsCount, setActiveOpeningsCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [jobType, setJobType] = useState<string>("ALL");
  const [workMode, setWorkMode] = useState<string>("ALL");
  const [experience, setExperience] = useState<string>("ALL");
  const [datePosted, setDatePosted] = useState<string>("ALL");
  const [loadError,setLoadError]=useState("");
  const [salaryRange, setSalaryRange] = useState<string>("ALL");
  const [selectedSkill, setSelectedSkill] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "relevance" | "salary" | "experience">("recent");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState<boolean>(false);

  // Application Modal state
  const [applyModalJob, setApplyModalJob] = useState<{ id: string; title: string; company: string } | null>(null);

  // Active filter count
  const activeFilterCount = [
    jobType !== "ALL",
    workMode !== "ALL",
    experience !== "ALL",
    datePosted !== "ALL",
    salaryRange !== "ALL",
    selectedSkill !== "ALL",
    Boolean(debouncedQuery.trim()),
  ].filter(Boolean).length;

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const jobsRequestSequence=useRef(0);
  const fetchJobs = useCallback(async () => {
    const sequence=++jobsRequestSequence.current;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedQuery) queryParams.set("query", debouncedQuery);
      if (jobType !== "ALL") queryParams.set("jobType", jobType);
      if (workMode !== "ALL") queryParams.set("workMode", workMode);
      if (experience !== "ALL") queryParams.set("experience", experience);
      if (datePosted !== "ALL") queryParams.set("datePosted", datePosted);
      if (salaryRange !== "ALL") queryParams.set("salaryRange", salaryRange);
      if (selectedSkill !== "ALL") queryParams.set("skills", selectedSkill);
      if (sortBy) queryParams.set("sortBy", sortBy);
      queryParams.set("page", page.toString());
      queryParams.set("limit", "6");

      const res = await fetch(`/api/jobs?${queryParams.toString()}`);
      if(!res.ok)throw new Error("Jobs could not be loaded. Please retry.");
      if(sequence!==jobsRequestSequence.current)return;
      setLoadError("");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if(sequence!==jobsRequestSequence.current)return;
          setJobs(json.jobs || []);
          setTotalCount(json.totalCount || 0);
          setTotalPages(json.totalPages || 1);
          setActiveOpeningsCount(json.activeOpeningsCount || 0);
        }
      }
    } catch(e) {
      if(sequence===jobsRequestSequence.current)setLoadError(e instanceof Error ? e.message : "Unable to load jobs.");
    } finally {
      if(sequence===jobsRequestSequence.current)setIsLoading(false);
    }
  }, [debouncedQuery, jobType, workMode, experience, datePosted, salaryRange, selectedSkill, sortBy, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleToggleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/jobs/${jobId}/save`, { method: jobs.find(j=>j.id===jobId)?.isSaved ? "DELETE":"POST" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, isSaved: json.isSaved } : j))
          );
        }
      }
    } catch(e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load jobs.");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setJobType("ALL");
    setWorkMode("ALL");
    setExperience("ALL");
    setDatePosted("ALL");
    setSalaryRange("ALL");
    setSelectedSkill("ALL");
    setSortBy("recent");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      {loadError && <p role="alert" className="p-4 bg-amber-50 rounded-xl">{loadError} <button className="underline" onClick={fetchJobs}>Retry</button></p>}
      {/* Hero Header */}
      <div className="border-b border-neutral-200 pb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 uppercase tracking-wider">
                CORPORATE CAREERS & JOB MARKETPLACE
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">
              Exclusive Engineering & Corporate Jobs
            </h1>
            <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
              Companies post hiring roles directly on Vantory. Candidates can discover verified opportunities and apply using their Vantory Resume.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/jobs/saved"
              className="px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs"
            >
              <Bookmark className="w-4 h-4 text-neutral-950" />
              <span>Saved Jobs</span>
            </Link>

            <Link
              href="/jobs/applications"
              className="px-4 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
            >
              <Briefcase className="w-4 h-4 text-white" />
              <span>My Applications</span>
            </Link>
          </div>
        </div>

        {/* Supporting Trust Indicator Banner */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-neutral-950 shrink-0" />
            <p>
              <strong className="text-neutral-950 font-bold">Verified Vantory Resume Gateway:</strong> Direct delivery to registered company hiring inbox with evidence-based ATS verification.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-neutral-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" />
            <span>100% Verified Employer Postings</span>
          </div>
        </div>
      </div>

      {/* Active Openings & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950 flex items-center gap-2">
            <span>Active Openings</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-100 text-neutral-950 border border-neutral-300">
              {activeOpeningsCount}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchJobs()}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-neutral-950" : ""}`} />
            <span>Refresh Openings</span>
          </button>

          <button
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className="md:hidden px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-700 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-950" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Prominent Search & Sort Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs, skills, companies, locations (e.g. Backend, Python, Nextute)..."
            className="w-full text-xs bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-3 text-neutral-950 font-mono placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-500 shrink-0 font-semibold">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "relevance" | "salary" | "experience")}
            className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3 py-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-mono font-medium"
          >
            <option value="recent">Most Recent</option>
            <option value="relevance">Search and skill relevance</option>
            <option value="salary">Annual equivalent salary / stipend</option>
            <option value="experience">Experience Level</option>
          </select>
        </div>
      </div>

      {/* Main Marketplace Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Desktop Sidebar Filter Options */}
        <div className="hidden md:block md:col-span-3 space-y-6">
          <div className="bg-white border border-neutral-200 shadow-sm rounded-3xl p-5 space-y-5 transition-all">
            {/* Filter Header with Shrink/Expand Toggle Button */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-950" />
                <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                  <span>JOB FILTERS</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-950 text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-[10px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}

                {/* Shrink / Expand Icon Button */}
                <button
                  onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                  title={isFilterCollapsed ? "Expand Job Filters" : "Shrink Job Filters"}
                  className="p-1 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-all cursor-pointer"
                >
                  {isFilterCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-neutral-950" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-neutral-950" />
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Pills Bar */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {jobType !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{jobType}</span>
                    <button onClick={() => setJobType("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {workMode !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{workMode}</span>
                    <button onClick={() => setWorkMode("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {experience !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{experience} Yrs</span>
                    <button onClick={() => setExperience("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {datePosted !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{datePosted}</span>
                    <button onClick={() => setDatePosted("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {salaryRange !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{salaryRange}</span>
                    <button onClick={() => setSalaryRange("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedSkill !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-neutral-100 border border-neutral-200 font-bold text-neutral-900">
                    <span>{selectedSkill}</span>
                    <button onClick={() => setSelectedSkill("ALL")} className="hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Filter Body Controls (Hidden when shrunk) */}
            {!isFilterCollapsed && (
              <div className="space-y-4">
                {/* Job Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">JOB TYPE</label>
                  <select
                    value={jobType}
                    onChange={(e) => {
                      setJobType(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-bold shadow-2xs"
                  >
                    <option value="ALL">All Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                {/* Work Mode Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">WORK MODE</label>
                  <select
                    value={workMode}
                    onChange={(e) => {
                      setWorkMode(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-bold shadow-2xs"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                {/* Experience Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">EXPERIENCE</label>
                  <select
                    value={experience}
                    onChange={(e) => {
                      setExperience(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-bold shadow-2xs"
                  >
                    <option value="ALL">All Experience Levels</option>
                    <option value="0-2">0-2 Years (Entry/Intern)</option>
                    <option value="1-3">1-3 Years</option>
                    <option value="2-4">2-4 Years</option>
                    <option value="3-5">3-5+ Years</option>
                  </select>
                </div>

                {/* Date Posted Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">DATE POSTED</label>
                  <select
                    value={datePosted}
                    onChange={(e) => {
                      setDatePosted(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-bold shadow-2xs"
                  >
                    <option value="ALL">Any Time</option>
                    <option value="today">Past 24 Hours</option>
                    <option value="3days">Past 3 Days</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>

                {/* Salary Range Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">SALARY / STIPEND RANGE</label>
                  <select
                    value={salaryRange}
                    onChange={(e) => {
                      setSalaryRange(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-bold shadow-2xs"
                  >
                    <option value="ALL">All Salary Ranges</option>
                    <option value="0-25k">Up to ₹25,000 / mo</option>
                    <option value="25k-50k">₹25,000 - ₹50,000 / mo</option>
                    <option value="50k-100k">₹50,000 - ₹1,00,000 / mo</option>
                    <option value="100k+">₹1,00,000+ / mo</option>
                  </select>
                </div>

                {/* Tech Stack Chips Filter */}
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <label className="text-[11px] font-mono text-neutral-500 uppercase block font-bold tracking-wider">POPULAR TECH STACK</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Python", "React", "TypeScript", "Node.js", "AI/ML", "SQL"].map((tech) => (
                      <button
                        key={tech}
                        onClick={() => {
                          setSelectedSkill(selectedSkill === tech ? "ALL" : tech);
                          setPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          selectedSkill === tech
                            ? "bg-neutral-950 text-white border border-neutral-950"
                            : "bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isFilterDrawerOpen && (
          <div className="md:hidden col-span-12 p-4 bg-white border border-neutral-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-xs font-mono font-bold text-neutral-950">Filters ({activeFilterCount})</h3>
              <button onClick={handleClearFilters} className="text-xs text-neutral-500 underline">
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1 font-bold">Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-950 font-medium"
                >
                  <option value="ALL">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block mb-1 font-bold">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg p-2 text-neutral-950 font-medium"
                >
                  <option value="ALL">All Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Job Listings Grid */}
        <div className="col-span-12 md:col-span-9 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 animate-pulse shadow-sm"
                >
                  <div className="h-4 bg-neutral-100 rounded w-1/3"></div>
                  <div className="h-6 bg-neutral-100 rounded w-2/3"></div>
                  <div className="h-4 bg-neutral-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-neutral-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-950">No active openings match your current search</h3>
                <p className="text-xs text-neutral-500">
                  Try adjusting your search query or clear selected filters to view available corporate openings.
                </p>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all cursor-pointer shadow-md"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => {
                const skillList = job.skills
                  ? job.skills.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={job.id}
                    className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 hover:border-neutral-300 transition-all group shadow-sm"
                  >
                    {/* Card Top Row: Logo, Title, Verification Badge, Bookmark */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-neutral-950 font-mono font-black text-lg text-white flex items-center justify-center shrink-0 shadow-inner">
                          {job.companyLogo || job.company.charAt(0)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-neutral-950">{job.company}</span>
                            {job.verificationStatus === "VERIFIED" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                                <CheckCircle2 className="w-3 h-3 text-neutral-950 inline" />
                                <span>Verified Listing</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-black text-neutral-950 group-hover:underline">
                            <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleSave(job.id, e)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
                        title={job.isSaved ? "Unsave Job" : "Save Job"}
                      >
                        {job.isSaved ? (
                          <BookmarkCheck className="w-5 h-5 text-neutral-950 fill-neutral-950" />
                        ) : (
                          <Bookmark className="w-5 h-5 text-neutral-400" />
                        )}
                      </button>
                    </div>

                    {/* Metadata Badges Row */}
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{job.location}</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800">
                        {job.workMode}
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800">
                        {job.type}
                      </span>

                      {job.salary && (
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-950 font-bold">
                          {job.salary}
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{job.experience}</span>
                      </span>
                    </div>

                    {/* Description Snippet */}
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed font-sans">
                      {job.description}
                    </p>

                    {/* Required Skill Tags */}
                    {skillList.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase mr-1">Skills:</span>
                        {skillList.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 border border-neutral-200 text-neutral-800 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Action CTAs */}
                    <div className="pt-3 border-t border-neutral-200 flex items-center justify-between flex-wrap gap-3">
                      <span className="text-[10px] font-mono text-neutral-500">
                        Posted {new Date(job.postedAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-3">
                        {job.companyUrl && (
                          <a
                            href={job.companyUrl.startsWith("http") ? job.companyUrl : `https://${job.companyUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-950 hover:bg-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Globe className="w-3.5 h-3.5 text-neutral-950" />
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3 text-neutral-500" />
                          </a>
                        )}

                        <Link
                          href={`/jobs/${job.id}`}
                          className="px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-950 hover:bg-neutral-50 transition-all"
                        >
                          View Job
                        </Link>

                        {job.hasApplied ? (
                          <span className="px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950" />
                            <span>Already Applied</span>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setApplyModalJob({
                                id: job.id,
                                title: job.title,
                                company: job.company,
                              })
                            }
                            className="px-4 py-2 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-white" />
                            <span>Apply with Vantory Resume</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <span className="text-xs font-mono text-neutral-500">
                Page {page} of {totalPages} ({totalCount} total openings)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-950 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-950 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Workflow Modal */}
      {applyModalJob && (
        <ApplyJobModal
          isOpen={Boolean(applyModalJob)}
          onClose={() => setApplyModalJob(null)}
          jobId={applyModalJob.id}
          jobTitle={applyModalJob.title}
          companyName={applyModalJob.company}
          onApplicationSuccess={() => {
            fetchJobs();
          }}
        />
      )}
    </div>
  );
}
