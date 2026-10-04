"use client";

import React from "react";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeProjectItem } from "@/lib/resume/types";

export interface ProjectsEditorProps {
  items: ResumeProjectItem[];
  onChange: (items: ResumeProjectItem[]) => void;
}

export function ProjectsEditor({ items, onChange }: ProjectsEditorProps) {
  const addItem = () => {
    const newItem: ResumeProjectItem = {
      id: `proj-${Date.now()}`,
      title: "",
      description: "",
      techStack: [],
      liveUrl: "",
      repoUrl: "",
      bullets: [],
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ResumeProjectItem,
    value: unknown,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const updateTechStack = (id: string, text: string) => {
    const list = text.split(",").map((t) => t.trim());
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, techStack: list } : item,
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
              <FolderKanban className="w-3.5 h-3.5 text-neutral-600" />
              <span>Project {idx + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
              aria-label="Remove project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <Input
            label="Project Title"
            placeholder="Enterprise RAG Assistant"
            value={item.title}
            onChange={(e) => updateItem(item.id, "title", e.target.value)}
            className="bg-white text-xs h-9"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Live Demo URL"
              placeholder="https://demo.com"
              value={item.liveUrl || ""}
              onChange={(e) => updateItem(item.id, "liveUrl", e.target.value)}
              className="bg-white text-xs h-9"
            />
            <Input
              label="GitHub Repository URL"
              placeholder="https://github.com/user/repo"
              value={item.repoUrl || ""}
              onChange={(e) => updateItem(item.id, "repoUrl", e.target.value)}
              className="bg-white text-xs h-9"
            />
          </div>

          <Input
            label="Tech Stack (Comma-separated)"
            placeholder="Next.js, Python, LangChain, FastAPI"
            value={item.techStack.join(", ")}
            onChange={(e) => updateTechStack(item.id, e.target.value)}
            className="bg-white text-xs h-9"
          />

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
              Project Bullets / Key Features (One per line)
            </label>
            <textarea
              rows={3}
              value={item.bullets.join("\n")}
              onChange={(e) => updateBullets(item.id, e.target.value)}
              placeholder="• Engineered real-time document search...&#10;• Reduced latency by 45%..."
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
        Add Featured Project
      </Button>
    </div>
  );
}
