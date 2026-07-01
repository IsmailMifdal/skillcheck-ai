// Petit wrapper fetch côté client avec gestion d'erreur uniforme.
// Lève une Error avec le message renvoyé par l'API (champ { error }).

export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const isJson = res.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(body?.error || `Erreur ${res.status}`);
  }
  return body as T;
}
