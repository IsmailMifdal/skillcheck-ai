import { withAuth, ok, ApiError } from "@/lib/api";
import { extractText } from "@/lib/pdf";
import { ingestDocument } from "@/lib/services";

// Uploads peuvent être longs (extraction + vectorisation + LLM) → runtime Node.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/documents
 * Reçoit un fichier (PDF/texte) en multipart, l'ingère intégralement
 * (RAG + concepts + questions + session) et renvoie l'id de session.
 */
export const POST = withAuth(async ({ user, req }) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new ApiError("Aucun fichier fourni.");
  }

  // Garde-fous : taille et type.
  const MAX = 8 * 1024 * 1024; // 8 Mo
  if (file.size > MAX) throw new ApiError("Fichier trop volumineux (max 8 Mo).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const contenu = await extractText({
    buffer,
    type: file.type,
    name: file.name,
  });

  if (contenu.trim().length < 200) {
    throw new ApiError(
      "Le document est trop court ou illisible (moins de 200 caractères de texte extrait)."
    );
  }

  const titre = file.name.replace(/\.[^.]+$/, "") || "Document";
  const { sessionId, documentId } = await ingestDocument(
    user.id,
    titre,
    contenu
  );

  return ok({ sessionId, documentId }, 201);
});
