// Netlify Function · runs an actual synthetic respondent study against the
// supplied stimulus using Claude Sonnet 4.6 (vision + structured JSON output).
//
// The function does ONE thing per request: gates the call behind a server-side
// password check, then makes a single Messages API call that returns a fully
// structured study report — vision-described stim, KPIs, resonance scorecard,
// themed positives/negatives, persona verbatims, and a strategic recommendation.
//
// Single Claude call instead of N parallel persona calls so we fit comfortably
// inside Netlify's 26 s sync-function ceiling — the model generates the whole
// cohort and the aggregated read in one response.

import Anthropic from '@anthropic-ai/sdk'
import crypto from 'node:crypto'

// SHA-256 of the access password ("Iceman9!!"). Compared in constant time.
const ACCESS_HASH = 'f91bc5e40613290361afec770c0ad4a0f47533483ee3e56a4e2b9df0d8c82dbd'

const SYSTEM_PROMPT = `You are running a synthetic respondent study for Hotspex, a brand-research firm.
Your job is to simulate a cohort of real Canadian consumers reacting to a stimulus, then
codify their reactions into a polished executive-ready report.

You operate inside the Hotspex Synthetic methodology stack:

1. PERSONA GROUNDING — every synthetic respondent is grounded in four layers:
   (a) Census / Statistics Canada PUMF demographics, (b) Ethosense attitudinal
   audience segmentation (the proprietary Hotspex audience-science platform —
   80 pre-curated Canadian segments), (c) prior brand-tracking history if available,
   and (d) real verbatim phrasing patterns from past Hotspex fieldwork in the same category.

2. RESPONSE STYLE — respondents speak in first-person, in real-Canadian-consumer cadence.
   Reactions are specific to the stimulus on screen — not generic platitudes. Pull verbatims
   from the actual emotional register of the audience profile (e.g. a 58-year-old pre-retiree
   does not sound like a 26-year-old Gen Z saver).

3. SCORING — score the stimulus on the Hotspex Resonance attribute battery:
   Relevance · Distinctiveness · Memorability (T2B percentages, with realistic pre/post lift).
   Plus the aggregate Hotspex Concept Score (0–200 scale; 100 = average; 110+ "builds the brand";
   below 90 "doesn't build"). Component appeal T2B (overall liking). Positive sentiment %.
   Brand mentions in open-ends %.

4. THEMES — codify open-end reactions into 3–5 dominant POSITIVE themes and 3–5 dominant
   NEGATIVE themes. Each theme should be a short noun-phrase (5–10 words) and accompanied by
   the % of synthetic respondents who hit that theme. Themes must be SPECIFIC to what's actually
   in the stimulus — not generic ad-language.

5. STRATEGIC RECOMMENDATION — one direct, decision-grade recommendation. Headline (12 words max,
   imperative). Body (2–3 sentences, addresses the strategic decision the brand has to make).

6. WATERMARKING — every output is synthetic and watermarked. Use to surface hypotheses and
   stress-test concepts. Never as a substitute for fieldwork on go/no-go decisions.

You will receive: the stimulus (image and/or text), a stimulus type, an audience description,
and a sample size. Generate a single JSON report following the supplied schema.`

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stim_description: {
      type: 'string',
      description: 'A 2–3 sentence factual description of what the stimulus actually is — read off the image / text. No interpretation, no marketing-speak. This is the proof to the user that we actually looked at their stim.',
    },
    headline: {
      type: 'string',
      description: 'A short executive title for the run, e.g. "Realie landing page · General population". Max 80 chars.',
    },
    kpis: {
      type: 'object',
      additionalProperties: false,
      properties: {
        concept_score: { type: 'integer', description: 'Hotspex Concept Score, 0–200 scale; 100 = average.' },
        concept_score_label: { type: 'string', description: 'One of: "Builds the brand" (≥110), "Average" (90–110), "Doesn\'t build" (<90).' },
        component_appeal_t2b: { type: 'integer', description: 'Component appeal Top-2-Box %, 0–100.' },
        positive_sentiment_pct: { type: 'integer', description: 'Positive sentiment in open-ends, 0–100.' },
        brand_mention_pct: { type: 'integer', description: 'Unaided brand mention in open-ends, 0–100.' },
      },
      required: ['concept_score', 'concept_score_label', 'component_appeal_t2b', 'positive_sentiment_pct', 'brand_mention_pct'],
    },
    resonance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        relevance_t2b: { type: 'integer' },
        relevance_lift: { type: 'integer', description: 'pre→post lift in points; can be negative.' },
        distinctiveness_t2b: { type: 'integer' },
        distinctiveness_lift: { type: 'integer' },
        memorability_t2b: { type: 'integer' },
        memorability_lift: { type: 'integer' },
      },
      required: ['relevance_t2b', 'relevance_lift', 'distinctiveness_t2b', 'distinctiveness_lift', 'memorability_t2b', 'memorability_lift'],
    },
    positive_themes: {
      type: 'array',
      description: '3–5 most-cited positive themes, sorted by descending pct.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          theme: { type: 'string', description: 'Short noun phrase, 5–12 words, specific to the stim.' },
          pct: { type: 'integer', description: '% of synthetic respondents hitting this theme.' },
        },
        required: ['theme', 'pct'],
      },
    },
    negative_themes: {
      type: 'array',
      description: '3–5 most-cited negative themes, sorted by descending pct.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          theme: { type: 'string', description: 'Short noun phrase, 5–12 words, specific to the stim.' },
          pct: { type: 'integer' },
        },
        required: ['theme', 'pct'],
      },
    },
    verbatims: {
      type: 'array',
      description: '3 illustrative first-person verbatims sampled across the cohort. Mix of positive, mixed, and negative.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          quote: { type: 'string', description: '1–3 sentences, first person, real-consumer cadence.' },
          persona: { type: 'string', description: 'Short persona descriptor, e.g. "Pre-retiree · Suburban ON · F · 58".' },
          sentiment: { type: 'string', enum: ['positive', 'mixed', 'negative'] },
        },
        required: ['quote', 'persona', 'sentiment'],
      },
    },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        headline: { type: 'string', description: 'Imperative. Max 12 words.' },
        body: { type: 'string', description: '2–3 sentences. Direct, decision-grade.' },
      },
      required: ['headline', 'body'],
    },
  },
  required: ['stim_description', 'headline', 'kpis', 'resonance', 'positive_themes', 'negative_themes', 'verbatims', 'recommendation'],
}

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: 'server_misconfigured', message: 'ANTHROPIC_API_KEY is not set in Netlify environment.' })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const { password, stim_type, stim_text, image_base64, image_media_type, audience, sample_size = 100 } = body

  // Server-side password check (the real gate — the client-side modal is just UX).
  if (!password || !safeEqual(sha256(password), ACCESS_HASH)) {
    return json(401, { error: 'unauthorized', message: 'Incorrect access password.' })
  }

  // Require at least one usable form of stimulus.
  const hasImage = !!image_base64 && !!image_media_type
  const hasText = typeof stim_text === 'string' && stim_text.trim().length > 0
  if (!hasImage && !hasText) {
    return json(400, { error: 'no_stimulus', message: 'Provide either an image or a stimulus description.' })
  }

  const audienceDesc = (audience && audience.trim()) || 'General Canadian adult population (mainstream, mass-market, balanced across age/region/income).'
  const N = Math.max(5, Math.min(200, parseInt(sample_size, 10) || 100))

  const userBlocks = []

  // System-style framing of the request goes in the user turn for the model to pin against.
  const briefHeader = [
    `STUDY BRIEF`,
    `============`,
    `Stimulus type:  ${stim_type || 'unspecified'}`,
    `Sample size:    ${N} synthetic respondents`,
    ``,
    `AUDIENCE PROFILE`,
    audienceDesc,
    ``,
  ].join('\n')

  userBlocks.push({ type: 'text', text: briefHeader })

  if (hasImage) {
    userBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image_media_type,
        data: image_base64,
      },
    })
    userBlocks.push({
      type: 'text',
      text: `↑ The image above IS the stimulus respondents are reacting to. Read it carefully — note brand, copy, layout, imagery, value proposition, and anything else that's actually visible. Your stim_description must reflect what's actually on screen.`,
    })
  }

  if (hasText) {
    userBlocks.push({
      type: 'text',
      text: `STIMULUS TEXT / CONTEXT\n========================\n${stim_text.trim()}`,
    })
  }

  userBlocks.push({
    type: 'text',
    text: `Run the synthetic study and return the structured JSON report. Be specific to what's
actually in this stimulus — generic ad-language is a fail. Make sure stim_description proves
you actually looked at the stim.`,
  })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      // Cache the (large, stable) system prompt so repeat runs are cheaper.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userBlocks }],
      output_config: {
        format: { type: 'json_schema', schema: REPORT_SCHEMA },
      },
    })

    // With output_config.format = json_schema, the first text block is the validated JSON.
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock) {
      return json(502, { error: 'no_text_block', message: 'Model returned no text block.', stop_reason: response.stop_reason })
    }

    let parsed
    try {
      parsed = JSON.parse(textBlock.text)
    } catch (e) {
      return json(502, { error: 'malformed_json', message: e.message, raw: textBlock.text.slice(0, 1000) })
    }

    return json(200, {
      ok: true,
      sample_size: N,
      stim_type: stim_type || 'unspecified',
      audience_summary: audienceDesc.slice(0, 200),
      report: parsed,
      usage: response.usage,
      model: response.model,
      run_id: 'SX-' + Date.now().toString(36).toUpperCase(),
    })
  } catch (err) {
    // Anthropic SDK exposes typed errors with a numeric .status
    const status = err?.status || 500
    return json(status, {
      error: err?.constructor?.name || 'api_error',
      message: err?.message || 'Unknown error talking to the Claude API.',
      details: err?.error || null,
    })
  }
}

export const config = {
  path: '/api/run-study',
}
