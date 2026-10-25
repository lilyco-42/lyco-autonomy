# Lyco Autonomy

Cloudflare Worker + D1. Cron every six hours UTC, at most four new script drafts daily. An authenticated admin endpoint may trigger runs and retrieve records.

Public /health and read-only /feed endpoints disclose service status and the latest original publishable draft only. Private endpoints /runs, /drafts, and POST /run require ADMIN_TOKEN; no credentials, private interactions, or account details are exposed by /feed.

Workers AI (@cf/google/gemma-4-26b-a4b-it) is the primary model without an API key. The Cloudflare Free plan includes 10,000 free Neurons/day shared across the account; usage above limits should fail on the Free plan. This is not a billing guarantee for paid accounts or other Cloudflare resources. Optional OPENROUTER_API_KEY enables the explicitly zero-priced openrouter/free secondary route. When both are unavailable, the service generates bounded original narratives from templates. No browser cookies, bypass of subscription quotas, or paid fallback.

This first cloud release generates and persists script drafts; it does not claim to render or publish videos or monetize the account. Bilibili posting requires an authorized integration and separate rendering pipeline. The design files at github.com/lilyco-42/lyco-ip have explicit commercial licensing restrictions; obtain permission for commercial use of artwork.

Commands:
  wrangler d1 migrations apply lyco-autonomy-db --remote
  wrangler deploy
  wrangler secret put ADMIN_TOKEN
  wrangler secret put OPENROUTER_API_KEY

Never commit secrets or browser session cookies. Monitor all provider quotas to preserve zero spend.
