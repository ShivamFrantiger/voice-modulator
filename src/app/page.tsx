"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Status =
  | "idle"
  | "ready"
  | "calling"
  | "connected"
  | "ended"
  | "error";

type EngineType = "elevenlabs" | "sarvam";

interface StatusInfo {
  pending: boolean;
  clientNumber?: string;
  activeCalls?: number;
  expiresInMs?: number;
  engine?: string;
  currentEngine?: string;
}

export default function DialerPage() {
  const [callerNumber, setCallerNumber] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<EngineType>("elevenlabs");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [serverInfo, setServerInfo] = useState<StatusInfo | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved caller number and engine on client mount
  useEffect(() => {
    const saved = localStorage.getItem("guruji_caller_number");
    if (saved) setCallerNumber(saved);

    const savedEngine = localStorage.getItem("guruji_voice_engine") as EngineType | null;
    if (savedEngine === "elevenlabs" || savedEngine === "sarvam") {
      setSelectedEngine(savedEngine);
    } else {
      // Fetch server default if no local preference
      fetch("/api/engine")
        .then((r) => r.json())
        .then((data) => {
          if (data.currentEngine === "elevenlabs" || data.currentEngine === "sarvam") {
            setSelectedEngine(data.currentEngine);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleEngineChange = (engine: EngineType) => {
    setSelectedEngine(engine);
    localStorage.setItem("guruji_voice_engine", engine);
  };

  const handleCallerChange = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.startsWith("91") && clean.length > 10) clean = clean.slice(2);
    if (clean.startsWith("0")) clean = clean.replace(/^0+/, "");
    const formatted = clean.slice(0, 10);
    setCallerNumber(formatted);
    localStorage.setItem("guruji_caller_number", formatted);
  };

  // ── Poll server status ──────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const url = callerNumber 
        ? `/api/prepare-call?callerNumber=${encodeURIComponent("+91" + callerNumber)}`
        : "/api/prepare-call";
      const res = await fetch(url);
      if (!res.ok) return;
      const data: StatusInfo = await res.json();
      setServerInfo(data);

      if (data.activeCalls && data.activeCalls > 0 && status === "ready") {
        setStatus("calling");
        setMessage("Recipient phone is ringing…");
      }
      if (data.activeCalls === 0 && status === "connected") {
        setStatus("ended");
        setMessage("Divine connection completed.");
        stopTimer();
      }
    } catch {}
  }, [status, callerNumber]);

  useEffect(() => {
    pollRef.current = setInterval(pollStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollStatus]);

  // ── Audio Sample toggle ──────────────────────────────────────────────────────
  const toggleAudioSample = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/guruji15.mp3");
      audioRef.current.onended = () => setIsPlayingSample(false);
    }

    if (isPlayingSample) {
      audioRef.current.pause();
      setIsPlayingSample(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingSample(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // ── Timer helpers ───────────────────────────────────────────────────────────
  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const PLIVO_NUMBER = "+918031906171";

  const handlePrepare = async () => {
    const rawCaller = callerNumber.replace(/\D/g, "");
    const rawClient = clientNumber.replace(/\D/g, "");

    if (!rawCaller) {
      setMessage("Please enter your valid caller phone number.");
      return;
    }
    if (!rawClient) {
      setMessage("Please enter a valid recipient phone number.");
      return;
    }

    const fullCallerNumber = `+91${rawCaller}`;
    const fullClientNumber = `+91${rawClient}`;

    setStatus("calling");
    setMessage(`Registering caller & recipient (${selectedEngine === "elevenlabs" ? "ElevenLabs S2S" : "Sarvam AI"})…`);
    try {
      const res = await fetch("/api/prepare-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientNumber: fullClientNumber,
          callerNumber: fullCallerNumber,
          engine:       selectedEngine,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to register call.");
        return;
      }
      setStatus("ready");
      setMessage("Registered! Opening phone dialer for divine call…");

      // Redirect to phone dialer app with Plivo number pre-loaded
      window.location.href = `tel:${PLIVO_NUMBER}`;
    } catch {
      setStatus("error");
      setMessage("Could not reach the divine voice server.");
    }
  };

  const handleEndCall = async () => {
    setMessage("Ending divine call connection…");
    try {
      await fetch("/api/end-call", { method: "POST" });
    } catch {}
    setStatus("ended");
    setMessage("Call completed in peace & grace.");
    stopTimer();
  };

  const handleMarkConnected = () => {
    setStatus("connected");
    setMessage("Vani Active — speaking in Guruji's serene voice.");
    startTimer();
  };

  const handleReset = () => {
    setStatus("idle");
    setMessage("");
    setClientNumber("");
    setElapsed(0);
    stopTimer();
  };

  // ── Render Helpers ──────────────────────────────────────────────────────────
  const statusColors: Record<Status, string> = {
    idle:      "text-amber-200/70",
    ready:     "text-amber-400 font-semibold",
    calling:   "text-sky-300 font-semibold",
    connected: "text-emerald-400 font-bold",
    ended:     "text-amber-200/70",
    error:     "text-rose-400 font-semibold",
  };

  const statusDots: Record<Status, string> = {
    idle:      "bg-amber-500/40 border border-amber-400/50",
    ready:     "bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)]",
    calling:   "bg-sky-400 animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.8)]",
    connected: "bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.9)]",
    ended:     "bg-stone-500",
    error:     "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]",
  };

  return (
    <div className="min-h-screen bg-[#090713] text-amber-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">

      {/* Sacred Halo Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-amber-600/15 via-orange-600/10 to-transparent rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-gradient-to-t from-indigo-900/20 via-amber-700/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md z-10 space-y-6">

        {/* Spiritual Branding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <span className="text-amber-400 text-sm">ॐ</span>
            <span>Guruji Real-Time Voice Transformation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-amber-100 via-amber-300 to-orange-200 bg-clip-text text-transparent drop-shadow-sm">
            Guruji Vani
          </h1>

          <p className="text-amber-200/70 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
            Transform your spoken words into the serene, revered voice of Guruji in real-time.
          </p>

          {/* Peaceful Banner */}
          <div className="pt-1">
            <span className="text-[11px] font-serif italic text-amber-300/80 bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">
              “Speak with calm, spread peace and wisdom.”
            </span>
          </div>
        </div>

        {/* Main Sacred Card */}
        <div className="bg-[#131024]/80 border border-amber-500/20 rounded-3xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.06)] backdrop-blur-xl transition-all">

          {/* Status Indicator Bar */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-amber-500/15">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${statusDots[status]}`} />
              <span className={`text-xs sm:text-sm ${statusColors[status]}`}>
                {status === "idle"      && "Ready — enter mobile numbers"}
                {status === "ready"     && "Primed — dial Plivo line now"}
                {status === "calling"   && "Initiating sacred connection…"}
                {status === "connected" && `Vani Active · ${formatTime(elapsed)}`}
                {status === "ended"     && "Call completed in peace"}
                {status === "error"     && "Connection error"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300/80 border border-amber-500/15 font-mono uppercase">
                {selectedEngine === "elevenlabs" ? "ElevenLabs" : "Sarvam"}
              </span>
              {serverInfo && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300/80 border border-amber-500/15">
                  {serverInfo.activeCalls ?? 0} active
                </span>
              )}
            </div>
          </div>

          {/* ── IDLE / ERROR STATE ───────────────────────────────────────────────── */}
          {(status === "idle" || status === "error") && (
            <div className="space-y-5">
              {/* Voice Modulation Engine Selector */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-amber-200/80 font-medium tracking-wide">
                    Modulation AI Engine
                  </label>
                  <span className="text-[10px] text-amber-400/70 font-mono">
                    {selectedEngine === "elevenlabs" ? "Speech-to-Speech" : "Saaras STT + Bulbul TTS"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#0d0a1a] rounded-2xl border border-amber-500/20 shadow-inner">
                  <button
                    id="engine-elevenlabs-btn"
                    type="button"
                    onClick={() => handleEngineChange("elevenlabs")}
                    className={`relative p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
                      selectedEngine === "elevenlabs"
                        ? "bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-transparent border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-100"
                        : "bg-transparent border border-transparent text-amber-200/50 hover:text-amber-200/80 hover:bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold tracking-wide">ElevenLabs</span>
                      {selectedEngine === "elevenlabs" ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                      ) : (
                        <span className="text-[10px] text-amber-500/40">Select</span>
                      )}
                    </div>
                    <span className="text-[10px] leading-tight text-amber-200/70">
                      Real-time S2S · tone preservation
                    </span>
                  </button>

                  <button
                    id="engine-sarvam-btn"
                    type="button"
                    onClick={() => handleEngineChange("sarvam")}
                    className={`relative p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
                      selectedEngine === "sarvam"
                        ? "bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-transparent border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-100"
                        : "bg-transparent border border-transparent text-amber-200/50 hover:text-amber-200/80 hover:bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold tracking-wide">Sarvam AI</span>
                      {selectedEngine === "sarvam" ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                      ) : (
                        <span className="text-[10px] text-amber-500/40">Select</span>
                      )}
                    </div>
                    <span className="text-[10px] leading-tight text-amber-200/70">
                      Indic languages · Hindi accents
                    </span>
                  </button>
                </div>
              </div>

              {/* Your Phone Number (Caller) */}
              <div>
                <label className="block text-xs text-amber-200/80 mb-2 font-medium tracking-wide flex justify-between items-center">
                  <span>Your Mobile Number (Caller)</span>
                  <span className="text-[10px] text-amber-400/60 font-normal">Auto-saved</span>
                </label>
                <div className="flex rounded-2xl overflow-hidden border border-amber-500/30 bg-[#0d0a1a] focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all shadow-inner">
                  <span className="inline-flex items-center px-4 bg-amber-500/15 text-amber-300 font-semibold text-sm border-r border-amber-500/20 select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    id="caller-number-input"
                    type="tel"
                    placeholder="Your 10-digit mobile number"
                    maxLength={10}
                    value={callerNumber}
                    onChange={(e) => handleCallerChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePrepare()}
                    className="w-full bg-transparent px-4 py-3.5 text-amber-100 placeholder-amber-900/60 text-sm focus:outline-none font-mono tracking-wider"
                  />
                </div>
              </div>

              {/* Recipient Phone Number */}
              <div>
                <label className="block text-xs text-amber-200/80 mb-2 font-medium tracking-wide">
                  Recipient / Devotee Mobile Number
                </label>
                <div className="flex rounded-2xl overflow-hidden border border-amber-500/30 bg-[#0d0a1a] focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all shadow-inner">
                  <span className="inline-flex items-center px-4 bg-amber-500/15 text-amber-300 font-semibold text-sm border-r border-amber-500/20 select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    id="client-number-input"
                    type="tel"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={clientNumber}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (val.startsWith("91") && val.length > 10) val = val.slice(2);
                      if (val.startsWith("0")) val = val.replace(/^0+/, "");
                      setClientNumber(val.slice(0, 10));
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handlePrepare()}
                    className="w-full bg-transparent px-4 py-3.5 text-amber-100 placeholder-amber-900/60 text-sm focus:outline-none font-mono tracking-wider"
                  />
                </div>
              </div>

              {message && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 text-center">
                  {message}
                </p>
              )}

              {/* Guruji Sample Voice Player */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleAudioSample}
                    className="w-9 h-9 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center transition-all border border-amber-500/40 active:scale-95"
                    title="Listen to Guruji's Voice Sample"
                  >
                    {isPlayingSample ? (
                      <span className="text-xs font-bold">❚❚</span>
                    ) : (
                      <span className="text-xs ml-0.5">▶</span>
                    )}
                  </button>
                  <div>
                    <div className="text-xs font-semibold text-amber-200">Guruji Voice Sample</div>
                    <div className="text-[10px] text-amber-300/60">
                      {isPlayingSample ? "Playing audio..." : "Tap to preview voice"}
                    </div>
                  </div>
                </div>

                {/* Animated Waveform indicator */}
                {isPlayingSample && (
                  <div className="flex items-center gap-0.5 h-4">
                    <span className="w-1 bg-amber-400 h-full animate-bounce rounded-full" />
                    <span className="w-1 bg-amber-300 h-2/3 animate-bounce delay-75 rounded-full" />
                    <span className="w-1 bg-amber-500 h-5/6 animate-bounce delay-150 rounded-full" />
                  </div>
                )}
              </div>

              <button
                id="prepare-call-btn"
                onClick={handlePrepare}
                disabled={!clientNumber.trim() || !callerNumber.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-stone-950 text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
              >
                <span>✨ Initiate Guruji Voice Call</span>
              </button>
            </div>
          )}

          {/* ── CALLING / RINGING STATE ─────────────────────────────────────────── */}
          {status === "calling" && (
            <div className="space-y-5">
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-sky-500/5 animate-pulse" />
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                  <span className="text-sky-300 text-sm font-semibold">
                    {message || "Initiating divine connection…"}
                  </span>
                </div>
                <p className="relative z-10 text-xs text-amber-200/70">
                  Ringing Recipient: <span className="text-white font-mono font-semibold">+91 {clientNumber}</span>
                </p>
                <p className="relative z-10 text-[10px] text-amber-300/60 font-mono">
                  Engine: {selectedEngine === "elevenlabs" ? "ElevenLabs S2S" : "Sarvam AI"}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  id="mark-connected-calling-btn"
                  onClick={handleMarkConnected}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs sm:text-sm font-semibold transition-all"
                >
                  Mark Connected
                </button>
                <button
                  id="end-call-calling-btn"
                  onClick={handleEndCall}
                  className="flex-1 py-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs sm:text-sm font-semibold transition-all"
                >
                  End Call
                </button>
              </div>
            </div>
          )}

          {/* ── READY STATE ─────────────────────────────────────────────────────── */}
          {status === "ready" && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center space-y-3">
                <div className="text-amber-300 text-sm font-semibold flex items-center justify-center gap-2">
                  <span className="text-lg">📞</span>
                  <span>Dial Plivo Line Now</span>
                </div>
                <p className="text-amber-200/70 text-xs">
                  Registered Recipient: <span className="text-amber-100 font-mono font-semibold">+91 {clientNumber}</span>
                </p>
                <div className="text-[11px] text-amber-300/70 bg-amber-500/10 py-1 px-3 rounded-lg inline-block border border-amber-500/15 font-mono">
                  Modulation: {selectedEngine === "elevenlabs" ? "ElevenLabs S2S" : "Sarvam AI"}
                </div>
                
                <a
                  href={`tel:${PLIVO_NUMBER}`}
                  className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98]"
                >
                  <span>📞 Call Plivo Line ({PLIVO_NUMBER})</span>
                </a>
              </div>

              <p className="text-xs text-amber-300/60 text-center">{message}</p>

              <div className="flex gap-3">
                <button
                  id="mark-connected-btn"
                  onClick={handleMarkConnected}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 text-xs sm:text-sm font-semibold transition-all"
                >
                  Mark Connected
                </button>
                <button
                  id="cancel-ready-btn"
                  onClick={handleEndCall}
                  className="flex-1 py-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs sm:text-sm font-semibold transition-all"
                >
                  Cancel Call
                </button>
              </div>
            </div>
          )}

          {/* ── CONNECTED STATE ─────────────────────────────────────────────────── */}
          {status === "connected" && (
            <div className="space-y-5">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
                {/* Aura Pulse Ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 rounded-full bg-emerald-500/10 animate-ping" />
                </div>

                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-sm font-bold tracking-wide">
                    Guruji Voice Active ({selectedEngine === "elevenlabs" ? "ElevenLabs S2S" : "Sarvam AI"})
                  </span>
                </div>

                <div className="relative z-10 text-4xl font-mono font-extrabold text-amber-200 tracking-wider">
                  {formatTime(elapsed)}
                </div>

                <p className="relative z-10 text-xs text-amber-200/70">
                  Speaking to Recipient: <span className="text-amber-100 font-mono font-semibold">+91 {clientNumber}</span>
                </p>
              </div>

              {/* Real-time Conduit Status */}
              <div className="grid grid-cols-2 gap-3 text-xs text-center">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                  <div className="text-amber-400 font-semibold mb-1">Your Voice</div>
                  <div className="text-amber-200/70">
                    Modulated ➔ Guruji ({selectedEngine === "elevenlabs" ? "ElevenLabs" : "Sarvam"})
                  </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                  <div className="text-sky-400 font-semibold mb-1">Recipient Voice</div>
                  <div className="text-amber-200/70">Raw Audio ➔ You</div>
                </div>
              </div>

              <button
                id="end-call-btn"
                onClick={handleEndCall}
                className="w-full py-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-[0.98]"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>End Divine Call</span>
              </button>
            </div>
          )}

          {/* ── ENDED STATE ─────────────────────────────────────────────────────── */}
          {status === "ended" && (
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center mx-auto text-xl">
                🙏
              </div>
              <div>
                <h3 className="text-amber-200 font-bold text-base">Call Completed in Grace</h3>
                <p className="text-amber-200/60 text-xs mt-1">{message || "The divine voice session has ended."}</p>
              </div>
              <button
                id="new-call-btn"
                onClick={handleReset}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 font-bold text-stone-950 text-sm transition-all shadow-lg shadow-amber-900/30 active:scale-[0.98]"
              >
                Initiate New Guruji Call
              </button>
            </div>
          )}
        </div>

        {/* Sacred Flow Diagram Footer */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center gap-1.5 text-[11px] text-amber-300/50 flex-wrap bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10">
            <span className="text-amber-300/80">Your Phone</span>
            <span>➔</span>
            <span>Plivo</span>
            <span>➔</span>
            <span>Voice Server</span>
            <span>➔</span>
            <span className="text-amber-400 font-semibold">
              Guruji {selectedEngine === "elevenlabs" ? "S2S (ElevenLabs)" : "STT+TTS (Sarvam)"}
            </span>
            <span>➔</span>
            <span className="text-amber-300/80">Recipient</span>
          </div>
        </div>

      </div>
    </div>
  );
}
