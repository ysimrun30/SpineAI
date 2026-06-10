const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// ====== DIET PLAN TEMPLATES (fallback when AI unavailable) ======
const DIET_TEMPLATES = {
  post_op_veg: {
    title: 'Post-Surgery Vegetarian Recovery Diet',
    meals: [
      {
        type: 'breakfast', time: '7:30 AM',
        items: ['Oatmeal with almonds and banana', 'Turmeric milk (golden latte)', 'Boiled eggs or paneer cubes'],
        nutrients: 'Protein + Anti-inflammatory + Calcium'
      },
      {
        type: 'mid_morning', time: '10:00 AM',
        items: ['Greek yogurt with flaxseeds', 'Handful of walnuts'],
        nutrients: 'Omega-3 + Probiotics'
      },
      {
        type: 'lunch', time: '1:00 PM',
        items: ['Brown rice / roti', 'Dal (lentil soup)', 'Palak paneer or tofu stir-fry', 'Salad with olive oil dressing'],
        nutrients: 'Iron + Protein + Fiber'
      },
      {
        type: 'evening_snack', time: '4:30 PM',
        items: ['Fresh fruit (papaya / orange)', 'Roasted chana or makhana'],
        nutrients: 'Vitamin C + Calcium'
      },
      {
        type: 'dinner', time: '7:30 PM',
        items: ['Multigrain roti', 'Mixed vegetable curry', 'Curd / buttermilk'],
        nutrients: 'Fiber + Probiotics'
      }
    ],
    guidelines: [
      'Increase protein intake for tissue repair (dal, paneer, tofu, eggs)',
      'Include anti-inflammatory foods: turmeric, ginger, garlic',
      'Calcium-rich foods for bone healing: dairy, ragi, sesame seeds',
      'Stay hydrated — aim for 2.5-3L water daily',
      'Avoid: processed foods, excess sugar, fried foods, alcohol'
    ]
  },
  post_op_non_veg: {
    title: 'Post-Surgery Non-Vegetarian Recovery Diet',
    meals: [
      {
        type: 'breakfast', time: '7:30 AM',
        items: ['Scrambled eggs with spinach', 'Whole wheat toast', 'Turmeric milk'],
        nutrients: 'Protein + Iron + Anti-inflammatory'
      },
      {
        type: 'mid_morning', time: '10:00 AM',
        items: ['Bone broth', 'Mixed nuts (almonds, walnuts)'],
        nutrients: 'Collagen + Omega-3'
      },
      {
        type: 'lunch', time: '1:00 PM',
        items: ['Brown rice / quinoa', 'Grilled chicken breast or fish curry', 'Steamed vegetables', 'Salad with lemon dressing'],
        nutrients: 'Lean Protein + Fiber + Vitamin C'
      },
      {
        type: 'evening_snack', time: '4:30 PM',
        items: ['Fresh fruit smoothie with protein powder', 'Handful of seeds (pumpkin, sunflower)'],
        nutrients: 'Vitamins + Zinc'
      },
      {
        type: 'dinner', time: '7:30 PM',
        items: ['Grilled fish / chicken soup', 'Steamed broccoli and carrots', 'Small portion of rice or roti'],
        nutrients: 'Omega-3 + Vitamins + Light carbs'
      }
    ],
    guidelines: [
      'Prioritize lean proteins: chicken breast, fish (salmon, sardines)',
      'Bone broth aids joint and disc recovery — have 1 cup daily',
      'Include fatty fish 2-3x per week for omega-3 anti-inflammatory benefits',
      'Calcium-rich foods: dairy, sardines, leafy greens',
      'Stay hydrated — aim for 2.5-3L water daily',
      'Avoid: red meat excess, processed foods, fried foods, alcohol'
    ]
  },
  pre_op_general: {
    title: 'Pre-Surgery Preparation Diet',
    meals: [
      {
        type: 'breakfast', time: '7:30 AM',
        items: ['Whole grain cereal with milk', 'Fresh fruit', 'Green tea'],
        nutrients: 'Fiber + Vitamins + Antioxidants'
      },
      {
        type: 'mid_morning', time: '10:00 AM',
        items: ['Protein shake or yogurt', 'Almonds'],
        nutrients: 'Protein + Healthy fats'
      },
      {
        type: 'lunch', time: '1:00 PM',
        items: ['Lean protein (chicken / paneer / tofu)', 'Complex carbs (brown rice / sweet potato)', 'Large salad'],
        nutrients: 'Balanced macros for strength'
      },
      {
        type: 'evening_snack', time: '4:30 PM',
        items: ['Fruit + nut butter', 'Herbal tea'],
        nutrients: 'Energy + Micronutrients'
      },
      {
        type: 'dinner', time: '7:30 PM',
        items: ['Light soup', 'Grilled vegetables', 'Small protein portion'],
        nutrients: 'Easy digestion + Nutrients'
      }
    ],
    guidelines: [
      'Build nutritional reserves before surgery',
      'Focus on vitamin C for wound healing preparation',
      'Increase iron-rich foods to prepare for blood loss',
      'Reduce sodium to minimize post-surgical swelling',
      'Stop alcohol at least 2 weeks before surgery',
      'Discuss any supplements with your surgeon'
    ]
  }
};

