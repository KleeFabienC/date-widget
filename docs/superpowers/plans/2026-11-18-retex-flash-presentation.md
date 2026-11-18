# Retex Flash Présentation (PPTX) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer la présentation PowerPoint native `Retex_Flash_Widget_Date_IA.pptx` (11 diapos) de retex flash sur la réalisation d'un widget StaffBase avec l'IA sans compétence dev.

**Architecture:** Un script Python (python-pptx) construit le deck depuis des définitions de diapos (titre + blocs de texte typés). Un second script (`check_deck.py`) extrait le texte du .pptx généré et assert : nombre de diapos, titres, phrases clés par diapo. La correction du contenu est testée, pas vérifiée à l'œil.

**Tech Stack:** Python 3.12, python-pptx (pip). Aucune autre dépendance.

**Spec:** `docs/superpowers/specs/2026-11-18-retex-flash-presentation-design.md`

## Global Constraints

- Fichier de sortie : `Retex_Flash_Widget_Date_IA.pptx` à la racine du repo (nom exact).
- Scripts : `retex/build_retex_pptx.py` (génération) et `retex/check_deck.py` (contrôle).
- Format 16:9 (13.333 × 7,5 in). Français. Police Calibri partout.
- Palette : fond blanc ; INK `#1A2B3C` (corps) ; SLATE `#16324F` (titres, fond diapo 1) ;
  ACCENT `#2E86AB` (marqueurs, sous-titres) ; SOFT `#5A6B7C` (footer, texte secondaire) ;
  GREEN `#2F855A` (ce qui a marché) ; AMBER `#B45309` (limites / vigilance).
- Corps 14pt (13pt sur les diapos 7 et 11), titres de diapos 24pt, titre diapo 1 : 32pt, footer 10pt.
- Max 5 puces de niveau 1 par diapo (les sous-puces comptent dans le bloc parent).
- Chaque diapo de contenu : barre accent 0,12 po sur le bord gauche, titre en haut,
  footer `Retex flash — widget StaffBase × IA · <n>/11` (diapos 2 à 11).
- Aucune image (aucune capture d'écran disponible).
- Commits en français, style du repo (`docs:`, `feat:`, `chore:`).
- L'URL github.io garde sa casse exacte : `KleeFabienC` (C majuscule final).

## Review Focus

- **Débordement texte** : les diapos 7 et 11 sont denses — le contrôle vérifie la
  présence des phrases, pas le débordement. Test qui l'épingl : le contrôle assert
  que la taille du corps des slides 7 et 11 est 13pt (Tasks 3 et 4). Le bâtisseur
  doit dimensionner les zones texte pour le pire cas (zone contenu ≈ 12,3 in × 5,6 in).
- **Accents et guillemets typographiques** (« », é, à) : le contrôle compare en
  minuscules normalisées ; écrire les phrases clés avec la même orthographe que le
  contenu (sinon faux négatif).
- **Casse de l'URL** : le contrôle case-insensitive ne vérifie pas la casse ; une
  vérification exacte `EXACT_URLS` (case-sensitive) existe pour le slide 6.
- **Formulation « 0 ligne de code écrite à la main »** (diapo 1) : juste au regard de
  l'historique (tous les commits émis par l'IA) ; c'est LA phrase à ajuster si
  l'utilisatrice la conteste. Test qui l'épingl : assertée dans le contrôle Task 5.
- **Incident 2 (diapo 7)** : les erreurs Edge/Zendesk sont du bruit de plateforme —
  doivent rester formulées « ignorées, non bloquantes », jamais comme « correctifs
  apportés ». Test qui l'épingl : la phrase clé `ignoré` du slide 7.

---

### Task 1 : Outillage + squelette du deck (11 diapos titrées)

**Files:**
- Create: `retex/check_deck.py`
- Create: `retex/build_retex_pptx.py`
- Create (output): `Retex_Flash_Widget_Date_IA.pptx` (racine du repo, commité)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `retex/check_deck.py` — `python3 retex/check_deck.py [chemin]` ; chemin par défaut
    `Retex_Flash_Widget_Date_IA.pptx` à la racine du repo. Sortie `CHECK OK (11 slides)`
    et code 0 si tout passe ; sinon liste les échecs, code 1.
  - `retex/build_retex_pptx.py` — `python3 retex/build_retex_pptx.py` ; écrit le .pptx
    à la racine du repo. Expose `SLIDE_TITLES` (liste de 11 chaînes) ; le slide 1 est
    la diapo titre (pas de footer).

