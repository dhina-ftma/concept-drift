/**
 * AI Service for Concept Drift
 * Integrates external LLM providers (Gemini, OpenAI, or compatible APIs)
 * with robust schema enforcement and automatic fallback to dynamic semanticEngine.
 */

import { getSemanticNeighbors, formatConceptName, normalizeConcept } from './semanticEngine.js';

const ENV_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || null;
const API_PROVIDER = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'auto'));
const API_BASE_URL = process.env.AI_BASE_URL || null;

export function getAIStatus(customKey = null) {
  const activeKey = customKey || ENV_API_KEY;
  return {
    configured: Boolean(activeKey),
    provider: activeKey ? (API_PROVIDER || 'custom') : 'dynamic-semantic-engine',
    model: process.env.AI_MODEL || (activeKey?.startsWith('AIza') ? 'gemini-1.5-flash' : 'gpt-4o-mini')
  };
}

/**
 * Generates conceptual neighbors for the specified concept.
 * Tries LLM first if configured with an API key; gracefully falls back to dynamic semanticEngine.
 */
export async function generateConceptNeighbors(concept, destination = null, visitedNodes = new Set(), userApiKey = null) {
  const normConcept = normalizeConcept(concept);
  const formattedConcept = formatConceptName(concept);
  const activeKey = userApiKey || ENV_API_KEY;

  if (!activeKey) {
    // Dynamic semantic engine mode
    return await getSemanticNeighbors(concept, destination, visitedNodes);
  }

  try {
    const prompt = buildPrompt(formattedConcept, destination, visitedNodes);
    let result = null;

    if (API_PROVIDER === 'gemini' || activeKey.startsWith('AIza')) {
      result = await callGeminiAPI(prompt, activeKey);
    } else {
      result = await callOpenAICompatibleAPI(prompt, activeKey);
    }

    if (result && validateResponse(result, normConcept)) {
      return sanitizeResponse(result, formattedConcept);
    }
  } catch (err) {
    console.warn(`[AI Service] LLM call failed (${err.message}). Seamlessly using dynamic semantic engine fallback.`);
  }

  // Seamless fallback to live semantic engine
  return await getSemanticNeighbors(concept, destination, visitedNodes);
}

function buildPrompt(concept, destination, visitedNodes) {
  const visitedList = Array.from(visitedNodes).slice(-5).join(', ');
  const destContext = destination 
    ? `The destination to reach is "${formatConceptName(destination)}". Provide 4 to 5 directly related, natural concepts connected to "${concept}". Ensure 1 or 2 choices help build a bridge towards "${formatConceptName(destination)}" without skipping logical steps.`
    : `Provide 4 to 5 directly related, natural conceptual neighbors connected to "${concept}".`;

  return `You are the conceptual network engine for Concept Drift.
Current Concept: "${concept}"
${destContext}
Previously visited: [${visitedList || 'none'}]

Rules:
1. Relationships must be semantically meaningful, defensible, and directly related to "${concept}".
2. DO NOT make bizarre, arbitrary jumps.
3. Concepts must be concise (1 to 3 words).
4. Return ONLY valid JSON matching this exact schema:
{
  "concept": "${concept}",
  "related_concepts": [
    {
      "name": "Concept Name",
      "relationship_strength": 0.85,
      "rationale": "Short reason for connection"
    }
  ]
}`;
}

async function callGeminiAPI(prompt, apiKey) {
  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Gemini HTTP error ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return JSON.parse(text);
}

async function callOpenAICompatibleAPI(prompt, apiKey) {
  const baseUrl = API_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You generate structured concept graph neighbors in strict JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP error ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');
  return JSON.parse(content);
}

function validateResponse(data, normCurrent) {
  if (!data || !Array.isArray(data.related_concepts)) return false;
  const list = data.related_concepts;
  if (list.length < 2) return false;

  return list.every(item => {
    if (!item.name || typeof item.name !== 'string') return false;
    if (normalizeConcept(item.name) === normCurrent) return false;
    return true;
  });
}

function sanitizeResponse(data, originalConcept) {
  const seen = new Set();
  const valid = [];

  for (const item of data.related_concepts) {
    const cleanName = formatConceptName(item.name.replace(/[^\w\s-]/g, '').trim());
    const norm = normalizeConcept(cleanName);
    if (!norm || seen.has(norm) || norm === normalizeConcept(originalConcept)) continue;

    seen.add(norm);
    valid.push({
      name: cleanName,
      relationship_strength: Math.max(0.4, Math.min(1.0, Number(item.relationship_strength) || 0.8)),
      rationale: item.rationale ? String(item.rationale).trim() : `Direct connection to ${originalConcept}`
    });

    if (valid.length >= 5) break;
  }

  return {
    concept: originalConcept,
    related_concepts: valid
  };
}