// Medicine-diet interaction rules
const MEDICINE_DIET_RULES = {
  'warfarin': { avoid: ['vitamin K rich foods (spinach, kale, broccoli in excess)'], note: 'Maintain consistent vitamin K intake — don\'t suddenly increase or decrease green leafy vegetables' },
  'blood thinner': { avoid: ['excessive garlic supplements', 'ginkgo biloba', 'fish oil in high doses'], note: 'Moderate ginger and turmeric; avoid cranberry juice in excess' },
  'metformin': { avoid: ['excessive alcohol'], note: 'Take with meals to reduce stomach upset; ensure adequate B12 intake' },
  'calcium supplement': { avoid: ['taking iron and calcium together'], note: 'Space calcium and iron supplements by 2 hours; dairy enhances absorption' },
  'iron supplement': { avoid: ['tea/coffee with meals', 'dairy at same time'], note: 'Take with vitamin C (orange juice) for better absorption' },
  'prednisone': { avoid: ['high sodium foods', 'excessive sugar'], note: 'Increase calcium and vitamin D intake; corticosteroids can weaken bones' },
  'steroid': { avoid: ['high sodium foods', 'excessive sugar'], note: 'Monitor blood sugar; increase potassium-rich foods (bananas, sweet potatoes)' },
  'nsaid': { avoid: ['alcohol', 'spicy foods on empty stomach'], note: 'Always take NSAIDs with food to protect stomach lining' },
  'ibuprofen': { avoid: ['alcohol', 'taking on empty stomach'], note: 'Take with food or milk; stay hydrated' },
  'gabapentin': { avoid: ['alcohol'], note: 'Can be taken with or without food; may increase appetite — watch portions' },
  'pregabalin': { avoid: ['alcohol'], note: 'May cause weight gain; focus on portion control and high-fiber foods' },
  'opioid': { avoid: ['alcohol', 'grapefruit'], note: 'Increase fiber and water intake to prevent constipation — common side effect' },
  'tramadol': { avoid: ['alcohol', 'grapefruit'], note: 'High fiber diet essential; constipation is very common' },
  'muscle relaxant': { avoid: ['alcohol', 'sedating herbs'], note: 'Stay hydrated; these can cause dry mouth' },
  'vitamin d': { avoid: [], note: 'Take with fatty food for better absorption; pair with calcium' },
  'bisphosphonate': { avoid: ['calcium supplements at same time', 'coffee/tea within 30 min'], note: 'Take on empty stomach with plain water; wait 30 min before eating' }
};

function getMedicineDietInteractions(medicines) {
  const interactions = [];
  if (!medicines || medicines.length === 0) return interactions;

  medicines.forEach(med => {
    const medName = (med.name || '').toLowerCase();
    Object.entries(MEDICINE_DIET_RULES).forEach(([drug, rules]) => {
      if (medName.includes(drug)) {
        interactions.push({
          medicine: med.name,
          dosage: med.dosage,
          avoid: rules.avoid,
          dietaryNote: rules.note
        });
      }
    });
  });
  return interactions;
}

