# FruitFilter — demo runbook

Installable web app (PWA): photo → fruit + ripeness + one piece of advice + allergen
cross-reaction warning, spoken aloud. Adds goal-based recipes, a scoped chat with optional
web citations, English / 中文（香港）, dark mode, and a WCAG 2.1 AA pass.

Live: https://fruitfilter.vercel.app

## 1. Local development

1. Copy `app\.env.local.example` to `app\.env.local` and paste the key after `OPENROUTER_API_KEY=`.
2. Terminal A: `npm run api`
3. Terminal B: `npm run dev` → http://localhost:5173

The local API proxies to the real OpenRouter by default. To test without credits, run three
terminals from `app`:

```
node scripts/mock-openrouter.mjs                 # terminal 1, port 8788
$env:OPENROUTER_API_KEY='test'
$env:OPENROUTER_BASE_URL='http://localhost:8788/chat'
node server.mjs                                  # terminal 2, port 8787
npm run preview -- --port 4173                   # terminal 3
```

Or use `node scripts/mock-test.mjs` for the full API path with a fake model.

## 2. Deploy

```
cd C:\Users\hayde\Desktop\FruitFilter\app
npx vercel login
npx vercel link --yes --project fruitfilter
npx vercel env add OPENROUTER_API_KEY production
npx vercel --prod
```

Check `https://<your-url>/api/health` → `{"ok":true,"hasKey":true,...}`.

## 3. The 90-second demo (and the 3-minute video)

1. Hook: a third of fresh food is wasted; most of it is fine.
2. Open the **installed icon**, set "Eating it: Later", select Latex + Milk, scan the banana.
3. Result: ripeness, advice, nutrition, red latex-fruit warning, spoken aloud.
4. **Recipes** → High protein: three recipes, macros, and a blocked recipe if an allergen appears.
5. **Ask** → toggle web search → "How should I store it?" → answer with cited sources.
6. Switch to **中文** and **dark mode** from the header.
7. Airplane mode → reopen → cached result + offline banner.
8. Close on food waste, access, and the deterministic safety gate.

The video script and poster are kept outside this repository for submission.

## 4. If something breaks

| Problem | Move |
| --- | --- |
| Vision model slow / 5xx | Automatic fallback model; the UI keeps the retry. |
| Venue Wi-Fi dead | Installed app opens offline and replays this morning's scans. Say "cached result". |
| Vercel down | `npm run api` + `npm run dev` on the laptop as a second origin. |
| Key missing/capped | `/api/health` shows `hasKey:false`; add the env var and redeploy. |
| Recipes slow (≈7 s) | The skeleton is intentional; wait, or pre-open the recipes screen before the demo. |
| Web chat costs more | Toggle web search off; each search is about US$0.007. |

## 5. Measurements (deployed, real calls)

- Vision: 5/5 correct (banana, apple, orange, strawberry, pen refused), median 4.5 s.
- Chinese scan: 香蕉 + Traditional-Chinese evidence/advice in 4.4 s.
- Recipes: 3 high-protein recipes in 7.0 s; selected milk allergy absent; client re-checks allergens.
- Chat: 1.9 s without web; 2.9 s with web and 3 cited sources.
- Accessibility: axe-core, WCAG 2.1 A/AA, **0 violations** across 6 screens (home, result,
  recipes, chat; EN/light and zh-HK/dark). Reproduce: `node scripts/scene-test.mjs <photo>`.
- Cost: ≈US$0.002 per scan, ≈US$0.0005 per recipe/chat, ≈US$0.008 with web search.

## 6. Safety and privacy

- The API key lives only in Vercel env; the browser calls `/api/*`.
- Photos are downscaled and re-encoded client-side; they are not stored server-side.
- Allergen warnings come from a fixed rule table, never the model; the UI never says "safe".
- History lives in `localStorage` and can be cleared by clearing site data.
- This is not a medical device and does not replace a diagnosis or an allergy plan.

## 7. QA commands

```
npm run typecheck
npm run lint
npm run build
node scripts/mock-test.mjs        # full API pipeline with a fake model
node scripts/scene-test.mjs <photo>  # screenshots + axe WCAG audit
```

## 8. Publishing to GitHub

The repo root is `C:\Users\hayde\Desktop\FruitFilter`. `.env.local` is gitignored and must stay out.
See the root `README.md` for the publish steps.
