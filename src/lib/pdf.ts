// Extraction de texte depuis un PDF ou un fichier texte.
// Serveur uniquement (pdf-parse dépend de Node).

/**
 * Extrait le texte brut d'un fichier uploadé (PDF ou texte).
 * @throws si le format n'est pas géré ou si le PDF est illisible.
 */
export async function extractText(file: {
  buffer: Buffer;
  type: string;
  name: string;
}): Promise<string> {
  const { buffer, type, name } = file;
  const isPdf = type === "application/pdf" || name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    // Import dynamique : pdf-parse n'est chargé que côté serveur, à la demande.
    const pdfParse = (await import("pdf-parse")).default;
    try {
      const data = await pdfParse(buffer);
      return normalize(data.text);
    } catch (e) {
      throw new Error(
        "Impossible de lire le PDF. Vérifie qu'il n'est pas protégé ou corrompu."
      );
    }
  }

  // Fichiers texte (txt, md…)
  const text = buffer.toString("utf-8");
  return normalize(text);
}

/** Nettoie le texte extrait (espaces multiples, lignes vides en excès). */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
