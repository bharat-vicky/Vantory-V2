"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Info, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ContactSupportFormProps {
  onSuccessClose?: () => void;
}

export function ContactSupportForm({ onSuccessClose }: ContactSupportFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subjectCategory, setSubjectCategory] = useState("General Support & Inquiry");
  const [customSubject, setCustomSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);


  const finalSubject =
    subjectCategory === "Other / Custom Inquiry"
      ? customSubject.trim() || "Custom Support Inquiry"
      : subjectCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject: finalSubject,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "We couldn't send your message right now. Please try again.");
      }

      setSuccessTicket(data.ticketId);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (successTicket) {
    return (
      <div className="bg-neutral-950 text-white rounded-2xl p-6 text-center space-y-4 shadow-xl animate-in fade-in border border-neutral-800">
        <div className="w-12 h-12 rounded-2xl bg-white text-neutral-950 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-6 h-6 text-neutral-950" />
        </div>
        <div className="space-y-2">
          <h4 className="text-base font-extrabold text-white">Support ticket saved</h4>
          <p className="text-xs text-neutral-300 max-w-xs mx-auto leading-relaxed font-medium">
            Ticket <span className="font-mono text-white font-bold">{successTicket}</span> has been saved. Keep this reference for follow-up.
          </p>


        </div>
        <button
          type="button"
          onClick={onSuccessClose}
          className="w-full py-3 bg-white text-neutral-950 font-extrabold text-xs rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 font-sans">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-3 rounded-xl text-xs flex items-center gap-2 font-mono font-bold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Your Name *"
          type="text"
          placeholder="Anupam Singh"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />

        <Input
          label="Your Email Address *"
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Phone Number (Optional)"
          type="tel"
          placeholder="7307679920"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />

        {/* Subject Dropdown Menu */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">
            Select Subject *
          </label>
          <div className="relative">
            <select
              value={subjectCategory}
              onChange={(e) => setSubjectCategory(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 pr-8 text-xs text-neutral-950 font-medium focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 transition-all cursor-pointer appearance-none"
            >
              <option value="General Support & Inquiry">General Support & Inquiry</option>
              <option value="Platform Partnership">Platform Partnership</option>
              <option value="Employer & Corporate Hiring">Employer & Corporate Hiring</option>
              <option value="Candidate ATS & Resume Help">Candidate ATS & Resume Help</option>
              <option value="AI Mock Interview Inquiry">AI Mock Interview Inquiry</option>
              <option value="Technical Issue / Bug Report">Technical Issue / Bug Report</option>
              <option value="Other / Custom Inquiry">Other / Custom Inquiry...</option>
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Optional Custom Subject Input when "Other" is selected */}
      {subjectCategory === "Other / Custom Inquiry" && (
        <Input
          label="Type Custom Subject *"
          type="text"
          placeholder="Specify subject..."
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          required
        />
      )}

      <Textarea
        label="Your Message *"
        placeholder="Type your inquiry, feedback, or support request..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        rows={3}
      />

      <button
        type="submit"
        disabled={isLoading || !name.trim() || !email.trim() || !message.trim()}
        className="w-full py-3 bg-neutral-950 text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
      >
        {isLoading ? (
          <span>Dispatching Email...</span>
        ) : (
          <>
            <span>Send Direct Message</span>
            <Send className="w-3.5 h-3.5 text-white" />
          </>
        )}
      </button>
    </form>
  );
}
