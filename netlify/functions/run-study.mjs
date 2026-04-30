// Netlify Function · runs an actual synthetic respondent study against the
// supplied stimulus using a two-stage pipeline:
//
//   Stage 1 — N respondents.  Split N into chunks of CHUNK_SIZE (10) and run
//   them in parallel against Claude Haiku 4.5 (fast, ~200 tok/s).  Each chunk
//   produces 10 respondents (persona + sentiment + first-person verbatim +
//   likes + dislikes).  Wall-clock time is dominated by the slowest chunk —
//   ~5–8 s — not by N.
//
//   Stage 2 — Aggregate.  Single Claude Sonnet 4.6 call that takes the full
//   respondent list as input and produces the executive-ready report (KPIs,
//   resonance scorecard, themed positives / negatives, strategic rec).
//
// Both stages share a cached system prompt so repeat runs are cheap.  The full
// pipeline fits inside Netlify Pro's 26 s sync ceiling for N up to ~100.

import Anthropic from '@anthropic-ai/sdk'
import crypto from 'node:crypto'

// SHA-256 of the access password ("Iceman9!!"). Compared in constant time.
const ACCESS_HASH = 'f91bc5e40613290361afec770c0ad4a0f47533483ee3e56a4e2b9df0d8c82dbd'

const CHUNK_SIZE = 10
const HARD_CAP = 100  // sync function ceiling — beyond this we'd need a background fn

const RESP_SYSTEM_PROMPT = `You are running ONE chunk of a Hotspex Synthetic respondent study.
Hotspex is a Canadian brand-research firm. Each "respondent" is a synthetic Canadian
consumer reacting to the supplied stimulus, grounded in:
  • Census 2021 / Statistics Canada PUMF demographics
  • Ethosense — the Hotspex proprietary audience-science platform of 80 pre-curated
    Canadian audience segments (attitudinal, brand affinities, media diet)
  • Real verbatim phrasing patterns from past Hotspex fieldwork in the same category
  • Hotspex emotional zones (Competent · Trustworthy · Familiar · Nurturing · Friendly ·
    Fun · Interesting · Inspiring)

Generate respondents who are DEMOGRAPHICALLY DIVERSE within the supplied audience profile —
mix of ages, regions (ON / QC / BC / AB / Atlantic), genders, income levels, and life stages
that fit the brief. Each respondent's reaction must be SPECIFIC to what's actually in the
stimulus, in real-Canadian-consumer cadence — not generic ad-language. The verbatims should
sound like real human reactions: some short, some longer; some enthusiastic, some skeptical,
some on the fence.

CRITICAL: respondents must SPAN the sentiment range. Roughly 40–55% positive, 25–35% mixed,
15–30% negative — unless the brief tells you the audience is heavily skewed. Do NOT generate
a chunk where every respondent loves the stim, or every respondent hates it. Real consumers
disagree.

Output JSON only — no preamble.`

const RESPONDENTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    respondents: {
      type: 'array',
      description: `Exactly ${CHUNK_SIZE} respondents.`,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          first_name: { type: 'string', description: 'Realistic Canadian first name appropriate to demographics.' },
          age: { type: 'integer', description: 'Age in years.' },
          gender: { type: 'string', description: 'M / F / NB.' },
          region: { type: 'string', description: 'Province + city/town size, e.g. "Toronto, ON" or "Suburban BC".' },
          segment: { type: 'string', description: 'Ethosense segment label, e.g. "Pre-retiree professional", "Gen Z saver", "New Canadian family".' },
          sentiment: { type: 'string', enum: ['positive', 'mixed', 'negative'] },
          quote: { type: 'string', description: '1–4 sentences. First person. Real-consumer cadence. Specific to the stim.' },
          likes: { type: 'array', items: { type: 'string' }, description: '0–3 specific things this respondent liked. Empty array if none.' },
          dislikes: { type: 'array', items: { type: 'string' }, description: '0–3 specific things this respondent disliked. Empty array if none.' },
        },
        required: ['first_name', 'age', 'gender', 'region', 'segment', 'sentiment', 'quote', 'likes', 'dislikes'],
      },
    },
  },
  required: ['respondents'],
}

