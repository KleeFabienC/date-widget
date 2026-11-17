/**
 * Appels à l'API Pages Staffbase (beta).
 *
 * Le widget s'authentifie par les cookies de session de l'utilisateur
 * (même origine que l'app Staffbase) : `credentials: "include"`.
 * Gate vérifié le 2026-11-17 sur l'instance réelle : 200 + `publishedAt`.
 */

export interface PageDates {
  publishedAt: string | null;
  updatedAt: string | null;
}

export async function getPageDates(webUrl: string, pageId: string): Promise<PageDates> {
  const url = `${webUrl.replace(/\/+$/, "")}/api/pages/${pageId}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API Pages : HTTP ${res.status} pour ${url}`);
  }
  const data = await res.json();
  return {
    publishedAt: data.publishedAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}