Contenu du contrôle à ce stade : 11 slides ; le texte concaténé du slide *i* contient
`SLIDE_TITLES[i]` (comparaison minuscules).

`SLIDE_TITLES` exact (index 0 = diapo titre) :

```python
SLIDE_TITLES = [
    "Un widget StaffBase fait avec l'IA, sans être dev",
    "Le contexte et mon point de départ",
    "Une méthode structurée, pas du prompting à l'aveugle",
    "Étape 1 — Init & GitHub (17/11 après-midi)",
    "Étape 2 — Spec & développement testé (17/11 soir)",
    "Étape 3 — Hébergement & installation (17/11 soir)",
    "Étape 4 — Boucle de debug en conditions réelles",
    "Comportement de l'IA — ce qui a marché",
    "Comportement de l'IA — limites",
    "Enseignements",
    "Points de vigilance & reproductibilité",
]
```

- [ ] **Step 1: Installer l'outillage**

`apt-get install -y python3-pip` (sudo si nécessaire), puis
`python3 -m pip install --break-system-packages python-pptx`.
Vérifier : `python3 -c "import pptx; print(pptx.__version__)"` affiche une version.
Si `--break-system-packages` est refusé par ce pip, omettre le flag (pip ≤ 23) ou
passer par un venv `python3 -m venv /tmp/opencode/retex-venv` en dernier recours.

- [ ] **Step 2: Écrire le contrôle qui échoue**

`retex/check_deck.py` : ouverture du .pptx (python-pptx), concaténation du texte de
chaque slide, assertion du nombre (11) et des titres. Pas encore de phrases clés.

- [ ] **Step 3: Exécuter le contrôle — vérifier qu'il échoue**

Run: `python3 retex/check_deck.py`
Expected: ÉCHEC (fichier .pptx absent), code 1.

- [ ] **Step 4: Écrire le générateur — squelette**

`retex/build_retex_pptx.py` :
- constantes : palette (6 couleurs ci-dessus), dimensions 16:9, polices,
  `SLIDE_TITLES` (valeurs exactes ci-dessus) ;
- helpers : `add_title_slide(prs)` (fond SLATE, titre 32pt blanc centré,
  sous-titre/auteur/stats vides à ce stade — ils sont complétés en Task 5),
  `add_content_slide(prs, n, title, blocks)` (barre accent gauche 0,12 po,
  titre 24pt SLATE, zone de corps, footer 10pt SOFT `Retex flash — widget StaffBase × IA · {n}/11`) ;
- boucle : 11 slides, titres seulement, `blocks=[]` pour les slides 2–11.

Approche du corps : un seul `text_frame` par slide avec un paragraphe par bloc,
`space_after=6pt`, marqueur « • » en ACCENT pour le niveau 0, « – » SOFT +
retrait 0,25 in pour le niveau 1.

- [ ] **Step 5: Générer + contrôler**

Run: `python3 retex/build_retex_pptx.py && python3 retex/check_deck.py`
Expected: `CHECK OK (11 slides)`, code 0.

- [ ] **Step 6: Commit**

```bash
git add retex/ Retex_Flash_Widget_Date_IA.pptx
git commit -m "feat: retex flash — squelette du deck (11 diapos titrées)"
```

---

### Task 2 : Contenu des diapos 2 à 5 (contexte, méthode, init, dev testé)

**Files:**
- Modify: `retex/build_retex_pptx.py` (blocks des slides 2–5)
- Modify: `retex/check_deck.py` (phrases clés des slides 2–5)

**Interfaces:**
- Consumes: helpers et constantes de Task 1.
- Produces: `KEY_PHRASES` (dict slide → phrases, ajouté au contrôle ; les Task 3–4
  y ajouteront les slides 6–11) et `EXACT` (dict slide → chaînes case-sensitive).

Contenu exact des slides (chaque ligne = 1 paragraphe ; `  ` = sous-puce niveau 1) :

**Slide 2 — « Le contexte et mon point de départ »**
```
- Le besoin : afficher sur chaque page StaffBase sa date de publication — et la date de modification si le jour diffère
- Mon point de départ :
  - une demande fonctionnelle claire
  - un widget d'exemple d'une collègue (repo GitHub)
  - le socle officiel @staffbase/create-widget (npm)
- Ce que je n'avais PAS : TypeScript, React, webpack, git, API StaffBase
- Le seul moyen : OpenCode, un agent IA en terminal, à qui je parle en langage naturel
```

