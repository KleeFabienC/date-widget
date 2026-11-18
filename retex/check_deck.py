#!/usr/bin/env python3
"""Contrôle du deck retex flash.

Vérifie sur le .pptx généré :
- le nombre de slides (11),
- le titre de chaque slide,
- les phrases clés par slide (KEY_PHRASES, minuscules) et les chaînes exactes
  (EXACT, case-sensitive),
- la taille de police du corps des slides denses (BODY_PT_OVERRIDES),
- l'absence de texte placeholder.

Usage : python3 retex/check_deck.py [chemin.pptx]
Sortie : "CHECK OK (11 slides)" et code 0 si tout passe ; sinon liste des échecs, code 1.
"""

import sys
from pathlib import Path

from pptx import Presentation

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "Retex_Flash_Widget_Date_IA.pptx"

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

# Phrases clés par slide (comparaison minuscules sur le texte concaténé du slide).
KEY_PHRASES: dict[int, list[str]] = {}

# Chaînes qui doivent apparaître AVEC leur casse exacte (URLs).
EXACT: dict[int, list[str]] = {}

# Slides denses : taille de police imposée du corps (points).
BODY_PT_OVERRIDES: dict[int, float] = {}

# Textes interdits (case-insensitive).
PLACEHOLDERS = ["TODO", "XXX", "Lorem", "TBD"]


def slide_text(slide) -> str:
    parts = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            parts.append(shape.text_frame.text)
    return "\n".join(parts)


def body_font_sizes(slide):
    """Tailles (pt) de tous les paragraphes du corps (zone principale, pas titre/footer)."""
    sizes = []
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                if run.font.size is not None:
                    sizes.append(run.font.size.pt)
    return sizes


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH
    failures: list[str] = []

    if not path.exists():
        print(f"ÉCHEC : fichier absent : {path}")
        return 1

    prs = Presentation(str(path))
    slides = list(prs.slides)

    if len(slides) != 11:
        failures.append(f"nombre de slides : {len(slides)} (attendu 11)")

    for i, (slide, title) in enumerate(zip(slides, SLIDE_TITLES), start=1):
        text = slide_text(slide)
        norm = text.lower()
        if title.lower() not in norm:
            failures.append(f"slide {i} : titre manquant « {title} »")
        for phrase in KEY_PHRASES.get(i, []):
            if phrase.lower() not in norm:
                failures.append(f"slide {i} : phrase clé manquante « {phrase} »")
        for exact in EXACT.get(i, []):
            if exact not in text:
                failures.append(f"slide {i} : chaîne exacte manquante « {exact} »")
        if i in BODY_PT_OVERRIDES:
            wanted = BODY_PT_OVERRIDES[i]
            sizes = [s for s in body_font_sizes(slide) if s not in (32.0, 24.0, 10.0)]
            if not sizes or any(abs(s - wanted) > 0.01 for s in sizes):
                failures.append(
                    f"slide {i} : police corps attendue {wanted}pt, observées {sorted(set(sizes))}"
                )
        for ph in PLACEHOLDERS:
            if ph.lower() in norm:
                failures.append(f"slide {i} : texte placeholder « {ph} »")

    if failures:
        for f in failures:
            print(f"ÉCHEC : {f}")
        return 1

    print("CHECK OK (11 slides)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
