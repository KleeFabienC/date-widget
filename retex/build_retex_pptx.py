#!/usr/bin/env python3
"""Générateur du deck retex flash « widget StaffBase × IA ».

Usage : python3 retex/build_retex_pptx.py
Écrit Retex_Flash_Widget_Date_IA.pptx à la racine du repo.

Le contenu est défini dans SLIDES : liste de 11 entrées
(type, titre, blocks). blocks = liste de (level, text, color) :
  level 0 → puce « • » (marqueur ACCENT),
  level 1 → puce « – » (marqueur SOFT, retrait).
color=None → INK.
"""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

OUT_PATH = Path(__file__).resolve().parent.parent / "Retex_Flash_Widget_Date_IA.pptx"

# --- Palette (spec : 2026-11-18-retex-flash-presentation-design.md) ---------
INK = RGBColor(0x1A, 0x2B, 0x3C)      # corps
SLATE = RGBColor(0x16, 0x32, 0x4F)    # titres, fond diapo titre
ACCENT = RGBColor(0x2E, 0x86, 0xAB)   # marqueurs, sous-titres
SOFT = RGBColor(0x5A, 0x6B, 0x7C)     # footer, texte secondaire
GREEN = RGBColor(0x2F, 0x85, 0x5A)    # ce qui a marché
AMBER = RGBColor(0xB4, 0x53, 0x09)    # limites / vigilance
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

FONT = "Calibri"
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

BODY_PT = 14.0
BODY_PT_DENSE = 13.0
DENSE_SLIDES = {7, 11}

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

# Contenu : (type, blocks) — type "title" (diapo 1) ou "content".
# blocks = (level, text, color)
SLIDES: list[tuple[str, list[tuple[int, str, object]]]] = [
    ("title", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
    ("content", []),
]


def _style_run(run, size, color, bold=False):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_title_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = SLATE

    box = slide.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.333), Inches(3.2))
    tf = box.text_frame
    tf.word_wrap = True
    lines = [
        (SLIDE_TITLES[0], 32.0, WHITE, True),
        ("", 16.0, WHITE, False),   # sous-titre (complété en Task 5)
        ("", 14.0, WHITE, False),   # auteur (complété en Task 5)
        ("", 14.0, ACCENT, False),  # stats (complété en Task 5)
    ]
    for i, (text, size, color, bold) in enumerate(lines):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = PP_ALIGN.CENTER
        para.space_after = Pt(14)
        run = para.add_run()
        run.text = text
        _style_run(run, size, color, bold)
    return slide


def add_content_slide(prs, n, title, blocks):
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    # Barre accent, bord gauche.
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.12), SLIDE_H)
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT
    bar.line.fill.background()
    bar.shadow.inherit = False

    # Titre.
    tbox = slide.shapes.add_textbox(Inches(0.45), Inches(0.35), Inches(12.5), Inches(0.8))
    tf = tbox.text_frame
    tf.word_wrap = True
    para = tf.paragraphs[0]
    run = para.add_run()
    run.text = title
    _style_run(run, 24, SLATE, bold=True)

    # Corps.
    body_pt = BODY_PT_DENSE if n in DENSE_SLIDES else BODY_PT
    bbox = slide.shapes.add_textbox(Inches(0.45), Inches(1.35), Inches(12.5), Inches(5.5))
    btf = bbox.text_frame
    btf.word_wrap = True
    btf.vertical_anchor = MSO_ANCHOR.TOP
    for i, (level, text, color) in enumerate(blocks):
        para = btf.paragraphs[0] if i == 0 else btf.add_paragraph()
        para.space_after = Pt(6)
        marker, indent = ("•  ", 0) if level == 0 else ("–  ", 6)
        if indent:
            run_m = para.add_run()
            run_m.text = " " * indent
            _style_run(run_m, body_pt, INK)
        run_m = para.add_run()
        run_m.text = marker
        _style_run(run_m, body_pt, ACCENT if level == 0 else SOFT, bold=True)
        run_t = para.add_run()
        run_t.text = text
        _style_run(run_t, body_pt, INK if color is None else color)

    # Footer.
    fbox = slide.shapes.add_textbox(Inches(0.45), Inches(7.05), Inches(12.5), Inches(0.3))
    ftf = fbox.text_frame
    fpara = ftf.paragraphs[0]
    frun = fpara.add_run()
    frun.text = f"Retex flash — widget StaffBase × IA · {n}/11"
    _style_run(frun, 10, SOFT)
    return slide


def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    add_title_slide(prs)
    for n, (kind, blocks) in enumerate(SLIDES[1:], start=2):
        assert kind == "content"
        add_content_slide(prs, n, SLIDE_TITLES[n - 1], blocks)

    prs.save(str(OUT_PATH))
    print(f"Écrit : {OUT_PATH}")


if __name__ == "__main__":
    build()