// GET /api/diet-plan — get current diet plan
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('dietPlan medicines medicalData condition recoveryPhase');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const medicineInteractions = getMedicineDietInteractions(user.medicines);

    res.json({
      dietPlan: user.dietPlan || null,
      medicineInteractions,
      hasMedicines: (user.medicines || []).length > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/diet-plan/generate — generate diet plan
router.post('/generate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const preferences = req.body.preferences || user.dietPlan?.preferences || {};
    const medicineInteractions = getMedicineDietInteractions(user.medicines);

    let plan;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (apiKey && apiKey !== 'your_openrouter_api_key_here') {
      try {
        plan = await generateAIDietPlan(user, preferences, medicineInteractions);
      } catch (e) {
        console.error('AI diet plan generation failed, using template:', e.message);
        plan = getTemplatePlan(user, preferences);
      }
    } else {
      plan = getTemplatePlan(user, preferences);
    }

    // Append medicine-specific dietary notes
    if (medicineInteractions.length > 0) {
      plan.medicineGuidelines = medicineInteractions.map(i => ({
        medicine: i.medicine,
        dosage: i.dosage,
        note: i.dietaryNote,
        avoid: i.avoid
      }));
    }

    user.dietPlan = {
      preferences,
      plan,
      generatedAt: new Date()
    };
    await user.save();

    res.json({
      dietPlan: user.dietPlan,
      medicineInteractions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/diet-plan/preferences — update preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { dietType, allergies, budget, region } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 'dietPlan.preferences': { dietType, allergies, budget, region } },
      { new: true }
    ).select('dietPlan');
    res.json(user.dietPlan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getTemplatePlan(user, preferences) {
  const isPostOp = user.medicalData?.surgeryStatus === 'post_op' || user.condition === 'post_surgery';
  const isVeg = preferences.dietType === 'veg' || preferences.dietType === 'vegan';

  let template;
  if (isPostOp && isVeg) template = DIET_TEMPLATES.post_op_veg;
  else if (isPostOp) template = DIET_TEMPLATES.post_op_non_veg;
  else template = DIET_TEMPLATES.pre_op_general;

  // Customize based on allergies
  const plan = JSON.parse(JSON.stringify(template));
  if (preferences.allergies && preferences.allergies.length > 0) {
    plan.allergyWarning = `⚠️ You have allergies to: ${preferences.allergies.join(', ')}. Please substitute any items containing these ingredients.`;
  }

  return plan;
}

async function generateAIDietPlan(user, preferences, medicineInteractions) {
  const medicineContext = medicineInteractions.length > 0
    ? `\n\nIMPORTANT MEDICINE CONSIDERATIONS:\n${medicineInteractions.map(i =>
        `- ${i.medicine} (${i.dosage}): ${i.dietaryNote}. Avoid: ${i.avoid.join(', ')}`
      ).join('\n')}`
    : '';

  const prompt = `Generate a detailed daily diet plan for a spine surgery patient:

Patient Details:
- Condition: ${user.condition?.replace(/_/g, ' ')}
- Recovery Phase: ${user.recoveryPhase}
- Surgery Status: ${user.medicalData?.surgeryStatus || 'unknown'}
- Age: ${user.age || 'unknown'}
- Pain Level: ${user.painLevel}/10

Diet Preferences:
- Type: ${preferences.dietType || 'no preference'}
- Allergies: ${(preferences.allergies || []).join(', ') || 'none'}
- Budget: ${preferences.budget || 'medium'}
- Region/Cuisine: ${preferences.region || 'general'}
${medicineContext}

Respond ONLY with valid JSON in this format:
{
  "title": "Plan name",
  "meals": [
    {"type": "breakfast", "time": "7:30 AM", "items": ["item1", "item2"], "nutrients": "key nutrients"},
    {"type": "mid_morning", "time": "10:00 AM", "items": [...], "nutrients": "..."},
    {"type": "lunch", "time": "1:00 PM", "items": [...], "nutrients": "..."},
    {"type": "evening_snack", "time": "4:30 PM", "items": [...], "nutrients": "..."},
    {"type": "dinner", "time": "7:30 PM", "items": [...], "nutrients": "..."}
  ],
  "guidelines": ["guideline1", "guideline2", ...],
  "focusNutrients": ["calcium", "protein", "vitamin D", ...]
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.4
    })
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`);

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');

  return JSON.parse(jsonMatch[0]);
}

module.exports = router;
