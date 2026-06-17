---
description: Which Vercel primitive maps onto which kind of company. Load before tailor_pitch to choose the right three primitives to emphasize.
---

# Skill: Vercel primitive → company-type fit

When tailoring a pitch, pick the **three** Vercel primitives most
relevant to the company in front of you. Below is the matching rubric.

## By company type

### AI-native company (model wrappers, agents, code-gen, search)

Lean into:
1. **AI Gateway** — they're already paying provider sprawl for Anthropic + OpenAI + others. Gateway = one key, fallback, observable.
2. **Vercel Sandbox** — they're either generating code, running customer code, or both. Sandbox is the only Firecracker-as-a-service primitive.
3. **Vercel Workflow** — agent runs are long. Workflow makes them durable for free.

### B2B SaaS (CRM, project management, billing, internal tools)

Lean into:
1. **Fluid Compute** — I/O-bound workloads (DB queries, third-party APIs) waste money on Lambda. Fluid only bills active CPU.
2. **Vercel Workflow** — multi-step processes (payments, onboarding, exports) are fragile on cron + DLQ. Workflow makes them resumable.
3. **v0** — internal admin/dashboard UI generation. Most B2B teams under-invest in their own UI; v0 closes that gap.

### Consumer / content / commerce

Lean into:
1. **Edge / CDN** — global anycast, ISR, image optimization. Self-hosted PHP or Rails apps see 5-10x latency wins.
2. **Fluid Compute** — high-concurrency reads benefit from in-function concurrency more than anything else.
3. **v0** — landing pages, campaign pages, A/B variants. Marketing teams ship without engineering tickets.

### Developer tools / infra (their customers are engineers)

Lean into:
1. **AI Gateway** — they almost certainly want to add AI features and don't want provider lock-in.
2. **Vercel Workflow** — anything that orchestrates customer code (CI, deploys, builds) needs durability.
3. **Vercel Functions + Fluid** — the baseline of "fast, framework-defined infra" lands hardest with this audience.

### Already on Vercel

Switch the pitch from "move to Vercel" to "use the primitives you haven't touched yet."

1. **Vercel Sandbox** (most teams haven't tried it)
2. **Vercel Workflow** (most teams default to Inngest/Trigger)
3. **AI Gateway** (most teams still call Anthropic/OpenAI directly)

## Migration angle

If they're on AWS or Cloudflare, name the pain explicitly:

- **AWS:** "Lambda + Step Functions + Secrets Manager + Bedrock + CloudWatch + DevOps hire" → "five primitives, one Git repo, no DevOps hire."
- **Cloudflare:** Workers' constrained runtime can't run npm install or long-form Node. Vercel can.

## What to avoid

- Don't pitch **Vercel Connect** unless the company specifically needs cross-service OAuth flows (Slack, Linear, Salesforce, etc.). Otherwise it sounds like undifferentiated secrets management.
- Don't pitch all five primitives. Three is the limit — anything more and the pitch loses focus.
- Don't pitch primitives the company already obviously owns (e.g., don't pitch "Edge CDN" to a Cloudflare native — they have a CDN).
