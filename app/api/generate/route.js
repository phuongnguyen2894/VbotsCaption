async function callOllama(prompt) {
  const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'mistral';
  
  return fetch(`${apiUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      temperature: 0.9,
    }),
  });
}

export async function POST(request) {
  const { topic, tagsAndKeywords, charLimit } = await request.json();

  if (!topic?.trim()) {
    return Response.json({ error: 'Topic is required' }, { status: 400 });
  }

  const tagsLine = tagsAndKeywords?.trim()
    ? `\nKeywords & hashtags (do NOT include in the caption itself): ${tagsAndKeywords}`
    : '';

  const prompt = `Generate 1 X (Twitter) post caption about: "${topic}"
Tone: Inspirational${tagsLine}

Rules:
- Caption must be strictly under ${charLimit || 280} characters
- Do NOT include any hashtags or keywords in the caption text
- Make it punchy, engaging, and share-worthy
- Return ONLY the raw caption text — no quotes, no explanation, no JSON`;

  try {
    const res = await callOllama(prompt);

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      if (res.status === 503) {
        return Response.json(
          { error: 'Ollama is not running. Please start Ollama on your machine.' },
          { status: 503 }
        );
      }
      return Response.json(
        { error: err || `Ollama API error ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = data.response?.trim() || '';
    const caption = raw.replace(/^["']|["']$/g, '').trim();
    
    if (!caption) {
      return Response.json(
        { error: 'Failed to generate caption. Try again.' },
        { status: 502 }
      );
    }

    return Response.json({ caption });
  } catch (e) {
    return Response.json(
      { error: `Connection error: ${e.message}. Is Ollama running?` },
      { status: 503 }
    );
  }
}
