/*!
 * Copyright 2026, Staffbase SE and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Appel à l'endpoint interne de l'app pour l'historique de versions d'une
 * page (HORS de l'API Pages publique documentée — pas de garantie de
 * stabilité ; si la plateforme le modifie ou le retire, le widget devient
 * invisible, jamais d'erreur affichée).
 *
 * Le widget s'authentifie par les cookies de session de l'utilisateur
 * (même origine que l'app Staffbase) : `credentials: "include"`.
 * Gate vérifié le 2026-11-18 dans le contexte de la page réelle : 200 +
 * JSON correct, sans les headers de Studio.
 *
 * Réponse : `{ data: Version[], cursor }`, versions triées décroissant.
 * Le brouillon est la version virtuelle `99999` avec `isDraft: true`
 * (au plus un par page) ; il est ignoré. Pour les versions publiées,
 * `createdAt` est la date de publication de cette version.
 */

export interface PublishedDates {
  /** Date ISO de publication de la version courante (N) — null si aucune. */
  current: string | null;
  /** Date ISO de publication de la version publiée précédente (N-1) — null si une seule. */
  previous: string | null;
}

interface VersionEntry {
  createdAt?: unknown;
  isDraft?: boolean;
  version?: number;
}

/**
 * `createdAt` provient d'un JSON non typé d'un endpoint sans contrat :
 * n'accepter qu'une chaîne parseable en date, sinon null (degradé bénin :
 * le widget n'affichera jamais « Invalid Date » ni une date erronée).
 */
const publishedDateOf = (entry: VersionEntry | undefined): string | null =>
  typeof entry?.createdAt === "string" && !Number.isNaN(Date.parse(entry.createdAt))
    ? entry.createdAt
    : null;

export async function getPublishedDates(webUrl: string, pageId: string): Promise<PublishedDates> {
  const url = `${webUrl.replace(/\/+$/, "")}/api/pages/${pageId}/versions?limit=5`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API Pages versions : HTTP ${res.status} pour ${url}`);
  }
  const data = await res.json();
  const versions: VersionEntry[] = Array.isArray(data?.data) ? data.data : [];
  // Double garde-fou anti-brouillon : le marqueur `isDraft` ET l'identifiant
  // de la version virtuelle `99999` — si la plateforme en retire un,
  // l'autre continue d'exclure le brouillon (Review Focus n°1).
  const published = versions.filter((v) => v && !v.isDraft && v.version !== 99999);
  return {
    current: publishedDateOf(published[0]),
    previous: publishedDateOf(published[1]),
  };
}
