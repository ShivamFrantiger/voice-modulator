"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Status =
  | "idle"
  | "ready"
  | "calling"
  | "connected"
  | "ended"
  | "error";

interface StatusInfo {
  pending: boolean;
  clientNumber?: string;
  activeCalls?: number;
  expiresInMs?: number;
}

export default function DialerPage() {
  const [clientNumber, setClientNumber] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [serverInfo, setServerInfo] = useState<StatusInfo | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll server status ──────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/prepare-call");
      if (!res.ok) return;
      const data: StatusInfo = await res.json();
      setServerInfo(data);

      if (data.activeCalls && data.activeCalls > 0 && status === "ready") {
        setStatus("calling");
        setMessage("Client is ringing…");
      }
      if (data.activeCalls === 0 && status === "connected") {
        setStatus("ended");
        setMessage("Call ended.");
        stopTimer();
      }
    } catch {}
  }, [status]);

  useEffect(() => {
    pollRef.current = setInterval(pollStatus, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollStatus]);

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
  const handlePrepare = async () => {
    if (!clientNumber.trim()) {
      setMessage("Please enter a client phone number.");
      return;
    }
    setStatus("calling");
    setMessage("Registering…");
    try {
      const res = await fetch("/api/prepare-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber: clientNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to register.");
        return;
      }
      setStatus("ready");
      setMessage("Ready! Now dial the Plivo number from your phone.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the voice server.");
    }
  };

  const handleCancel = async () => {
    try {
      await fetch("/api/prepare-call", { method: "DELETE" });
    } catch {}
    setStatus("idle");
    setMessage("");
    stopTimer();
  };

  const handleMarkConnected = () => {
    setStatus("connected");
    setMessage("Call active — your voice is being modulated.");
    startTimer();
  };

  const handleReset = () => {
    setStatus("idle");
    setMessage("");
    setClientNumber("");
    setElapsed(0);
    stopTimer();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const statusColors: Record<Status, string> = {
    idle:      "text-zinc-400",
    ready:     "text-amber-400",
    calling:   "text-sky-400",
    connected: "text-emerald-400",
    ended:     "text-zinc-400",
    error:     "text-rose-400",
  };

  const statusDots: Record<Status, string> = {
    idle:      "bg-zinc-600",
    ready:     "bg-amber-400 animate-pulse",
    calling:   "bg-sky-400 animate-pulse",
    connected: "bg-emerald-400",
    ended:     "bg-zinc-600",
    error:     "bg-rose-500",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6 font-sans">

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-sky-700/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Voice Modulator
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Outbound Dialer
          </h1>
          <p className="mt-2 text-zinc-500 text-sm">
            Register a client number, then dial the Plivo line from your phone.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`w-2 h-2 rounded-full ${statusDots[status]}`} />
            <span className={`text-sm font-medium ${statusColors[status]}`}>
              {status === "idle"      && "Idle — enter a number to begin"}
              {status === "ready"     && "Ready — dial the Plivo number now"}
              {status === "calling"   && "Initiating call…"}
              {status === "connected" && `Connected · ${formatTime(elapsed)}`}
              {status === "ended"     && "Call ended"}
              {status === "error"     && "Error"}
            </span>
            {serverInfo && (
              <span className="ml-auto text-xs text-zinc-600">
                {serverInfo.activeCalls ?? 0} active
              </span>
            )}
          </div>

          {/* Phone input */}
          {(status === "idle" || status === "error") && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  Client Phone Number
                </label>
                <input
                  id="client-number-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={clientNumber}
                  onChange={(e) => setClientNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePrepare()}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>

              {message && (
                <p className="text-xs text-rose-400">{message}</p>
              )}

              <button
                id="prepare-call-btn"
                onClick={handlePrepare}
                disabled={!clientNumber.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-violet-900/30"
              >
                Prepare Call
              </button>
            </div>
          )}

          {/* Ready state */}
          {status === "ready" && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <p className="text-amber-300 text-sm font-medium mb-1">
                  📞 Dial the Plivo number now
                </p>
                <p className="text-zinc-400 text-xs">
                  Calling: <span className="text-white font-mono">{clientNumber}</span>
                </p>
              </div>

              <p className="text-xs text-zinc-500 text-center">{message}</p>

              <div className="flex gap-3">
                <button
                  id="mark-connected-btn"
                  onClick={handleMarkConnected}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 text-sm font-medium transition-all"
                >
                  Mark Connected
                </button>
                <button
                  id="cancel-ready-btn"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Connected state */}
          {status === "connected" && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-sm font-semibold">Call Active</span>
                </div>
                <p className="text-3xl font-mono font-bold text-white">{formatTime(elapsed)}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  Client: <span className="text-zinc-300 font-mono">{clientNumber}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-center text-zinc-500">
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-emerald-400 font-medium mb-0.5">Your voice</div>
                  <div>Modulated → Client</div>
                </div>
                <div className="bg-white/[0.04] rounded-lg p-3">
                  <div className="text-sky-400 font-medium mb-0.5">Client voice</div>
                  <div>Raw → You</div>
                </div>
              </div>

              <button
                id="end-call-btn"
                onClick={handleCancel}
                className="w-full py-3 rounded-xl bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 text-rose-300 text-sm font-semibold transition-all"
              >
                End Call
              </button>
            </div>
          )}

          {/* Ended state */}
          {(status === "ended") && (
            <div className="space-y-4 text-center">
              <p className="text-zinc-400 text-sm">{message || "Call ended."}</p>
              <button
                id="new-call-btn"
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-semibold text-sm transition-all"
              >
                New Call
              </button>
            </div>
          )}
        </div>

        {/* Flow diagram */}
        <div className="mt-6 flex items-center justify-center gap-1 text-[10px] text-zinc-600 flex-wrap">
          <span className="text-zinc-400">Your Phone</span>
          <span>→</span>
          <span>Plivo</span>
          <span>→</span>
          <span>Server</span>
          <span>→</span>
          <span>ElevenLabs S2S</span>
          <span>→</span>
          <span className="text-zinc-400">Client Phone</span>
        </div>
      </div>
    </div>
  );
}
