// api/gemini.js — Vercel Serverless Function
// מסתיר את GEMINI_API_KEY מהצד הלקוח
// משתנה סביבה ב-Vercel: GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { messages, systemPrompt, mode } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  // בנה את ה-contents עבור Gemini
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt || 'אתה עוזר AI של מערכת רבנות פיקוד מרכז. ענה תמיד בעברית.' }]
    },
    contents,
    generationConfig: {
      temperature:     mode === 'brief' ? 0.3 : 0.7,
      maxOutputTokens: mode === 'brief' ? 2048 : 1024,
    }
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return res.status(response.status).json({ error: 'Gemini API error', details: err })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return res.status(200).json({ text })

  } catch (e) {
    console.error('Fetch error:', e)
    return res.status(500).json({ error: e.message })
  }
}