**Slide 3 — « Une méthode structurée, pas du prompting à l'aveugle »**
```
- Workflow (superpowers) : brainstorming → spec → plan → exécution TDD → revue indépendante
- Chaque phase est validée par moi avant de passer à la suivante — pas de code « à l'aveugle »
- Chiffres globaux : 2 jours (17–18/11) · 2 phases · 20 commits · 16 tests
- Phase 1 (17/11 après-midi) : initialisation du projet + GitHub
- Phase 2 (17/11 soir → 18/11 matin) : développement, déploiement, debug en conditions réelles
```

**Slide 4 — « Étape 1 — Init & GitHub (17/11 après-midi) »**
```
- Ma demande : ~2 phrases en langage naturel (« crée-moi le projet widget + le GitHub, voici le socle + l'exemple d'une collègue »)
- Reconnaissance de l'IA avant d'agir :
  - npm officiel + repo de la collègue → pattern de l'artefact : staffbase.<nom>.js à la racine du repo
  - mon environnement : node sous WSL, bizarrerie git (chemin C:/), CLI gh absente
- La question clé posée avant de démarrer : à quoi sert le widget ? Quel nom ?
- Exécution : scaffold, build, installation de gh, repo GitHub + push
- Revue finale indépendante (autre IA, contexte frais) : défauts réels trouvés (avis de licence, .gitignore) → corrigés avant livraison
```

**Slide 5 — « Étape 2 — Spec & développement testé (17/11 soir) »**
```
- Spec écrite AVANT le code, validée par moi (comportement, affichage, cas d'erreur)
- Plan d'exécution : 5 tâches, chacune = test de régression d'abord (RED) → code (GREEN) → commit
- Ce que le widget fait :
  - ID de la page lu dans le DOM : data-installation-id sur <html>
  - API Pages StaffBase : GET {webUrl}/api/pages/{pageId}, authentification par cookies de session
  - Affichage : « Publié le … » + « · Modifié le … » seulement si le jour diffère
- 16 tests (jest), tous verts avant tout déploiement
```

Phrases clés du contrôle (comparaison minuscules ; `EXACT` : rien pour ces slides) :

```python
KEY_PHRASES = {
    2: ["date de publication", "exemple d'une collègue", "@staffbase/create-widget",
        "typescript", "react", "webpack", "opencode", "langage naturel"],
    3: ["brainstorming", "spec", "plan", "tdd", "revue indépendante",
        "2 jours", "20 commits", "16 tests", "phase 1", "phase 2"],
    4: ["langage naturel", "reconnaissance", "staffbase.<nom>.js", "wsl", "gh",
        "revue finale", "licence", "push"],
    5: ["avant le code", "red", "green", "data-installation-id", "api/pages",
        "publié le", "modifié le", "16 tests"],
}
```

- [ ] **Step 1: Ajouter les phrases clés au contrôle (slides 2–5) et exécuter — vérifier l'échec**

