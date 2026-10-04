"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Volume2,
  Send,
  RotateCcw,
  SkipForward,
  LogOut,
  Bot,
  Clock,
  BarChart2,
  AlertCircle,
  Edit3,
} from "lucide-react";
import { EvaluatedQuestion } from "@/lib/interview/types";

export interface InterviewRoomProps {
  sessionId?: string;
  startedAt?: string;
  durationMinutes?: number;
  initialQuestion: { id: string; questionIndex: number; category: string; questionText: string };
  onAnswerSubmit: (questionId: string, text: string, audioDuration?: number) => Promise<{
    evaluatedQuestion: EvaluatedQuestion;
    nextQuestion?: { id: string; questionIndex: number; category: string; questionText: string; isFollowUp: boolean };
    isInterviewComplete: boolean;
  }>;
  onEndInterview: () => void;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }> & {isFinal:boolean}> }) => void;
  onerror: (err: { error?: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export function InterviewRoom({ sessionId, startedAt, durationMinutes, initialQuestion, onAnswerSubmit, onEndInterview }: InterviewRoomProps) {
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [candidateAnswer, setCandidateAnswer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Voice Recording & Speech Recognition State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string>("");
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number>(initialQuestion.questionIndex);
  const [recentEvaluations, setRecentEvaluations] = useState<EvaluatedQuestion[]>([]);

  const timedEndRequested = useRef(false);
  const recognitionRef = useRef<unknown>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // General Interview Session Timer
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(startedAt ? Math.floor((Date.now()-Date.parse(startedAt))/1000) : (prev)=>prev+1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [startedAt]);

  useEffect(() => {
    try {if (sessionId) setCandidateAnswer(localStorage.getItem(`interview-draft:${sessionId}:${initialQuestion.id}`) || "");} catch {setSpeechError("Local draft storage is unavailable. Keep this tab open until your answer is submitted.");}
  }, [sessionId, initialQuestion.id]);
  useEffect(() => {
    try {if (sessionId) localStorage.setItem(`interview-draft:${sessionId}:${currentQuestion.id}`, candidateAnswer);} catch {setSpeechError("Local draft storage is unavailable. Keep this tab open until your answer is submitted.");}
  }, [sessionId, currentQuestion.id, candidateAnswer]);
  useEffect(() => {
    if (durationMinutes && elapsedSeconds >= durationMinutes*60 && !isSubmitting && !timedEndRequested.current) {timedEndRequested.current=true;onEndInterview();}
  }, [elapsedSeconds, durationMinutes, isSubmitting, onEndInterview]);

  // Web Speech Synthesis (Text-to-Speech replay)
  const speakQuestion = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingQuestion(true);
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Auto-speak new question when question changes
  useEffect(() => {
    if (currentQuestion?.questionText) {
      speakQuestion(currentQuestion.questionText);
    }
  }, [currentQuestion, speakQuestion]);

  // Web Speech API Initialization for Voice Recording
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWin = window as any;
      const SpeechRecognitionCtor = globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition: ISpeechRecognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: { resultIndex: number; results: Array<Array<{ transcript: string }> & {isFinal:boolean}> }) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) transcript += event.results[i][0].transcript + " ";
          }
          if (transcript.trim()) {
            setCandidateAnswer((prev) => {
              if (!prev) return transcript;
              return `${prev} ${transcript}`;
            });
          }
        };

        recognition.onerror = (err: { error?: string }) => {
          console.warn("Speech recognition error:", err);
          setSpeechError("Voice recognition paused or unavailable. You can type your answer directly.");
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSpeechSupported(false);
      }
    }
  }, []);

  useEffect(() => () => {
    (recognitionRef.current as ISpeechRecognition | null)?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  // Voice recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startVoiceRecording = () => {
    setSpeechError("");
    const rec = recognitionRef.current as { start: () => void } | null;
    if (rec) {
      try {
        rec.start();
        setIsRecording(true);
      } catch (err) {
        console.warn("Start mic error:", err);
      }
    } else {
      setSpeechError("Speech recognition not supported in this browser. Please type your answer below.");
    }
  };

  const stopVoiceRecording = () => {
    const rec = recognitionRef.current as { stop: () => void } | null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // Handle silently
      }
    }
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    if (!candidateAnswer.trim() || isSubmitting) return;

    if (isRecording) {
      stopVoiceRecording();
    }

    setIsSubmitting(true);

    try {
      const res = await onAnswerSubmit(currentQuestion.id, candidateAnswer, recordingSeconds);

      try {if (sessionId) localStorage.removeItem(`interview-draft:${sessionId}:${currentQuestion.id}`);} catch {}
      setRecordingSeconds(0);
      setSpeechError("");
      setRecentEvaluations((prev) => [...prev, res.evaluatedQuestion]);

      if (res.isInterviewComplete || !res.nextQuestion) {
        onEndInterview();
      } else {
        setCurrentQuestion(res.nextQuestion);
        setCandidateAnswer("");
        setQuestionCount((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setSpeechError(err instanceof Error ? err.message : "Unable to submit. Your answer is preserved; retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[80vh] bg-[#FAFAFA] text-neutral-950 font-sans p-4 sm:p-6 space-y-6 w-full max-w-6xl mx-auto">
      {/* Top Session Progress Bar */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-neutral-950">PRACTICE INTERVIEW</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-950 text-white">
                Question {questionCount}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              Category: <strong className="text-neutral-900 font-bold">{currentQuestion.category}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl text-neutral-900 font-bold">
            <Clock className="w-3.5 h-3.5 text-neutral-600" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <button
            onClick={onEndInterview}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 bg-white text-neutral-950 border border-neutral-300 rounded-xl text-xs font-mono font-bold hover:bg-neutral-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Area: AI Interviewer Question & Candidate Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* AI Interviewer Avatar & Question Box */}
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  {isSpeakingQuestion && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-950 tracking-tight">AI Technical Recruiter</h3>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                    {isSpeakingQuestion ? "Speaking Question..." : "Listening to Candidate"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => speakQuestion(currentQuestion.questionText)}
                className="p-2 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-mono font-bold border border-neutral-200 cursor-pointer"
                title="Replay Question Audio"
              >
                <Volume2 className="w-4 h-4 text-neutral-950" />
                <span className="hidden sm:inline">Replay Question</span>
              </button>
            </div>

            {/* Question Text Display */}
            <div className="p-5 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">
                QUESTION #{questionCount} • {currentQuestion.category}
              </span>
              <p className="text-base sm:text-lg font-bold text-neutral-950 leading-relaxed font-serif">
                &ldquo;{currentQuestion.questionText}&rdquo;
              </p>
            </div>

            {speechError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{speechError}</span>
              </div>
            )}
          </div>

          {/* Candidate Response Area (Voice + Text Input) */}
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3.5">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-neutral-950" />
                <span>YOUR RESPONSE</span>
              </h3>

              {isSpeechSupported && (
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="px-3.5 py-1.5 bg-neutral-950 text-white rounded-xl text-xs font-mono font-bold hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-white" />
                      <span>Start Voice Recording</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-mono font-bold hover:bg-red-700 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse shadow-xs"
                    >
                      <Square className="w-3.5 h-3.5 text-white fill-white" />
                      <span>Stop Recording ({formatTimer(recordingSeconds)})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Answer Text Area & Live Transcript Editor */}
            <div className="space-y-2">
              <textarea
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                rows={6}
                placeholder={
                  isRecording
                    ? "Listening... Speak your response clearly into your microphone..."
                    : "Type or edit your response here..."
                }
                className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-4 text-neutral-950 font-sans leading-relaxed focus:outline-none focus:border-neutral-950 resize-y shadow-2xs"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>{candidateAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>Voice input is transcribed live above</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCandidateAnswer("")}
                className="px-4 py-2.5 bg-white text-neutral-600 border border-neutral-300 rounded-xl text-xs font-mono font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCandidateAnswer("I would like to pass this question and move to the next topic.")}
                  className="px-4 py-2.5 bg-white text-neutral-800 border border-neutral-300 rounded-xl text-xs font-mono font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!candidateAnswer.trim() || isSubmitting}
                  className="px-6 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <span>Evaluating Response...</span>
                  ) : (
                    <>
                      <span>Submit Answer</span>
                      <Send className="w-3.5 h-3.5 text-white" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Live Progress & Recent Feedback */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 space-y-5 sticky top-24">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-neutral-950" />
              <span>INTERVIEW PROGRESS</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">
                  Questions Answered
                </span>
                <div className="text-2xl font-black text-neutral-950 font-mono">
                  {recentEvaluations.length}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">
                  Current Interview Stage
                </span>
                <div className="font-extrabold text-neutral-950 text-xs">
                  {currentQuestion.category}
                </div>
              </div>
            </div>

            {/* Live Progress Checklist */}
            {recentEvaluations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  RECENT EVALUATIONS
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recentEvaluations.map((ev, idx) => (
                    <div key={idx} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-neutral-950 text-[11px]">Q{ev.questionIndex}: {ev.category}</span>
                        <span className="px-1.5 py-0.5 bg-neutral-950 text-white rounded text-[9px] font-bold">
                          {ev.evaluation?.overallScore}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
