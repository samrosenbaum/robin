---
description: Slack Block Kit patterns for launch announcements. Load when calling post_to_slack so the message renders richly instead of as a wall of text.
---

# Skill: Slack Block Kit for launch announcements

Use this skill when posting to Slack via the `post_to_slack` tool. A
plain-text Slack message is fine for a heads-up; a launch announcement
needs structure.

## The minimum viable launch message

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "🚀 v2 pricing page" } },
    { "type": "section", "text": { "type": "mrkdwn", "text": "*Headline:* Pricing that scales with your eng team, not against it" } },
    { "type": "section", "text": { "type": "mrkdwn", "text": "*Preview:* <https://demo.vercel.app|v0.dev/r/...>" } },
    { "type": "actions", "elements": [
      { "type": "button", "text": { "type": "plain_text", "text": "Open preview" }, "url": "https://demo.vercel.app", "style": "primary" },
      { "type": "button", "text": { "type": "plain_text", "text": "Review in Linear" }, "url": "https://linear.app/.../ENG-2847" }
    ]}
  ]
}
```

## Rules

- **Always link, never paste** raw URLs. Use `<url|label>` mrkdwn syntax.
- **Header block first.** Slack collapses long messages — the header
  always shows.
- **Actions block last.** Buttons go at the bottom; readers expect the
  CTA after they've seen the content.
- **Keep total blocks ≤ 8.** Beyond that Slack truncates and your action
  buttons get hidden.
- **Use `mrkdwn` for sections.** Slack does not parse standard markdown
  bold/italic in `plain_text`.

## Common mistakes

- Sending the v0 preview URL with its query string. Slack tries to
  unfurl it; the unfurl times out; the message looks broken. Strip the
  query string, or wrap in a button instead of a section.
- Using @channel or @here without a reason. Use a thread reply to the
  launch announcement instead.
- Posting to #general. Always post to a launch-specific channel
  (`#launches`, `#product-changes`, etc.) so the audience self-selects.

## Threading the rest

After the announcement lands, post the long-form details — full body
copy, screenshots, technical notes — as **thread replies** to the main
message. This keeps the channel scannable while letting the deep
context live nearby.
