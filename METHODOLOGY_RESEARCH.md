# Synthetic-Respondent Methodology Research

Background research for the Hotspex Synthetic methodology. Covers the leading vendors (Aaru, Kantar LINK AI, Ipsos Creative|Spark, YouGov, Yabble, Fairgen, Verve, Subconscious AI, NielsenIQ BASES AI, Quester) and the academic foundation, then synthesizes a 15-choice methodology stack engineered to credibly target ~95% directional accuracy.

---

## 1. Aaru (the Ritson-backed one)

**Methodology.** Aaru describes itself as "simulation software that recreates the world using a multi-agent approach." Their agents — internally called *constituents* — are LLM-driven personas seeded from US Census data at the precinct level, then layered with hundreds of personality traits, family/relationship context, media-diet signals and behavioral tendencies. Critically, constituents "are constantly surfing the internet and gathering information meant to mimic the media diets of the humans they're replicating," which lets their preferences drift over time. Aaru positions itself as outcome-grounded rather than survey-grounded: "real world outcomes that don't lie."

**Validation & accuracy.** Their headline win was the 2024 New York Democratic primary, called within ~371 votes using ~5,000 constituent Q&A sessions at roughly 1/10 the cost of a traditional poll. Their 2024 General Election call (Harris over Trump in the Electoral College) was wrong, and Harvard Ash Center researchers flagged stale training data as the root cause. EY case-study claim: Aaru "recreated EY's Global Wealth Research Report overnight — a study that took EY six months. Our results were highly correlated, but more importantly, where they diverged, Aaru was more accurate."

**Ritson on Aaru.** In Marketing Week ("Synthetic data is as good as real – next comes synthetic strategy") Ritson called the Evidenza/Aaru wave a "step change," and reported the 95% correlation figure from EY's Toni Clayton-Hine: "*It was astounding that the matches were so similar… it was 95% correlation*."

