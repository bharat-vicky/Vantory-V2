"use client";

import React from "react";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeEducationItem } from "@/lib/resume/types";

export interface EducationEditorProps {
  items: ResumeEducationItem[];
  onChange: (items: ResumeEducationItem[]) => void;
}

export function EducationEditor({ items, onChange }: EducationEditorProps) {
  const addItem = () => {
    const newItem: ResumeEducationItem = {
      id: `edu-${Date.now()}`,
      degree: "",
      institution: "",
      location: "",
      startDate: "",
      endDate: "",
      grade: "",
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ResumeEducationItem,
    value: string,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
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
              <GraduationCap className="w-3.5 h-3.5 text-neutral-600" />
              <span>Education {idx + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
              aria-label="Remove education"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Degree / Major"
              placeholder="B.Tech Computer Science"
              value={item.degree}
              onChange={(e) => updateItem(item.id, "degree", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="Institution / University"
              placeholder="Stanford University"
              value={item.institution}
              onChange={(e) =>
                updateItem(item.id, "institution", e.target.value)
              }
              className="bg-white text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Start Year"
              placeholder="2022"
              value={item.startDate}
              onChange={(e) => updateItem(item.id, "startDate", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="End Year / Expected"
              placeholder="Expected 2026"
              value={item.endDate}
              onChange={(e) => updateItem(item.id, "endDate", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="Grade / GPA"
              placeholder="3.9 CGPA"
              value={item.grade || ""}
              onChange={(e) => updateItem(item.id, "grade", e.target.value)}
              className="bg-white text-xs h-9"
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
        Add Education Entry
      </Button>
    </div>
  );
}
