"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  GatewayCall,
  LogEntry,
  OutputCard,
  PrimitiveId,
  PrimitiveState,
  RunEvent,
  RunState,
  SandboxSnapshot,
  StepName,
  StepState,
} from "@/lib/types";
import { createAdapter } from "@/lib/eveAdapter";

/* ---------------- Defaults ---------------- */

const INITIAL_STEPS: Record<StepName, StepState> = {
  research: "pending",
  tailor: "pending",
  generate: "pending",
  verify: "pending",
};

const INITIAL_PRIMS: Record<PrimitiveId, PrimitiveState> = {
  workflow: "idle",
  sandbox: "idle",
  gateway: "idle",
  connect: "idle",
};

const INITIAL_STATS: Record<PrimitiveId, string> = {
  workflow: "",
  sandbox: "",
  gateway: "",
  connect: "",
};

/* ---------------- Context shape ---------------- */

export interface RunContextValue {
  runState: RunState;
  error: string | null;
  runSessionId: string | null;

  logs: LogEntry[];
  steps: Record<StepName, StepState>;
  prims: Record<PrimitiveId, PrimitiveState>;
  primStats: Record<PrimitiveId, string>;
  outputs: OutputCard[];
  runningFile: string | null;

  sandboxActive: boolean;
  sandboxSnapshot: SandboxSnapshot | null;
  previewUrl: string | null;

  elapsedMs: number;
  activeMs: number;

  modelId: string | null;
  gatewayCalls: GatewayCall[];

  // Durability story — visible signals that Workflow caught a failure
  // and the run continued.
  streamCuts: { atEventCount: number; ts: string }[];
  stepRetries: Record<StepName, number>;

  startRun: (prompt: string) => Promise<void>;
  reset: () => void;
}

const RunContext = createContext<RunContextValue | null>(null);

export function useRun(): RunContextValue {
  const v = useContext(RunContext);
  if (!v) throw new Error("useRun must be used inside <RunProvider>");
  return v;
}

