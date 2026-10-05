// Cloudflare Pages Function: /api/workout-ai
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Gemini-Key',
      'Cache-Control': 'no-cache'
    }
  });
}

export async function onRequestOptions() {
  return jsonResponse({ ok: true });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const action = body.action || 'suggest_workout';

    // Extract API key from Cloudflare secrets or fallback client header/body
    const apiKey = (
      context.env?.GEMINI_API_KEY ||
      context.request.headers.get('X-Gemini-Key') ||
      body.apiKey ||
      ''
    ).trim();

    if (!apiKey) {
      return jsonResponse({
        error: 'Clé GEMINI_API_KEY manquante. Veuillez configurer le secret GEMINI_API_KEY dans Cloudflare Pages ou renseigner votre clé dans les Paramètres.'
      }, 401);
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'suggest_workout') {
      systemPrompt = `Tu es un préparateur physique et coach de musculation expert, direct et motivant.
Ta mission est de proposer une séance d'entraînement optimisée, équilibrée et réaliste (4 à 6 exercices maximum), adaptée aux muscles reposés de l'utilisateur.
Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide (sans markdown de code, sans texte avant ou après).
RÈGLE SYNTAXE JSON OBLIGATOIRE : N'utilise AUCUN guillemet double (") à l'intérieur des chaînes de texte (utilise des apostrophes ' ou des guillemets français « » si nécessaire). Tout guillemet double doit être strictement réservé à la structure JSON. Ne produis aucun saut de ligne non échappé.
Schéma JSON strict attendu :
{
  "workoutName": "Nom clair et motivant de la séance (ex: Séance Dos, Épaules & Biceps)",
  "rationale": "1 phrase claire expliquant pourquoi cette séance est programmée aujourd'hui selon la récupération.",
  "exercises": [
    {
      "exerciseId": "identifiant court ou nom standard",
      "name": "Nom standard de l'exercice",
      "muscleGroup": "chest" | "back" | "shoulders" | "arms" | "quads" | "hamstrings" | "abs",
      "equipment": "machine" | "dumbbell" | "barbell" | "bodyweight",
      "targetSets": 4,
      "targetReps": "8-10",
      "restSeconds": 90,
      "coachingTip": "Conseil technique d'exécution ou tempo (1 phrase sans guillemets doubles)"
    }
  ],
  "estimatedDurationMinutes": 50,
  "focusSummary": "Court résumé du volume et des groupes ciblés"
}`;

      userPrompt = `Voici mon profil et l'historique de mes séances récentes :
Historique récent des séances :
${JSON.stringify(body.recentWorkouts || [], null, 2)}

État estimé de récupération de mes muscles :
${JSON.stringify(body.recoveryStatus || {}, null, 2)}

Préférence ou envie exprimée pour aujourd'hui :
"${body.preference || 'Séance adaptative libre selon les muscles les plus frais'}"

Liste des exercices que je pratique d'habitude :
${JSON.stringify(body.availableExercises || [], null, 2)}

Génère la séance idéale pour aujourd'hui au format JSON strict.`;

    } else if (action === 'smart_exercise_tip') {
      systemPrompt = `Tu es un coach de musculation expert en surcharge progressive et gestion de la fatigue (RPE / RIR).
Analyse les performances passées sur cet exercice et donne un conseil tactique court, percutant et ultra-actionnable (1 à 2 phrases max) pour la séance d'aujourd'hui.
Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide.
Schéma JSON attendu :
{
  "tip": "Conseil direct et motivant (ex: Tu as validé 70kg x 10 la semaine passée : tente 72.5kg sur la 1ère série !)",
  "suggestedWeight": 72.5,
  "suggestedReps": 8,
  "shouldPushToFailure": false,
  "rationale": "Explication brève"
}`;

      userPrompt = `Exercice actuel : ${body.exercise?.name || 'Exercice'} (${body.exercise?.muscle_group}, ${body.exercise?.equipment})
Performances lors de la dernière séance :
${JSON.stringify(body.previousSets || [], null, 2)}
Séries déjà effectuées aujourd'hui :
${JSON.stringify(body.currentSets || [], null, 2)}

Donne ton conseil tactique pour aujourd'hui en JSON strict.`;

    } else if (action === 'analyze_balance') {
      systemPrompt = `Tu es un entraîneur sportif et kinésithérapeute spécialisé en biomécanique et équilibre musculaire.
Analyse la répartition de l'entraînement de l'utilisateur sur les dernières semaines (volume par groupe musculaire, ratio Poussée/Tirage, chaîne antérieure vs postérieure).
Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide.
Schéma JSON attendu :
{
  "score": 85,
  "statusTitle": "Excellent équilibre / Attention déséquilibre poussée / etc.",
  "analysis": "Paragraphe d'analyse clair et bienveillant (3-4 phrases).",
  "pointsOfAttention": [
    "Point d'attention 1 (ex: Volume fessiers/ischios inférieur aux quadriceps)",
    "Point d'attention 2"
  ],
  "recommendedNextFocus": "Recommandation pour la prochaine séance"
}`;

      userPrompt = `Voici la répartition de mon volume d'entraînement (nombre de séries effectives) :
Volume par groupe musculaire sur 7/14 jours :
${JSON.stringify(body.volumeDistribution || {}, null, 2)}
Ratio Poussée / Tirage : ${body.pushPullRatio || '1.0'}
Nombre de séances récentes : ${body.totalSessions || 0}

Donne ton audit d'équilibre complet en JSON strict.`;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    };

    // Call Google Gemini API (starting with gemini-3.8-flash as recommended by Google)
    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastErrorMsg = '';
    let data = null;

    for (const modelName of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        data = await res.json();
        break;
      }

      const errTxt = await res.text();
      try {
        const errObj = JSON.parse(errTxt);
        lastErrorMsg = errObj.error?.message || `HTTP ${res.status}`;
      } catch (_) {
        lastErrorMsg = errTxt || `HTTP ${res.status}`;
      }

      // If the error is not about model unavailability, stop trying next models
      if (!lastErrorMsg.includes('no longer available') && !lastErrorMsg.includes('not found') && !lastErrorMsg.includes('404')) {
        break;
      }
    }

    if (!data) {
      return jsonResponse({ error: `Erreur API Google Gemini : ${lastErrorMsg}` }, 500);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse structured JSON with multi-stage sanitization
    let clean = rawText.trim();
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) clean = fenceMatch[1].trim();

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(clean);
    } catch (err1) {
      // Recovery Attempt 1: Replace unescaped newlines inside strings
      try {
        const fixedNewlines = clean.replace(/([^\\])\r?\n/g, '$1\\n');
        parsedResult = JSON.parse(fixedNewlines);
      } catch (_) {
        // Recovery Attempt 2: If Gemini cut off or unescaped quotes, throw with helpful message
        throw new Error(`Réponse JSON malformée de Gemini: ${err1.message}`);
      }
    }

    return jsonResponse({ success: true, result: parsedResult });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
