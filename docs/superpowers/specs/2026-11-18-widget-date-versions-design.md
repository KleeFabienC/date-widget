# Design — date-widget : dates de publication via l'historique de versions (phase 3)

> Remplace la sémantique d'affichage de la phase 2 (`docs/superpowers/specs/2026-11-17-widget-date-dev-design.md`), qui reste valable pour tout le reste (ID de page, auth, zéro habillage, invisibilité, non-goals).

## Intention

Le widget affiche les deux **événements de publication** de la Page courante :

- **« Publié le »** = date de publication de la version **N-1** (la version publiée précédemment)
- **« Mis à jour le »** = date de publication de la version **N** (la version courante)

**Pourquoi** (confirmé par l'utilisatrice) : dans l'API publique, `publishedAt` = date à laquelle le *contenu courant* a été publié, `updatedAt` = dernier touché du contenu courant en backoffice **y compris brouillon** (invisible des lecteurs). Les dates affichées doivent refléter ce que le lecteur voit : des événements de publication, pas des édits de brouillon.

## Source de données

Endpoint **interne** de l'app (non documenté dans l'API publique), identifié par l'utilisatrice dans Studio (vue « historique des versions ») :

- `GET {webUrl}/api/pages/{pageId}/versions?limit=5`
- Auth : cookies de session, même origine, `credentials: "include"` — **gate validé le 2026-11-18** (200 + JSON correct, fetch simple depuis le contexte de la page, sans les headers de Studio).
- Réponse : `{ data: Version[], cursor }`, versions triées **décroissant**.
  - Le brouillon est une **version virtuelle `version: 99999`** avec `isDraft: true` (compte dans `limit` ; au plus un par page).
  - Versions publiées = versions réelles de la chaîne (sans `isDraft`) ; **`createdAt` = la date de publication de cette version**.
  - **N = 1ʳᵉ version non brouillon, N-1 = 2ᵉ.** `limit=5` (comme Studio) garantit de toujours trouver N et N-1 (brouillon + 4 versions réelles au minimum).
  - `cursor` non utilisé (pas de pagination côté widget).

## Règles d'affichage (validées par l'utilisatrice le 2026-11-18)

| Cas | Affichage |
|---|---|
| ≥ 2 versions publiées, jours affichés **différents** | « Publié le {N-1} · Mis à jour le {N} » |
| ≥ 2 versions publiées, **même jour affiché** | « Publié le {N} » seul (règle existante : une date au même jour n'apporte rien) |
| 1 seule version publiée | « Publié le {N} » |
| Jamais publiée (brouillon seul ou liste vide) | rien, silencieusement (l'appel a lieu, rien n'est affiché) |
| Erreur API (401/403/404/5xx/réseau) | rien + `console.warn` (comportement phase 2) |

- Format des dates inchangé : `formatDate` (locale dérivée de `contentLanguage`, nbsp CLDR → espace).
- L'étiquette « Modifié le » de la phase 2 est **remplacée** par « **Mis à jour le** ».
- Le brouillon en tête de chaîne (éditions non publiées) ne décale pas N/N-1 : on exclut `isDraft: true` **et** la version `99999` (double marqueur, voir Risque connu).

## Approche

**Remplacer** l'appel `GetPage` par l'appel `versions` — une seule requête, données exactes.
Alternative écartée : « GetPage + versions » — redondant (`GetPage.publishedAt` est déjà la date de la version N), deux requêtes, risque d'incohérence entre les deux réponses.

## Changements induits

- **Module API** : `getPageDates(webUrl, pageId)` est remplacé par un appel au `versions` (même module `page-dates.ts` renommé en `page-versions.ts`, ou conservé — choix du bâtisseur, même structure : module pur, testable sans DOM). Interface visée : renvoyer `{ current: string | null; previous: string | null }` (dates ISO de publication de N et N-1), rejet avec statut HTTP comme aujourd'hui, `createdAt` absent → `null`.
- **Composant** : `DateWidget` consomme `{ current, previous }` et applique le tableau ci-dessus (le mapping reste dans le composant).
- **Inchangé** : résolution de l'ID à travers les shadow roots, invisibilité hors Page, invisibilité + `console.warn` sur erreur, aucune configuration, zéro habillage (bundle + CSS globale de l'app), bundle GitHub Pages.
- **Tests** : réécriture des mocks (structure `versions`), cas : 2 publiées jours différents / même jour, 1 publiée, brouillon seul, brouillon en tête avec 2 publiées, rejet 401/404, champ `createdAt` absent.
- **Docs** : spec (ce fichier) + README alignés.

## Non-goals

- Historique au-delà de N-1 (pas de pagination, pas d'affichage de plus de 2 dates).
- Affichage de l'auteur, du commentaire ou du `contentType` des versions.
- Dates par langue (`modifiedLanguages` non utilisé).
- Repli sur l'API publique si l'endpoint interne venait à disparaître.

## Risque connu (accepté)

L'endpoint `versions` **n'est pas dans l'API publique documentée** : pas de garantie de stabilité. Dégradé bénin : si la plateforme le modifie ou le retire, le widget devient invisible — jamais d'erreur affichée, et une `createdAt` absente, malformée ou non-chaîne est écartée (jamais de « Invalid Date » ni de date erronée). L'exclusion du brouillon repose sur un **double marqueur** (`isDraft: true` + version virtuelle `99999`) : si la plateforme en retire un, l'autre continue de protéger ; si elle modifie les deux, des dates de brouillon pourraient s'afficher. Rollback = la version phase 2 (`GetPage`). L'utilisatrice est insider Staffbase et peut suivre le sujet côté plateforme.

## Acceptation

- Dans l'app, sur une vraie Page avec ≥ 2 publications à jours différents : « Publié le {N-1} · Mis à jour le {N} » ; à jour identique : « Publié le {N} ».
- Page publiée une seule fois : « Publié le {N} ».
- Widget invisible dans un post News, sur une page jamais publiée, et sur erreur API.
