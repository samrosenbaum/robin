---
description: Patterns for identifying a company's tech stack from their homepage HTML and response headers. Load before research_company.
---

# Skill: Stack detection from a homepage

When you have the homepage HTML and response headers, here's what to look
for and what each signal means.

## Response headers (most reliable)

| Header                    | Tells you                                          |
| ------------------------- | -------------------------------------------------- |
| `x-vercel-id`             | They're on Vercel. Stop guessing.                  |
| `x-vercel-cache: HIT/MISS`| They're on Vercel's edge cache.                    |
| `x-powered-by: Next.js`   | Next.js, likely on Vercel or self-hosted.          |
| `server: cloudflare`      | Sitting behind Cloudflare (could still be on AWS). |
| `cf-ray:` present         | Cloudflare proxy.                                  |
| `x-amz-cf-id:`            | CloudFront → AWS hosting.                          |
| `server: Netlify`         | Netlify hosted.                                    |
| `server: Fly`             | Fly.io hosted.                                     |

## HTML body signals

- `<meta name="generator" content="Next.js">` → Next.js
- `_next/static/` script paths → Next.js (any host)
- `__NEXT_DATA__` script tag → Next.js with SSR/SSG
- `_nuxt/` paths → Nuxt
- `__NUXT__` → Nuxt
- `_app/immutable/` → SvelteKit
- `_remix/` or `__remixContext` → Remix
- `data-react-helmet` → React
- `<div id="__NEXT_DATA__">` is the strongest Next.js tell

## Stack inferences

- **Next.js + x-vercel-id** → "Next.js on Vercel". Lean into deeper primitives.
- **Next.js without Vercel headers** → "Next.js, probably self-hosted on AWS/Render/Fly". Migration story.
- **React without a framework signal** → "Vite or CRA SPA". Probably hosted as a static site.
- **WordPress / Drupal generators** → enterprise content site, edge + ISR pitch.
- **Webflow / Framer in the source** → marketing site, design tool ownership. Less interesting for Vercel pitch.

## What NOT to do

- Don't claim a stack you can't see. If `x-powered-by` is missing and the
  HTML is minimal, say "stack unknown" — the AE can ask the prospect.
- Don't conflate the *front-end* stack with the *back-end* stack. The
  marketing site can be on Webflow while the product is on AWS.
- Don't overweight Cloudflare presence — most large sites use Cloudflare
  as a CDN regardless of origin host.

## Output discipline

Stack signals should be **factual phrases** that came from the HTML, not
inferences. Good:

- `"x-vercel-id present in response headers"`
- `"__NEXT_DATA__ script tag in HTML"`
- `"server: cloudflare"`

Bad:

- `"probably built on Next.js"`
- `"likely uses React"`
- `"modern stack"`

Save inferences for `tailor_pitch`.
