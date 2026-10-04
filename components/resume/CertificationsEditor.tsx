"use client";

import React from "react";
import {
  Plus,
  Trash2,
  Award,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResumeCertificationItem } from "@/lib/resume/types";

export interface CertificationsEditorProps {
  items: ResumeCertificationItem[];
  onChange: (items: ResumeCertificationItem[]) => void;
}

export function CertificationsEditor({
  items,
  onChange,
}: CertificationsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: `cert-${Date.now()}`, name: "", issuer: "", issueDate: "" },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    field: keyof ResumeCertificationItem,
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
              <Award className="w-3.5 h-3.5 text-neutral-600" />
              <span>Certification {index + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors"
              aria-label="Remove certification"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Certification Name"
              placeholder="e.g. Cloud Practitioner Certification"
              value={item.name}
              onChange={(event) =>
                updateItem(item.id, "name", event.target.value)
              }
              className="bg-white text-xs h-9"
            />
            <Input
              label="Issuing Organization"
              placeholder="Organization name"
              value={item.issuer}
              onChange={(event) =>
                updateItem(item.id, "issuer", event.target.value)
              }
              className="bg-white text-xs h-9"
            />
          </div>

          <Input
            label="Issue Date"
            placeholder="Month YYYY"
            value={item.issueDate}
            onChange={(event) =>
              updateItem(item.id, "issueDate", event.target.value)
            }
            className="bg-white text-xs h-9"
          />

          <div className="space-y-2 pt-1 border-t border-neutral-200/60">
            <Input
              label="Credential Verification URL"
              placeholder="https://example.com/credential"
              value={item.credentialUrl || ""}
              onChange={(event) =>
                updateItem(item.id, "credentialUrl", event.target.value)
              }
              className="bg-white text-xs h-9"
              leftIcon={<LinkIcon className="w-3.5 h-3.5 text-neutral-500" />}
            />
            {item.credentialUrl && (
              <a
                href={item.credentialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-neutral-700 hover:text-neutral-950 underline"
              >
                <ExternalLink className="w-3 h-3" />
                Verify credential
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
        Add Certification
      </Button>
    </div>
  );
}
