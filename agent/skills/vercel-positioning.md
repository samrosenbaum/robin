---
description: Pick a business outcome first, then choose Vercel primitives that support it. Load before tailor_pitch.
---

# Skill: Vercel positioning — outcomes first

A technical buyer reads with their CTO/CFO/founder hat on. The pitch
leads with a **business outcome** and uses Vercel primitives as
evidence. Never reverse this.

## Step 1 — Pick the outcome

There are six outcomes Vercel can credibly own. Pick exactly one for
the pitch. The rest are noise.

| Outcome | When to pick it | Why Vercel wins it |
| --- | --- | --- |
| **ship-faster** | Iteration speed is their edge. Deploying daily+. Marketing/PM ships without filing eng tickets. | git push → preview URL → prod. v0 closes the design-to-code gap. No CI/CD platform to maintain. |
| **no-devops** | < 20 engineers. No dedicated platform team. They want to hire product engineers, not SREs. | Framework-defined infra means no IAM, no Terraform, no Step Functions. The team you have is the team you keep. |
| **lower-infra-cost** | High I/O-bound spend. LLM-heavy. Lots of external API waits. | Fluid Compute charges active CPU only — not the model wait. AI-heavy workloads see 50%+ cost cuts. |
| **better-dx** | Engineering hiring or retention is a constraint. Stack quality affects recruiting. | Next.js is the most popular React framework. Engineers already know it. Onboarding is one day. |
| **ai-features-faster** | AI-native company. Shipping LLM features is their core motion. | AI Gateway = one API for every model. Sandbox = run AI-generated code safely. v0 = ship UI as fast as you ship logic. |
| **global-performance** | Consumer / commerce / content. p95 latency translates to revenue. | Vercel's edge network + ISR + image optimization. Multi-region by default. |

## Step 2 — Choose three primitives that support the outcome

Each primitive section in the pitch must close by stating *how it advances the chosen outcome*. Examples:

### If the outcome is "ship-faster"
- **v0** — design-to-code in minutes, not sprints. Lead engineers don't bottleneck on UI.
- **Vercel Functions + framework-defined infra** — your code becomes the deploy spec. No infra PR before the feature PR.
- **Preview URLs per PR** — review-on-the-URL replaces review-on-Figma. PMs and marketing self-serve.

### If the outcome is "lower-infra-cost"
- **Fluid Compute** — active-CPU billing. For LLM-heavy workloads, ~50% reduction vs Lambda.
- **AI Gateway** — provider fallback + cost tracking + budget caps in one API.
- **Edge caching** — same payload served once globally, not N times from origin.

### If the outcome is "no-devops"
- **Vercel Functions** — no Lambda + IAM + VPC config. Just deploy.
- **Vercel Workflow** — durable orchestration without Step Functions + DynamoDB + DLQ.
- **AI Gateway** — one API key replaces per-provider rotation logic.

### If the outcome is "ai-features-faster"
- **AI Gateway** — provider switching is one model string. No code change.
- **Vercel Sandbox** — generate code with an LLM; run it safely without building your own isolation.
- **v0** — UI generation at API speed; lets product ship customer-facing AI faster.

### If the outcome is "better-dx"
- **Next.js + framework-defined infra** — code informs infra; no IaC to maintain.
- **Preview URLs** — every PR is a live URL.
- **Observability built in** — traces and runs in the dashboard; no Datadog wiring.

### If the outcome is "global-performance"
- **Edge CDN** — anycast routing, p95 wins for global users.
- **ISR + image optimization** — same UX, less origin traffic.
- **Fluid Compute** — concurrency means edge-adjacent compute scales without cold starts.

## Tone

Each section in the pitch should sound like: *"Here is the primitive. Here is how it concretely advances [outcome]."*

Avoid: *"Vercel offers [primitive] which is [adjective]."*

Avoid pitching the primitive in a vacuum. The buyer doesn't care that Sandbox exists — they care that it lets them ship customer-facing AI features without a platform-engineer hire.
