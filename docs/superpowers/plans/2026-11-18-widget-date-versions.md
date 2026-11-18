# Implementation Plan — phase 3 : dates de publication via l'historique de versions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le widget `<date-widget>` affiche « Publié le {N-1} · Mis à jour le {N} » — les dates de publication des deux dernières versions publiées de la Page courante — en remplaçant l'appel `GetPage` par l'endpoint interne `GET {webUrl}/api/pages/{pageId}/versions?limit=5`.

**Architecture:** un module `page-versions.ts` (pur, testable sans DOM) appelle l'endpoint interne avec les cookies de session et renvoie `{ current, previous }` (dates ISO de publication de N et N-1 ; le brouillon `isDraft: true` est ignoré). Le composant `DateWidget` consomme ces deux dates et applique les règles d'affichage de la spec. Le wiring `index.tsx` ne change pas (mêmes props).

**Tech Stack:** Node 22 (Linux via nvm), TypeScript, React 19, webpack 5, jest/jsdom, @staffbase/widget-sdk 3.19.9.

**Spec:** `docs/superpowers/specs/2026-11-18-widget-date-versions-design.md`

## Global Constraints

- **Toute commande node/npm** est précédée de : `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22`.
- **Toute commande `git push` / `gh`** : `export PATH="$HOME/.local/bin:$PATH"` (le `credential.helper` du repo est déjà configuré localement).
- **Ne pas réécrire le code généré** (webpack, jest, babel, eslint, `dev/`, `resources/`) — seulement `src/*` + `README.md` à la racine du repo.
- **Shadow DOM** : pas de `document.body`, pas de styles globaux dans le code du widget.
- **Build** : `cd date-widget && npm run build` → `dist/staffbase.date-widget.js` ; le bundle **et** `staffbase.date-widget.js.LICENSE.txt` sont copiés à la racine du repo (la 1ʳᵉ ligne du bundle référence ce fichier).
- **Tests** : `cd date-widget && npm test` (jest, ~2 min) — la suite complète au vert avant chaque commit, **sauf le transitif rouge explicitement noté dans la Task 2** (`index.test.tsx` attend encore l'ancienne forme de mock ; rétabli par la Task 3).
- **Textes du widget en français** (« Publié le … », « Mis à jour le … ») ; les dates sont formatées selon `contentLanguage`.
- **Repo** : `/mnt/c/Projets/StaffBase/widgetDate`, branche `main`, remote `origin` → GitHub `KleeFabienC/date-widget` (public).
- Le mock `getBranchInformation()` (dev) renvoie `webUrl: "https://staffbase.showcase.com"` et `contentLanguage` du bootstrap de test = `"en_US"`.
- **Endpoint interne** : `GET {webUrl}/api/pages/{pageId}/versions?limit=5` — cookies de session (`credentials: "include"`), même origine. Gate validé le 2026-11-18 (200 + JSON correct depuis le contexte de la page, sans les headers de Studio).

## Review Focus

1. **Endpoint interne sans contrat public** — si la plateforme change la forme de la réponse (marqueur de brouillon, champ de date, ordre), le widget doit afficher rien, jamais « undefined » ni « Invalid Date ». → test « missing `createdAt` → null » + « brouillon seul → dates null » dans la **Task 1**.
2. **Header `staffbase-app`** — la requête Studio en portait un ; le widget n'en envoie pas. S'il était requis → 403 → widget invisible définitivement. → le gate a passé 200 depuis le contexte de la page sans ce header (2026-11-18) ; re-vérification finale avec le bundle déployé dans la **Task 5**.
3. **Page publiée dont le contenu courant est en brouillon** — le brouillon (version virtuelle `99999`, `isDraft: true`) ne doit pas compter comme version publiée ni décaler N/N-1. → test « draft ignored » (brouillon en tête de `data`) dans la **Task 1**.
4. **Ordre et `limit` de la réponse** — le widget suppose les versions non brouillon en tête, décroissantes, avec `limit=5` suffisant (brouillon + 4 versions). → tests « fetch appelé avec `?limit=5` » + payload brouillon-en-tête dans la **Task 1**.
5. **Page publiée une seule fois / jamais publiée** — pas de N-1 → « Publié le » seul ; jamais publiée → invisible, aucun texte d'erreur. → tests « single published version » + « draft only » dans la **Task 2**.

---

### Task 1: Module d'appel à l'historique de versions (`page-versions.ts`)

**Files:**
- Create: `date-widget/src/page-versions.ts`
- Create: `date-widget/src/page-versions.test.ts`
- (inchangé : `date-widget/src/page-dates.ts` — supprimé dans la Task 2)

**Interfaces:**
- Consumes: rien (module pur).
- Produces:

```ts
export interface PublishedDates {
  /** Date ISO de publication de la version courante (N) — null si aucune. */
  current: string | null;
  /** Date ISO de publication de la version publiée précédente (N-1) — null si une seule. */
  previous: string | null;
}
export async function getPublishedDates(webUrl: string, pageId: string): Promise<PublishedDates>
```

- [ ] **Step 1: écrire le test échouant `date-widget/src/page-versions.test.ts`**

```ts
import { getPublishedDates } from "./page-versions";

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

describe("getPublishedDates", () => {
  it("should return the two latest published versions' dates (draft ignored)", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 8, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-17T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: "2026-11-18T09:21:17Z", previous: "2026-11-17T09:14:21Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}/versions?limit=5`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { data: [], cursor: null });
    await getPublishedDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}/versions?limit=5`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map a single published version to previous = null", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 1, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: "2026-11-17T08:00:00Z", previous: null });
  });

  it("should map an unpublished page (draft only) to null dates", async () => {
    mockFetch(200, {
      data: [{ version: 99999, previousVersion: null, createdAt: "2026-11-18T09:27:40Z", isDraft: true }],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: null });
  });

  it("should map a missing createdAt to null", async () => {
    mockFetch(200, { data: [{ version: 1, previousVersion: null }], cursor: null });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: null });
  });

  it("should reject on non-2xx with the HTTP status (401 and 404)", async () => {
    mockFetch(401, {});
    await expect(getPublishedDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
    mockFetch(404, {});
    await expect(getPublishedDates(WEB_URL, PAGE_ID)).rejects.toThrow(/404/);
  });
});
```