/* ---------------- Provider ---------------- */

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [runState, setRunState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [runSessionId, setRunSessionId] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [prims, setPrims] = useState(INITIAL_PRIMS);
  const [primStats, setPrimStats] = useState(INITIAL_STATS);
  const [outputs, setOutputs] = useState<OutputCard[]>([]);
  const [runningFile, setRunningFile] = useState<string | null>(null);

  const [sandboxActive, setSandboxActive] = useState(false);
  const [sandboxSnapshot, setSandboxSnapshot] =
    useState<SandboxSnapshot | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeMs, setActiveMs] = useState(0);

  const [modelId, setModelId] = useState<string | null>(null);
  const [gatewayCalls, setGatewayCalls] = useState<GatewayCall[]>([]);

  const [streamCuts, setStreamCuts] = useState<
    { atEventCount: number; ts: string }[]
  >([]);
  const [stepRetries, setStepRetries] = useState<Record<StepName, number>>({
    research: 0,
    tailor: 0,
    generate: 0,
    verify: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const runStartRef = useRef<number | null>(null);
  const lastEventAtRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setLogs([]);
    setSteps(INITIAL_STEPS);
    setPrims(INITIAL_PRIMS);
    setPrimStats(INITIAL_STATS);
    setOutputs([]);
    setError(null);
    setRunSessionId(null);
    setSandboxActive(false);
    setSandboxSnapshot(null);
    setPreviewUrl(null);
    setRunningFile(null);
    setElapsedMs(0);
    setActiveMs(0);
    setModelId(null);
    setGatewayCalls([]);
    setStreamCuts([]);
    setStepRetries({ research: 0, tailor: 0, generate: 0, verify: 0 });
    runStartRef.current = null;
    lastEventAtRef.current = null;
  }, []);

  // Wall-clock elapsed ticker for the Fluid meter — runs as long as a run
  // is in flight, persists across navigation because the provider is in
  // the root layout.
  useEffect(() => {
    if (runState !== "running") return;
    const id = setInterval(() => {
      if (runStartRef.current) {
        setElapsedMs(Date.now() - runStartRef.current);
      }
    }, 100);
    return () => clearInterval(id);
  }, [runState]);

  function applyEvent(evt: RunEvent) {
    switch (evt.type) {
      case "log":
        setLogs((prev) => [
          ...prev,
          { ts: evt.ts, tag: evt.tag, msg: evt.msg },
        ]);
        return;
      case "step":
        setSteps((prev) => ({ ...prev, [evt.step]: evt.state }));
        return;
      case "primitive":
        setPrims((prev) => ({ ...prev, [evt.id]: evt.state }));
        if (evt.stat !== undefined) {
          setPrimStats((prev) => ({ ...prev, [evt.id]: evt.stat! }));
        }
        return;
      case "file-open":
        // Captured by DemoApp via a side channel — see useFileOpenListener.
        fileOpenListeners.forEach((fn) => fn(evt.file));
        return;
      case "file-running":
        setRunningFile(evt.file);
        return;
      case "sandbox-start":
        setSandboxActive(true);
        setSandboxSnapshot(null);
        return;
      case "sandbox-result":
        setSandboxSnapshot(evt.snapshot);
        return;
      case "gateway-info":
        setModelId(evt.modelId);
        return;
      case "gateway-call":
        setGatewayCalls((prev) => [...prev, evt.call]);
        return;
      case "stream-cut":
        setStreamCuts((prev) => [
          ...prev,
          {
            atEventCount: evt.atEventCount,
            ts: new Date().toISOString().slice(11, 19),
          },
        ]);
        return;
      case "step-retry":
        setStepRetries((prev) => ({
          ...prev,
          [evt.step]: (prev[evt.step] ?? 0) + 1,
        }));
        return;
      case "output":
        setOutputs((prev) => [...prev, evt.output]);
        if (
          evt.output.label?.toLowerCase().includes("preview") &&
          evt.output.href
        ) {
          setPreviewUrl(evt.output.href);
        }
        return;
      case "error":
        setError(evt.msg);
        return;
      case "done":
        return;
    }
  }

  function recordEventActivity() {
    if (!runStartRef.current) return;
    setActiveMs((prev) => prev + 80);
  }

  const startRun = useCallback(
    async (prompt: string) => {
      reset();
      setRunState("running");
      runStartRef.current = Date.now();
      lastEventAtRef.current = Date.now();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const startRes = await fetch("/eve/v1/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
          signal: ac.signal,
        });
        if (!startRes.ok) {
          throw new Error(
            `eve session create failed: ${startRes.status} ${await startRes
              .text()
              .catch(() => "")}`,
          );
        }
        const sessionId =
          startRes.headers.get("x-eve-session-id") ??
          ((await startRes
            .clone()
            .json()
            .catch(() => ({}))) as { sessionId?: string }).sessionId;
        if (!sessionId) throw new Error("no x-eve-session-id returned");

        setRunSessionId(sessionId);

        const adapter = createAdapter({ sessionId });
        let finished = false;
        const MAX_RECONNECTS = 8;
        let reconnects = 0;

        while (!finished) {
          const url = `/eve/v1/session/${sessionId}/stream${
            adapter.state.eventCount > 0
              ? `?startIndex=${adapter.state.eventCount}`
              : ""
          }`;
          const streamRes = await fetch(url, { signal: ac.signal });
          if (!streamRes.ok || !streamRes.body) {
            throw new Error(`eve stream attach failed: ${streamRes.status}`);
          }

          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let receivedAny = false;

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            receivedAny = true;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) >= 0) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line) continue;
              let parsed: unknown;
              try {
                parsed = JSON.parse(line);
              } catch {
                continue;
              }
              recordEventActivity();
              for (const ev of adapter.handle(parsed)) {
                applyEvent(ev);
                if (ev.type === "done") finished = true;
              }
            }
          }

          if (finished) break;
          if (reconnects >= MAX_RECONNECTS) {
            setError(
              `stream closed after ${reconnects} reconnects without session.completed`,
            );
            break;
          }
          reconnects += 1;
          setLogs((prev) => [
            ...prev,
            {
              ts: hhmmss(adapter.state.start),
              tag: "workflow",
              msg: `<span class="warn">⚡ function killed — Workflow resuming from event ${adapter.state.eventCount}</span>`,
            },
          ]);
          // Also surface the cut visually on the WorkflowSteps timeline.
          applyEvent({
            type: "stream-cut",
            atEventCount: adapter.state.eventCount,
          });
          if (!receivedAny) await new Promise((r) => setTimeout(r, 800));
        }
        setRunState("done");
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") {
          setRunState("idle");
        } else {
          setError(e instanceof Error ? e.message : String(e));
          setRunState("done");
        }
      } finally {
        abortRef.current = null;
      }
    },
    [reset],
  );

  const value: RunContextValue = {
    runState,
    error,
    runSessionId,
    logs,
    steps,
    prims,
    primStats,
    outputs,
    runningFile,
    sandboxActive,
    sandboxSnapshot,
    previewUrl,
    elapsedMs,
    activeMs,
    modelId,
    gatewayCalls,
    streamCuts,
    stepRetries,
    startRun,
    reset,
  };

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
}

/* ---------------- File-open side channel ----------------
 * The run emits `file-open` events; the DemoApp wants those to drive its
 * file-viewer tabs, but the file-viewer state stays local to the demo
 * route (no point in keeping it in the global provider). Subscribe here
 * with `useFileOpenListener`.
 */
const fileOpenListeners = new Set<(file: string) => void>();

export function useFileOpenListener(fn: (file: string) => void) {
  useEffect(() => {
    fileOpenListeners.add(fn);
    return () => {
      fileOpenListeners.delete(fn);
    };
  }, [fn]);
}

function hhmmss(start: number): string {
  const sec = Math.floor((Date.now() - start) / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    sec % 60,
  ).padStart(2, "0")}`;
}
