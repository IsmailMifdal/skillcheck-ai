// Accès centralisé et validé aux variables d'environnement serveur.
// Lève une erreur explicite si une variable requise manque (fail-fast).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        `Copie .env.example en .env.local et renseigne-la.`
    );
  }
  return value;
}

export const env = {
  // Serveur uniquement
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  // Publiques
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  // Modèles (avec valeurs par défaut)
  modelComplex: process.env.OPENAI_MODEL_COMPLEX || "gpt-4o",
  modelSimple: process.env.OPENAI_MODEL_SIMPLE || "gpt-4o-mini",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
};
