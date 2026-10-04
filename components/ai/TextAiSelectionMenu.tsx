"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Send,
  Check,
  Copy,
  RefreshCw,
  X,
  ArrowRight,
  Bot,
  MessageSquare,
} from "lucide-react";
import { ResumeData } from "@/lib/resume/types";
import { replaceUniqueResumeText } from "@/lib/resume/text-replacement";

export interface TextAiSelectionMenuProps {
  resumeData: ResumeData;
  onUpdateResume: (updated: ResumeData) => void;
}

export function TextAiSelectionMenu({
  resumeData,
  onUpdateResume,
}: TextAiSelectionMenuProps) {
  const [selectedText, setSelectedText] = useState("");
  const [sectionContext, setSectionContext] = useState("Resume Content");
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedText, setEnhancedText] = useState("");
  const [alternativeText, setAlternativeText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [appliedOption, setAppliedOption] = useState<
    "primary" | "alternative" | null
  >(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detect section context automatically
  const detectSectionName = (
    node: Node | null,
    activeEl: Element | null,
  ): string => {
    if (activeEl) {
      const container = activeEl.closest("[data-section]");
      if (container) {
        const secAttr = container.getAttribute("data-section");
        if (secAttr) return secAttr;
      }
      const label = activeEl
        .closest(".space-y-1, .space-y-2")
        ?.querySelector("label, h3, h4");
      if (label && label.textContent) {
        return label.textContent.trim();
      }
    }

    if (node) {
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;
      if (element) {
        const section = element.closest("section");
        if (section) {
          const heading = section.querySelector("h2");
          if (heading && heading.textContent) {
            return heading.textContent.trim();
          }
        }
      }
    }

    return "Resume Content";
  };

  // Monitor text selection across preview elements AND input/textarea fields
  const handleSelection = useCallback(() => {
    if (isOpen) return;

    const activeEl = document.activeElement as
      | HTMLTextAreaElement
      | HTMLInputElement
      | null;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT") &&
      typeof activeEl.selectionStart === "number" &&
      typeof activeEl.selectionEnd === "number"
    ) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      if (end - start >= 3) {
        const text = activeEl.value.substring(start, end).trim();
        if (text.length >= 3) {
          const rect = activeEl.getBoundingClientRect();
          const detectedSection = detectSectionName(null, activeEl);
          setSelectedText(text);
          setSectionContext(detectedSection);
          setMenuPosition({
            top: Math.max(10, rect.top - 40),
            left: Math.min(window.innerWidth - 150, rect.left + 140),
          });
          return;
        }
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setMenuPosition(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setMenuPosition(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        setMenuPosition(null);
        return;
      }

      const detectedSection = detectSectionName(range.startContainer, null);
      setSelectedText(text);
      setSectionContext(detectedSection);
      setMenuPosition({
        top: Math.max(10, rect.top - 38),
        left: Math.min(window.innerWidth - 150, rect.right + 10),
      });
    } catch {
      setMenuPosition(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      setTimeout(handleSelection, 20);
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  const handleSendChat = async (promptText?: string) => {
    setIsLoading(true);
    setError("");
    setAppliedOption(null);

    const instruction = promptText || customPrompt;

    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          sectionContext,
          mode: instruction.trim() ? "custom" : "enhance",
          customInstruction: instruction,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to generate AI options.");
      }

      setEnhancedText(json.enhancedText || "");
      setAlternativeText(json.alternativeText || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAiModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setMenuPosition(null);
    handleSendChat();
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEnhancedText("");
    setAlternativeText("");
    setError("");
    setCustomPrompt("");
    setAppliedOption(null);
  };

  const handleCopy = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Replace occurrences of selected text in resume state
  const handleApplyReplacement = (
    textToApply: string,
    optionType: "primary" | "alternative",
  ) => {
    if (!selectedText || !textToApply) return;

    const original = selectedText.trim();
    const replacement = textToApply.trim();
    if (replacement === original) {
      setError(
        "The suggested text is unchanged. Choose another option or edit the suggestion.",
      );
      return;
    }

    const result = replaceUniqueResumeText(resumeData, original, replacement);
    if (!result.resumeData) {
      setError(
        result.matchCount === 0
          ? "The selected text is no longer in your resume. Nothing was changed."
          : "That text appears more than once. Select a more specific phrase before applying it.",
      );
      return;
    }

    setError("");
    onUpdateResume(result.resumeData);
    setAppliedOption(optionType);
    setTimeout(() => {
      handleCloseModal();
    }, 1000);
  };

  return (
    <>
      {/* Floating Selection Trigger Badge positioned right next to selected text */}
      {menuPosition && !isOpen && (
        <div
          ref={menuRef}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
          className="fixed z-[99999] transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-auto"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenAiModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 text-white text-xs font-sans font-semibold rounded-full shadow-2xl border border-neutral-700 hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Chat AI with words</span>
          </button>
        </div>
      )}

      {/* AI Interactive Chat Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs overflow-y-auto p-4 sm:p-6 custom-scrollbar"
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
        >
          <div className="min-h-full flex items-start justify-center py-6 sm:py-12">
            <div className="bg-white border border-neutral-300 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden font-sans text-neutral-900 animate-in fade-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-950">
                        AI Resume Assistant
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-medium">
                        {sectionContext}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Ask AI to customize or rewrite selected words
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-neutral-400 hover:text-neutral-950 p-1 rounded-md hover:bg-neutral-200/50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Selected Words Box */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                    Selected Words ({sectionContext})
                  </label>
                  <div className="p-3 bg-neutral-50 rounded-xl text-xs font-serif text-neutral-800 border border-neutral-200 italic">
                    &ldquo;{selectedText}&rdquo;
                  </div>
                </div>

                {/* Chat Input Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-neutral-500" />
                    <span>Chat / Prompt AI about these words</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSendChat();
                        }
                      }}
                      placeholder="e.g. 'Make it shorter', 'Add metrics', 'Focus on Full-Stack & Generative AI'..."
                      className="flex-1 text-xs px-3.5 py-2.5 border border-neutral-300 rounded-xl bg-white focus:outline-none focus:border-neutral-950 shadow-xs"
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={isLoading}
                      className="px-4 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>

                {/* AI Generated Options */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <span>AI Generated Options</span>
                      {isLoading && (
                        <RefreshCw className="w-3 h-3 animate-spin text-neutral-950" />
                      )}
                    </label>

                    {enhancedText && (
                      <button
                        onClick={() => handleCopy(enhancedText)}
                        className="text-xs text-neutral-500 hover:text-neutral-950 flex items-center gap-1 cursor-pointer"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{isCopied ? "Copied!" : "Copy"}</span>
                      </button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-mono text-neutral-600">
                      <RefreshCw className="w-5 h-5 animate-spin text-neutral-950" />
                      <span>AI is processing your selected words...</span>
                    </div>
                  ) : error ? (
                    <div className="p-3.5 bg-neutral-100 border border-neutral-300 text-neutral-900 rounded-xl text-xs font-mono">
                      {error}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Option 1 */}
                      {enhancedText && (
                        <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-950">
                              ✨ Option 1 (Recommended)
                            </span>
                            <button
                              onClick={() =>
                                handleApplyReplacement(enhancedText, "primary")
                              }
                              className="px-3 py-1.5 bg-neutral-950 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              {appliedOption === "primary" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Applied!</span>
                                </>
                              ) : (
                                <>
                                  <span>Apply Option 1</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs font-serif leading-relaxed text-neutral-950 font-medium">
                            {enhancedText}
                          </p>
                        </div>
                      )}

                      {/* Option 2 */}
                      {alternativeText && (
                        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600">
                              ⚡ Option 2 (Alternative)
                            </span>
                            <button
                              onClick={() =>
                                handleApplyReplacement(
                                  alternativeText,
                                  "alternative",
                                )
                              }
                              className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-950 text-xs font-semibold rounded-lg hover:bg-neutral-100 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              {appliedOption === "alternative" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Applied!</span>
                                </>
                              ) : (
                                <>
                                  <span>Apply Option 2</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs font-serif leading-relaxed text-neutral-800">
                            {alternativeText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end px-6 py-3.5 border-t border-neutral-200 bg-neutral-50">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
