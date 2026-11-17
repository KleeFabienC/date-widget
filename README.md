# date-widget — StaffBase

Widget Staffbase qui affiche **la date de publication de la Page qui l'héberge**, et sa date de modification si celle-ci est postérieure.

## Fonctionnement

- L'identifiant de la page courante est lu dans le DOM sur l'attribut `data-installation-id` (posé sur le tag HTML de la page) via `closest()` depuis l'élément `<date-widget>`.
- Les dates proviennent de l'API Pages Staffbase : `GET {webUrl}/api/pages/{pageId}`, avec l'authentification par cookies de session de l'utilisateur (`credentials: "include"`). `webUrl` est fourni par le SDK (`widgetApi.getBranchInformation()`).
- Affichage : « Publié le 17 nov. 2026 », éventuellement « · Modifié le … » si la modification est strictement postérieure à la publication. Page non publiée → « Modifié le … » seul.
- Hors d'une Page (News, aperçu éditeur) ou en cas d'erreur d'API, le widget ne rend rien (un `console.warn` est émis).
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

## Installation en développement

```bash
cd date-widget
npm start
```

Puis installer l'URL `http://localhost:9000/staffbase.date-widget.js` dans Staffbase Studio (doc : https://developers.staffbase.com/frameworks/customwidget-development).
