# Hotspex Synthetic

Marketing site + interactive demo for **Hotspex Synthetic** — synthetic respondent studies grounded in Ethosense audience science and 347K real Hotspex verbatims.

## Sections

- **Hero** — "Your audience. Pre-launch. In minutes."
- **How it works** — 3-step flow
- **What grounds it** — 8 evidence tiles (Ethosense, verbatims, brand studies, benchmarks, personas, voice anchors, emotion zones, reproducibility)
- **Anatomy** — animated brain SVG showing input → synthetic respondent → output stack
- **Methodology** — 15 engineering choices grounded in Aaru / Kantar LINK AI / Ipsos / Fairgen / Subconscious AI / Argyle (Stanford) academic literature
- **Validation** — green / yellow / red per-metric correlation scorecard
- **Landscape** — comparison vs. Aaru, Kantar, Ipsos, YouGov, Verve, Subconscious AI, NIQ
- **Try it** — interactive demo form (image / video / website / script / manifesto)
- **Sample report** — mock executive-ready output
- **FAQ** — including the "homeopathy of market research" rebuttal

## Stack

Single self-contained `index.html`. Tailwind via CDN, Inter + Space Grotesk from Google Fonts, vanilla JS. No build step.

## Local dev

```bash
python3 -m http.server 8795
```

Then visit http://localhost:8795.

## Deploy

Auto-deployed to Netlify from `main`.

## See also

- `METHODOLOGY_RESEARCH.md` — full vendor-landscape research synthesis with source URLs (Aaru, Kantar, Ipsos, YouGov, Fairgen, Verve, Subconscious AI, Argyle et al., ESOMAR posture).