Run: `python3 retex/check_deck.py`
Expected: ÉCHEC listant les phrases manquantes (le contenu n'est pas encore écrit), code 1.

- [ ] **Step 2: Écrire le contenu des slides 2–5 dans le générateur**

Copier le contenu exact ci-dessus (les 4 slides) dans les `blocks` correspondants.

- [ ] **Step 3: Générer + contrôler**

Run: `python3 retex/build_retex_pptx.py && python3 retex/check_deck.py`
Expected: `CHECK OK (11 slides)`, code 0.

- [ ] **Step 4: Commit**

```bash
git add retex/ Retex_Flash_Widget_Date_IA.pptx
git commit -m "feat: retex flash — contenu diapos 2-5 (contexte, méthode, init, dev testé)"
```

---

### Task 3 : Contenu des diapos 6 à 7 (hébergement, boucle de debug)

**Files:**
- Modify: `retex/build_retex_pptx.py` (blocks des slides 6–7)
- Modify: `retex/check_deck.py` (phrases clés slides 6–7 + `EXACT`)

**Interfaces:**
- Consumes: `KEY_PHRASES`/`EXACT` de Task 2.
- Produces: idem, complétés.

Contenu exact :

**Slide 6 — « Étape 3 — Hébergement & installation (17/11 soir) »**
```
- Blocage : StaffBase (SaaS) refuse localhost → le bundle doit être servi en HTTPS public
- 1ʳᵉ URL (raw.githubusercontent.com) refusée par Studio : Content-Type: text/plain + nosniff
- Solution : GitHub Pages (gratuit, automatique)
  - chaque push sur main → redéploiement ~1 min
  - URL : https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js
- Vérification après chaque déploiement : taille locale vs taille distante (curl)
```

**Slide 7 — « Étape 4 — Boucle de debug en conditions réelles »** (corps 13pt)
```
- 4 incidents dans l'app réelle (17/11 soir → 18/11 matin) :
  - « Le script n'a pas pu être chargée » → GitHub Pages (bon Content-Type)
  - Erreurs Edge « Tracking Prevention » + Zendesk → bruit de plateforme, pas le widget : ignoré
  - Widget invisible (connecté, vide) → rendu dans une shadow root, closest() ne la traverse pas → remontée parent en traversant les shadow roots
  - « Toujours la même date » → publier met à jour la page (updatedAt = publishedAt + 50 ms) → comparaison au jour affiché, test avec mes données réelles
- Division des rôles :
  - Moi : tester dans l'app réelle, copier les erreurs, amener les données API réelles (console.table)
  - IA : diagnostic → correctif avec test de régression → rebuild → push → vérification du déploiement
```

Phrases clés du contrôle :

```python
KEY_PHRASES[6] = ["localhost", "content-type", "github pages",
                  "1 min", "curl"]
EXACT[6] = ["https://KleeFabienC.github.io/date-widget/staffbase.date-widget.js"]
KEY_PHRASES[7] = ["shadow root", "closest", "tracking prevention", "50 ms",
                  "console.table", "diagnostic", "rebuild", "ignoré"]
```

Le contrôle vérifie en outre que la taille de police du corps du slide 7 est 13pt
(assert sur chaque paragraphe du corps du slide 7 — épinglage anti-débordement).

- [ ] **Step 1: Ajouter les phrases clés au contrôle (slides 6–7 + taille 13pt du slide 7) et exécuter — vérifier l'échec**

Run: `python3 retex/check_deck.py`
Expected: ÉCHEC (phrases manquantes), code 1.

- [ ] **Step 2: Écrire le contenu des slides 6–7 dans le générateur**

Copier le contenu exact ci-dessus. Pour le slide 7, utiliser la taille corps 13pt
(constante dédiée) pour tenir dans la zone.

- [ ] **Step 3: Générer + contrôler**

Run: `python3 retex/build_retex_pptx.py && python3 retex/check_deck.py`
Expected: `CHECK OK (11 slides)`, code 0.

- [ ] **Step 4: Commit**

```bash
git add retex/ Retex_Flash_Widget_Date_IA.pptx
git commit -m "feat: retex flash — contenu diapos 6-7 (hébergement, boucle de debug)"
```

---

### Task 4 : Contenu des diapos 8 à 11 (comportement IA, enseignements, vigilance)

**Files:**
- Modify: `retex/build_retex_pptx.py` (blocks des slides 8–11)
- Modify: `retex/check_deck.py` (phrases clés slides 8–11)

**Interfaces:**
- Consumes: `KEY_PHRASES`/`EXACT` de Task 3.
- Produces: contrôle complet (11 slides couverts).

Contenu exact :

**Slide 8 — « Comportement de l'IA — ce qui a marché »** (puces en GREEN)
```
- Reconnaissance autonome : npm officiel, code de la collègue, docs, mon environnement — avant de demander quoi que ce soit
- Des questions avant d'agir : la question clé (but, nom), des gates (spec, plan, appel API manuel validé avant le code)
- TDD : test de régression avant chaque correctif, écrit avec MES données réelles
- Auto-revue indépendante : des défauts trouvés que je n'avais pas vus (licence, .gitignore)
- Décisions documentées et réversibles (ledger) + un commit par étape → traçabilité complète
```

**Slide 9 — « Comportement de l'IA — limites »** (puces en AMBER)
```
- Elle ne connaît pas l'app en prod : shadow DOM, comportement du SaaS, navigateur → invisible pour elle
- Elle s'est trompée une fois : data-menu-id → en réalité data-installation-id (corrigée par MES retours depuis le DOM réel)
- Elle ne peut pas tester dans l'app réelle : JE SUIS le test d'acceptance
- Conséquence : l'humain reste dans la boucle — mes retours et mes données sont le carburant du processus
```

**Slide 10 — « Enseignements »**
```
- Un non-dev a livré un widget réel, testé et déployé
- Ce qui a fait la différence : le workflow structuré (spec / plan / TDD / validations), pas un « prompt magique »
- L'humain reste indispensable : l'app réelle, les données réelles, l'acceptance
- Tout est traçable : spec, plan, tests, git — le projet a une mémoire lisible
- Le résultat est réutilisable : le repo sert de référence pour le prochain widget
```

**Slide 11 — « Points de vigilance & reproductibilité »** (corps 13pt ; puce 1 en AMBER, puce 2 en INK)
```
- Vigilance :
  - ne pas croire sur parole : valider TOUJOURS dans l'app réelle
  - la spec est la source de vérité : la garder à jour
  - documenter les décisions, même mineures (ledger)
- Reproductibilité :
  - socle officiel @staffbase/create-widget
  - OpenCode + workflow structuré (superpowers)
  - pattern : source + bundle compilé à la racine du repo, GitHub Pages
- Questions ?
```

Phrases clés du contrôle :

```python
KEY_PHRASES[8] = ["reconnaissance", "questions", "tdd", "revue",
                  "ledger", "traçabilité"]
KEY_PHRASES[9] = ["prod", "data-menu-id", "data-installation-id",
                  "test d'acceptance", "dans la boucle"]
KEY_PHRASES[10] = ["non-dev", "workflow", "humain", "traçable",
                   "réutilisable"]
KEY_PHRASES[11] = ["source de vérité", "create-widget", "github pages",
                   "questions"]
```

Le contrôle vérifie en outre que la taille de police du corps du slide 11 est 13pt
(idem slide 7 — épinglage anti-débordement).

- [ ] **Step 1: Ajouter les phrases clés au contrôle (slides 8–11 + taille 13pt du slide 11) et exécuter — vérifier l'échec**

Run: `python3 retex/check_deck.py`
Expected: ÉCHEC (phrases manquantes), code 1.

- [ ] **Step 2: Écrire le contenu des slides 8–11 dans le générateur**

Copier le contenu exact ci-dessus. Couleurs des puces : GREEN (slide 8), AMBER
(slide 9), INK (slides 10–11, sous-puces SOFT).

- [ ] **Step 3: Générer + contrôler**

Run: `python3 retex/build_retex_pptx.py && python3 retex/check_deck.py`
Expected: `CHECK OK (11 slides)`, code 0.

- [ ] **Step 4: Commit**

```bash
git add retex/ Retex_Flash_Widget_Date_IA.pptx
git commit -m "feat: retex flash — contenu diapos 8-11 (comportement IA, enseignements, vigilance)"
```

---

### Task 5 : QA finale + livraison

**Files:**
- Modify: `retex/check_deck.py` (seuils de QA)
- Commit: deck final

**Interfaces:**
- Consumes: contrôle complet de Task 4.
- Produces: deck final validé, commité, poussé.

- [ ] **Step 1: Ajouter les vérifications de QA au contrôle, puis exécuter — vérifier l'échec**

Au contrôle existant, ajouter : (a) absence de texte placeholder — aucune des chaînes
`"TODO"`, `"XXX"`, `"Lorem"`, `"TBD"` (case-insensitive) sur aucun slide ; (b)
re-ouverture du .pptx après génération (intégrité du zip OOXML) ; (c) le texte du
slide 1 contient `20 commits`, `16 tests` et `0 ligne de code écrite à la main`.

Run: `python3 retex/check_deck.py`
Expected: ÉCHEC (la ligne stats de la diapo titre est encore vide), code 1.

- [ ] **Step 2: Compléter la diapo titre dans le générateur**

Contenu exact de la diapo titre (fond SLATE, texte blanc, centré) :
titre 32pt `Un widget StaffBase fait avec l'IA, sans être dev`,
sous-titre 16pt `Retex flash — le widget de date de publication sur StaffBase`,
`Fabien Klee · 18 novembre 2026`, ligne stats 14pt
`2 jours · 2 phases · 20 commits · 16 tests · 0 ligne de code écrite à la main`.

Run: `python3 retex/build_retex_pptx.py && python3 retex/check_deck.py`
Expected: `CHECK OK (11 slides)`, code 0.

- [ ] **Step 3: Vérifier le nom et l'emplacement du fichier**

Run: `ls -la Retex_Flash_Widget_Date_IA.pptx`
Expected: fichier présent à la racine du repo, taille > 30 Ko.

- [ ] **Step 4: Commit final + push**

```bash
git add retex/ Retex_Flash_Widget_Date_IA.pptx
git commit -m "chore: retex flash — deck final validé"
git push origin main
```

Expected : push réussi (même workflow que les phases précédentes).