const AGG_SYSTEM_PROMPT = `You are the senior research analyst on a Hotspex Synthetic study.
A cohort of synthetic Canadian respondents has just reacted to a stimulus — you have their
full verbatim record. Your job: codify that raw cohort data into an executive-ready report.

You produce:
  • A factual stim_description (2–3 sentences) that proves the analysis was grounded in
    the actual stimulus
  • A short headline for the run
  • Hotspex KPIs (Concept Score 0–200, Component Appeal T2B, Positive sentiment %, Brand
    mention %) — derived from the actual sentiment distribution and likes/dislikes density
    in the cohort, NOT from imagination
  • Resonance scorecard (Relevance / Distinctiveness / Memorability T2B + pre→post lift)
  • 3–5 dominant positive themes (each: short noun phrase + % of cohort hitting it)
  • 3–5 dominant negative themes (same shape)
  • One direct, decision-grade strategic recommendation (12-word imperative headline +
    2–3 sentence body)

Rules:
  - All percentages must reflect the actual cohort distribution you were handed
  - Themes must be SPECIFIC to the stim — generic ad-language is a fail
  - Concept Score: 110+ "Builds the brand", 90–110 "Average", <90 "Doesn't build"
  - Output JSON only`

const AGG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stim_description: { type: 'string', description: 'Factual 2–3 sentence description of the stim. Read what is on screen / in the text.' },
    headline: { type: 'string', description: 'Short executive title (max 80 chars).' },
    kpis: {
      type: 'object',
      additionalProperties: false,
      properties: {
        concept_score: { type: 'integer' },
        concept_score_label: { type: 'string', description: '"Builds the brand" (≥110), "Average" (90–110), or "Doesn\'t build" (<90).' },
        component_appeal_t2b: { type: 'integer' },
        positive_sentiment_pct: { type: 'integer' },
        brand_mention_pct: { type: 'integer' },
      },
      required: ['concept_score', 'concept_score_label', 'component_appeal_t2b', 'positive_sentiment_pct', 'brand_mention_pct'],
    },
    resonance: {
      type: 'object',
      additionalProperties: false,
      properties: {
        relevance_t2b: { type: 'integer' },
        relevance_lift: { type: 'integer' },
        distinctiveness_t2b: { type: 'integer' },
        distinctiveness_lift: { type: 'integer' },
        memorability_t2b: { type: 'integer' },
        memorability_lift: { type: 'integer' },
      },
      required: ['relevance_t2b', 'relevance_lift', 'distinctiveness_t2b', 'distinctiveness_lift', 'memorability_t2b', 'memorability_lift'],
    },
    positive_themes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { theme: { type: 'string' }, pct: { type: 'integer' } },
        required: ['theme', 'pct'],
      },
    },
    negative_themes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { theme: { type: 'string' }, pct: { type: 'integer' } },
        required: ['theme', 'pct'],
      },
    },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      properties: {
        headline: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['headline', 'body'],
    },
  },
  required: ['stim_description', 'headline', 'kpis', 'resonance', 'positive_themes', 'negative_themes', 'recommendation'],
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

// Run one Haiku chunk, returning { respondents: [...10] }
async function runChunk(client, brief, image, chunkIdx, totalChunks) {
  const userBlocks = []
  userBlocks.push({
    type: 'text',
    text: `STUDY BRIEF\n===========\n${brief}\n\nThis is chunk ${chunkIdx + 1} of ${totalChunks}. Generate exactly ${CHUNK_SIZE} respondents reacting to the stimulus. Each chunk should produce a different mix of demographics within the audience profile so the full cohort is diverse.`,
  })
  if (image) {
    userBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: image.media_type, data: image.data },
    })
    userBlocks.push({
      type: 'text',
      text: `↑ The image above IS the stimulus. Your respondents are reacting to what's actually in this image — read it carefully (brand, copy, layout, value prop).`,
    })
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 3000,
    system: [{ type: 'text', text: RESP_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userBlocks }],
    output_config: { format: { type: 'json_schema', schema: RESPONDENTS_SCHEMA } },
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error(`Chunk ${chunkIdx}: no text block`)
  const parsed = JSON.parse(textBlock.text)
  return { respondents: parsed.respondents || [], usage: response.usage }
}