Sources: [Aaru.com](https://aaru.com/) · [Semafor](https://www.semafor.com/article/09/20/2024/ai-startup-aaru-uses-chatbots-instead-of-humans-for-political-polls) · [TechCrunch Series A](https://techcrunch.com/2025/12/05/ai-synthetic-research-startup-aaru-raised-a-series-a-at-a-1b-headline-valuation/) · [Ritson in Marketing Week](https://www.marketingweek.com/ritson-synthetic-data-strategy/) · [Research-Live on Accenture investing](https://www.research-live.com/article/news/accenture-invests-in-synthetic-audience-startup-aaru/id/5136643)

---

## 2. Kantar LINK AI

**Methodology.** Trained on Kantar's LINK+ database — 260,000+ ad tests and ~40 million human interviews accumulated over 30+ years. Architecture is an *ensemble* of ML models (neural networks plus classical learners) operating on multimodal feature embeddings extracted from the creative itself (visual, audio, narrative). LINK AI is fundamentally a *creative-prediction* model, not a persona simulator — it predicts the validated LINK metrics (Branded Impact, Short-term Persuasion, long-term Power) directly from the asset.

**Validation.** Cross-validated against held-out human LINK+ data and triangulated to real-world sales lift / market-share data. Public claim: ~80% accuracy in predicting top-performing TV ads on key metrics across US, Brazil, Germany; up to 89% on certain validated outcomes.

Sources: [Kantar LINK AI campaign](https://www.kantar.com/campaigns/link-ai) · [Can AI decode creative effectiveness](https://www.kantar.com/inspiration/agile-market-research/can-ai-really-decode-creative-effectiveness)

---

## 3. Ipsos Creative|Spark AI + Synthetic Sample

**Methodology.** Creative|Spark AI fuses analytical computer vision (frame-level features) with generative LLM scoring, trained on the last 5 years of Creative|Spark — ~18,000 sales-validated human cases. Synthetic Sample sits separately, built on digital-twin panels developed jointly with **Stanford's Politics and Social Change Lab (PASCL)**.

**Validation.** Three-pillar framework — *Truth, Transparency, Trust*. Public numbers Ipsos has been willing to put in writing: **98.2% accuracy** in synthesized cancer-treatment data for niche patient populations; up to **50% questionnaire reduction with 90%+ accuracy** via imputation; synthetic panels that are "statistically indistinguishable from real participants" on the metrics tested.

**Pitfalls Ipsos discloses.** "Calibrating Synthetic Confidence" warns that "naively boosting a dataset can increase the rate of 'false positives' from a standard 5% to as high as 80%." This is the single most important quote in this whole space — it's why a calibration layer is non-optional.

Sources: [Ipsos: Transforming research through synthetic data](https://www.ipsos.com/en/ai/transforming-research-through-synthetic-data) · [Ipsos × Stanford partnership](https://www.ipsos.com/en-us/ipsos-partners-stanford-university-pioneer-future-market-research-synthetic-data) · [Calibrating Synthetic Confidence](https://www.ipsos.com/en-us/calibrating-synthetic-confidence)

---

## 4. YouGov (BrandIndex Voices, AI Personas, Profiles AI Agent)

**Methodology.** YouGov has chosen the *opposite* posture to Aaru and Evidenza: rather than full synthetic respondents, they pitch real-panel-grounded AI. **AI Personas** is built on 480K+ verified US panelists and 650K+ data points; Profiles AI Agent layers a natural-language interface over that panel. **BrandIndex Voices** is AI-led probing of *real* respondents — not synthetic.

YouGov's marketing line is explicit: "many off-the-shelf solutions rely on synthetic or inferred traits — meaning decisions are based on assumptions, not evidence." That said, YouGov **acquired Yabble in 2024**, so they have a synthetic bench in-house.

This is the strongest "real-grounded" model in the space and the cleanest architectural reference for Hotspex, because HMF works the same way: real tracking data is the substrate, AI is the interface.

Sources: [YouGov AI Personas](https://yougov.com/en-us/business/products/profiles/ai-personas) · [BrandIndex Voices](https://yougov.com/en-us/business/products/brandindex/voices)

---

## 5. Yabble (now YouGov)

**Methodology.** Yabble explicitly rejects "purely synthetic" framing and uses what they call **augmented data**: LLM as the contextual engine, grounded in proprietary survey data, public statistics, social trend data and academic repositories. Personas are constructed by *first* searching for real demographic cohorts who would be relevant to the topic, *then* conditioning the LLM on those grounded profiles.

Sources: [Yabble Virtual Audiences](https://www.yabble.com/virtual-audiences) · [Yabble augmented-data manifesto](https://www.yabble.com/blog/why-yabbles-virtual-audiences-is-the-ai-tool-for-market-research)

---

## 6. Fairgen — the calibration-layer reference

**Methodology.** Fairgen is *not* full synthetic — it's the most rigorous published example of **synthetic boosting**, the technique you bolt on top of a small real sample to inflate sub-segment ESS without re-fielding. Their generator is trained on the actual survey distribution from each project.

**Validation numbers (the cleanest in the industry).**
- 95%+ correlation with original distributions on held-out validation
- Error rates dropped up to 2.5 percentage points for sub-50 cells
- Effective sample size increased 153–165% for n=10–40 cells
- Mid-sized groups (150+) show minimal benefit
- Requires ≥300 real respondents; boost works for segments ≤15% of total

**This is the model for Hotspex's calibration layer.** Don't replace real data — boost real cells that are too thin to read, and *only* those.

Sources: [Fairgen Boost](https://www.fairgen.ai/platform/boost) · [Fairgen independent validation study](https://www.fairgen.ai/blog/synthetic-data-validation-independent-study)

---

## 7. Quester / Verve / Subconscious AI / NielsenIQ BASES AI

- **Quester** — agentic respondents that execute a designed interview script, designed for qual-style probing.
- **Verve Intelligent Personas (VIPs).** Refuses the "synthetic data" label — calls them "audience simulations." Trained on curated, refreshed *client-specific* datasets. Public claim: **>0.9 validation correlation** vs. real responses. Case study: 40% fieldwork-cost reduction, 3-week speed-up.
- **Subconscious AI.** Causal experiments on digital twins using **discrete choice models** (Nobel-winning McFadden tradition), trained on a base of 3.5M people grounded in 800M respondent records and "100 years of social science." Right reference for any conjoint/choice work.
- **NielsenIQ BASES AI Screener.** Synthetic personas grounded in NIQ's transactional consumer-panel data — i.e. real *behavioral* data, not just attitudinal. Public claim: 70% faster insight generation, validated against human-tested concepts.

Sources: [Verve VIPs](https://www.addverve.com/inspiration/digital-twins-synthetic-data-and-audience-simulations/) · [Subconscious.ai research](https://subconscious.ai/research) · [NIQ BASES AI Screener](https://nielseniq.com/global/en/products/bases-ai-screener/)

---

## 8. Academic foundation

**Argyle et al., "Out of One, Many" (Political Analysis, 2023).** The seminal paper. Coined the field's central concept — **algorithmic fidelity**: the property by which proper conditioning makes the model emulate response distributions of human subgroups, not just generic averages. ([arXiv:2209.06899](https://arxiv.org/abs/2209.06899))

**The cautionary literature.** Group-level reproduction is achievable; individual-level prediction is not — comprehensive individual accuracy stays <5%. **This bounds what 95% can mean.** It can mean ~95% on aggregate distributions and segment-level deltas. It cannot mean 95% individual prediction.

- *Quantifying the Persona Effect* (arXiv 2402.10811): persona prompting lift is concentrated in low-support subgroups and a small subset of items.
- *Polypersona* (arXiv 2512.14562) and *PersonaTwin* (arXiv 2508.10906): multi-tier prompt conditioning (demographic + behavioral + psychometric) outperforms single-axis personas.

**Conjointly's broadside.** Nik Samoylov's "synthetic respondents are the homeopathy of market research" — the most-cited skeptical critique. Worth rebutting head-on in client materials. ([Conjointly](https://conjointly.com/blog/synthetic-respondents-are-the-homeopathy-of-market-research/))

---

## 9. Professional standards

ESOMAR has not yet issued a stand-alone *Code* on synthetic respondents but presented at **ESOMAR Congress 2024** on "Synthetic Data in Marketing Studies." **GRBN's 2024 Trust Survey** found AI-tool providers materially less trusted than traditional MR firms — a disclosure obligation Hotspex should pre-empt.

---

# The Hotspex Synthetic Methodology Stack — 15 Choices for ~95% Directional Accuracy

This is the engineering spec. Each choice is justified by what the evidence above shows actually moves the correlation needle.

**1. Multi-tier persona grounding (Argyle + PersonaTwin pattern).** Every constituent is built from four stacked layers: (a) Census / Statistics Canada PUMF demographics, (b) HMF brand-tracking history, (c) attitudinal/values segmentation (Big Five + category-attitudes vector via Ethosense), (d) recent Hotspex verbatims as few-shot exemplars. Single-axis demographic personas don't work — the literature is unambiguous.

**2. Brand-specific RAG context layer.** Each constituent has access to a category- and brand-specific knowledge index built from brand-tracking data, ad transcripts, and recent earned/social mentions. This is the Aaru "media-diet" mechanic, fixed for the staleness problem that broke their 2024 General Election call. Refresh weekly.

**3. Multi-shot prompting with real verbatims.** System prompt holds the persona. The user-turn prompt includes 3–5 real verbatims from actual Hotspex fieldwork in the same category, drawn from constituents matched on demographics + segment. This is the highest-leverage single move for correlation lift.

**4. Stimulus vision pipeline.** A Computer-Vision pre-pass extracts ABCD-style features (branding moment, scene structure, emotional arc, product visibility) — Kantar's pattern. The constituent reasons over both the visual features *and* a generated description, not raw pixels alone.

**5. Discrete-choice substrate for trade-off questions.** For pricing, claim selection, pack-design, conjoint-style work: route through a McFadden-style discrete-choice model (Subconscious AI move) rather than free-form LLM Likert generation. LLMs are unreliable on numeric trade-offs; choice models aren't.

**6. Reproducibility controls.** Temperature 0.7 for verbatims, 0.0 for forced-choice. Fixed seeds per constituent ID. Full prompt + model-version + seed logging. Version-pin the model.

**7. Three-tier validation scorecard.** Per metric, publish: (a) distributional fidelity (KS / KL-divergence), (b) structural fidelity (correlation matrix preservation), (c) predictive fidelity (rank-order correlation). Target ≥0.90 on (a) and (c) for green-light metrics.

**8. Held-out twin study as the headline number.** Run 60–100 head-to-head studies — Evidenza's playbook — fielding both real HMF and synthetic on the same stimulus and same audience. Publish the per-metric correlation table.

**9. Calibration layer (Fairgen pattern).** Train a per-metric calibration model on the deltas between synthetic and real on the held-out twin studies. Apply post-hoc to every synthetic estimate. This is what gets you from raw 80–85% correlation to 92–95%. Refresh quarterly.

**10. Hybrid by default, never pure synthetic on net-new categories.** Synthetic-only is OK when (a) brand is in HMF tracking, (b) category has ≥1 prior real-respondent benchmark within 18 months, (c) question is directional. Real fieldwork is required when (a) brand new to HMF, (b) category recently disrupted, (c) decision is single-bet go/no-go ≥$5M, (d) metric is one of the known-fragile ones.

**11. Per-metric green/yellow/red list.**
- **Green** (target 95% correlation): brand awareness, ad recognition, message communication, claim ranking, creative diagnostics, pack preference rank, concept-vs-concept choice.
- **Yellow** (80–90%, use with calibration): purchase intent levels, brand imagery deltas, NPS ranks.
- **Red** (do not promise synthetic-only): absolute price elasticity, low-incidence categorical behavior, novel category entry intent, anything political.

**12. Ensemble across two model families.** Run every prompt against two base models from different vendors (Claude + GPT-class), average the calibrated outputs.

**13. Verbatim quality scoring + hallucination flagging.** Every generated verbatim is scored for persona-consistency, specificity, and hallucination flags. Anything below threshold is regenerated or dropped.

**14. Watermarking and disclosure.** Every synthetic respondent record carries a non-removable flag. Every client report has a methodology slide naming exactly what was synthetic, what was real, what calibration was applied, and what the validated correlation was.

**15. Continuous validation loop.** Each real fieldwork wave becomes new validation data. Track twin-study correlation over time per metric and per category.

---

## What ~95% can and can't mean

A defensible "95% directional accuracy" means: at the metric-segment-rank level, the synthetic system reproduces real-respondent ordering and deltas at r≥0.95 on green-list metrics, after calibration, in the categories where Hotspex has ≥18 months of tracking history.

Where it cannot land:
- Individual-response prediction (literature ceiling ~5%)
- Absolute levels on price-elasticity and rare-behavior metrics
- Novel categories with no real-data prior
- Anything where the model's training cutoff is older than the stimulus context

The play is the **Evidenza/Fairgen/Verve hybrid posture** — never pitched as a replacement for HMF, always pitched as a *calibrated extension* of it, with a published twin-study correlation per metric.
