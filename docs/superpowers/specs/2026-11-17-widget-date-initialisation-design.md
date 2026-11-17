# Design — Initialisation du widget StaffBase « date-widget »

**Date :** 2026-11-17 — approuvé par l'utilisatrice dans la conversation (« validé »).

## Intent et pourquoi

Poser le socle de développement d'un widget StaffBase qui affiche la **date de publication d'une page**, et sa **date de modification si postérieure**. Un repo GitHub est nécessaire pour développer avec openCode, collaborer, et produire l'artefact à monter sur StaffBase (`staffbase.date-widget.js`).

## Goals

- Projet généré par `@staffbase/create-widget` (v2.7.8) dans le sous-dossier `date-widget/`
- `npm install` + `npm run build` réussis
- Binaire compilé `staffbase.date-widget.js` à la racine du repo
- Repo git (branche `main`) avec un commit initial propre
- Repo GitHub public `date-widget` avec le code poussé

## Non-goals

- La logique du widget (récupération/affichage des dates) → phase de développement suivante
- CI/CD, publication npm
- Décider la source des dates (la page qui héberge le widget vs. une page cible configurée dans les réglages) → question ouverte pour la phase suivante

## Contraintes

- Racine du repo : `/mnt/c/Projets/StaffBase/widgetDate`, branche `main`, visibilité **public**
- Widget : `--org=staffbase --name=date-widget` → package `@staffbase/date-widget`, tag `<date-widget>`, bundle `staffbase.date-widget.js`
- Package manager : npm (`package-lock.json` commité) ; Node 22 (Windows v22.14.0, via WSL)
- `node_modules/`, `dist/`, `.env` ne sont **jamais** commités

## Approaches

1. **Générateur officiel `@staffbase/create-widget`** — ✅ choisi. À jour (v2.7.8, publié il y a ~1 mois), propre, official (repo Staffbase/create-widget).
2. Fork du repo de la collègue (`luciekleegroup/staffbase-widget`) — refusé : contient sa logique de widget (news feed), des dépendances figées, et `node_modules/` + `.env` commités.
3. Projet écrit à la main — refusé : le générateur fournit gratuitement la config webpack/babel/jest, la préview dev et le pattern de registration du block.

**GitHub :** option A choisie (installer la CLI `gh` + authentification navigateur) plutôt que l'option B (créer le repo à la main sur github.com puis pousser avec un token).

## Décisions (proposées, approuvées)

- Nom `date-widget` (d'après le dossier `widgetDate`)
- Repo public, comme celui de la collègue
- Layout : source dans le sous-dossier `date-widget/` + binaire compilé `.js` à la racine (pattern de la collègue)
- **Écart délibéré par rapport au repo de référence** : la collègue a commité `node_modules/`, `dist/` et un `.env` (199 octets, potentiellement sensible). Nous faisons l'inverse : `.gitignore` correct + `.env.example` pour la forme des variables.

## Laisser au builder

- Comportement exact de la CLI si elle est interactive malgré les flags
- Fallback si l'interop WSL↔Windows casse le build webpack (installation Node 22 Linux via NodeSource)
- Identité git = compte GitHub authentifié (name + email ou noreply)
