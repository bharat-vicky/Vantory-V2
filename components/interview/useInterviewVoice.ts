"use client";
import {useCallback,useEffect,useRef,useState} from "react";

export function useInterviewVoice(sessionId?:string) {
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice,setSelectedVoice]=useState("");
  const [cloudEnabled,setCloudEnabled]=useState(false);
  const [rate,setRate]=useState(1);
  const [status,setStatus]=useState<"idle"|"loading"|"speaking">("idle");
  const [error,setError]=useState("");
  const generation=useRef(0);
  const audio=useRef<HTMLAudioElement|null>(null);
  const request=useRef<AbortController|null>(null);
  const cache=useRef(new Map<string,string>());
  const stop=useCallback(()=>{
    generation.current++; request.current?.abort(); request.current=null;
    if(audio.current) {audio.current.pause();audio.current=null;}
    window.speechSynthesis?.cancel();setStatus("idle");
  },[]);
  useEffect(()=>{
    const synth=window.speechSynthesis;
    const update=()=>setVoices(synth?.getVoices().filter(v=>v.lang.startsWith("en")) || []);
    update();synth?.addEventListener("voiceschanged",update);
    const controller=new AbortController();
    if(sessionId) fetch(`/api/interview/${sessionId}/voice`,{signal:controller.signal}).then(r=>r.ok?r.json():{enabled:false}).then(j=>{setCloudEnabled(j.enabled===true);if(j.enabled===true)setSelectedVoice("cloud:Kore");}).catch(()=>{});
    const urls=cache.current;
    return ()=>{controller.abort();synth?.removeEventListener("voiceschanged",update);stop();urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();};
  },[sessionId,stop]);
  const speak=useCallback(async(question:{id:string;questionText:string})=>{
    stop();setError("");const token=generation.current;
    if(selectedVoice.startsWith("cloud:")) {
      setStatus("loading");
      try {
        const key=`${question.id}:${selectedVoice}`;
        let url=cache.current.get(key);
        if(!url) {
          const controller=new AbortController();request.current=controller;
          const res=await fetch(`/api/interview/${sessionId}/voice`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({questionId:question.id,voice:selectedVoice.slice(6)}),signal:controller.signal});
          if(!res.ok) {const j=await res.json();throw new Error(j.error || "Voice unavailable.");}
          const blob=await res.blob();if(token!==generation.current)return;
          url=URL.createObjectURL(blob);cache.current.set(key,url);
        }
        if(token!==generation.current)return;
        const player=new Audio(url);audio.current=player;player.playbackRate=rate;
        player.onended=()=>{if(token===generation.current)setStatus("idle");};
        player.onerror=()=>{if(token===generation.current){setStatus("idle");setError("Audio could not play. Try a device voice.");}};
        await player.play();if(token===generation.current)setStatus("speaking");
      } catch(e) {if(token===generation.current){setStatus("idle");setError(e instanceof Error ? e.message : "Voice unavailable. Choose a device voice.");}}
      return;
    }
    if(!window.speechSynthesis) {setError("Audio is unavailable in this browser. The question is shown below.");return;}
    const utterance=new SpeechSynthesisUtterance(question.questionText);
    utterance.voice=voices.find(v=>v.voiceURI===selectedVoice) || voices.find(v=>v.default) || voices[0] || null;
    utterance.lang=utterance.voice?.lang || "en-US";utterance.rate=rate;
    utterance.onstart=()=>{if(token===generation.current)setStatus("speaking");};
    utterance.onend=()=>{if(token===generation.current)setStatus("idle");};
    utterance.onerror=()=>{if(token===generation.current){setStatus("idle");setError("Audio paused. Click Play question to try again.");}};
    window.speechSynthesis.speak(utterance);
  },[selectedVoice,rate,voices,sessionId,stop]);
  return {voices,selectedVoice,setSelectedVoice,cloudEnabled,rate,setRate,status,error,speak,stop};
}
