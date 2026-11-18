# Implementation Plan — date-widget : la date de la page courante

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le widget `<date-widget>` affiche la date de publication de la Page Staffbase qui l'héberge, et sa date de modification si postérieure, via l'API Pages.

**Architecture:** la classe du bloc étend `HTMLElement` — `this` est l'élément `<date-widget>` — elle lit l'ID de la page par `this.closest('[data-installation-id]')` (l'attribut est posé sur le tag HTML de la page) et le domaine de l'instance via `widgetApi.getBranchInformation().webUrl` (2ᵉ argument du factory). Un module `page-dates.ts` isole l'appel `GET {webUrl}/api/pages/{pageId}` (auth par cookies de session, `credentials: "include"`). Le composant React formate et affiche.

**Tech Stack:** Node 22 (Linux via nvm v22.23.5), TypeScript, React 19, webpack 5, jest/jsdom, @staffbase/widget-sdk 3.19.9, projet généré par @staffbase/create-widget 2.7.8.

**Spec:** `docs/superpowers/specs/2026-11-17-widget-date-dev-design.md`

## Global Constraints

- **Toute commande node/npm** est précédée de : `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22` (le node Windows ne se résout pas sous le nom `node` en WSL).
- **Toute commande `git push` / `gh`** : `export PATH="$HOME/.local/bin:$PATH"` (le `credential.helper` du repo est déjà configuré localement, phase 1 — pas besoin de reconfigurer).
- **Ne pas réécrire le code généré** (webpack, jest, babel, eslint, `dev/`, `resources/`) — seulement `src/*` + `README.md` à la racine du repo.
- **Shadow DOM** : pas de `document.body`, pas de styles globaux dans le code du widget.
- **Build** : `cd date-widget && npm run build` → `dist/staffbase.date-widget.js` ; le bundle **et** `staffbase.date-widget.js.LICENSE.txt` sont copiés à la racine du repo (la 1ʳᵉ ligne du bundle référence ce fichier).
- **Tests** : `cd date-widget && npm test` (jest, ~2 min) — la suite complète au vert avant chaque commit, sauf le transitif rouge explicitement noté dans la Task 3 (`index.test.tsx` attend encore l'ancien composant ; rétabli par la Task 4).
- **Textes du widget en français** (« Publié le … », « Modifié le … ») ; les dates sont formatées selon `contentLanguage`.
- **Repo** : `/mnt/c/Projets/StaffBase/widgetDate`, branche `main`, remote `origin` → GitHub `KleeFabienC/date-widget` (public).
- Le mock `getBranchInformation()` (dev) renvoie `webUrl: "https://staffbase.showcase.com"` et `contentLanguage` du bootstrap de test = `"en_US"`.

## Review Focus

1. **Auth session sur l'API Pages beta** — la doc de l'API ne documente que le token admin ; si l'instance répond 401/403 aux cookies de session, le widget n'affichera jamais les dates. Attente raisonnable : les dates s'affichent sur une vraie page. → Gate **Task 1** (test console sur l'instance) ; stop et re-cadrage si 401/403.
2. **DOM réel de l'app (nouvelle UX, Shadow DOM)** — `closest('[data-installation-id]')` doit trouver le tag de la page dans le DOM réel, pas seulement en jsdom ; `webUrl` de production provient de la plateforme. Attente raisonnable : les dates s'affichent dans l'app installée, et le widget reste silencieux ailleurs. → **Task 6** (vérification réelle dans Studio).
3. **Forme du `webUrl`** — si la valeur réelle a une barre finale, l'URL construite doit rester valide. Attente raisonnable : URL d'API correcte quelle que soit la forme. → normalisation + test dans **Task 2** (fixe RF #3).
4. **`data-installation-id` absent ou périmé** — widget dans une News, aperçu éditeur, ou ID inexistant (404 API). Attente raisonnable : widget invisible, jamais de texte d'erreur ni « undefined » dans le contenu de la page. → tests 404/**reject** dans **Task 2**, test « hors page » dans **Task 4** (fixent RF #4).
5. **Dates absentes dans la réponse** — page en brouillon : `publishedAt` manquant. Attente raisonnable : jamais de « Publié le NaN » ; affichage du « Modifié le » seul. → test dans **Task 3** (fixe RF #5).

---

### Task 1: Gate — vérifier l'auth par session sur l'instance réelle (⚠️ action de l'utilisatrice)

**Files:** aucun.

**Interfaces:**
- Produces: la confirmation que `GET /api/pages/{pageId}` répond 200 avec les cookies de session — condition de poursuite de toutes les tâches suivantes. Si 401/403/404 → **STOP**, rapport à l'utilisatrice, re-cadrage (pas d'implémentation).

- [ ] **Step 1: demander à l'utilisatrice d'exécuter dans la console du navigateur, sur une vraie Page de son instance**

```js
const id = document.querySelector('[data-installation-id]')?.getAttribute('data-installation-id');
const r = await fetch('/api/pages/' + id, { credentials: 'include' });
console.log(r.status, (await r.text()).slice(0, 400));
```

Attendre la réponse de l'utilisatrice. (Fixe Review Focus #1.)

- [ ] **Step 2: interpréter le résultat**

- `200` + JSON contenant `publishedAt` (ex. `{"id":"6afc…","publishedAt":"2026-…",…}`) → **OK**, on passe à la Task 2.
- `401`/`403` → auth session refusée : **STOP**, rapporter à l'utilisatrice, re-cadrer (pas de Tasks 2-6).
- `404` → l'ID trouvé n'est pas un `pageId` de l'API Pages : **STOP**, demander à l'utilisatrice de vérifier l'élément porteur de `data-installation-id`.

Pas de commit (aucun code). Clôture du task : aucune commande à exécuter côté repo — noter le résultat (statut HTTP observé) dans le ledger avant de passer à la Task 2.

---

### Task 2: `src/page-dates.ts` — module d'appel à l'API Pages

**Files:**
- Create: `date-widget/src/page-dates.ts`
- Test: `date-widget/src/page-dates.test.ts`

**Interfaces:**
- Produces:
  - `interface PageDates { publishedAt: string | null; updatedAt: string | null }`
  - `getPageDates(webUrl: string, pageId: string): Promise<PageDates>` — appelle `GET {webUrl}/api/pages/{pageId}` avec `credentials: "include"` ; **reject** (Error dont le message contient le statut HTTP) si la réponse n'est pas 2xx ; champs absents → `null`.
- Consommés par la Task 3.

- [ ] **Step 1: écrire le test qui échoue** — créer `date-widget/src/page-dates.test.ts`

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
  it("should return publishedAt and updatedAt from the Pages API", async () => {
    mockFetch(200, { id: PAGE_ID, publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z" });
    await getPageDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map missing date fields to null", async () => {
    mockFetch(200, { id: PAGE_ID });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ publishedAt: null, updatedAt: null });
  });

  it("should reject on non-2xx with the HTTP status", async () => {
    mockFetch(401, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
  });
});
```

(Fixe Review Focus #3 — barre finale — et #4 — reject 401/404.)

- [ ] **Step 2: exécuter et vérifier l'échec**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
cd /mnt/c/Projets/StaffBase/widgetDate/date-widget
npx jest src/page-dates.test.ts
```
Expected: FAIL — « Cannot find module './page-dates' ».

- [ ] **Step 3: implémenter `date-widget/src/page-dates.ts`**

Signatures : `export interface PageDates { publishedAt: string | null; updatedAt: string | null }` et `export async function getPageDates(webUrl: string, pageId: string): Promise<PageDates>`.

Approche : URL = `` `${webUrl.replace(/\/+$/, "")}/api/pages/${pageId}` `` ; `fetch(url, { credentials: "include", headers: { Accept: "application/json" } })` ; `if (!res.ok) throw new Error(`API Pages : HTTP ${res.status} pour ${url}`)` ; `const data = await res.json()` ; retourner `{ publishedAt: data.publishedAt ?? null, updatedAt: data.updatedAt ?? null }`.

- [ ] **Step 4: exécuter et vérifier le passage**

```bash
npx jest src/page-dates.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 5: suite complète + commit**

```bash
npm test
git add src/page-dates.ts src/page-dates.test.ts
git commit -m "feat: module d'appel à l'API Pages (getPageDates)"
```
Expected: `npm test` → toutes les suites au vert (les anciens tests du scaffold sont encore intacts).

---

### Task 3: `src/date-widget.tsx` — composant React (fetch + affichage)

**Files:**
- Modify: `date-widget/src/date-widget.tsx` (remplacement complet du contenu, garder l'en-tête Apache de licence existant)
- Test: `date-widget/src/date-widget.test.tsx` (remplacement complet)

**Interfaces:**
- Consumes: `getPageDates` + `PageDates` (Task 2).
- Produces:
  - `interface DateWidgetProps { pageId?: string; webUrl?: string; contentLanguage: string }`
  - `DateWidget` — rendu : sans `pageId` ou `webUrl` → `null` sans appel fetch ; en erreur → `null` + `console.warn` ; sinon « Publié le X » et « · Modifié le Y » seulement si `updatedAt` strictement postérieure à `publishedAt` ; page non publiée (`publishedAt` null) → « Modifié le Y » seul ; les deux null → `null`.

- [ ] **Step 1: réécrire le test** — remplacer le contenu de `date-widget/src/date-widget.test.tsx`

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
  it("should render the publish date and no modified date when dates are equal", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Modifié le/)).not.toBeInTheDocument();
  });

  it("should append the modified date only when it is strictly later", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026 · Modifié le 3 déc. 2026")).toBeInTheDocument();
  });

  it("should render only the modified date when the page is unpublished", async () => {
    mockFetch(200, { updatedAt: "2026-12-03T08:30:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Modifié le 3 déc. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing and warn when the API fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(document.body.textContent).toBe("");
  });

  it("should render nothing and not fetch without pageId", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<DateWidget contentLanguage="fr_FR" />);
    expect(document.body.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

(Fixe Review Focus #5 — brouillon sans `publishedAt` — et #4 — invisibilité sur erreur.)
Note : `process.env.TZ = "UTC"` en tête de fichier rend le formatage déterministe.

- [ ] **Step 2: exécuter et vérifier l'échec**

```bash
npx jest src/date-widget.test.tsx
```
Expected: FAIL — le composant actuel rend « Hello World … ».

- [ ] **Step 3: réécrire `date-widget/src/date-widget.tsx`**

Props : `export interface DateWidgetProps { pageId?: string; webUrl?: string; contentLanguage: string }`.

Approche :
- `useEffect` dépendant de `[pageId, webUrl]` : si `!pageId || !webUrl` → ne rien faire ; sinon `getPageDates(webUrl, pageId)` → `.then(setDates)` / `.catch(err => { setError(true); console.warn(`date-widget: ${err.message}`); })`, avec un flag `cancelled` nettoyé dans la fonction de retour.
- Helper de formatage (à inclure tel quel — les tests pinnent la chaîne exacte) :

```tsx
const formatDate = (iso: string, contentLanguage: string): string =>
  new Date(iso)
    .toLocaleDateString(contentLanguage.replace("_", "-"), { day: "numeric", month: "short", year: "numeric" })
    .replace(/[\u202f\u00a0]/g, " ");
```

(Le remplacement des espaces fines insécables CLDR rend le texte déterministe et sans caractères exotiques.)

- Rendu : construire **une seule chaîne** (les tests utilisent `findByText` exact) — `publishedAt` présent → `Publié le ${formatDate(...)}` ; `updatedAt` strictement postérieure (`new Date(updatedAt) > new Date(publishedAt)`) → ajouter ` · Modifié le ${formatDate(...)}` ; `publishedAt` absent → `Modifié le ${formatDate(...)}` seul ; rien à afficher ou erreur ou chargement → `return null`. Rendu : `<div>{texte}</div>`.

- [ ] **Step 4: exécuter et vérifier le passage**

```bash
npx jest src/date-widget.test.tsx
```
Expected: 5 tests PASS.

- [ ] **Step 5: suites touchées au vert + commit (transitif noté)**

```bash
npx jest src/date-widget.test.tsx src/page-dates.test.ts
git add src/date-widget.tsx src/date-widget.test.tsx
git commit -m "feat: composant DateWidget — affichage des dates de la page"
```
Expected: les deux suites ci-dessus au vert. La suite complète reste rouge sur `index.test.tsx` (il attend encore « Hello World ») — **transitif attendu**, rétabli par la Task 4 ; ne pas modifier `index.test.tsx` dans cette tâche.

---

### Task 4: `src/index.tsx` + `configuration-schema.ts` — wiring du bloc

**Files:**
- Modify: `date-widget/src/index.tsx`
- Modify: `date-widget/src/configuration-schema.ts`
- Test: `date-widget/src/index.test.tsx` (remplacement complet)

**Interfaces:**
- Consumes: `DateWidget` / `DateWidgetProps` (Task 3) ; le factory reçoit `widgetApi: WidgetApi` en 2ᵉ argument (SDK) ; le mock de dev renvoie `webUrl: "https://staffbase.showcase.com"` et le bootstrap fixe `contentLanguage = "en_US"`.
- Produces: le bloc `date-widget` enregistré avec **zéro attribut de widget** ; props calculées : `pageId` = `this.closest('[data-installation-id]')?.getAttribute('data-installation-id')`, `webUrl` = `widgetApi.getBranchInformation().webUrl`, `contentLanguage` = `this.contentLanguage`.

- [ ] **Step 1: réécrire le test d'intégration** — remplacer le contenu de `date-widget/src/index.test.tsx`

```tsx
process.env.TZ = "UTC";

import { screen } from "@testing-library/dom";

import "../dev/bootstrap";

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("Widget integration", () => {
  beforeAll(async () => {
    document.body.innerHTML = `
        <div id="preview"></div>
        <div id="config"></div>
        `;
    await import("./index");
  });

  it("should show the dates of the hosting page", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" });
    const page = document.createElement("div");
    page.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const widget = document.createElement("date-widget");
    page.appendChild(widget);
    document.body.appendChild(page);
    // contentLanguage du bootstrap de test = "en_US"
    expect(await screen.findByText("Publié le Nov 17, 2026")).toBeInTheDocument();
  });

  it("should render nothing outside a page (no data-installation-id)", async () => {
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    const widget = document.createElement("date-widget");
    document.body.appendChild(widget);
    expect(widget.textContent).toBe("");
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});
```

(Fixe Review Focus #4 — hors page : invisible, aucun fetch. Le 1ᵉʳ test couvre le wiring réel `closest` + `widgetApi` en jsdom.)

- [ ] **Step 2: exécuter et vérifier l'échec**

```bash
npx jest src/index.test.tsx
```
Expected: FAIL — le bloc actuel ne reçoit ni `pageId` ni `webUrl` (le 1ᵉʳ test ne trouve pas « Publié le … », le 2ᵉ trouve « Hello World en_US »).

- [ ] **Step 3: câbler `src/index.tsx`**

- `const widgetAttributes: string[] = [];`
- Factory : `const factory: BlockFactory = (BaseBlockClass, widgetApi) => {` (capturer le 2ᵉ argument au lieu de `_widgetApi`).
- Getter `props` de la classe :

```tsx
private get props(): DateWidgetProps {
  return {
    pageId: this.closest('[data-installation-id]')?.getAttribute('data-installation-id') ?? undefined,
    webUrl: widgetApi.getBranchInformation().webUrl,
    contentLanguage: this.contentLanguage,
  };
}
```

(ne plus utiliser `parseAttributes` — plus aucun attribut de widget.)
- `import { DateWidget, DateWidgetProps } from "./date-widget";` (remplacer l'import de `BlockAttributes` si devenu inutile).

Et `src/configuration-schema.ts` :

```tsx
export const configurationSchema: JSONSchema7 = {
  type: "object",
  properties: {},
};

export const uiSchema: UiSchema = {};
```

- [ ] **Step 4: exécuter et vérifier le passage**

```bash
npx jest src/index.test.tsx
```
Expected: 2 tests PASS.

- [ ] **Step 5: suite complète + commit**

```bash
npm test
git add src/index.tsx src/configuration-schema.ts src/index.test.tsx
git commit -m "feat: wiring du bloc — pageId via closest(data-installation-id), webUrl via widgetApi"
```
Expected: `npm test` → **toutes les suites au vert** (le rouge transitoire de la Task 3 est rétabli ici).

---

### Task 5: build, README racine, bundle, push

**Files:**
- Create: `README.md` (racine du repo)
- Regenerate: `staffbase.date-widget.js` + `staffbase.date-widget.js.LICENSE.txt` (racine)

**Interfaces:**
- Consumes: tout le code des Tasks 2-4.
- Produces: le bundle à jour commité et poussé — consommé par la Task 6 (installation dans Studio).

- [ ] **Step 1: compiler**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
cd /mnt/c/Projets/StaffBase/widgetDate/date-widget
npm run build
test -f dist/staffbase.date-widget.js && echo BUNDLE_OK
```
Expected: `BUNDLE_OK`, compilation webpack sans erreur.

- [ ] **Step 2: copier le bundle et les licences à la racine, vérifier l'identité**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
cp date-widget/dist/staffbase.date-widget.js .
cp date-widget/dist/staffbase.date-widget.js.LICENSE.txt .
sha256sum date-widget/dist/staffbase.date-widget.js staffbase.date-widget.js
```
Expected: les deux sha256 identiques.

- [ ] **Step 3: écrire `README.md` à la racine du repo**

Contenu (court, en français) : ce que fait le widget (dates de la page courante via l'API Pages, attribut `data-installation-id`) ; layout du repo (`date-widget/` = source, `staffbase.date-widget.js` + `.LICENSE.txt` = artefacts à monter sur StaffBase) ; commandes : `cd date-widget && npm install && npm test && npm run build` puis copie du bundle + du `.LICENSE.txt` à la racine ; installation en dev : `npm start` → installer `http://localhost:9000/staffbase.date-widget.js` dans Staffbase Studio.

- [ ] **Step 4: suite de tests finale**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
cd /mnt/c/Projets/StaffBase/widgetDate/date-widget
npm test
```
Expected: toutes les suites au vert.

- [ ] **Step 5: commit + push**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
git add README.md staffbase.date-widget.js staffbase.date-widget.js.LICENSE.txt
git commit -m "chore: bundle à jour + README racine"
export PATH="$HOME/.local/bin:$PATH"
git push origin main
git ls-remote origin main
git rev-parse main
```
Expected: push OK, SHA remote = SHA local.

---

### Task 6: Vérification réelle dans l'app Staffbase (⚠️ action de l'utilisatrice)

**Files:** aucun (sauf correctif éventuel).

**Interfaces:**
- Consommés : le bundle poussé (Task 5) et l'accès de l'utilisatrice à Studio.
- Produces: l'acceptation du widget en conditions réelles (fixe Review Focus #2).

- [ ] **Step 1: lancer le serveur de dev**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22
cd /mnt/c/Projets/StaffBase/widgetDate/date-widget
npm start
```
Expected: serveur sur `http://localhost:9000/staffbase.date-widget.js` (laisser tourner en arrière-plan).

- [ ] **Step 2: demander à l'utilisatrice d'installer et vérifier dans Studio**

1. Installer le widget via l'URL `http://localhost:9000/staffbase.date-widget.js`.
2. Insérer le widget dans une **vraie Page** et vérifier :
   - « Publié le … » avec la bonne date ;
   - « · Modifié le … » présent seulement si la modification est postérieure ;
3. Vérifier que le widget reste **invisible** dans un post News ou dans l'aperçu de l'éditeur.

(Fixe Review Focus #2 — DOM réel + `webUrl` de production.)

- [ ] **Step 3: si ajustement nécessaire**

Si un des points échoue (ex. `data-installation-id` inaccessible depuis le widget dans la nouvelle UX, `webUrl` inattendu, 401) : corriger (TDD — d'abord le test qui échoue), `npm test` au vert, commit, repousser, re-builder si le bundle change (re-copie Step 2 de la Task 5) et refaire la vérification. Le résultat final (OK ou points restants) est noté dans le ledger.

- [ ] **Step 4: arrêter le serveur de dev** et noter la conclusion de la vérification dans le ledger.

---

## Revue finale (après la Task 6)

Un revieweur frais (sous-agent) relit la plage de commits de la phase 2 (du commit de ce plan jusqu'au dernier) contre la spec et ce plan : grille « plan alignment, qualité, tests, hygiène git » ; le review ne modifie rien au checkout.
