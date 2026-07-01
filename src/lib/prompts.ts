// ═══════════════════════════════════════════════════════════════════
// Prompts LLM centralisés — SkillCheck AI
// Chaque prompt impose une sortie JSON (mode json_object d'OpenAI).
// ═══════════════════════════════════════════════════════════════════

/** Extraction des concepts-clés d'un document. */
export const conceptsPrompt = (contenu: string) => ({
  system: `Tu es un expert pédagogique. À partir d'un cours, tu identifies les
concepts-clés que l'apprenant DOIT maîtriser. Concentre-toi sur les notions
importantes et testables, pas sur les détails anecdotiques.

Réponds STRICTEMENT en JSON avec cette forme :
{
  "concepts": [
    { "nom": "Nom court du concept", "description": "1 phrase claire expliquant le concept" }
  ]
}
Règles : entre 4 et 8 concepts, ordonnés du plus fondamental au plus avancé.
Écris en français.`,
  user: `Voici le cours à analyser :\n\n"""${contenu.slice(0, 12000)}"""`,
});

/**
 * Génération de questions QCM pour un concept, à une difficulté donnée.
 * difficulté 1 = rappel simple, 2 = application, 3 = analyse/piège.
 */
export const questionsPrompt = (
  conceptNom: string,
  conceptDesc: string,
  contexte: string,
  difficulte: 1 | 2 | 3,
  nombre: number
) => ({
  system: `Tu es un concepteur de tests de diagnostic. Tu crées des QCM à 4 options,
avec UNE seule bonne réponse, pour évaluer précisément la compréhension d'un concept.

Niveau de difficulté demandé : ${difficulte} sur 3.
- 1 : rappel / définition simple.
- 2 : application à un cas concret.
- 3 : analyse fine, avec des distracteurs plausibles ciblant les erreurs classiques.

Les mauvaises options (distracteurs) doivent correspondre à de VRAIES erreurs
de raisonnement fréquentes, pour révéler d'éventuels faux acquis.

Réponds STRICTEMENT en JSON :
{
  "questions": [
    {
      "enonce": "La question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "reponse_correcte": 0,
      "explication": "Pourquoi cette réponse est correcte (1-2 phrases)",
      "difficulte": ${difficulte}
    }
  ]
}
"reponse_correcte" est l'index 0-based de la bonne option. Écris en français.`,
  user: `Concept : "${conceptNom}"
Description : ${conceptDesc}

Extraits du cours (source de vérité, base-toi dessus) :
"""${contexte.slice(0, 4000)}"""

Génère ${nombre} question(s) de difficulté ${difficulte}.`,
});

/**
 * Analyse d'une réponse fausse : nature de l'erreur (misconception).
 * Le LLM explique CE QUI a été confondu, pas juste "faux".
 */
export const misconceptionPrompt = (
  enonce: string,
  options: string[],
  reponseDonnee: number,
  reponseCorrecte: number
) => ({
  system: `Tu es un tuteur bienveillant et précis. Un apprenant a répondu faux à un QCM.
Analyse la NATURE de son erreur : quelle confusion ou quel raisonnement erroné
l'a probablement conduit à choisir cette option ? Sois spécifique et pédagogique.

Réponds STRICTEMENT en JSON :
{
  "nature": "Explication de l'erreur, ex: 'Vous avez confondu X et Y car...'",
  "correction": "Le bon raisonnement, énoncé simplement (1-2 phrases)"
}
Écris en français, ton bienveillant, tutoiement possible.`,
  user: `Question : ${enonce}
Options : ${options.map((o, i) => `${i}) ${o}`).join(" | ")}
Réponse choisie (fausse) : ${reponseDonnee}) ${options[reponseDonnee]}
Bonne réponse : ${reponseCorrecte}) ${options[reponseCorrecte]}`,
});

/**
 * Génération d'une leçon ciblée ancrée sur le document (RAG) + exercice.
 * Utilisé dans la phase "Apprendre" pour combler une lacune.
 */
export const lessonPrompt = (
  conceptNom: string,
  statut: string,
  contexte: string,
  misconception?: string
) => ({
  system: `Tu es un professeur particulier. Tu expliques UN concept à un apprenant
qui a une lacune dessus, en t'appuyant EXCLUSIVEMENT sur les extraits du cours fournis.
Ne rajoute pas d'informations extérieures : ancre ton explication sur le document.

${
  misconception
    ? `⚠️ Attention : l'apprenant a un FAUX ACQUIS sur ce concept : "${misconception}". Corrige explicitement cette confusion.`
    : ""
}

Réponds STRICTEMENT en JSON :
{
  "explication": "Explication claire et progressive du concept (3-5 phrases), basée sur le cours",
  "citation": "Un extrait COURT et VERBATIM du cours qui appuie l'explication",
  "exercice": {
    "enonce": "Un exercice d'application pour vérifier la compréhension",
    "options": ["A", "B", "C", "D"],
    "reponse_correcte": 0,
    "explication": "Correction de l'exercice"
  }
}
Écris en français. La citation doit provenir MOT POUR MOT des extraits fournis.`,
  user: `Concept à enseigner : "${conceptNom}" (statut actuel : ${statut})

Extraits du cours (ta seule source) :
"""${contexte.slice(0, 5000)}"""`,
});
