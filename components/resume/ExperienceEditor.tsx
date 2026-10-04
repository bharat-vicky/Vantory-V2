"use client";

import React from "react";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeExperienceItem } from "@/lib/resume/types";

export interface ExperienceEditorProps {
  items: ResumeExperienceItem[];
  onChange: (items: ResumeExperienceItem[]) => void;
}

export function ExperienceEditor({ items, onChange }: ExperienceEditorProps) {
  const addItem = () => {
    const newItem: ResumeExperienceItem = {
      id: `exp-${Date.now()}`,
      role: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      bullets: [],
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ResumeExperienceItem,
    value: unknown,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateBullets = (id: string, bulletsText: string) => {
    const list = bulletsText.split("\n").filter((b) => b.trim());
    onChange(
      items.map((item) => (item.id === id ? { ...item, bullets: list } : item)),
    );
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div
          key={item.id || idx}
          className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900">
              <Briefcase className="w-3.5 h-3.5 text-neutral-600" />
              <span>Experience {idx + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
              aria-label="Remove experience"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Job Title / Role"
              placeholder="Software Engineer"
              value={item.role}
              onChange={(e) => updateItem(item.id, "role", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="Company Name"
              placeholder="Acme Corp"
              value={item.company}
              onChange={(e) => updateItem(item.id, "company", e.target.value)}
              className="bg-white text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Location"
              placeholder="Bengaluru, India"
              value={item.location}
              onChange={(e) => updateItem(item.id, "location", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="Start Date"
              placeholder="Jan 2024"
              value={item.startDate}
              onChange={(e) => updateItem(item.id, "startDate", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="End Date / Present"
              placeholder="Present / Dec 2024"
              value={item.endDate}
              onChange={(e) => updateItem(item.id, "endDate", e.target.value)}
              className="bg-white text-xs h-9"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              Achievement Bullets (One per line)
            </label>
            <textarea
              rows={3}
              value={item.bullets.join("\n")}
              onChange={(e) => updateBullets(item.id, e.target.value)}
              placeholder="• Built REST APIs...&#10;• Reduced latency by 20%..."
              className="w-full text-xs p-2.5 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-950 font-mono"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full text-xs"
        leftIcon={<Plus className="w-3.5 h-3.5" />}
      >
        Add Work Experience
      </Button>
    </div>
  );
}
