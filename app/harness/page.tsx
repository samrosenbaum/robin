import {
  Hero,
  MarketingPage,
  MarketingSection,
  PrimitiveCard,
  Stat,
} from "@/components/MarketingPage";

export const metadata = {
  title: "Harness — launch-intelligence",
  description:
    "How a single Eve harness composes five Vercel primitives into a production-grade AI agent.",
};

const PRIMITIVES = [
  {
    name: "Vercel Workflow",
    color: "var(--workflow)",
    description:
      "Durable execution. Every tool call is a checkpoint; sessions survive cold starts, redeploys, and long pauses.",
    detail: "wrun_* run IDs are real Workflow runs you can replay.",
  },
  {
    name: "Vercel Sandbox",
    color: "var(--sandbox)",
    description:
      "Sandboxed compute. AI-generated code runs in ephemeral microVMs, isolated from your app runtime.",
    detail: "Firecracker microVMs · node22 · /workspace mount",
  },
  {
    name: "AI Gateway",
    color: "var(--gateway)",
    description:
      "One model API across providers with automatic fallbacks and cost tracking.",
    detail: 'gateway("anthropic/claude-sonnet-4.6") — no provider keys in code',
  },
  {
    name: "Vercel Connect",
    color: "var(--connect)",
    description:
      "Managed OAuth tokens and API keys for the external services the agent talks to.",
    detail: "Resolved at runtime, scoped per session, rotated automatically.",
  },
  {
    name: "v0",
    color: "var(--v0)",
    description:
      "Generate production UI from a prompt. The output gets verified in the Sandbox before users see it.",
    detail: "v0.chats.create({ message }) → demoUrl",
  },
];

const FILES = [
  { path: "agent/agent.ts", desc: "defineAgent — model, options, compaction" },
  {
    path: "agent/instructions.md",
    desc: "Always-on system prompt; markdown is the source",
  },
  {
    path: "agent/tools/*.ts",
    desc: "One file per tool. Filename = name the model sees.",
  },
  {
    path: "agent/channels/eve.ts",
    desc: "HTTP entry; auth chain (none / oidc / Auth.js / Clerk)",
  },
  {
    path: "agent/sandbox/sandbox.ts",
    desc: "Sandbox backend config; defaults to Vercel in prod",
  },
  {
    path: "next.config.ts",
    desc: "withEve(nextConfig) — installs /eve/v1/* routes",
  },
];

