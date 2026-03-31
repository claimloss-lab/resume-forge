/**
 * ResumeForge — Cloudflare Worker (Claude API Proxy)
 * 
 * Deploy steps:
 *   1. wrangler secret put ANTHROPIC_API_KEY   ← paste your key
 *   2. wrangler deploy
 * 
 * Set ALLOWED_ORIGIN in wrangler.toml to your Pages URL, e.g.:
 *   [vars]
 *   ALLOWED_ORIGIN = "https://resume-forge.pages.dev"
 */

export default {
  async fetch(request, env) {

    // ── CORS preflight ──────────────────────────────────────────
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Only allow POST ─────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // ── Validate API key is set ─────────────────────────────────
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured. Run: wrangler secret put ANTHROPIC_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse & sanitize request body ───────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Force safe defaults — client cannot override these
    const safeBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      stream: true,
      messages: body.messages,
    };

    // Validate messages exist
    if (!Array.isArray(safeBody.messages) || safeBody.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Proxy to Anthropic ──────────────────────────────────────
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
    });

    // ── Stream response back to client ──────────────────────────
    return new Response(anthropicResponse.body, {
      status: anthropicResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
