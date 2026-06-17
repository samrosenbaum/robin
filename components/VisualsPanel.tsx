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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--text3)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>▲</div>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Edit the prompt on the right and hit <strong>Run agent</strong>.
          The sandbox, v0 preview, and outreach drafts will appear here as
          the agent works.
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 11,
            color: "var(--text3)",
            opacity: 0.7,
          }}
        >
          Switch to the <strong>Code</strong> view in the header to inspect
          the agent's source files.
        </p>
      </div>
    </div>
  );
}
