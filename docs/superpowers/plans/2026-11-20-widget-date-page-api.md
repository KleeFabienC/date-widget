# Plan d'implémentation — date-widget phase 4 : dates via l'API de la page (createdAt / publishedAt)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le widget affiche « Publié le {createdAt} · Mis à jour le {publishedAt} » lues directement dans la réponse de l'API Pages (plus d'historique de versions).

**Architecture:** On revient au mécanisme GetPage de la phase 2 (une seule requête `GET {webUrl}/api/pages/{pageId}`, auth par cookies de session) avec le nouveau mapping de champs. Le module `page-versions.ts` (endpoint interne `/versions`) est supprimé ; le composant `DateWidget` consomme `{ createdAt, publishedAt }` et applique le tableau de règles de la spec.

**Tech Stack:** Node 22, TypeScript, React, jest + @testing-library/react, webpack (bundle StaffBase).

**Spec:** `docs/superpowers/specs/2026-11-20-widget-date-page-api-design.md`

## Global Constraints

- Node 22 ; pas de changement de config (jest, webpack, tsconfig) ni de dépendance.
- Nouveau module avec le header de licence Apache existant (copier celui de `date-widget/src/page-versions.ts`).
- Jamais de « Invalid Date » ni de date erronée affichée : n'accepter qu'une **chaîne** parseable par `Date.parse`, sinon `null`.
- `credentials: "include"`, `webUrl` normalisé (barres finales absorbées), `Accept: "application/json"` ; rejet sur non-2xx avec le statut HTTP dans le message.
- `updatedAt` de la réponse : **non utilisé**, jamais affiché.
- Page jamais publiée (`publishedAt` absent) / hors Page / erreur API : rien de visible ; `console.warn` uniquement en cas d'erreur.
- Widget sans configuration (schéma vide) — ne pas toucher `configuration-schema.ts`.
- Après build, copier les deux artefacts à la racine du repo : `date-widget/dist/staffbase.date-widget.js` et `staffbase.date-widget.js.LICENSE.txt` (le `.LICENSE.txt` est référencé par la 1ʳᵉ ligne du bundle, il doit voyager avec lui).
- Push sur les **deux** remotes : `github` (déploiement GitHub Pages de la URL installée dans Staffbase) et `origin` (GitLab).

## Review Focus

