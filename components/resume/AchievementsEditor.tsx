"use client";

import React from "react";
import {
  Plus,
  Trash2,
  Trophy,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeAchievementItem } from "@/lib/resume/types";

export interface AchievementsEditorProps {
  items: ResumeAchievementItem[];
  onChange: (items: ResumeAchievementItem[]) => void;
}

export function AchievementsEditor({
  items,
  onChange,
}: AchievementsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: `ach-${Date.now()}`, title: "", description: "" },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ResumeAchievementItem,
    value: string | undefined,
  ) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900">
              <Trophy className="w-3.5 h-3.5 text-neutral-600" />
              <span>Achievement {index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
              aria-label="Remove achievement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <Input
            label="Achievement Title"
            placeholder="Award, competition, or accomplishment"
            value={item.title}
            onChange={(event) =>
              updateItem(item.id, "title", event.target.value)
            }
            className="bg-white text-xs h-9"
          />

          <Input
            label="Short Description / Detail"
            placeholder="Describe what you achieved"
            value={item.description || ""}
            onChange={(event) =>
              updateItem(item.id, "description", event.target.value)
            }
            className="bg-white text-xs h-9"
          />

          <div className="space-y-2 pt-1 border-t border-neutral-200/60">
            <Input
              label="Proof URL"
              placeholder="https://example.com/award"
              value={item.proofUrl || ""}
              onChange={(event) =>
                updateItem(item.id, "proofUrl", event.target.value)
              }
              className="bg-white text-xs h-9"
              leftIcon={<LinkIcon className="w-3.5 h-3.5 text-neutral-500" />}
            />
            {item.proofUrl && (
              <a
                href={item.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-neutral-700 hover:text-neutral-950 underline"
              >
                <ExternalLink className="w-3 h-3" />
                View proof
              </a>
            )}
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
        Add Achievement
      </Button>
    </div>
  );
}
