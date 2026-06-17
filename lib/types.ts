export type LogTag =
  | "workflow"
  | "sandbox"
  | "gateway"
  | "connect"
  | "obs"
  | "v0"
  | "info";

export interface LogEntry {
  ts: string;
  tag: LogTag;
  msg: string;
}

export type PrimitiveId = "workflow" | "sandbox" | "gateway" | "connect";

export type PrimitiveState = "idle" | "active" | "done";

export type StepName = "research" | "tailor" | "generate" | "verify";

export type StepState = "pending" | "running" | "done" | "interrupted";

export type RunState =
  | "idle"
  | "running"
  | "interrupted"
  | "resuming"
  | "done";

export interface OutputCard {
  label: string;
  color: string;
  icon: string;
  href?: string;
  // Optional rich payload for full draft rendering (post_to_slack /
  // open_linear_ticket).
  draftKind?: "slack" | "linear";
  draftTitle?: string;
  draftBody?: string;
  draftMeta?: string;
}

export interface TreeNode {
  type: "file" | "folder";
  name: string;
  depth: number;
  id?: string;
  badge?: "M" | "active" | "new";
}

// ----- Streaming event protocol from /api/run -----

export interface SandboxSnapshot {
  id: string;
  command: string;
  stdout: string;
  files: string[];
  totalLines: number;
  elapsedMs: number;
}

export type RunEvent =
  | { type: "log"; ts: string; tag: LogTag; msg: string }
  | { type: "step"; step: StepName; state: StepState }
  | {
      type: "primitive";
      id: PrimitiveId;
      state: PrimitiveState;
      stat?: string;
    }
  | { type: "file-open"; file: string }
  | { type: "file-running"; file: string | null }
  | { type: "sandbox-start" }
  | { type: "sandbox-result"; snapshot: SandboxSnapshot }
  | { type: "output"; output: OutputCard }
  | { type: "done" }
  | { type: "error"; msg: string };