(Normalisation de la barre finale + rejet 401 **et** 404 : ce dernier cloture le minor #6 de la revue phase 2, deferé.)

- [ ] **Step 2: vérifier que le test échoue**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd /mnt/c/Projets/StaffBase/widgetDate/date-widget && npx jest src/page-versions.test.ts 2>&1 | tail -10`
Expected: FAIL — « Cannot find module './page-versions' »

- [ ] **Step 3: implémenter `getPublishedDates` dans `date-widget/src/page-versions.ts`**

Même forme que l'ancien `page-dates.ts` (header de licence Apache, normalisation de la barre finale de `webUrl`, `credentials: "include"`, rejet avec statut HTTP). Mapping : `data` (tableau, décroissant) → filtrer `!isDraft` → `current = published[0]?.createdAt ?? null`, `previous = published[1]?.createdAt ?? null`. Commenter que l'endpoint est **interne** (hors API publique) et que le brouillon est la version virtuelle `99999` avec `isDraft: true`.

- [ ] **Step 4: vérifier que le test passe, puis la suite complète**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd /mnt/c/Projets/StaffBase/widgetDate/date-widget && npx jest src/page-versions.test.ts 2>&1 | tail -5 && npm test 2>&1 | tail -5`
Expected: PASS (6 tests du fichier) puis suite complète verte (le module ancien coexiste, rien n'est cassé)

- [ ] **Step 5: commit**

```bash
git add date-widget/src/page-versions.ts date-widget/src/page-versions.test.ts
git commit -m "feat: module d'appel à l'endpoint interne de l'historique de versions (N et N-1)"
```

---

### Task 2: Composant — « Publié le {N-1} » / « Mis à jour le {N} »

**Files:**
- Modify: `date-widget/src/date-widget.tsx` (réécriture du corps du composant ; `DateWidgetProps` inchangé)
- Modify: `date-widget/src/date-widget.test.tsx` (réécriture des mocks et attendus)
- Delete: `date-widget/src/page-dates.ts`, `date-widget/src/page-dates.test.ts`

**Interfaces:**
- Consumes: `getPublishedDates(webUrl: string, pageId: string): Promise<PublishedDates>` + `PublishedDates { current: string | null; previous: string | null }` (Task 1).
- Produces: `DateWidgetProps { pageId?: string; webUrl?: string; contentLanguage: string }` + `DateWidget` (signatures inchangées — `index.tsx` ne bouge pas).

- [ ] **Step 1: réécrire `date-widget/src/date-widget.test.tsx` (RED)**

Même squelette que l'existant (`process.env.TZ = "UTC"`, `PROPS` avec `contentLanguage: "fr_FR"`, `mockFetch`), mais corps de mock = forme `versions` et attendus = nouvelles règles :

```tsx
describe("DateWidget", () => {
  it("should show the previous publication as « Publié le » and the current one as « Mis à jour le » when the days differ", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 8, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-17T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
  });

  it("should show a single date when both publications fall on the same displayed day", async () => {
    mockFetch(200, {
      data: [
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-18T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should show only « Publié le » when there is a single published version", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" }],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should render nothing when the page is unpublished (draft only)", async () => {
    mockFetch(200, {
      data: [{ version: 99999, previousVersion: null, createdAt: "2026-11-18T09:27:40Z", isDraft: true }],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
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

- [ ] **Step 2: vérifier que les tests échouent**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd /mnt/c/Projets/StaffBase/widgetDate/date-widget && npx jest src/date-widget.test.tsx 2>&1 | tail -15`
Expected: FAIL — le composant consomme encore `page-dates` (mocks `versions` → `publishedAt` undefined → rien n'est rendu ; « Mis à jour le » inconnu)

- [ ] **Step 3: réécrire le corps du composant dans `date-widget/src/date-widget.tsx`**

- Import : `getPublishedDates, PublishedDates` depuis `./page-versions` (remplace `getPageDates, PageDates`).
- État : `const [publishedDates, setPublishedDates] = useState<PublishedDates | null>(null); const [failed, setFailed] = useState(false);`
- `useEffect` (dépendances `[pageId, webUrl]`) : garde-fou `!pageId || !webUrl → return` ; **puis `setFailed(false); setPublishedDates(null);`** (clôture le minor #3 de la revue phase 2) ; flag `cancelled` comme aujourd'hui ; `.then` → `setPublishedDates(result)` ; `.catch` → `setFailed(true)` + `console.warn(\`date-widget: ${err.message}\`)`.
- `formatDate` inchangé (locale `contentLanguage.replace("_", "-")`, nbsp CLDR → espace).
- Rendu :

```tsx
if (failed || !publishedDates) return null;
const currentDay = publishedDates.current ? formatDate(publishedDates.current, contentLanguage) : null;
if (!currentDay) return null;
// « Publié le » = N-1, « Mis à jour le » = N (spec phase 3).
// Même jour affiché → une seule date (une ligne au même jour n'apporte rien).
const previousDay = publishedDates.previous ? formatDate(publishedDates.previous, contentLanguage) : null;
if (previousDay && previousDay !== currentDay) {
  return <div>Publié le {previousDay} · Mis à jour le {currentDay}</div>;
}
return <div>Publié le {currentDay}</div>;
```

- [ ] **Step 4: supprimer le module ancien et vérifier**

Run: `cd /mnt/c/Projets/StaffBase/widgetDate && git rm date-widget/src/page-dates.ts date-widget/src/page-dates.test.ts && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd date-widget && npx jest src/date-widget.test.tsx src/page-versions.test.ts 2>&1 | tail -5`
Expected: PASS (composant + module). **Transitif rouge attendu et noté** : `src/index.test.tsx` (intégration) échoue encore — ses mocks ont l'ancienne forme ; rétabli par la Task 3 (le commit de la Task 2 est autorisé malgré ce fichier rouge, comme le transitif rouge de la phase 2).

- [ ] **Step 5: commit**

```bash
git add date-widget/src/date-widget.tsx date-widget/src/date-widget.test.tsx
git commit -m "feat: « Publié le » (N-1) / « Mis à jour le » (N) — dates de publication via l'historique de versions"
```

---

### Task 3: Tests d'intégration — forme `versions` + test « hors page » autonome

**Files:**
- Modify: `date-widget/src/index.test.tsx` (corps de mock + un test)

**Interfaces:**
- Consumes: le wiring existant d'`index.tsx` (inchangé) + `DateWidget` (Task 2).
- Produces: la suite complète verte (fin du transitif rouge).

- [ ] **Step 1: remplacer les corps de mock**

Chaque `mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" })` (5 occurrences) devient :

```ts
mockFetch(200, {
  data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
  cursor: "NA==",
});
```

(Les attendus « Publié le Nov 17, 2026 » restent valides : une seule version publiée → « Publié le » seul, `contentLanguage` du bootstrap = `en_US`.)

- [ ] **Step 2: rendre le test « hors page » autonome (clôture le minor #5 de la revue phase 2)**

Le test « should render nothing outside a page (no data-installation-id) » lit aujourd'hui `mock.calls.length` de `global.fetch` non initialisé si le fichier est lancé seul. Il devient :

```ts
it("should render nothing outside a page (no data-installation-id)", async () => {
  global.fetch = jest.fn() as unknown as typeof fetch;
  const widget = document.createElement("date-widget");
  document.body.appendChild(widget);
  expect(widget.textContent).toBe("");
  expect(global.fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: vérifier le fichier puis la suite complète**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd /mnt/c/Projets/StaffBase/widgetDate/date-widget && npx jest src/index.test.tsx 2>&1 | tail -5 && npm test 2>&1 | tail -5`
Expected: PASS du fichier, puis **suite complète verte** (4 files)

- [ ] **Step 4: commit**

```bash
git add date-widget/src/index.test.tsx
git commit -m "test: intégration — mocks de l'historique de versions, test « hors page » autonome"
```

---

### Task 4: README + bundle + GitHub Pages

**Files:**
- Modify: `README.md` (racine)
- Regenerate: `staffbase.date-widget.js` + `staffbase.date-widget.js.LICENSE.txt` (racine)

**Interfaces:**
- Consumes: le code des Tasks 1-3.
- Produces: le bundle déployé sur `https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js`.

- [ ] **Step 1: aligner le README**

Section « Fonctionnement » :
- source : `GET {webUrl}/api/pages/{pageId}/versions?limit=5` — **endpoint interne** (hors API publique documentée), cookies de session ; N = 1ʳᵉ version non brouillon, N-1 = 2ᵉ, date = `createdAt` de la version.
- affichage : la table des règles de la spec phase 3 (2 jours différents / même jour / 1 publication / jamais publiée / erreur).
- nouveau : « « Modifié le » de la phase 2 est remplacé par « Mis à jour le » ».
- risque : endpoint interne sans contrat — dégradé = widget invisible (jamais d'erreur affichée), rollback = la version phase 2.
Le reste (layout, développement, installation, CSS globale de l'app) reste valable.

- [ ] **Step 2: commit du README**

```bash
git add README.md
git commit -m "docs: README — phase 3 (endpoint /versions, règles d'affichage, risque endpoint interne)"
```

- [ ] **Step 3: build + copie des artefacts + vérification sha256**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null; cd /mnt/c/Projets/StaffBase/widgetDate/date-widget && npm run build
cd /mnt/c/Projets/StaffBase/widgetDate && cp date-widget/dist/staffbase.date-widget.js . && cp date-widget/dist/staffbase.date-widget.js.LICENSE.txt . && sha256sum staffbase.date-widget.js staffbase.date-widget.js.LICENSE.txt date-widget/dist/staffbase.date-widget.js date-widget/dist/staffbase.date-widget.js.LICENSE.txt
```
Expected : les 2 sha256 (bundle, LICENSE) identiques racine/dist.

- [ ] **Step 4: commit du bundle**

```bash
git add staffbase.date-widget.js staffbase.date-widget.js.LICENSE.txt
git commit -m "chore: bundle à jour (phase 3 — dates de publication via l'historique de versions)"
```

- [ ] **Step 5: push + vérification GitHub Pages**

```bash
export PATH="$HOME/.local/bin:$PATH"
git push origin main
test "$(git ls-remote origin main | cut -f1)" = "$(git rev-parse main)" && echo PUSHED_OK
```
Puis boucle (max ~5 × 20 s) : `curl -sI https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js` → `content-length` == `wc -c staffbase.date-widget.js` local, et `content-type: application/javascript`. **Rappeler à l'utilisatrice : l'URL ne change pas → re-enregistrer le widget ou Ctrl+Maj+R (cache).**

---

### Task 5: Acceptation en conditions réelles (⚠️ action de l'utilisatrice)

**Files:** aucun.

**Interfaces:**
- Produces: l'acceptation phase 3 + la conclusion du ledger (clôture aussi le minor #8 de la revue phase 2 — conclusion de vérification Studio).

- [ ] **Step 1: demander à l'utilisatrice de re-enregistrer le widget (ou Ctrl+Maj+R, cache désactivé) et de vérifier**

Avec les données réelles de sa page (v8 publiée 18/11 09:21, v7 publiée 18/11 09:14 — **même jour**):
1. La page affiche « **Publié le 18 nov. 2026** » (ligne unique, jour affiché identique).
2. Après une **nouvelle publication un jour différent** : « Publié le 18 nov. 2026 · Mis à jour le {nouveau jour} ».
3. Le widget reste **invisible dans un post News** et sur une page jamais publiée.
4. Rappel de l'acceptation en suspens : **aucune ombre** autour des dates (CSS globale de l'app) — éditeur + page publiée.

- [ ] **Step 2: consigner la conclusion au ledger**

`.superpowers/sdd/2026-11-17-widget-date-dev/progress.md` (ou nouveau ledger phase 3 si la structure est scindée) : conclusion T5 (acceptation conditions réelles, incluant la vérification ombre) + clôture des minors #5, #6, #3 (traités dans ce plan) et #8.