// One Sonnet aggregation call over the full respondent list
async function runAggregation(client, brief, image, respondents) {
  const cohortDigest = respondents.map((r, i) => {
    const likes = (r.likes || []).join(' / ')
    const dislikes = (r.dislikes || []).join(' / ')
    return `[#${i + 1}] ${r.first_name} ${r.age}${r.gender} · ${r.region} · ${r.segment} · ${r.sentiment.toUpperCase()}\n  "${r.quote}"\n  + ${likes || '—'}\n  − ${dislikes || '—'}`
  }).join('\n\n')

  const userBlocks = []
  userBlocks.push({
    type: 'text',
    text: `STUDY BRIEF\n===========\n${brief}\n\nN = ${respondents.length} synthetic respondents.`,
  })
  if (image) {
    userBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: image.media_type, data: image.data },
    })
    userBlocks.push({
      type: 'text',
      text: `↑ The stimulus respondents reacted to. Use this for the stim_description.`,
    })
  }
  userBlocks.push({
    type: 'text',
    text: `COHORT DATA\n===========\n${cohortDigest}\n\nProduce the structured report. Percentages must reflect this cohort. Themes must be specific to the stim.`,
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: [{ type: 'text', text: AGG_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userBlocks }],
    output_config: { format: { type: 'json_schema', schema: AGG_SCHEMA } },
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('Aggregation: no text block')
  return { agg: JSON.parse(textBlock.text), usage: response.usage }
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

  const { password, stim_type, stim_text, image_base64, image_media_type, audience, sample_size = 50 } = body

  if (!password || !safeEqual(sha256(password), ACCESS_HASH)) {
    return json(401, { error: 'unauthorized', message: 'Incorrect access password.' })
  }

  const hasImage = !!image_base64 && !!image_media_type
  const hasText = typeof stim_text === 'string' && stim_text.trim().length > 0
  if (!hasImage && !hasText) {
    return json(400, { error: 'no_stimulus', message: 'Provide either an image or a stimulus description.' })
  }

  const audienceDesc = (audience && audience.trim()) || 'General Canadian adult population (mainstream, mass-market, balanced across age/region/income).'
  let N = parseInt(sample_size, 10)
  if (Number.isNaN(N) || N < CHUNK_SIZE) N = CHUNK_SIZE
  if (N > HARD_CAP) N = HARD_CAP
  // Round down to a multiple of CHUNK_SIZE
  N = Math.floor(N / CHUNK_SIZE) * CHUNK_SIZE
  const numChunks = N / CHUNK_SIZE

  const briefParts = [
    `Stimulus type: ${stim_type || 'unspecified'}`,
    `Sample size:    ${N} synthetic respondents (split across ${numChunks} parallel chunks of ${CHUNK_SIZE})`,
    ``,
    `AUDIENCE PROFILE`,
    audienceDesc,
  ]
  if (hasText) {
    briefParts.push('', 'STIMULUS TEXT / CONTEXT', stim_text.trim())
  }
  const brief = briefParts.join('\n')

  const image = hasImage ? { media_type: image_media_type, data: image_base64 } : null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const t0 = Date.now()

  try {
    // Stage 1 — parallel chunks of N/CHUNK_SIZE Haiku calls
    const chunkPromises = Array.from({ length: numChunks }, (_, i) => runChunk(client, brief, image, i, numChunks))
    const chunkResults = await Promise.all(chunkPromises)
    const respondents = chunkResults.flatMap((c) => c.respondents).slice(0, N)
    const t1 = Date.now()

    if (respondents.length === 0) {
      return json(502, { error: 'no_respondents', message: 'All chunks returned empty.' })
    }

    // Stage 2 — single Sonnet aggregation call
    const { agg, usage: aggUsage } = await runAggregation(client, brief, image, respondents)
    const t2 = Date.now()

    // Total token usage across all calls
    const totalUsage = chunkResults.reduce(
      (acc, c) => ({
        input: acc.input + (c.usage?.input_tokens || 0),
        output: acc.output + (c.usage?.output_tokens || 0),
        cache_read: acc.cache_read + (c.usage?.cache_read_input_tokens || 0),
      }),
      { input: aggUsage?.input_tokens || 0, output: aggUsage?.output_tokens || 0, cache_read: aggUsage?.cache_read_input_tokens || 0 },
    )

    return json(200, {
      ok: true,
      sample_size: respondents.length,
      stim_type: stim_type || 'unspecified',
      audience_summary: audienceDesc.slice(0, 240),
      report: { ...agg, respondents },
      timing_ms: { chunks_ms: t1 - t0, aggregation_ms: t2 - t1, total_ms: t2 - t0 },
      usage: totalUsage,
      models: { chunks: 'claude-haiku-4-5', aggregation: 'claude-sonnet-4-6' },
      run_id: 'SX-' + Date.now().toString(36).toUpperCase(),
    })
  } catch (err) {
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
