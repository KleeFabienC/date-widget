# Design — phase 2 : date-widget, la date de la page courante

Date : 2026-11-17 · Statut : proposé (en attente de validation)

## Objectif

Le widget `<date-widget>` affiche, dans l'app Staffbase, la **date de publication de la Page qui l'héberge**, et sa date de modification si celle-ci est postérieure. Les dates proviennent de l'API Pages StaffBase.

## Mécanisme de données (vérifié)

- L'identifiant de la page courante est présent dans le DOM sous l'attribut **`data-installation-id`** sur la balise **`<html>`** de l'app (vérifié sur l'instance : `document.documentElement`). Format : ObjectId 24 caractères hexadécimaux.
- Le widget est un web component : la classe du bloc étend `HTMLElement`, donc **`this` dans le bloc est l'élément `<date-widget>` lui-même**. Dans la nouvelle UX, le widget est rendu **à l'intérieur d'une shadow root** et `closest()` seul ne traverse pas la frontière shadow : l'ID est résolu par `resolveInstallationId(this)` (module `src/installation-id.ts`), qui remonte les ancêtres en traversant chaque shadow root vers son host jusqu'au DOM light.
- Domaine de l'instance : `widgetApi.getBranchInformation().webUrl` (synchron, reçu par le factory — le factory du SDK reçoit `widgetApi` en 2ᵉ argument).
- Endpoint : `GET https://{webUrl}/api/pages/{pageId}` (API Pages, beta) → JSON avec `publishedAt`, `updatedAt`, `createdAt` (ISO 8601).
- Auth : cookies de session, même origine, `fetch(..., { credentials: "include" })` — pattern validé sur l'API v2 par le widget news feed de la collègue.

## Affichage

- **« Publié le 17 nov. 2026 »** — format court via `contentLanguage` (`toLocaleDateString` en locale dérivée de `contentLanguage`, ex. `fr_FR` → `fr-FR`, `day: 'numeric', month: 'short', year: 'numeric'`).
- **« · Modifié le 3 déc. 2026 »** — uniquement si le **jour affiché** de la modification diffère de celui de la publication. La publication met à jour la page (`updatedAt` ≈ `publishedAt`, à la seconde près — observé 50-114 ms dans l'app) : une « modification » au même jour n'apporte aucune information et n'est pas affichée.
- `publishedAt` absent (page jamais publiée) → afficher « Modifié le … » seul si `updatedAt` existe.
- Absence de `data-installation-id` (widget hors d'une Page : News, aperçu dans l'éditeur) → le widget **ne rend rien de visible** + `console.warn`.
- Erreur d'API (401/403/5xx/réseau) → idem : rien de visible + `console.warn`.

## Configuration du widget

- Aucune : `widgetAttributes: []`, schéma de configuration vide. L'attribut `message` du scaffold est supprimé.

## Architecture (fichiers)

- `src/page-dates.ts` — module API isolé : `getPageDates(webUrl, pageId): Promise<{ publishedAt: string | null, updatedAt: string | null }>` (fetch, parse, erreurs). Testable sans DOM.
- `src/date-widget.tsx` — composant React `DateWidget`, props `{ pageId?: string; webUrl?: string; contentLanguage: string }` ; `useEffect` → `getPageDates` ; états chargement/succès/erreur ; rendu des dates.
- `src/index.tsx` — factory : capturer `widgetApi` (2ᵉ argument), calculer `pageId` (`closest`) et `webUrl` (`getBranchInformation()`) dans le getter `props`, les passer au composant.
- `src/date-widget.test.tsx` — tests du composant (fetch mocké : dates, modifié postérieur, erreur, hors page).
- `src/index.test.tsx` — tests du wiring factory (présence du `closest`/`widgetApi` branchés).

## Livrables & livraison

- `npm run build` → copie du bundle **et** de `.LICENSE.txt` à la racine du repo (procédure phase 1).
- `README.md` à la racine (reporté de la phase 1) : layout repo, build, installation dans Studio.
- Tests jest au vert, commit, push sur `main`.
- Vérification réelle : `npm start` (dev server) → URL installée dans Staffbase Studio → widget sur une vraie Page → les dates s'affichent.

## Risque principal (gate)

**L'auth par session sur l'API Pages beta n'est pas vérifiée** — la doc ne documente que le token admin (`Authorization: Basic {API_Token}`). Le service token du SDK est exclu (réservé aux backends de plugins) ; un token en config du widget est exclu (les attributs du widget sont lisibles dans le DOM).

→ La **première tâche du plan** est une vérification sur l'instance réelle (commande console sur une page : `fetch('/api/pages/' + id, { credentials: 'include' })`) :

- **200** + JSON → on implémente.
- **401/403** → stop, re-cadrage (pas d'implémentation).

## Non-goals

- Dates des News/posts — Pages uniquement.
- Cache, configuration du format, i18n au-delà de `contentLanguage`.
- CI, publication npm.
- Compatibilité avec un futur changement d'attribut plateforme (on suit `data-installation-id` tel que constaté).
