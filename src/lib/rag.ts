import { insertDocumentChunks, getDocumentChunks } from "./sqlite";

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

    // Fin du document atteinte → on s'arrête (évite une boucle infinie sur
    // la dernière fenêtre, quand end - overlap ne progresse plus).
    if (end >= clean.length) break;

    // Avance en garantissant TOUJOURS une progression (au moins +1 caractère).
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
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
  let chunks = chunkText(text);

  // Garde-fou : borne le nombre de chunks pour un document géant (coût/temps).
  const MAX_CHUNKS = 400;
  if (chunks.length > MAX_CHUNKS) chunks = chunks.slice(0, MAX_CHUNKS);

  const rows = chunks.map((contenu, i) => ({
    document_id: documentId,
    chunk_index: i,
    contenu,
  }));

  insertDocumentChunks(rows);
  return [];
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
  const chunks = getDocumentChunks(documentId);
  const terms = tokenize(query);

  return chunks
    .map((chunk) => ({
      ...chunk,
      similarity: scoreChunk(chunk.contenu, terms),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);
}

function scoreChunk(text: string, terms: string[]) {
  const haystack = tokenize(text).join(" ");
  if (terms.length === 0) return 0;
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}
