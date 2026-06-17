import {
  Hero,
  MarketingPage,
  MarketingSection,
  Stat,
} from "@/components/MarketingPage";

export const metadata = {
  title: "Infrastructure — launch-intelligence",
  description:
    "Why AI-native startups ship on Vercel: framework-defined infra, durable workflows, sandboxed compute, observability built in.",
};

const OUTCOMES = [
  {
    label: "Lower infra cost",
    today: "Pay for cluster capacity 24/7, even when idle.",
    vercel: "Fluid Compute charges for CPU time, not invocations.",
  },
  {
    label: "Ship more often",
    today: "Slack-coordinated weekly deploys; rollbacks are risky.",
    vercel: "Every commit gets a preview URL. Instant rollback.",
  },
  {
    label: "Less platform work",
    today: "Hire a platform engineer to wire AWS services together.",
    vercel: "Framework-defined infra — your code provisions the runtime.",
  },
  {
    label: "Real observability",
    today: "Bolt on CloudWatch + X-Ray + Datadog; pay for each.",
    vercel: "Traces, runs, token usage, vitals — all in the dashboard.",
  },
  {
    label: "AI built in",
    today: "Pick a provider; manage keys, retries, fallbacks per call.",
    vercel: "AI Gateway is one API across providers with budget caps.",
  },
];

const COMPARISON = [
  {
    capability: "Model API across providers",
    vercel: "AI Gateway — one key, fallback built-in, observable",
    aws: "Bedrock for some models + your own provider keys + custom routing",
    cloudflare: "Workers AI (smaller catalog) or BYO provider",
  },
  {
    capability: "Untrusted code execution",
    vercel: "Sandbox.create() — Firecracker microVM in one call",
    aws: "Lambda + custom container + IAM + VPC config",
    cloudflare: "Workers (constrained runtime, no full Node.js)",
  },
  {
    capability: "Durable multi-step agents",
    vercel: "Workflow SDK — 'use workflow', checkpointing, replay",
    aws: "Step Functions + DynamoDB + DLQ + state store + retry logic",
    cloudflare: "Workflows (newer, smaller ecosystem)",
  },
  {
    capability: "External OAuth at runtime",
    vercel: "Connect — getToken('slack')",
    aws: "Secrets Manager + custom rotation Lambda + IAM",
    cloudflare: "Workers KV + custom token rotation",
  },
  {
    capability: "Generated production UI",
    vercel: "v0 — text → React component → deployable URL",
    aws: "—",
    cloudflare: "—",
  },
  {
    capability: "Preview-per-PR + rollback",
    vercel: "git push → preview URL, instant rollback in dashboard",
    aws: "CI/CD config + S3/CloudFront staging + manual cutover",
    cloudflare: "Pages preview deployments (Workers limited)",
  },
];

