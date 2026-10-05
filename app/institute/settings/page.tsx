"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InstituteProfile {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  description: string | null;
  location: string;
  contactEmail: string;
  contactPhone: string | null;
  establishedYear: number;
  verificationStatus: string;
  adminsCount: number;
}

export default function InstituteSettingsPage() {
  const [profile, setProfile] = useState<InstituteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [establishedYear, setEstablishedYear] = useState<number>(2010);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/institute/profile");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.profile) {
          const p = json.profile;
          setProfile(p);
          setName(p.name || "");
          setWebsite(p.website || "");
          setDescription(p.description || "");
          setLocation(p.location || "Main Campus");
          setContactEmail(p.contactEmail || "");
          setContactPhone(p.contactPhone || "");
          setEstablishedYear(p.establishedYear || 2010);
          setIsDirty(false);
        }
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage(null);

    try {
      const res = await fetch("/api/institute/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          description: description.trim(),
          location: location.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          establishedYear: Number(establishedYear),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setProfile(json.profile);
        setIsDirty(false);
        setToastMessage({ type: "success", text: "Institute profile updated & saved to database!" });
        try {
          window.dispatchEvent(new Event("institute-updated"));
        } catch {
          // Handle silently
        }
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({
          type: "error",
          text: `Failed to update profile: ${json.error || "Invalid parameters."}`,
        });
      }
    } catch {
      setToastMessage({ type: "error", text: "Network error updating institute profile." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-4xl mx-auto w-full">
          {/* Real-time Toast Feedback */}
          {toastMessage && (
            <div
              className={`p-4 font-mono text-xs rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 ${
                toastMessage.type === "success"
                  ? "bg-neutral-950 text-white"
                  : "bg-red-950 text-white border border-red-800"
              }`}
            >
              <span className="flex items-center gap-2">
                {toastMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                {toastMessage.text}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 flex items-center gap-3">
                Institute Profile & Settings
                {isDirty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Unsaved Changes
                  </span>
                )}
              </h1>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Manage Campus Identity, Verification Badges & Authorized Administrators
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProfile}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Reload Data
              </Button>

              <Badge variant="dark" className="font-mono text-xs px-3 py-1.5 border-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                {profile?.verificationStatus || "Loading"}
              </Badge>
            </div>
          </div>

          <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-6">
            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-neutral-400">
                Loading campus profile from PostgreSQL database...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Institute Name *"
                    type="text"
                    value={name}
                    onChange={handleInputChange(setName)}
                    placeholder="e.g. Polaris School of Tech"
                    required
                  />

                  <Input
                    label="Campus Location"
                    type="text"
                    value={location}
                    onChange={handleInputChange(setLocation)}
                    placeholder="Main Campus, Boston, MA"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Official Website"
                    type="text"
                    value={website}
                    onChange={handleInputChange(setWebsite)}
                    placeholder="https://campus.edu"
                  />

                  <Input
                    label="Established Year"
                    type="number"
                    value={establishedYear.toString()}
                    onChange={(e) => {
                      setEstablishedYear(parseInt(e.target.value, 10) || 2010);
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Placement Office Email"
                    type="email"
                    value={contactEmail}
                    onChange={handleInputChange(setContactEmail)}
                    placeholder="placements@campus.edu"
                  />

                  <Input
                    label="Placement Contact Phone"
                    type="text"
                    value={contactPhone}
                    onChange={handleInputChange(setContactPhone)}
                    placeholder="+1 (555) 019-2834"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                    Institute Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Brief overview of your institution and academic programs..."
                    className="w-full p-3 border border-neutral-200 rounded-2xl text-xs text-neutral-900 focus:border-neutral-950 outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
                  <span className="text-[10px] font-mono text-neutral-400">
                    Database ID: {profile?.id || "N/A"} • Status: {profile?.verificationStatus || "Loading"}
                  </span>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
