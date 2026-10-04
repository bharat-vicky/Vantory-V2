"use client";

import React from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeSkillCategory } from "@/lib/resume/types";

export interface SkillsEditorProps {
  skills: ResumeSkillCategory[];
  onChange: (skills: ResumeSkillCategory[]) => void;
}

export function SkillsEditor({ skills, onChange }: SkillsEditorProps) {
  const addCategory = () => {
    const newCategory: ResumeSkillCategory = {
      id: `cat-${Date.now()}`,
      category: "",
      skills: [],
    };
    onChange([...skills, newCategory]);
  };

  const removeCategory = (id: string) => {
    onChange(skills.filter((s) => s.id !== id));
  };

  const updateCategoryName = (id: string, name: string) => {
    onChange(skills.map((s) => (s.id === id ? { ...s, category: name } : s)));
  };

  const updateSkillsString = (id: string, skillsText: string) => {
    const list = skillsText.split(",").map((s) => s.trim());
    onChange(skills.map((s) => (s.id === id ? { ...s, skills: list } : s)));
  };

  return (
    <div className="space-y-4">
      {skills.map((cat, idx) => (
        <div
          key={cat.id || idx}
          className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Category Name (e.g. Languages / Full-Stack / Cloud)"
              value={cat.category}
              onChange={(e) => updateCategoryName(cat.id, e.target.value)}
              className="font-bold text-xs bg-white h-8"
              leftIcon={<Tag className="w-3.5 h-3.5 text-neutral-500" />}
            />
            <button
              type="button"
              onClick={() => removeCategory(cat.id)}
              className="p-1.5 text-neutral-400 hover:text-neutral-950 transition-colors shrink-0"
              aria-label="Delete category"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <Input
            placeholder="Comma-separated skills (e.g. Python, TypeScript, React.js, Next.js)"
            value={cat.skills.join(", ")}
            onChange={(e) => updateSkillsString(cat.id, e.target.value)}
            className="text-xs bg-white h-8"
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCategory}
        className="w-full text-xs"
        leftIcon={<Plus className="w-3.5 h-3.5" />}
      >
        Add Skill Category
      </Button>
    </div>
  );
}
