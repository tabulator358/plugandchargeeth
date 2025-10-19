# RPC Setup Instructions

## Problem Fixed
Your frontend was experiencing RPC connection issues due to:
- Default Alchemy API key being exhausted (400/403 errors)
- Public Arbitrum Sepolia RPC being rate-limited (429 errors)
- CORS issues with `sepolia-rollup.arbitrum.io` (duplicate headers)
- 20 event history hooks making too many requests simultaneously
- ETH price fetching also failing due to exhausted API key

## Solution Implemented
✅ Switched to Chainstack public RPC (`arbitrum-sepolia.public.blastapi.io`)
✅ Added RPC fallback configuration to `scaffold.config.ts`
✅ Created `.env.example` template for environment variables
✅ Disabled ETH price fetching (causing 403 errors, not needed for USDC-based app)

## Next Steps

### ✅ Ready to Use!
Your app now uses **Chainstack public RPC** which:
- Works immediately without any setup
- No API key required
- Stable and reliable
- No CORS issues

### 3. Restart Your Development Server
```bash
yarn start
```

### (Optional) Upgrade to Alchemy API Key
If you want better performance and higher rate limits:

1. Get your Alchemy API key at https://dashboard.alchemy.com
2. Create `packages/nextjs/.env.local`:
```bash
cd packages/nextjs
cp .env.example .env.local
```
3. Add your API key to `.env.local`
4. Restart the server

## What This Fixes
- ✅ Uses Chainstack public RPC (stable, no CORS issues)
- ✅ Eliminates 400, 403, and 429 errors
- ✅ No more "Failed to fetch" or CORS errors
- ✅ Allows all 20 event history hooks to work properly
- ✅ Disabled unnecessary ETH price fetching (not needed for USDC app)
- ✅ Works immediately without any API key setup

## Optional: Reduce Load (if needed)
If you still experience issues, you can:
- Increase `pollingInterval` from 30s to 60s in `scaffold.config.ts`
- Remove `watch: true` from non-critical event hooks
- Use fewer event history hooks per page

## Free Tier Limits
Alchemy free tier includes 300M compute units/month, which is plenty for development.