1. **`updatedAt` présent dans la réponse** — un lecteur raisonnable s'attend à ne jamais le voir (non-goal spec). → test 1 de la Task 2 (chaîne exacte + `not.toMatch(/Modifié le/)`) et test 1 de la Task 1 (mapping qui l'ignore).
2. **Publication à 23 h 30 UTC vue depuis un fuseau UTC+1** — le jour affiché est celui du lecteur (choix documenté des phases 2-3, inchangé). → les tests de la Task 2 pinnent `process.env.TZ = "UTC"` ; aucun test ne « prouve » le comportement fuseau, c'est le comportement voulu.
3. **`publishedAt` valide mais `createdAt` absent ou malformé** — s'affiche « Mis à jour le {publishedAt} » seul, pas de crash ni de date vide. → test 3 de la Task 2 ; la variante malformée est composée avec les gardes de la Task 1.
4. **Forme de réponse inattendue** (JSON d'erreur, champ absent, corps non-JSON) — rien d'affiché, jamais d'exception levée dans le rendu. → Task 1 (tous les champs → `null` par défaut) + test « unpublished » de la Task 2.
5. **Widget réutilisé sur une autre page (props changés sans remontage)** — refetch + nouvelles dates, jamais de dates stale. → test « refetch on pageId change » de la Task 2.

---

### Task 1: Module `page-dates.ts` (appel API Pages)

**Files:**
- Create: `date-widget/src/page-dates.ts`
- Test: `date-widget/src/page-dates.test.ts`

**Interfaces:**
- Consumes: global `fetch`.
- Produces: `interface PageDates { createdAt: string | null; publishedAt: string | null }` et `getPageDates(webUrl: string, pageId: string): Promise<PageDates>` — rejette avec `Error` dont le message contient le statut HTTP sur non-2xx.

- [ ] **Step 1: Write the failing test**

Create `date-widget/src/page-dates.test.ts` with exactly this content (same `mockFetch` pattern as `page-versions.test.ts`):

```ts
import { getPageDates } from "./page-dates";

const WEB_URL = "https://staffbase.showcase.com";
const PAGE_ID = "6afc78e4000e7511c05ac171";

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe("getPageDates", () => {
  it("should return createdAt and publishedAt from the Pages API (updatedAt ignored)", async () => {
    mockFetch(200, {
      id: PAGE_ID,
      createdAt: "2021-06-23T08:07:13.178Z",
      updatedAt: "2021-09-03T11:37:01.760Z",
      publishedAt: "2026-11-18T09:21:17Z",
    });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    await getPageDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map a missing publishedAt to null (unpublished page)", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a malformed publishedAt to null (never « Invalid Date » downstream)", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "pas-une-date" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a non-string publishedAt to null", async () => {
    mockFetch(200, { id: PAGE_ID, createdAt: "2021-06-23T08:07:13.178Z", publishedAt: 1234567890 });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: "2021-06-23T08:07:13.178Z", publishedAt: null });
  });

  it("should map a missing or malformed createdAt to null", async () => {
    mockFetch(200, { id: PAGE_ID, publishedAt: "2026-11-18T09:21:17Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ createdAt: null, publishedAt: "2026-11-18T09:21:17Z" });
    mockFetch(200, { id: PAGE_ID, createdAt: "pas-une-date", publishedAt: "2026-11-18T09:21:17Z" });
    const dates2 = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates2).toEqual({ createdAt: null, publishedAt: "2026-11-18T09:21:17Z" });
  });

  it("should reject on non-2xx with the HTTP status (401 and 404)", async () => {
    mockFetch(401, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
    mockFetch(404, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/404/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd date-widget && npx jest src/page-dates.test.ts`
Expected: FAIL — `Cannot find module './page-dates'`.

- [ ] **Step 3: Implement `page-dates.ts`**

Create `date-widget/src/page-dates.ts` : header de licence Apache (copie de `page-versions.ts`), commentaire d'en-tête adapté (« API Pages Staffbase (beta), gate vérifié le 2026-11-17 sur l'instance réelle », `publishedAt` absent = page jamais publiée), puis :

- `interface PageDates { createdAt: string | null; publishedAt: string | null }`
- garde partagée : une valeur n'est acceptée que si `typeof value === "string" && !Number.isNaN(Date.parse(value))`, sinon `null` (même garde-fou que `publishedDateOf` dans `page-versions.ts`) ;
- `getPageDates(webUrl, pageId)` : URL `` `${webUrl.replace(/\/+$/, "")}/api/pages/${pageId}` ``, `fetch` avec `credentials: "include"` + header `Accept: application/json`, rejet `API Pages : HTTP ${res.status} pour ${url}` sur non-2xx, puis mapping `data?.createdAt` / `data?.publishedAt` via la garde.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd date-widget && npx jest src/page-dates.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add date-widget/src/page-dates.ts date-widget/src/page-dates.test.ts
git commit -m "feat: module getPageDates (API Pages — createdAt / publishedAt) — phase 4"
```

---

### Task 2: Composant `DateWidget` + tests d'intégration + suppression de `page-versions`

**Files:**
- Modify: `date-widget/src/date-widget.tsx`
- Test: `date-widget/src/date-widget.test.tsx` (réécrit)
- Modify: `date-widget/src/index.test.tsx` (mocks uniquement)
- Delete: `date-widget/src/page-versions.ts`, `date-widget/src/page-versions.test.ts`

**Interfaces:**
- Consumes: `getPageDates` / `PageDates` de la Task 1.
- Produces: rien d'extérieur (composant interne).

- [ ] **Step 1: Réécrire `date-widget/src/date-widget.test.tsx`** avec exactement ce contenu :

```tsx
process.env.TZ = "UTC";

