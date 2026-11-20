# date-widget — StaffBase

Widget Staffbase qui affiche les **dates de la Page** qui l'héberge : sa date de création (« Publié le », `createdAt`) et sa date de publication (« Mis à jour le », `publishedAt`).

## Fonctionnement

- L'identifiant de la page courante est lu dans le DOM sur l'attribut `data-installation-id` (posé sur la balise `<html>` de la page) par `resolveInstallationId()`, qui remonte depuis l'élément `<date-widget>` **en traversant les shadow roots** — le widget est rendu dans la shadow root de la plateforme, et `closest()` seul ne la traverse pas.
- Les dates sont lues **directement dans la réponse de l'API Pages publique (beta)** : `GET {webUrl}/api/pages/{pageId}`. L'objet plat de la Page contient `createdAt` (ISO) et `publishedAt` (ISO) ; `publishedAt` absent = page jamais publiée. `updatedAt` n'est pas utilisé (il inclut les édits de brouillon). L'authentification repose sur les cookies de session (`credentials: "include"`, même origine) ; `webUrl` est fourni par le SDK (`widgetApi.getBranchInformation()`), normalisé (barre finale absorbée).
- Affichage :

  | Cas | Affichage |
  |---|---|
  | `createdAt` + `publishedAt` présents, jours affichés différents | « Publié le {createdAt} · Mis à jour le {publishedAt} » |
  | présents, même jour affiché | « Publié le {jour} » seul |
  | `publishedAt` présent, `createdAt` absent/malformé | « Mis à jour le {publishedAt} » seul |
  | `publishedAt` absent (page jamais publiée) | rien, silencieusement |
  | Erreur API (401/403/404/5xx/réseau) | rien + `console.warn` |

- **Risque assumé** : l'API Pages est en **beta** (documentée, mais sans garantie de stabilité) — si la plateforme la modifie ou la retire, le widget devient invisible, **jamais d'erreur ni de date erronée affichée** (les dates non parseables sont écartées). L'authentification repose sur le cookie de session du lecteur (comme phases 2-3). Rollback = la version phase 3 (endpoint interne `/versions`, toujours dans l'historique git).
- Zéro habillage : le widget neutralise par override inline la décoration « carte » de la plateforme (`div.widget-card`, et le wrapper du bloc light DOM `designer-branding-shadow` / `designer-branding-border-radius` au-dessus de la shadow root).
- Hors d'une Page (News, aperçu éditeur), le widget ne rend rien, **silencieusement** (aucun appel API). En cas d'erreur d'API, il ne rend rien non plus et émet un `console.warn`.
- Le widget n'a **aucune configuration** (schéma vide).

## Layout du repo

```
date-widget/                     ← source (générée par @staffbase/create-widget 2.7.8)
staffbase.date-widget.js         ← artefact à monter sur StaffBase (copie de date-widget/dist/)
staffbase.date-widget.js.LICENSE.txt  ← avis de licences des dépendances (référencé par le bundle)
docs/superpowers/                ← specs et plans de développement
```

## Développement

Prérequis : Node 22.

```bash
cd date-widget
npm install
npm test        # jest
npm run build   # webpack → dist/staffbase.date-widget.js
```

Après chaque build, recopier les artefacts à la racine :

```bash
cp date-widget/dist/staffbase.date-widget.js .
cp date-widget/dist/staffbase.date-widget.js.LICENSE.txt .
```

Le fichier `.LICENSE.txt` est référencé par la 1ʳᵉ ligne du bundle : il doit toujours voyager avec lui.

## Installation

Staffbase est un SaaS : le bundle doit être servi **en HTTPS depuis une URL publique** — un `localhost` est refusé par Studio. L'URL publiée (GitHub Pages sur `main`, redéploié ~1 min après push) :

```
https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js
```

Installez cette URL dans Staffbase Studio (doc : https://developers.staffbase.com/frameworks/customwidget-development). L'URL ne change pas après un rebuild+push : si Studio ou le navigateur sert le bundle en cache, re-enregistrez le widget ou faites un rechargement dur.

`npm start` (serveur local de prévisualisation, port 9000) sert uniquement au développement local, pas à l'installation dans Studio.

## Zéro habillage — CSS globale de l'app (production)

Le bundle neutralise lui-même la décoration « carte » par override inline (`removeCardDecoration` / `removeBlockBranding` dans `src/index.tsx`). Mais le wrapper du bloc en light DOM peut être **re-rendu par la plateforme après l'exécution du script** (ou l'ancien bundle rester en cache) : la couche autoritative en production est donc cette CSS, insérée au niveau global de l'app — **scopée au bloc `date-widget` uniquement**, via le JSON de l'attribut `custom-block` du `<sb-custom-block>` :

```css
div[data-c13y-region="custom-block"]:has(sb-custom-block[custom-block*="date-widget"]) {
  box-shadow: none;
  border-radius: 0;
}
```

La specificité (`(0,2,2)`) domine `.designer-branding-shadow` / `.designer-branding-border-radius` (`(0,1,0)`) : pas besoin de `!important`. Variante plus stricte (si un autre widget contenait « date-widget » dans son nom ou son URL) : remplacer `*="date-widget"` par `*='"customElementName":"date-widget"'`.
