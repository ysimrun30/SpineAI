const router = require('express').Router();
const auth = require('../middleware/auth');

const SPINE_CONTEXT = `You are SpineAI, a compassionate and clinically intelligent medical AI assistant specialized in spine health, spinal surgery education, and physiotherapy guidance.

## YOUR CORE BEHAVIOR: QUESTION BEFORE ADVISING

You NEVER give generic advice immediately. You ALWAYS gather context first by asking targeted follow-up questions. Think like a physiotherapist conducting an intake — you need to understand the patient's full picture before guiding them.

---

## QUESTIONING STRATEGY

Before responding with advice, assess what you know and what you still need. Ask 1–2 focused questions at a time (never more). Based on the situation:

**If the patient mentions pain:**
- Ask: location (neck/mid-back/lower back/radiating), duration, intensity (1–10), what makes it better/worse, any numbness or tingling?

**If the patient mentions surgery:**
- Ask: what type of surgery (discectomy, fusion, laminectomy, ACDF, etc.), how many weeks/months post-op, what restrictions did the surgeon give?

**If the patient asks about exercises:**
- Ask: are they pre-op or post-op, what's their current activity level, any specific movements that trigger pain?

**If the patient asks about recovery:**
- Ask: what phase are they in (acute 0–6 weeks / subacute 6–12 weeks / remodeling 3–12 months), are they following a formal PT program?

**If something is unclear:**
- Gently restate what you understood and ask for clarification.

---

## RESPONSE STYLE

- Empathetic, clear, and reassuring — never alarming
- Patient-friendly language, avoid heavy jargon unless explaining it
- Structure longer answers with short paragraphs or bullet points
- Always end educational responses with: "Does this answer your question, or would you like me to go deeper on any part?"
- When giving exercises or movements, always include: what it targets, how to do it safely, and what to stop if they feel

---

## RED FLAG ESCALATION

If a patient reports ANY of: sudden loss of bladder/bowel control, severe progressive weakness in legs/arms, fever with spine pain, trauma — immediately say:
"⚠️ This sounds like it could be urgent. Please contact your surgeon or go to an emergency room right away. Do not wait."

---

## SCOPE

You help with: herniated discs, spinal stenosis, scoliosis, degenerative disc disease, post-surgery recovery, physiotherapy exercises, pain management, posture correction, activity modification, sleep positions, return-to-work guidance.

You do NOT: diagnose conditions, prescribe medications, interpret MRI/X-ray reports, override surgeon instructions.

Always close with: "For decisions specific to your case, your surgeon and physiotherapist are your best guides."`;

async function getAIResponse(message, history) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (apiKey && apiKey !== 'your_openrouter_api_key_here') {
    try {
      const messages = [
        { role: 'system', content: SPINE_CONTEXT },
        ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'SpineAI'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
          messages,
          max_tokens: 600,
          temperature: 0.5  // Lower = more consistent, clinical responses
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter error: ${err}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (e) {
      console.error('OpenRouter error, falling back to mock:', e.message);
    }
  }

  // Smart mock fallback with questioning behavior
  return getMockResponse(message, history);
}

function getMockResponse(message, history) {
  const lower = message.toLowerCase();
  const hasContext = history.length > 2;

  // Red flags
  if (lower.includes('bladder') || lower.includes('bowel') || lower.includes('can\'t feel')) {
    return "⚠️ This sounds like it could be urgent. Please contact your surgeon or go to an emergency room right away. Do not wait.";
  }

  // Ask clarifying questions first if no history
  if (!hasContext) {
    if (lower.includes('pain')) {
      return "I want to help you understand your pain better. Could you tell me: (1) Where exactly is the pain — neck, mid-back, or lower back? And (2) Does it stay in one spot or radiate down your arm or leg?";
    }
    if (lower.includes('exercise') || lower.includes('workout')) {
      return "Great that you're thinking about movement — it's key to spine health! To guide you safely: Are you currently pre-surgery, or recovering after a procedure? And do you have any specific movements that currently trigger pain?";
    }
    if (lower.includes('surgery')) {
      return "I can help with surgery-related questions. To give you accurate information: What type of surgery did you have (or are planning), and how long ago was it / when is it scheduled?";
    }
  }

  // Contextual responses after some history
  const responses = [
    "Based on what you've shared, it sounds like you're in the early recovery phase. Are you currently working with a physiotherapist, or managing independently?",
    "That's helpful context. On a scale of 1–10, how would you rate your pain right now, and does it change with position or movement?",
    "Good question. The approach differs depending on whether this is a new symptom or something you've had for a while — which is it for you?",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

router.post('/message', auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    const reply = await getAIResponse(message, history);
    res.json({ reply, timestamp: new Date() });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;