import React from "react";
import { screen, render, waitFor } from "@testing-library/react";

import { DateWidget } from "./date-widget";

const PROPS = { pageId: "p1", webUrl: "https://staffbase.showcase.com", contentLanguage: "fr_FR" } as const;

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe("DateWidget", () => {
  it("should show « Publié le » (createdAt) and « Mis à jour le » (publishedAt) when the displayed days differ", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", updatedAt: "2021-09-03T11:37:01.760Z", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 23 juin 2021 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Modifié le/);
  });

  it("should show a single « Publié le » when both dates fall on the same displayed day", async () => {
    mockFetch(200, { id: "p1", createdAt: "2026-11-18T06:00:00Z", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should show only « Mis à jour le » when createdAt is absent", async () => {
    mockFetch(200, { id: "p1", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing when the page is unpublished (publishedAt absent)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z" });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing when publishedAt is malformed (no « Invalid Date » visible)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "pas-une-date" });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
    expect(screen.queryByText(/Publié le|Invalid Date/)).not.toBeInTheDocument();
  });

  it("should render nothing and warn when the API fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(document.body.textContent).toBe("");
  });

  it("should refetch and show the new page's dates when pageId changes (no stale state)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    const { rerender } = render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 23 juin 2021 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    mockFetch(200, { id: "p2", createdAt: "2022-01-05T08:00:00Z", publishedAt: "2026-11-20T09:00:00Z" });
    rerender(<DateWidget pageId="p2" webUrl={PROPS.webUrl} contentLanguage={PROPS.contentLanguage} />);
    expect(await screen.findByText("Publié le 5 janv. 2022 · Mis à jour le 20 nov. 2026")).toBeInTheDocument();
  });

  it("should render nothing and not fetch without pageId", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<DateWidget contentLanguage="fr_FR" />);
    expect(document.body.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd date-widget && npx jest src/date-widget.test.tsx src/index.test.tsx`
Expected: FAIL — le composant appelle encore `getPublishedDates` (structure `data`/versions), les assertions « Publié le 23 juin 2021 · Mis à jour le 18 nov. 2026 » etc. ne passent pas.

- [ ] **Step 3: Mettre à jour `date-widget/src/date-widget.tsx`**

- Import `{ getPageDates, PageDates }` depuis `./page-dates` (remplacer l'import `page-versions`).
- État `pageDates: PageDates | null` (renomme `publishedDates`) ; l'`useEffect` appelle `getPageDates(webUrl, pageId)` (même structure : reset d'état, `cancelled`, `console.warn` sur rejet).
- Rendu (remplace le bloc `currentDay`/`previousDay`) :

```tsx
const createdDay = pageDates.createdAt ? formatDate(pageDates.createdAt, contentLanguage) : null;
const publishedDay = pageDates.publishedAt ? formatDate(pageDates.publishedAt, contentLanguage) : null;
if (!publishedDay) {
  return null; // page jamais publiée (ou publishedAt non parseable)
}
if (createdDay && createdDay !== publishedDay) {
  return <div>Publié le {createdDay} · Mis à jour le {publishedDay}</div>;
}
if (createdDay) {
  return <div>Publié le {publishedDay}</div>; // même jour affiché → une seule date
}
return <div>Mis à jour le {publishedDay}</div>; // createdAt absent/malformé
```

- [ ] **Step 4: Mettre à jour `date-widget/src/index.test.tsx` (mocks uniquement)**

Remplacer **chacun** des mocks de forme versions, p. ex.

```ts
mockFetch(200, {
  data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
  cursor: "NA==",
});
```

par un mock de forme page plate (mêmes deux dates → jour affiché identique → « Publié le Nov 17, 2026 » attendu, inchangé) :

```ts
mockFetch(200, { id: "6afc78e4000e7511c05ac171", createdAt: "2026-11-17T10:00:00Z", publishedAt: "2026-11-17T10:00:00Z" });
```

Aucune autre ligne de `index.test.tsx` n'est modifiée.

- [ ] **Step 5: Supprimer le module versions et lancer la suite complète**

```bash
rm date-widget/src/page-versions.ts date-widget/src/page-versions.test.ts
cd date-widget && npm test
```

Expected: PASS — toute la suite (page-dates, date-widget, index, installation-id) verte.

- [ ] **Step 6: Commit**

```bash
git add -A date-widget/src
git commit -m "feat: « Publié le » (createdAt) / « Mis à jour le » (publishedAt) — API Pages, suppression du module versions"
```

---

### Task 3: README, build, déploiement (GitHub Pages + GitLab)

**Files:**
- Modify: `README.md`
- Regenerated: `staffbase.date-widget.js`, `staffbase.date-widget.js.LICENSE.txt` (racine du repo), `date-widget/dist/*`

**Interfaces:**
- Consumes: le code vert des Tasks 1-2.
- Produces: bundle déployé sur `https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js` + historique GitLab.

- [ ] **Step 1: Mettre à jour `README.md`**

Aligner sur la spec (`docs/superpowers/specs/2026-11-20-widget-date-page-api-design.md`) :

- L.3 : le widget affiche « Publié le » = `createdAt` et « Mis à jour le » = `publishedAt` de la Page.
- 2ᵉ puce de « Fonctionnement » : remplacer le paragraphe endpoint `/versions` par `GET {webUrl}/api/pages/{pageId}` (API Pages publique, **beta**), cookies de session, `createdAt`/`publishedAt` ISO dans la réponse, `publishedAt` absent = jamais publiée.
- Tableau d'affichage : celui de la spec (4 lignes + erreur API), étiquette « Mis à jour le » conservée.
- Puce « Risque assumé » : réécrire — l'API est **documentée (beta)**, le rollback = la version phase 3 (endpoint interne `/versions`, toujours dans l'historique git) ; garder le principe « jamais d'erreur ni de date erronée affichée ».
- Sections « Layout », « Développement », « Installation », « Zéro habillage » : inchangées.

- [ ] **Step 2: Suite complète + build + copie des artefacts**

```bash
cd date-widget && npm test && npm run build
cp dist/staffbase.date-widget.js ..
cp dist/staffbase.date-widget.js.LICENSE.txt ..
```

Expected: tests verts, build OK, les deux fichiers racine à jour (le bundle ne contient plus la chaîne `versions?limit=5`).

- [ ] **Step 3: Commit**

```bash
git add README.md staffbase.date-widget.js staffbase.date-widget.js.LICENSE.txt date-widget/dist
git commit -m "chore: README + bundle phase 4 (API Pages createdAt/publishedAt)"
```

- [ ] **Step 4: Push sur les deux remotes**

```bash
git push github main
git push origin main
```

Expected: les deux pushes OK (`origin` = GitLab, `github` = GitHub Pages).

- [ ] **Step 5: Vérifier le déploiement GitHub Pages**

Attendre ~1 min (redéploiement après push), puis :

```bash
curl -s https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js -o /tmp/opencode/bundle-deployed.js
grep -c "versions?limit=5" /tmp/opencode/bundle-deployed.js   # attendu : 0
grep -c "api/pages" /tmp/opencode/bundle-deployed.js            # attendu : ≥ 1
```

Expected : le marqueur phase 3 a disparu du bundle servi, le marqueur phase 4 est présent. (Si le cache sert l'ancien bundle : vérifier l'en-tête `ETag`/`Last-Modified`, attendre et re-tester avant de conclure.)
