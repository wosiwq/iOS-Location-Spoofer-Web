/**
 * iOS Location Spoofer Web
 * Copyright (c) 2026 akudamatata
 * Licensed under CC BY-NC-SA 4.0
 */
import { authOk, jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet({ request, env }) {
  // Never expose a quota-consuming proxy when authentication is unconfigured.
  if (!env.TOKEN || !authOk(request, env)) {
    return errorResponse('unauthorized', 401);
  }
  if (!env.AMAP_KEY) return errorResponse('search unavailable', 503);

  const keywords = (new URL(request.url).searchParams.get('keywords') || '').trim();
  if (!keywords || keywords.length > 100) {
    return errorResponse('keywords must contain 1-100 characters');
  }

  const url = new URL('https://restapi.amap.com/v3/assistant/inputtips');
  url.searchParams.set('keywords', keywords);
  url.searchParams.set('key', env.AMAP_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) return errorResponse('search provider unavailable', 502);
    const data = await response.json();
    if (data.status !== '1' || !Array.isArray(data.tips)) {
      return errorResponse('search provider unavailable', 502);
    }
    // Return only fields used by the panel, never upstream diagnostics or URLs.
    const tips = data.tips.slice(0, 20).map(tip => ({
      name: typeof tip.name === 'string' ? tip.name : '',
      district: typeof tip.district === 'string' ? tip.district : '',
      address: typeof tip.address === 'string' ? tip.address : '',
      location: typeof tip.location === 'string' ? tip.location : ''
    }));
    return jsonResponse({ status: '1', tips });
  } catch {
    return errorResponse('search provider unavailable', 502);
  } finally {
    clearTimeout(timeout);
  }
}
