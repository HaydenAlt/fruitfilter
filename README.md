# FruitFilter

Point your phone at a fruit and know whether it is ready, what to do with it, and whether it
could trigger an allergic reaction for you.

**Live:** https://fruitfilter.vercel.app

Installable PWA (Add to Home Screen) · English / 中文（香港） · light & dark · spoken results ·
offline after the first load.

## What it does

- **Scan** a fruit photo → fruit name, confidence, ripeness band, two visible cues, and one piece of advice.
- **Allergen gate** → deterministic cross-reaction rules (latex-fruit, birch/ragweed pollen-food
  syndrome, Big-9 flags). The vision model never decides safety and the app never says "safe".
- **Eating timing** → "Now / Tomorrow / Later" tailors the advice to when you plan to eat it.
- **Recipes** → three simple recipes for a chosen goal (any / high protein / low sugar), with
  per-serving macros and a client-side allergen re-check on every ingredient.
- **Chat** → scoped to the scanned fruit, with optional web search and cited sources.
- **Accessibility** → WCAG 2.1 A/AA audited with axe-core (0 violations across 6 screens),
  keyboard access, focus management, live regions, 44 px targets, reduced-motion support, and
  no meaning conveyed by colour alone.
- **PWA** → manifest, maskable icons, service worker, offline shell and cached last scan.

## Stack

React 19 · TypeScript · Vite · three Vercel functions · OpenRouter (Gemini 3.8 Flash vision,
Claude Haiku fallback, DeepSeek V4.1 Flash for text) · Exa web search · Web Speech API ·
Service Worker · axe-core.

```
app/
  api/identify.js   # vision proxy, JSON validation, repair + fallback
  api/recipes.js    # goal/allergy-aware recipe generation
  api/chat.js       # scoped chat, optional web search with citations
  api/health.js
  src/lib/          # i18n, theme, allergen rules, speech, storage, image
  src/components/   # scan, result, recipes, chat, allergies, history, install
  public/           # manifest, service worker, icons
  scripts/          # mock model, API tests, screenshots, WCAG audit
```

## Run locally

```powershell
cd app
Copy-Item .env.local.example .env.local   # paste your OpenRouter key
npm install
npm run api                                # terminal A, port 8787
npm run dev                                # terminal B, port 5173
```

## Deploy

```powershell
cd app
npx vercel login
npx vercel link --yes --project fruitfilter
npx vercel env add OPENROUTER_API_KEY production
npx vercel --prod
```

## Verify

```powershell
npm run typecheck
npm run lint
npm run build
node scripts/mock-test.mjs
node scripts/scene-test.mjs <photo>   # screenshots + axe WCAG audit
```

## Safety, privacy, cost

- Keys stay server-side; the browser only calls `/api/*`.
- Photos are downscaled and re-encoded on the device; they are not stored server-side.
- Allergen warnings are fixed rules, not model output; the UI never claims a food is safe.
- History stays in `localStorage`.
- Approx. US$0.002 per scan, US$0.0005 per recipe/chat, US$0.008 with web search.
- This is not a medical device and does not replace an allergy plan or professional advice.

## AI statement

AI tools were used as coding and drafting assistants. Both team members reviewed the code,
ran the tests, and can explain every part shown in the video. Model output is schema-validated
and clamped, and is never used to decide allergen safety.
