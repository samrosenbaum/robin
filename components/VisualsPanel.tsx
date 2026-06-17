"use client";

import { SandboxTerminal } from "./SandboxTerminal";
import type { OutputCard, SandboxSnapshot } from "@/lib/types";

interface Props {
  sandboxActive: boolean;
  sandboxSnapshot: SandboxSnapshot | null;
  previewUrl: string | null;
  outputs: OutputCard[];
}

export function VisualsPanel({
  sandboxActive,
  sandboxSnapshot,
  previewUrl,
  outputs,
}: Props) {
  const slack = outputs.find((o) => o.draftKind === "slack");
  const linear = outputs.find((o) => o.draftKind === "linear");
  const hasAnything =
    sandboxActive ||
    sandboxSnapshot ||
    previewUrl ||
    outputs.length > 0;

  if (!hasAnything) {
    return <EmptyState />;
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {(sandboxActive || sandboxSnapshot) && (
          <Section
            label="vercel sandbox"
            color="var(--sandbox)"
            note={
              sandboxSnapshot
                ? `${sandboxSnapshot.totalLines.toLocaleString()} lines · ${(sandboxSnapshot.elapsedMs / 1000).toFixed(1)}s`
                : "running…"
            }
          >
            <SandboxTerminal
              active={sandboxActive}
              snapshot={sandboxSnapshot}
            />
          </Section>
        )}

        {previewUrl && (
          <Section
            label="v0 preview"
            color="var(--v0)"
            action={{ href: previewUrl, label: "open in v0 ↗" }}
          >
            <iframe
              src={previewUrl}
              title="v0 preview"
              style={{
                width: "100%",
                height: 540,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "white",
                display: "block",
              }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </Section>
        )}

        {(slack || linear) && (
          <Section label="outreach drafts" color="var(--connect)">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {slack && <SlackCard card={slack} />}
              {linear && <LinearCard card={linear} />}
            </div>
          </Section>
        )}

        {outputs.length > 0 && (
          <Section label="artifacts shipped" color="var(--success)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {outputs.map((o, i) => (
                <a
                  key={i}
                  href={o.href ?? "#"}
                  target={o.href ? "_blank" : undefined}
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    textDecoration: "none",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: o.color,
                    }}
                  />
                  {o.label}
                  <span style={{ color: "var(--text3)" }}>{o.icon}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  color,
  note,
  action,
  children,
}: {
  label: string;
  color: string;
  note?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--text3)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
        <span style={{ color: "var(--text2)" }}>{label}</span>
        {note && <span style={{ color: "var(--text3)" }}>· {note}</span>}
        {action && (
          <a
            href={action.href}
            target="_blank"
            rel="noreferrer"
            style={{
              marginLeft: "auto",
              color: color,
              textDecoration: "none",
              fontSize: 12,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {action.label}
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

function SlackCard({ card }: { card: OutputCard }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "rgba(34,197,94,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 0.8,
          color: "var(--text2)",
          textTransform: "uppercase",
        }}
      >
        <span>slack · {card.draftTitle}</span>
        <span style={{ color: "var(--text3)" }}>{card.draftMeta}</span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text2)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {card.draftBody}
      </pre>
    </div>
  );
}

function LinearCard({ card }: { card: OutputCard }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          background: "rgba(59,130,246,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 0.8,
          color: "var(--text2)",
          textTransform: "uppercase",
        }}
      >
        <span>linear · {card.draftMeta}</span>
        {card.href && (
          <a
            href={card.href}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "var(--connect)",
              textDecoration: "none",
              textTransform: "none",
              letterSpacing: 0,
              fontSize: 11,
            }}
          >
            open ↗
          </a>
        )}
      </div>
      <div
        style={{
          padding: "12px 14px 4px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--text)",
          fontWeight: 500,
        }}
      >
        {card.draftTitle}
      </div>
      <pre
        style={{
          margin: 0,
          padding: "0 14px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text2)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {card.draftBody}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--bg)",
        padding: "48px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          fontFamily: "var(--font-sans)",
          color: "var(--text)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text2)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--workflow)",
              boxShadow: "0 0 6px var(--workflow)",
            }}
          />
          built with eve
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.5,
            color: "var(--text)",
          }}
        >
          Launch Intelligence
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            color: "var(--text2)",
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 640,
          }}
        >
          An autonomous launch agent — give it a brief, it ships the launch:
          competitor research, copy, a v0-built landing page, and outreach
          drafts for Slack and Linear.
        </p>

        <div
          style={{
            marginTop: 28,
            padding: "16px 18px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface)",
            color: "var(--text2)",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--text3)",
              marginBottom: 8,
            }}
          >
            what is eve?
          </div>
          <a
            href="https://vercel.com/docs/eve"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text)", fontWeight: 500 }}
          >
            Eve
          </a>{" "}
          is Vercel&apos;s filesystem-first framework for durable backend AI
          agents. You author the agent under <code style={mono}>agent/</code> —
          one file per tool, one file per channel, a markdown file for the
          system prompt. Eve discovers, validates, compiles, and serves the
          runtime on Vercel Functions with first-class observability.
        </div>

        <div
          style={{
            marginTop: 28,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--text3)",
            marginBottom: 12,
          }}
        >
          the primitives this agent composes
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {PRIMITIVES.map((p) => (
            <div
              key={p.name}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg, ${p.color}14 0%, transparent 60%)`,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: p.color,
                    boxShadow: `0 0 6px ${p.color}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--text)",
                  }}
                >
                  {p.name}
                </span>
              </div>
              <p
                style={{
                  position: "relative",
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--text2)",
                }}
              >
                {p.summary}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            padding: "14px 16px",
            borderRadius: 10,
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(99,102,241,0.25)",
            color: "var(--text)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <strong>Try it:</strong> edit the prompt on the right (tailor it for
          whichever company you&apos;re demoing) and hit{" "}
          <span style={mono}>Run agent</span>. The sandbox, v0 preview, and
          outreach drafts appear here in real time. Switch to{" "}
          <span style={mono}>Code</span> in the header to inspect the agent
          source.
        </div>
      </div>
    </div>
  );
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  color: "var(--text)",
  background: "var(--surface2)",
  padding: "1px 6px",
  borderRadius: 4,
};

const PRIMITIVES = [
  {
    name: "Vercel Workflow",
    color: "var(--workflow)",
    summary:
      "Persists session state and resumes interrupted work. Every step is a durable checkpoint — sessions survive cold starts, redeploys, and long pauses. The wrun_* ID you see in the right panel is a real Workflow run.",
  },
  {
    name: "Vercel Sandbox",
    color: "var(--sandbox)",
    summary:
      "Isolates code execution in ephemeral Firecracker microVMs. The v0-generated landing page gets written into a sandbox /workspace and verified there before anything touches your infra.",
  },
  {
    name: "AI Gateway",
    color: "var(--gateway)",
    summary:
      "Routes model requests through Vercel's gateway — single API key, provider fallbacks, observable. The agent talks to claude-sonnet-4.6 via gateway model strings, no provider creds in code.",
  },
  {
    name: "Vercel Connect",
    color: "var(--connect)",
    summary:
      "Manages OAuth tokens and API keys for external services. Slack and Linear posting flows would resolve their tokens at runtime via Connect — no long-lived secrets stored in env vars.",
  },
  {
    name: "v0",
    color: "var(--v0)",
    summary:
      "Generates the landing-page component from the copy brief. The chat returns code, the sandbox verifies it, and the demoUrl gets embedded in the preview iframe right here.",
  },
];
