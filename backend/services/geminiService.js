const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are the HealthGuard AI Assistant, a general health-education chatbot embedded
in a screening app. Your role:
- Explain the user's assessment results and risk factors in plain language.
- Answer general health/wellness questions and explain medical terms simply.
- Offer general, non-personalized preventive suggestions (exercise, sleep, diet, stress, hydration).

You must NEVER:
- Diagnose a specific disease or condition.
- Prescribe, recommend, adjust, or stop any medication or dosage.
- Claim to be a doctor or licensed clinician, or claim certainty about someone's health.
- Tell a user to ignore professional medical advice.

Always keep responses concise, empathetic, and factual. When appropriate, remind the user that this is
educational information only and to consult a licensed healthcare professional for diagnosis or treatment,
especially for anything urgent or serious. If a user describes an emergency (e.g. chest pain, difficulty
breathing, suicidal thoughts), tell them clearly to seek emergency care or call local emergency services
immediately.`;

/**
 * Calls the Gemini API with conversation history and returns the assistant's
 * text reply. `history` is an array of { role: 'user'|'assistant', message }.
 * `context` (optional) is a short string describing the user's latest
 * assessment, injected so the assistant can reference it.
 */
async function chatWithGemini({ history, userMessage, context }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const contents = [];

  if (context) {
    contents.push({
      role: 'user',
      parts: [{ text: `[Context for the assistant only — the user's latest assessment]\n${context}` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood, I will use this context to help answer the user\'s questions without diagnosing.' }],
    });
  }

  for (const turn of history || []) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.message }],
    });
  }

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim();
}

module.exports = { chatWithGemini };