export default function HarnessPage() {
  return (
    <MarketingPage>
      <Hero
        kicker="harness"
        title="One harness. Many agents."
        subtitle="The unglamorous parts of running an agent in production — durable state, sandboxed code execution, OAuth, model fallbacks, observability — are the same for every agent you'll ever build. Vercel ships them as primitives and Eve composes them into a single harness. Define what your agent does; everything else carries over."
        ctas={[
          { href: "/", label: "▶ Run the live demo", primary: true },
          { href: "/infrastructure", label: "Why on Vercel →" },
        ]}
      />

      <div
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        <Stat value="5" label="primitives composed" />
        <Stat value="5" label="tools defined" />
        <Stat value="~10" label="files in agent/" />
        <Stat value="1" label="next.js repo" />
      </div>

      <MarketingSection
        number="01"
        kicker="the point-solution trap"
        title="Every new AI feature shouldn't be a from-scratch project."
      >
        <p style={paragraph}>
          The familiar pattern: one team builds a chatbot. Another builds an
          internal copilot. A third builds an outbound research agent. Each
          re-implements the same plumbing — model calls, retries, state
          persistence, token management, sandboxing, logging — and nothing
          carries over to the next agent.
        </p>
        <p style={paragraph}>
          The harness flips that. Build the foundation once: shared model
          gateway, shared sandbox runtime, shared state model, shared
          observability. Then every new agent is a folder of tools and a
          markdown prompt — not a new infrastructure project.
        </p>
      </MarketingSection>

      <MarketingSection
        number="02"
        kicker="the primitives"
        title="Five things that Vercel ships in the box."
      >
        <p style={paragraph}>
          The harness is a composition of these five. No assembly, no glue
          services, no IAM rules to write.
        </p>
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {PRIMITIVES.map((p) => (
            <PrimitiveCard key={p.name} {...p} />
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        number="03"
        kicker="anatomy"
        title="Grounded in code, not abstractions."
      >
        <p style={paragraph}>
          The harness is whatever exists under{" "}
          <code style={mono}>agent/</code>. Eve discovers, validates, and
          compiles those files into a deployable Next.js app. Add a tool by
          adding a file. Change the model by editing one line.
        </p>
        <div
          style={{
            marginTop: 24,
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {FILES.map((f, i) => (
            <div
              key={f.path}
              style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 16,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              <code style={{ ...mono, padding: 0, background: "transparent" }}>
                {f.path}
              </code>
              <span style={{ color: "var(--text2)" }}>{f.desc}</span>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        number="04"
        kicker="how it runs"
        title="Build → Run → Govern."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Stage
            label="Build"
            color="var(--workflow)"
            heading="Author files."
            body={
              <>
                Tools, channels, instructions, sandbox config — all live in
                the repo. Code review applies. Versioning applies.
                No separate "agent platform" to learn.
              </>
            }
          />
          <Stage
            label="Run"
            color="var(--sandbox)"
            heading="Execute durably."
            body={
              <>
                Vercel Workflow runs the agent on Vercel Functions. Every
                tool call checkpoints to a Workflow event log. If a function
                dies mid-run, the next invocation resumes from the last
                checkpoint.
              </>
            }
          />
          <Stage
            label="Govern"
            color="var(--gateway)"
            heading="Trace and gate."
            body={
              <>
                Every model call, tool call, and step is traced
                automatically — visible in the Vercel Observability
                dashboard. Sensitive tools can require human approval before
                execution.
              </>
            }
          />
        </div>
      </MarketingSection>

      <MarketingSection
        number="05"
        kicker="the comparison"
        title="What this looks like without a harness."
      >
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <ComparePanel
            label="Without — every agent is a new project"
            color="var(--danger)"
            items={[
              "Pick a model provider, manage keys per env",
              "Build retry + fallback logic per tool",
              "Stand up Step Functions or temporal cluster",
              "Write a sandboxing layer (ECS task per call)",
              "Wire OAuth flows per integration",
              "Bolt on CloudWatch + X-Ray for observability",
              "Ship in months",
            ]}
          />
          <ComparePanel
            label="With — five primitives, one repo"
            color="var(--success)"
            items={[
              "AI Gateway: one API, provider fallback built-in",
              "Workflow SDK: 'use workflow' + checkpoints",
              "Sandbox: ctx.getSandbox() returns a microVM",
              "Connect: getToken('slack') resolves OAuth",
              "Observability auto-attached to every step",
              "withEve(nextConfig) installs the runtime",
              "Ship in a day",
            ]}
          />
        </div>
      </MarketingSection>

      <div
        style={{
          marginTop: 80,
          padding: "28px 32px",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.10) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
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
          the commitment
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: -0.4,
            color: "var(--text)",
          }}
        >
          Build what your agent does. Not how it runs.
        </h2>
        <p
          style={{
            margin: "12px 0 24px",
            fontSize: 15,
            color: "var(--text2)",
            lineHeight: 1.6,
          }}
        >
          You bring the prompt, the tools, the personality. Vercel brings the
          durability, isolation, gateway, OAuth, and observability.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/"
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--text)",
              color: "var(--bg)",
              textDecoration: "none",
            }}
          >
            ▶ Run the live demo
          </a>
          <a
            href="/infrastructure"
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              textDecoration: "none",
            }}
          >
            Why on Vercel →
          </a>
        </div>
      </div>
    </MarketingPage>
  );
}

function Stage({
  label,
  color,
  heading,
  body,
}: {
  label: string;
  color: string;
  heading: string;
  body: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 10,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 8px",
          borderRadius: 999,
          background: `${color}22`,
          color: color,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          color: "var(--text)",
          marginBottom: 8,
        }}
      >
        {heading}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--text2)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function ComparePanel({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: string[];
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 10,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: 0.4,
          color: color,
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {items.map((it, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              color: "var(--text2)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color, marginTop: 2 }}>—</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 16,
  lineHeight: 1.65,
  color: "var(--text2)",
  maxWidth: 760,
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  color: "var(--text)",
  background: "var(--surface2)",
  padding: "1px 6px",
  borderRadius: 4,
};