export default function InfrastructurePage() {
  return (
    <MarketingPage>
      <Hero
        kicker="infrastructure"
        title="Infrastructure for the AI-native startup."
        subtitle="Every cloud has functions and databases. Vercel is the one where AI-generated code can be a first-class deploy target — where durability, isolation, model routing, and observability ship as primitives instead of as a quarter of platform work. This demo is the proof."
        ctas={[
          { href: "/", label: "▶ Run the live demo", primary: true },
          { href: "/harness", label: "← How it's composed" },
        ]}
      />

      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        <Stat value="1 repo" label="entire stack" />
        <Stat value="0 services" label="to wire together" />
        <Stat value="seconds" label="from push to live" />
        <Stat value="primitives" label="instead of glue code" />
      </div>

      <MarketingSection
        number="01"
        kicker="the outcomes"
        title="What your team gets for choosing Vercel."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          {OUTCOMES.map((o) => (
            <div
              key={o.label}
              style={{
                padding: 18,
                borderRadius: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text)",
                  marginBottom: 12,
                }}
              >
                {o.label}
              </div>
              <BeforeAfter today={o.today} vercel={o.vercel} />
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        number="02"
        kicker="framework-defined infrastructure"
        title="Your code provisions the runtime."
      >
        <p style={paragraph}>
          The pattern on every other cloud is{" "}
          <span style={{ color: "var(--text)" }}>describe infra → write code to fit</span>.
          On Vercel it&apos;s inverted:{" "}
          <span style={{ color: "var(--text)" }}>write code → infra follows</span>.
          A Next.js route becomes a Function. A server action becomes an
          endpoint. A directive (<code style={mono}>&apos;use workflow&apos;</code>) makes
          a function durable. There is no separate IaC layer to maintain.
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
          {[
            {
              code: "app/api/run/route.ts",
              infra: "Vercel Function on Fluid Compute",
            },
            {
              code: "withEve(nextConfig) in next.config.ts",
              infra: "/eve/v1/* routes installed; Workflow runtime mounted",
            },
            {
              code: "defineTool({ execute })",
              infra: "Step in a durable Workflow, individually checkpointed",
            },
            {
              code: "ctx.getSandbox()",
              infra: "Ephemeral Firecracker microVM, /workspace mounted",
            },
            {
              code: 'gateway("anthropic/claude-sonnet-4.6")',
              infra: "Model call through AI Gateway with fallback + tracing",
            },
            {
              code: 'getToken("slack")',
              infra: "OAuth token resolved via Connect, scoped per session",
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              <code style={{ ...mono, padding: 0, background: "transparent" }}>
                {row.code}
              </code>
              <span style={{ color: "var(--text2)" }}>→ {row.infra}</span>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        number="03"
        kicker="the comparison"
        title="Vercel vs. AWS vs. Cloudflare, side by side."
      >
        <p style={paragraph}>
          Every primitive listed below has an AWS equivalent. The difference
          is the assembly cost. On Vercel they&apos;re imports. On AWS
          they&apos;re a quarter of platform work and a dedicated hire.
        </p>
        <div
          style={{
            marginTop: 16,
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr 1.3fr 1.1fr",
              gap: 0,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "var(--text3)",
            }}
          >
            <div style={{ padding: "0 16px" }}>capability</div>
            <div style={{ padding: "0 16px" }}>vercel</div>
            <div style={{ padding: "0 16px" }}>aws</div>
            <div style={{ padding: "0 16px" }}>cloudflare</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr 1.3fr 1.1fr",
                gap: 0,
                padding: "14px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  padding: "0 16px",
                  color: "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                {row.capability}
              </div>
              <div style={{ padding: "0 16px", color: "var(--text)" }}>
                {row.vercel}
              </div>
              <div style={{ padding: "0 16px", color: "var(--text3)" }}>
                {row.aws}
              </div>
              <div style={{ padding: "0 16px", color: "var(--text3)" }}>
                {row.cloudflare}
              </div>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        number="04"
        kicker="durability"
        title="Workflow makes long-running agents survive failures."
      >
        <p style={paragraph}>
          AI workloads are long-running by nature — research takes 10s, a v0
          build takes 30s, a tool chain runs for minutes. The function that
          starts a turn rarely finishes it. Vercel Workflow records each
          step to a durable event log so the next invocation replays from
          the last checkpoint. If a function dies, the run survives. If the
          model rate-limits, the wait persists. The client can disconnect
          and reattach with <code style={mono}>?startIndex=N</code>.
        </p>
        <p style={paragraph}>
          On other clouds this is Step Functions, a state store, a retry
          queue, dead-letter handling, and custom event replay logic — a
          dedicated services team. On Vercel it&apos;s the default.
        </p>
      </MarketingSection>

      <MarketingSection
        number="05"
        kicker="isolation"
        title="Sandbox is built for running AI-generated code."
      >
        <p style={paragraph}>
          The new threat model in AI apps: the model writes code, your app
          runs it. Vercel Sandbox spins ephemeral Firecracker microVMs in
          one call — your agent writes the generated files to{" "}
          <code style={mono}>/workspace</code>, runs{" "}
          <code style={mono}>npm install + next build</code>, captures
          stdout, and returns. The compute is isolated; the network policy is
          configurable; the VM is destroyed when the step ends.
        </p>
        <p style={paragraph}>
          This is the difference between a chat app and an agent that ships
          code. AWS Lambda will run a container, but you build the
          orchestration, the workspace plumbing, the network policy, and
          the destroy. Sandbox ships it.
        </p>
      </MarketingSection>

      <MarketingSection
        number="06"
        kicker="shipping"
        title="git push → live URL → real users → rollback."
      >
        <p style={paragraph}>
          Every commit produces a preview deployment with a stable URL.
          Marketing reviews on the URL. PMs sign off on the URL. Promote to
          production with a click; revert with a click. There is no
          staging-vs-prod drift, no &quot;works on my machine,&quot; no waiting
          for a deploy slot. The same workflow handles your agent runtime
          as your marketing site.
        </p>
      </MarketingSection>

      <div
        style={{
          marginTop: 80,
          padding: "28px 32px",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(99,102,241,0.10) 100%)",
          border: "1px solid rgba(16,185,129,0.25)",
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
          Spend your time on the product. Not the plumbing.
        </h2>
        <p
          style={{
            margin: "12px 0 24px",
            fontSize: 15,
            color: "var(--text2)",
            lineHeight: 1.6,
          }}
        >
          Vercel handles the infrastructure that every AI startup ends up
          rebuilding. You build the product your users actually pay for.
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
            href="/harness"
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
            ← How it&apos;s composed
          </a>
        </div>
      </div>
    </MarketingPage>
  );
}

function BeforeAfter({ today, vercel }: { today: string; vercel: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Line label="today" color="var(--text3)" text={today} />
      <Line label="vercel" color="var(--gateway)" text={vercel} />
    </div>
  );
}

function Line({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color,
          padding: "2px 6px",
          borderRadius: 3,
          background: `${color}1a`,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
        {text}
      </span>
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
