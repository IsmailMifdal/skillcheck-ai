import { embed, embedOne } from "./openai";
import { createAdminSupabase } from "./supabase/server";

// ═══════════════════════════════════════════════════════════════════
// Service RAG : chunking, vectorisation et recherche sémantique.
// ═══════════════════════════════════════════════════════════════════

const CHUNK_SIZE = 900; // ~caractères par chunk
const CHUNK_OVERLAP = 150; // chevauchement pour ne pas couper le contexte

/**
 * Découpe un texte en chunks avec chevauchement, en respectant au mieux
 * les frontières de paragraphes/phrases.
 */
export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);

    // Tente de couper sur une fin de phrase/paragraphe proche.
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? ")
      );
      if (lastBreak > CHUNK_SIZE * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Vectorise un document : découpe, calcule les embeddings et les stocke.
 * Retourne l'embedding "global" (moyenne des chunks) pour la colonne documents.
 */
export async function vectorizeDocument(
  documentId: string,
  text: string
): Promise<number[]> {
  const supabase = createAdminSupabase();
  const chunks = chunkText(text);

  // Embeddings par batch (OpenAI accepte plusieurs entrées).
  const embeddings = await embed(chunks);

  const rows = chunks.map((contenu, i) => ({
    document_id: documentId,
    chunk_index: i,
    contenu,
    embedding: embeddings[i] as unknown as string, // pgvector accepte le tableau
  }));

  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw new Error(`Échec de la vectorisation : ${error.message}`);

  // Embedding global = moyenne composante par composante.
  return averageVectors(embeddings);
}

/** Moyenne d'une liste de vecteurs (même dimension). */
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= vectors.length;
  return avg;
}

export interface RetrievedChunk {
  contenu: string;
  chunk_index: number;
  similarity: number;
}

/**
 * Recherche les passages du document les plus pertinents pour une requête.
 * Base de l'ancrage RAG (citations sourcées) des leçons.
 */
export async function retrieveContext(
  documentId: string,
  query: string,
  matchCount = 4
): Promise<RetrievedChunk[]> {
  const supabase = createAdminSupabase();
  const queryEmbedding = await embedOne(query);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding as unknown as string,
    p_document_id: documentId,
    match_count: matchCount,
  });

  if (error) throw new Error(`Échec de la recherche RAG : ${error.message}`);
  return (data ?? []) as RetrievedChunk[];
}
