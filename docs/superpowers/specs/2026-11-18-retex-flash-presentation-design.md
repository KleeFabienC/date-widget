# Design — Présentation Retex Flash (PPTX)

## Intention / pourquoi

Présenter en retex flash (5–8 min) comment un widget StaffBase a été réalisé avec l'IA
(OpenCode) **sans compétence développeur**, pour des **collègues techniques**.
L'enjeu : montrer le déroulé (grandes étapes) et le **comportement de l'IA** —
ce qu'elle a fait seule, ce qui est resté humain, et ce que ça change.

## Objectifs

- Un fichier **PowerPoint natif** (.pptx), 11 diapos, 16:9, en français.
- Contenu : contexte → méthode → 4 étapes → comportement de l'IA (forces + limites) →
  enseignements → vigilance/reproductibilité.
- Style sobre et lisible : ~5 puces max par diapo, pas de capture d'écran (aucune
  disponible) — timeline et boucle de debug en texte structuré.

## Non-objectifs

- Pas de capture d'écran, pas de vidéo, pas de publication en ligne.
- Pas de refonte du repo ou du widget.

## Contraintes

- Source de vérité du contenu : `initProjetEtDev.md` (historique complet), l'historique
  git (20 commits, 17–18/11/2026) et le code final.
- Fichier de sortie : `Retex_Flash_Widget_Date_IA.pptx` à la racine du repo.
- Environnement : Python 3.12, pip à installer (apt), `python-pptx` via pip.

## Approches

- **Choisie : génération programmatique avec python-pptx** (script conservé dans
  `retex/`, rejouable). Le contenu est vérifié par un script de contrôle qui
  extrait le texte du .pptx et asserts les phrases clés par diapo.
- Écartée : Marp (markdown → pptx) — outillage en plus, moins de contrôle du layout.
- Écartée : PowerPoint manuel — non reproductible, hors sujet pour la démo « IA ».

## Décisions (arbitrages du rédacteur)

- Palette sobre : fond blanc, en-têtes ardoise `#16324F`, texte `#1A2B3C`,
  accent bleu `#2E86AB`, vert `#2F855A` (forces), ambre `#B45309` (limites/vigilance) ;
  diapo titre sur fond ardoise.
- Police Calibri (disponible dans PowerPoint). Titres 24pt, corps 14pt (13pt sur les
  diapos denses 7 et 11), footer 10pt avec numéro de diapo.
- 11 diapos, liste exacte dans le plan `docs/superpowers/plans/2026-11-18-retex-flash-presentation.md`.
- Le script de génération et le script de contrôle sont commités (reproductibilité).

## Lissé au bâtisseur

- Coordonnées exactes des zones (python-pptx), gestion de l'installation pip
  (sudo éventuel, `--break-system-packages`).
