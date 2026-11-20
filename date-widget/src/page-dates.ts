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
 * Appel à l'API Pages Staffbase (beta), gate vérifié le 2026-11-17 sur
 * l'instance réelle : `GET {webUrl}/api/pages/{pageId}` renvoie la page
 * courante. Si la plateforme retire ou modifie cet endpoint, le widget
 * devient invisible, jamais d'erreur affichée.
 *
 * `publishedAt` est absent du JSON quand la page n'a jamais été publiée.
 *
 * Le widget s'authentifie par les cookies de session de l'utilisateur
 * (même origine que l'app Staffbase) : `credentials: "include"`.
 */

export interface PageDates {
  /** Date ISO de création de la page — null si absente ou invalide. */
  createdAt: string | null;
  /** Date ISO de publication — null si la page n'a jamais été publiée. */
  publishedAt: string | null;
}

/**
 * Les dates proviennent d'un JSON non typé : n'accepter qu'une chaîne
 * parseable en date, sinon null (degradé bénin : le widget n'affichera
 * jamais « Invalid Date » ni une date erronée).
 */
const isoDateOrNull = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

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
    createdAt: isoDateOrNull(data?.createdAt),
    publishedAt: isoDateOrNull(data?.publishedAt),
  };
}
