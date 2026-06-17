export type LogTag =
  | "workflow"
  | "sandbox"
  | "gateway"
  | "connect"
  | "obs"
  | "v0"
  | "info";

export interface LogEntry {
  index: number;
  ts: string;
  tag: LogTag;
  msg: string;
}

export type PrimitiveId = "workflow" | "sandbox" | "gateway" | "connect";

export type PrimitiveState = "idle" | "active";

export type StepName = "research" | "brief" | "copy" | "v0 build" | "outreach";

export type StepState = "pending" | "running" | "done" | "interrupted";

export type RunState =
  | "idle"
  | "running"
  | "interrupted"
  | "resuming"
  | "done";

export interface LogEffect {
  activatePrimitive?: PrimitiveId;
  deactivatePrimitive?: PrimitiveId;
  stepTransition?: { step: StepName; state: StepState };
  primitiveStatUpdate?: { primitive: PrimitiveId; value: string };
  openFile?: string;
  showKillButton?: boolean;
}

export interface OutputCard {
  label: string;
  color: string;
  icon: string;
}

export interface TreeNode {
  type: "file" | "folder";
  name: string;
  depth: number;
  id?: string;
  badge?: "M" | "active" | "new";
}
