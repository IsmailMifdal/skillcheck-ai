import OpenAI from "openai";
import { env } from "./env";

// ⚠️ Ce module ne doit être importé que depuis du code serveur (API routes).
// La clé OpenAI n'est jamais exposée au client.

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

type Complexity = "complex" | "simple";

/**
 * Appelle un chat completion en mode JSON structuré et parse le résultat.
 * - `complexity` : "complex" → GPT-4o, "simple" → GPT-4o-mini.
 * - Le prompt DOIT demander une sortie JSON (contrainte du mode json_object).
 *
 * @throws si la réponse est vide ou n'est pas un JSON valide.
 */
export async function completeJSON<T>(opts: {
  system: string;
  user: string;
  complexity?: Complexity;
  temperature?: number;
}): Promise<T> {
  const { system, user, complexity = "complex", temperature = 0.3 } = opts;
  const model = complexity === "complex" ? env.modelComplex : env.modelSimple;

  const res = await getClient().chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse LLM vide.");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("Réponse LLM invalide (JSON non parsable).");
  }
}

/** Génère les embeddings d'une liste de textes (batch). */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];
  const batchSize = 64;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await getClient().embeddings.create({
      model: env.embeddingModel,
      input: batch,
    });
    embeddings.push(...res.data.map((d) => d.embedding));
  }

  return embeddings;
}

/** Embedding d'un seul texte (requête RAG). */
export async function embedOne(text: string): Promise<number[]> {
  const [e] = await embed([text]);
  return e;
}
