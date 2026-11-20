# Design — date-widget : dates via l'API de la page (createdAt / publishedAt) (phase 4)

> Remplace la sémantique de données et d'affichage de la phase 3 (`docs/superpowers/specs/2026-11-18-widget-date-versions-design.md`). Reste valable pour tout le reste (ID de page, auth, zéro habillage, invisibilité, non-goals) — la spec phase 2 (`2026-11-17-widget-date-dev-design.md`) pour le mécanisme GetPage.

## Intention

Le widget affiche, pour la Page courante, deux dates lues **directement** dans la réponse de l'API de la page — pas d'historique de versions, pas de N/N-1 :

- **« Publié le »** = `createdAt` de la page
- **« Mis à jour le »** = `publishedAt` de la page

Les deux dates sont affichées seulement si les jours affichés sont différents. (Confirmé par l'utilisatrice le 2026-11-20.)

## Source de données

- `GET {webUrl}/api/pages/{pageId}` — API Pages publique (beta, documentée) ; **pas** l'endpoint interne `/versions` de la phase 3.
- Auth : cookies de session, même origine, `credentials: "include"` — **gate validé le 2026-11-17/18** (200 + JSON correct depuis le contexte de la page réelle).
- `webUrl` fourni par le SDK (`widgetApi.getBranchInformation()`), normalisé (barre finale absorbée).
- ID de page : `resolveInstallationId()` (attribut `data-installation-id`, traversée des shadow roots) — inchangé.
- Réponse : objet plat, `createdAt` (ISO), `publishedAt` (ISO), `updatedAt` (**non utilisé** — inclut les édits de brouillon). `publishedAt` absent = page jamais publiée.

## Règles d'affichage

| Cas | Affichage |
|---|---|
| `createdAt` + `publishedAt` présents, jours affichés **différents** | « Publié le {createdAt} · Mis à jour le {publishedAt} » |
| présents, **même jour affiché** | « Publié le {jour} » seul |
| `publishedAt` présent, `createdAt` absent/malformé | « Mis à jour le {publishedAt} » seul |
| `publishedAt` absent (page jamais publiée) | rien, silencieusement |
| Erreur API (401/403/404/5xx/réseau) | rien + `console.warn` |

- Format des dates inchangé : `formatDate` (locale dérivée de `contentLanguage`, nbsp CLDR → espace).
- La comparaison « différentes » est faite sur le **jour affiché** (fuseau local du lecteur) — règle existante.

## Approche

**Revenir** au mécanisme GetPage de la phase 2 (une seule requête, mécanisme validé sur l'instance réelle), avec le nouveau mapping de champs. L'alternative phase 3 (endpoint interne `/versions`) est écartée : endpoint non documenté, et l'utilisatrice demande les valeurs lues directement dans l'appel de la page. Appel double GetPage+`versions` : redondant, écarté.

## Changements induits

- **Module API** : `page-versions.ts` + son test supprimés. Nouveau `page-dates.ts` : `getPageDates(webUrl, pageId): Promise<{ createdAt: string | null; publishedAt: string | null }>` — rejet avec statut HTTP sur non-2xx, chaîne non parseable → `null` (jamais de « Invalid Date » ni de date erronée).
- **Composant** : `DateWidget` consomme `{ createdAt, publishedAt }` et applique le tableau ci-dessus.
- **Inchangé** : résolution de l'ID à travers les shadow roots, invisibilité hors Page, invisibilité + `console.warn` sur erreur, aucune configuration, zéro habillage (bundle + CSS globale de l'app), bundle GitHub Pages.
- **Tests** : `page-dates.test.ts` réécrit + `date-widget.test.tsx` aligné sur les cas du tableau.
- **Docs** : spec (ce fichier) + README alignés (section dates et « Risque assumé » : API documentée en beta plutôt qu'endpoint interne).
- **Déploiement** : build + copie des artefacts + push sur les deux remotes (`github` pour GitHub Pages, `origin` GitLab).

## Non-goals

- `updatedAt` non affiché (édits de brouillon, invisibles des lecteurs).
- Aucun affichage d'auteur, de commentaire ou de liste de versions.
- Pas de repli sur l'endpoint interne `/versions`.

## Risque connu (accepté)

L'API Pages est en **beta** (documentée, mais sans garantie de stabilité). Dégradé bénin : si la plateforme la modifie ou la retire, le widget devient invisible — jamais d'erreur ni de date erronée affichée (les dates non parseables sont écartées). L'auth repose sur le cookie de session du lecteur (comme phases 2-3). Rollback = la version phase 3 (endpoint interne `/versions`).

## Acceptation

- Dans l'app, sur une vraie Page dont `createdAt` et `publishedAt` sont à jours différents : « Publié le {createdAt} · Mis à jour le {publishedAt} » ; à jour identique : « Publié le {jour} ».
- Page jamais publiée : widget invisible.
- Erreur API : widget invisible + `console.warn`.
- Bundle déployé sur GitHub Pages, push GitLab effectué.
