"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useInterviewVoice } from "./useInterviewVoice";
import { AnswerPause } from "@/lib/interview/answer-pause";
import { PASSED_ANSWER } from "@/lib/interview/turns";
import { EvaluatedQuestion } from "@/lib/interview/types";

export interface InterviewRoomProps {
  sessionId?: string;
  startedAt?: string;
  durationMinutes?: number;
  answeredQuestions?: EvaluatedQuestion[];
  initialQuestion: { id: string; questionIndex: number; category: string; questionText: string; isFollowUp?: boolean };
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

export function InterviewRoom({ sessionId, startedAt, durationMinutes, answeredQuestions = [], initialQuestion, onAnswerSubmit, onEndInterview }: InterviewRoomProps) {
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [candidateAnswer, setCandidateAnswer] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Voice Recording & Speech Recognition State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string>("");
  const voice = useInterviewVoice(sessionId);
  const isSpeakingQuestion = voice.status === "speaking";
  const stopAudio = voice.stop;
  const [autoPlay, setAutoPlay] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [handsFree, setHandsFree] = useState(false);
  const handsFreeRef = useRef(false);
  const [pauseSeconds, setPauseSeconds] = useState(6);
  const pauseRef = useRef(6);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const languageRef = useRef("en-IN");
  const silenceTimer = useRef(new AnswerPause());
  const submitTurn = useRef<()=>void>(()=>{});
  const listenTurn = useRef<()=>void>(()=>{});
  const clearSilence = () => silenceTimer.current.clear();
  const pauseConversation = () => {
    handsFreeRef.current=false;setHandsFree(false);clearSilence();
  };
  const [callMode, setCallMode] = useState(true);
  const answerRef = useRef("");
  const submittedRef = useRef(false);
  const recordingRef = useRef(false);
  const submittingRef = useRef(false);
  const recognitionFailed = useRef(false);
  const interimRef = useRef("");
  const stopResolve = useRef<(() => void) | null>(null);
  const setAnswer = (text:string) => { answerRef.current=text;setCandidateAnswer(text); };
  const speakRef = useRef(voice.speak);
  speakRef.current=voice.speak;

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number>(initialQuestion.questionIndex);
  const [recentEvaluations, setRecentEvaluations] = useState<EvaluatedQuestion[]>(answeredQuestions);

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
    try {if (sessionId) setAnswer(localStorage.getItem(`interview-draft:${sessionId}:${initialQuestion.id}`) || "");} catch {setSpeechError("Local draft storage is unavailable. Keep this tab open until your answer is submitted.");}
  }, [sessionId, initialQuestion.id]);
  useEffect(() => {
    try {if (sessionId) localStorage.setItem(`interview-draft:${sessionId}:${currentQuestion.id}`, candidateAnswer);} catch {setSpeechError("Local draft storage is unavailable. Keep this tab open until your answer is submitted.");}
  }, [sessionId, currentQuestion.id, candidateAnswer]);
  useEffect(() => {
    if (durationMinutes && elapsedSeconds >= durationMinutes*60 && !isSubmitting && !timedEndRequested.current) {timedEndRequested.current=true;pauseConversation();stopAudio();(recognitionRef.current as ISpeechRecognition | null)?.stop();onEndInterview();}
  }, [elapsedSeconds, durationMinutes, isSubmitting, onEndInterview]);

  // Playback starts only after an explicit user gesture; stop before each turn.
  useEffect(() => {
    stopAudio();
    if (handsFreeRef.current) void speakRef.current(currentQuestion,()=>{if(handsFreeRef.current)listenTurn.current();});
    else if (autoPlay) void speakRef.current(currentQuestion);
  }, [currentQuestion, autoPlay, stopAudio]);

  // Web Speech API Initialization for Voice Recording
  useEffect(() => {
    submittedRef.current=false;
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWin = window as any;
      const SpeechRecognitionCtor = globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition: ISpeechRecognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageRef.current;

        recognition.onresult = (event: { resultIndex: number; results: Array<Array<{ transcript: string }> & {isFinal:boolean}> }) => {
          if (submittedRef.current) return;
          let transcript = "";
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) transcript += event.results[i][0].transcript + " ";
            else interim += event.results[i][0].transcript + " ";
          }
          if (transcript.trim()) {
            answerRef.current = `${answerRef.current} ${transcript}`.trim();
            setCandidateAnswer(answerRef.current);
          }
          interimRef.current=interim;
          setInterimTranscript(interim);
          clearSilence();
          // Only recognized speech schedules submission. Silence alone never sends an empty answer.
          if(handsFreeRef.current && (transcript.trim() || interim.trim())) {
            silenceTimer.current.heard(transcript+interim,pauseRef.current*1000,()=>{
              if(handsFreeRef.current && recordingRef.current) submitTurn.current();
            });
          }

        };

        recognition.onerror = (err: { error?: string }) => {
          recognitionFailed.current=true;
          pauseConversation();
          setSpeechError(err.error === "not-allowed" ? "Microphone permission was denied. Allow it in your browser, or type your answer." : err.error === "no-speech" ? "No speech was detected. Try again, or type your answer." : "Voice recognition paused or unavailable. Your transcript is preserved; you can type your answer.");
          recordingRef.current=false;
          stopResolve.current?.();stopResolve.current=null;
          setInterimTranscript("");
          setIsRecording(false);
        };

        recognition.onend = () => {
          if(interimRef.current.trim()) {
            setAnswer(`${answerRef.current} ${interimRef.current}`.trim());
            interimRef.current="";recognitionFailed.current=true;
            pauseConversation();
            setSpeechError("Some words were not finalized. Your draft is preserved; review it and submit manually.");
          }
          // An unexpected browser disconnect preserves the draft and requires explicit resume.
          if(handsFreeRef.current && !stopResolve.current) {
            pauseConversation();
            setSpeechError("Microphone connection ended. Your draft is preserved. Resume hands-free or submit it yourself.");
          }
          recordingRef.current=false;
          stopResolve.current?.();stopResolve.current=null;
          setInterimTranscript("");
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSpeechSupported(false);
      }
    }
  }, []);

  useEffect(() => () => {
    handsFreeRef.current=false;clearSilence();
    submittedRef.current=true;
    (recognitionRef.current as ISpeechRecognition | null)?.stop();
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
    if (isSubmitting || recordingRef.current) return;
    voice.stop();
    setSpeechError("");
    const rec = recognitionRef.current as ISpeechRecognition | null;
    if (rec) {
      try {
        submittedRef.current=false;recognitionFailed.current=false;interimRef.current="";
        rec.lang=languageRef.current;
        rec.start();
        recordingRef.current=true;
        setIsRecording(true);
      } catch {
        pauseConversation();
        setSpeechError("Microphone could not start. Check browser permission or type your answer.");
      }
    } else {
      pauseConversation();
      setSpeechError("Speech recognition not supported in this browser. Please type your answer below.");
    }
  };

  listenTurn.current=startVoiceRecording;

  const stopVoiceRecording = () => {
    clearSilence();
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
    if (submittingRef.current || submittedRef.current) return;
    submittingRef.current=true;
    clearSilence();
    setIsSubmitting(true);
    voice.stop();
    // Recognition may emit the final words only after stop(). Wait for onend.
    if (recordingRef.current) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {recognitionFailed.current=true;stopResolve.current=null;resolve();}, 2000);
        stopResolve.current=()=>{clearTimeout(timeout);resolve();};
        stopVoiceRecording();
      });
    }
    if(recognitionFailed.current) {
      pauseConversation();recognitionFailed.current=false;
      setSpeechError("Recognition did not finish cleanly. Your draft is preserved; review it and submit manually.");
      submittingRef.current=false;setIsSubmitting(false);return;
    }
    if (!answerRef.current.trim()) {pauseConversation();setSpeechError("No final transcript was received. Please try again or type your answer.");submittingRef.current=false;setIsSubmitting(false);return;}
    submittedRef.current=true;

    try {
      const res = await onAnswerSubmit(currentQuestion.id, answerRef.current, recordingSeconds || undefined);

      try {if (sessionId) localStorage.removeItem(`interview-draft:${sessionId}:${currentQuestion.id}`);} catch {}
      setRecordingSeconds(0);
      setSpeechError("");
      setRecentEvaluations((prev) => [...prev, res.evaluatedQuestion]);

      if (res.isInterviewComplete || !res.nextQuestion) {
        pauseConversation();onEndInterview();
      } else {
        setCurrentQuestion(res.nextQuestion);
        setAnswer("");
        setQuestionCount((prev) => prev + 1);
      }
    } catch (err: unknown) {
      pauseConversation();
      setSpeechError(err instanceof Error ? err.message : "Unable to submit. Your answer is preserved; retry.");
    } finally {
      submittedRef.current=false;submittingRef.current=false;
      setIsSubmitting(false);
    }
  };

  submitTurn.current=()=>{void handleSubmit();};
  useEffect(()=>{
    if(voice.error && handsFreeRef.current) pauseConversation();
  },[voice.error]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){pauseConversation();stopAudio();(recognitionRef.current as ISpeechRecognition | null)?.stop();}};
    document.addEventListener("visibilitychange",hidden);
    return ()=>document.removeEventListener("visibilitychange",hidden);
  },[stopAudio]);
  const startConversation = () => {
    if(isSubmitting || recordingRef.current) return;
    handsFreeRef.current=true;setHandsFree(true);setAutoPlay(false);setSpeechError("");
    // A recovered or edited draft must be reviewed rather than silently sent.
    if(answerRef.current.trim()) startVoiceRecording();
    else void speakRef.current(currentQuestion,()=>{if(handsFreeRef.current)listenTurn.current();});
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
            onClick={() => {pauseConversation();voice.stop();stopVoiceRecording();onEndInterview();}}
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
                  <h3 className="text-sm font-black text-neutral-950 tracking-tight">AI Practice Interviewer</h3>
                  <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                    {isSubmitting ? "Considering your answer…" : voice.status === "loading" ? "Preparing natural audio…" : isSpeakingQuestion ? "Interviewer speaking" : isRecording ? "Microphone on · your turn" : "Your turn · microphone off"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting || isRecording}
                onClick={() => {pauseConversation();void voice.speak(currentQuestion);}}
                className="p-2 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-mono font-bold border border-neutral-200 cursor-pointer"
                title="Replay Question Audio"
              >
                <Volume2 className="w-4 h-4 text-neutral-950" />
                <span className="hidden sm:inline">Play question</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p>AI interview practice. Only answer content is assessed; your accent and voice are not scored.</p>
              <div className="flex flex-wrap gap-3 items-end">
                <label className="space-y-1">Interviewer voice
                  <select aria-label="Interviewer voice" value={voice.selectedVoice} onChange={e=>{pauseConversation();voice.stop();stopVoiceRecording();voice.setSelectedVoice(e.target.value);}} className="block border rounded-lg p-2 max-w-64">
                    <option value="">Device default</option>
                    {voice.cloudEnabled && <optgroup label="Natural Gemini voices"><option value="cloud:Kore">Kore</option><option value="cloud:Aoede">Aoede</option><option value="cloud:Charon">Charon</option></optgroup>}
                    {voice.voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                  </select>
                </label>
                <label>Speaking pace<select aria-label="Speaking pace" value={voice.rate} onChange={e=>{pauseConversation();voice.stop();stopVoiceRecording();voice.setRate(Number(e.target.value));}} className="block border rounded-lg p-2"><option value="0.85">Slower</option><option value="1">Normal</option><option value="1.15">Faster</option></select></label>
                <button type="button" onClick={()=>{pauseConversation();voice.stop();stopVoiceRecording();}} disabled={voice.status==="idle"} className="border rounded-lg p-2 disabled:opacity-40">Stop audio</button>
              </div>
              <div className="rounded-xl border p-3 space-y-2">
                <button type="button" disabled={isSubmitting || !isSpeechSupported} onClick={()=>{if(handsFree){pauseConversation();voice.stop();stopVoiceRecording();}else startConversation();}} className="rounded-lg bg-neutral-950 text-white px-3 py-2 disabled:opacity-40">{handsFree ? "Pause hands-free" : "Start hands-free"}</button>
                <p>Hands-free reads each question, then opens your microphone. After recognized speech pauses, your transcript is submitted automatically. Use headphones to prevent echo. Pause to review or edit; switching tabs pauses the conversation.</p>
                <label>Answer pause<select aria-label="Answer pause" disabled={handsFree || isRecording} value={pauseSeconds} onChange={e=>{const n=Number(e.target.value);pauseRef.current=n;setPauseSeconds(n);}} className="border rounded p-2 ml-2"><option value="4">4 seconds</option><option value="6">6 seconds</option><option value="10">10 seconds</option></select></label>
                <label className="block">Recognition language<select aria-label="Recognition language" disabled={handsFree || isRecording} value={speechLanguage} onChange={e=>{languageRef.current=e.target.value;setSpeechLanguage(e.target.value);}} className="border rounded p-2 ml-2"><option value="en-IN">English (India)</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select></label>
                {handsFree && <p role="status">Hands-free active · answers send after {pauseSeconds} seconds without recognized words.</p>}
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" disabled={handsFree} checked={autoPlay} onChange={e=>setAutoPlay(e.target.checked)}/> Play each new question automatically</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={callMode} onChange={e=>setCallMode(e.target.checked)}/> Interview call mode · save feedback until the report</label>
              <p className="text-neutral-500">{voice.selectedVoice.startsWith("cloud:") ? "Natural AI voice via Google. Questions are sent for speech generation. Audio replays are reused in this tab." : "Device voice quality depends on your browser. Select a natural Gemini voice for more conversational speech when available."}</p>
              {voice.error && <p role="alert" className="text-amber-900">{voice.error}</p>}
            </div>
            {/* Question Text Display */}
            <div className="p-5 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">
                {currentQuestion.isFollowUp ? "FOLLOW-UP" : "QUESTION"} #{questionCount} • {currentQuestion.category}
              </span>
              <p aria-live="polite" className="text-base sm:text-lg font-bold text-neutral-950 leading-relaxed font-serif">
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
                      disabled={isSubmitting}
                      onClick={startVoiceRecording}
                      className="px-3.5 py-1.5 bg-neutral-950 text-white rounded-xl text-xs font-mono font-bold hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-white" />
                      <span>Speak answer</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={()=>{pauseConversation();stopVoiceRecording();}}
                      className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-mono font-bold hover:bg-red-700 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse shadow-xs"
                    >
                      <Square className="w-3.5 h-3.5 text-white fill-white" />
                      <span>Stop microphone ({formatTimer(recordingSeconds)})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Answer Text Area & Live Transcript Editor */}
            <div className="space-y-2">
              <textarea
                value={candidateAnswer}
                aria-label="Your answer"
                disabled={isSubmitting}
                maxLength={12000}
                onChange={(e) => {if(handsFreeRef.current){pauseConversation();stopVoiceRecording();}setAnswer(e.target.value);}}
                rows={6}
                placeholder={
                  isRecording
                    ? "Listening... Speak your response clearly into your microphone..."
                    : "Type or edit your response here..."
                }
                className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-4 text-neutral-950 font-sans leading-relaxed focus:outline-none focus:border-neutral-950 resize-y shadow-2xs"
              />

              {interimTranscript && <p role="status" className="text-sm text-neutral-500">Hearing: {interimTranscript}</p>}
              <p className="text-xs text-neutral-500">{!isSpeechSupported && "Voice input is unavailable in this browser. You can type your answer. "}Microphone starts when you choose Speak answer, or after question playback in hands-free mode. Your browser may use its speech service to transcribe audio. Vantory saves the submitted transcript, not a microphone recording. Review it before submitting.</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>{candidateAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>Voice input is transcribed live above</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting || isRecording}
                onClick={() => setAnswer("")}
                className="px-4 py-2.5 bg-white text-neutral-600 border border-neutral-300 rounded-xl text-xs font-mono font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting || isRecording}
                  onClick={() => {setAnswer(PASSED_ANSWER);void handleSubmit();}}
                  className="px-4 py-2.5 bg-white text-neutral-800 border border-neutral-300 rounded-xl text-xs font-mono font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={(!candidateAnswer.trim() && !isRecording) || isSubmitting}
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
            {!callMode && recentEvaluations.length > 0 && (
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
