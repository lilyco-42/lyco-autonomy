# Lyco Autonomy

Cloudflare Worker + D1. Cron every six hours UTC, at most four new script drafts daily. An authenticated admin endpoint may trigger runs and retrieve records.

The public health endpoint is /health. Private endpoints /runs, /drafts, and POST /run are disabled until ADMIN_TOKEN is set as a Cloudflare Worker secret.

Optional OPENROUTER_API_KEY enables the explicitly zero-priced openrouter/free route. If absent or unavailable, the service generates a bounded original narrative from templates instead, without spending money. No browser cookies, bypass of subscription quotas, or paid fallback.

This first cloud release generates and persists script drafts; it does not claim to render or publish videos or monetize the account. Bilibili posting requires an authorized integration and separate rendering pipeline. The design files at github.com/lilyco-42/lyco-ip have explicit commercial licensing restrictions; obtain permission for commercial use of artwork.

Commands:
  wrangler d1 migrations apply lyco-autonomy-db --remote
  wrangler deploy
  wrangler secret put ADMIN_TOKEN
  wrangler secret put OPENROUTER_API_KEY

Never commit secrets or browser session cookies. Monitor all provider quotas to preserve zero spend.
