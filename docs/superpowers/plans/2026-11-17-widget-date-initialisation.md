# Plan d'implémentation — Initialisation du widget StaffBase « date-widget »

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer le projet StaffBase `date-widget` (widget des dates de publication/modification d'une page), le compiler, et le publier dans un nouveau repo GitHub public `date-widget`.

**Architecture:** Le générateur officiel `@staffbase/create-widget` produit un projet TypeScript/React (webpack 5, babel, jest) dans le sous-dossier `date-widget/`. Le bundle compilé `dist/staffbase.date-widget.js` est copié à la racine du repo (l'artefact à monter sur StaffBase, pattern du repo de référence). Le repo est créé et poussé via la CLI `gh`.

**Tech Stack:** Node 22 (Linux via nvm v22.23.5 — node Windows non résolu sous le nom `node`), npm, TypeScript, React 19 (fourni par le générateur v2.7.8 ; la ligne initiale « React 18 » datait du repo de référence), webpack 5, gh CLI, Ubuntu 24.04 (WSL).

**Spec:** `docs/superpowers/specs/2026-11-17-widget-date-initialisation-design.md`

## Global Constraints

- Racine du repo : `/mnt/c/Projets/StaffBase/widgetDate` — futur repo GitHub `date-widget`, branche `main`, **public**
- Widget : `--org=staffbase --name=date-widget` → package `@staffbase/date-widget`, tag `<date-widget>`, bundle `staffbase.date-widget.js`
- Package manager : npm ; `package-lock.json` est commité
- `node_modules/`, `dist/`, `.env` ne sont JAMAIS commités (écart délibéré par rapport au repo de référence)
- `staffbase.date-widget.js` à la racine du repo EST commité (artefact StaffBase)
- Node : `export PATH="$PATH:/mnt/c/Program Files/nodejs"` sur chaque commande shell (v22.14.0)
- `git config --global` échoue depuis `/mnt/c` (bug WSL `cannot chdir to 'C:/'`) → identité git en config **locale** uniquement
- Fallback build : si l'interop WSL↔Windows casse le build, installer Node 22 Linux via **nvm** (pas de root requis — `sudo` exige un mot de passe ici) et relancer l'install + le build
- Les fichiers spec/plan (`docs/superpowers/…`) sont créés à la phase de planification et entrent dans le commit initial

## Review Focus

1. **Le générateur peut être interactif malgré les flags** → après génération, vérifier les 3 noms (`package.json` = `@staffbase/date-widget`, `src/index.tsx` = `name: "date-widget"`, `webpack.common.ts` = entrée `staffbase.date-widget`) ; sinon stop et rapport (flags ignorés ou template renommé).
2. **L'interop WSL↔Windows peut casser le build webpack/babel** (node.exe via 9p, CRLF) → le build doit sortir 0 ; sinon passer à Node 22 Linux (NodeSource) avant toute autre investigation.
3. **Le générateur produit un `.env`** (le repo de référence l'a commité — ne pas reproduire) → `.env` ignoré, `.env.example` commité à la place.
4. **`git add -A` sans `.gitignore` root avalerait `node_modules/`** (le générateur n'en crée pas, le repo de référence l'a subi) → avant le commit : `git status --porcelain` sans aucune entrée `node_modules`/`dist`/`.env`, et `git diff --cached --stat` de taille raisonnable.
5. **`gh auth login` exige l'action de l'utilisatrice** (code + navigateur) → pause explicite dans la tâche 2, avec fallback token (`gh auth login --with-token`).

---

### Task 1: Générer et compiler le projet `date-widget`

**Files:**
- Create: `date-widget/**` (sortie complète du générateur)
- Create: `staffbase.date-widget.js` (racine du repo, copie du bundle compilé)

**Interfaces:**
- Produces: le dossier `date-widget/` buildable, et `staffbase.date-widget.js` à la racine — consommés par les tâches 3-4 (commit + push).

- [ ] **Step 1: Vérifier que node et npm répondent**

```bash
export PATH="$PATH:/mnt/c/Program Files/nodejs"
node --version && npm --version
```
Expected: `v22.14.0` et `11.3.0`.
**Fallback (si node Windows ne répond pas, ou si le Step 5 échoue sur l'interop WSL↔Windows)** — installer Node 22 Linux via nvm (pas de root requis) :
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22 && nvm use 22
node --version   # attendu: v22.x Linux
```
Puis relancer les étapes concernées (les commandes npm de ce plan fonctionnent ensuite avec ce Node ; `export NVM_DIR... && . nvm.sh` est nécessaire dans chaque nouvelle shell).

- [ ] **Step 2: Lancer le générateur dans la racine du futur repo**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
export PATH="$PATH:/mnt/c/Program Files/nodejs"
npx -y @staffbase/create-widget --packageManager=npm --org=staffbase --name=date-widget
```
Expected: un dossier `date-widget/` apparaît avec au moins `package.json`, `src/`, `webpack.common.ts`, `webpack.prod.ts`, `tsconfig.json`, `README.md`.
Si la CLI pose des questions interactives : répondre `npm`, `staffbase`, `date-widget`.

- [ ] **Step 3: Vérifier les noms générés (Review Focus #1)**

```bash
grep '"name"' date-widget/package.json
grep -n 'name:' date-widget/src/index.tsx | head -3
grep -n 'staffbase.date-widget' date-widget/webpack.common.ts
```
Expected: `@staffbase/date-widget` / `name: "date-widget"` / entrée `"staffbase.date-widget"`. Si un nom diffère → STOP, rapporter à l'utilisatrice avec la sortie réelle.

- [ ] **Step 4: Installer les dépendances**

```bash
cd date-widget
npm install
```
Expected: exit 0, `node_modules/` créé, `package-lock.json` présent.

- [ ] **Step 5: Compiler (Review Focus #2)**

```bash
npm run build
test -f dist/staffbase.date-widget.js && echo BUNDLE_OK
```
Expected: exit 0 puis `BUNDLE_OK`.
Si le build échoue avec des erreurs d'interop (chemins `C:\`, EACCES, SIGSEGV) → appliquer le fallback nvm du Step 1 puis relancer les Steps 4-5. D'autres erreurs → les rapporter, ne pas patcher aveuglément.

- [ ] **Step 6: Copier le bundle (et son fichier de licences) à la racine du repo**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
cp date-widget/dist/staffbase.date-widget.js .
cp date-widget/dist/staffbase.date-widget.js.LICENSE.txt .
ls -la staffbase.date-widget.js staffbase.date-widget.js.LICENSE.txt
head -c 200 staffbase.date-widget.js
```
Expected: fichier présent, de l'ordre de 100-300 Ko, début lisible (JS), pas une page d'erreur. Le `.LICENSE.txt` (avis de licence des dépendances — React, etc.) est référencé par le bundle : il doit voyager avec lui, surtout dans un repo public.

---

### Task 2: Installer `gh` et s'authentifier GitHub (⚠️ action de l'utilisatrice)

**Files:** aucun fichier projet.

**Interfaces:**
- Produces: `gh` authentifié — consommé par les tâches 3 (identité git) et 4 (`gh repo create`).

- [ ] **Step 1: Installer gh**

```bash
apt-get update -qq && apt-get install -y gh
gh --version
```
Expected: `gh version 2.x`. Si le paquet apt est indisponible/ancêtre → télécharger le `.deb` de `cli/cli` (release latest, `linux_amd64.deb`) et `dpkg -i`.

- [ ] **Step 2: Authentification (Review Focus #5)**

```bash
gh auth login --hostname github.com --git-protocol https --web
```
Le flux affiche un **one-time code** (`XXXX-XXXX`) et l'URL `https://github.com/login/device`.
**⚠️ PAUSE — demander à l'utilisatrice** d'ouvrir l'URL dans son navigateur et de saisir le code. Attendre la fin du flux.
Fallback si le flux navigateur ne passe pas (WSL sans navigateur) : l'utilisatrice crée un token GitHub (fine-grained sur son compte, ou classic scope `repo`) et le colle → `printf '%s' "TOKEN" | gh auth login --with-token`.

- [ ] **Step 3: Vérifier l'authentification**

```bash
gh auth status
gh api user --jq '.login'
```
Expected: `Logged in to github.com as <login>` et le login s'affiche. Le login est retenu pour la Task 3.

---

### Task 3: Initialiser git et faire le commit initial

**Files:**
- Create: `.gitignore` (racine du repo — le générateur n'en crée pas)
- Create: `date-widget/.env.example` (copie du `.env` généré, sans secrets)

**Interfaces:**
- Consommés : le login GitHub de la Task 2 (identité git), les fichiers de la Task 1.
- Produces : un repo git local avec 1 commit sur `main` — consommé par la Task 4.

- [ ] **Step 1: Initialiser le repo**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
git init -b main
```
Expected: `Initialized empty Git repository ... (branch main)`.

- [ ] **Step 2: Créer le `.gitignore` à la racine (Review Focus #3, #4)**

```
node_modules/
dist/
.env*
!.env.example
coverage/
*.tsbuildinfo
*.log
.DS_Store
```

Ensuite, préparer l'exemple du `.env` généré :
```bash
cd date-widget
if [ -f .env ] && ! grep -qE "sk-|token|secret|key=.{8,}" .env; then cp .env .env.example; fi
cd ..
```
Expected: `.env.example` créé si le `.env` ne contient aucun secret réel ; sinon ne PAS le copier et le signaler.

- [ ] **Step 3: Configurer l'identité git LOCALE depuis le compte GitHub (contrainte WSL)**

```bash
LOGIN=$(gh api user --jq '.login')
NAME=$(gh api user --jq '.name // .login')
EMAIL=$(gh api user --jq '.email // empty')
[ -z "$EMAIL" ] && EMAIL="$(gh api user --jq '.id')+$LOGIN@users.noreply.github.com"
git config user.name "$NAME"
git config user.email "$EMAIL"
git config user.name && git config user.email
```
Expected: les deux valeurs affichées sont cohérentes avec le compte GitHub.

- [ ] **Step 4: Stager et vérifier AVANT de committer (Review Focus #4)**

```bash
git add -A
git status --porcelain | grep -E 'node_modules|(^|\s)dist/|\.env$' || echo CLEAN
git diff --cached --stat | tail -3
```
Expected: `CLEAN` et un stat de quelques dizaines de fichiers (source + docs), PAS des dizaines de milliers. Si `node_modules` apparaît → stop, corriger le `.gitignore` avant de continuer.

- [ ] **Step 5: Committer**

```bash
git commit -m "chore: scaffold date-widget (@staffbase/create-widget 2.7.8) + build"
git log --oneline
git status --porcelain | wc -l
```
Expected: 1 commit, working tree vide (`0`).

---

### Task 4: Créer le repo GitHub et pousser

**Files:** aucun (opération distante).

**Interfaces:**
- Consommés : le repo local de la Task 3, l'authentification de la Task 2.
- Produces : le repo `https://github.com/<login>/date-widget` public — l'objectif final.

- [ ] **Step 1: Créer le repo et pousser**

```bash
cd /mnt/c/Projets/StaffBase/widgetDate
gh repo create date-widget --public --source=. --remote=origin --push
```
Expected: le repo est créé, le commit est poussé.
Si l'erreur « repository already exists » → STOP et proposer à l'utilisatrice un autre nom de repo (le flag `--name` du widget ne change pas).

- [ ] **Step 2: Vérifier le push**

```bash
git remote -v
git ls-remote origin main
gh repo view date-widget --json url,visibility --jq '.'
```
Expected: `origin` pointe sur `https://github.com/<login>/date-widget`, `ls-remote` renvoie un sha (identique à `git rev-parse main`), `visibility: PUBLIC`.

- [ ] **Step 3: Rapport final à l'utilisatrice**

- URL du repo
- Arborescence commitée (racine : `date-widget/`, `staffbase.date-widget.js`, `docs/`, `.gitignore`)
- Rappel : étape suivante = phase de développement du widget (source des dates à trancher : page qui héberge le widget vs. page cible configurée).
