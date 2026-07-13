#!/usr/bin/env python3
"""Regenerate src/assets/material-symbols-subset.woff2.

Add any new icon name used with <Icon name="..."/> to ICONS, then:
    pip3 install --user "fonttools[woff]"
    python3 scripts/subset-icons.py
"""
import io
from fontTools import ttLib
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Subsetter, Options

ICONS = """add arrow_back balance bolt candlestick_chart check check_circle chevron_right
dashboard delete donut_large double_arrow download edit expand_more filter_list
fingerprint key link_off local_fire_department lock_open note_add person psychology
remove restart_alt rocket_launch search sentiment_dissatisfied sentiment_neutral sync
table_view thumb_up timeline trending_down trending_flat trending_up upload_file
verified warning""".split()

font = ttLib.TTFont("node_modules/material-symbols/material-symbols-outlined.woff2")
opts = Options()
opts.layout_features = ["liga", "rlig", "ccmp", "calt"]
opts.layout_closure = False
ss = Subsetter(options=opts)
ss.populate(glyphs=ICONS, text="abcdefghijklmnopqrstuvwxyz_")
ss.subset(font)

buf = io.BytesIO()
font.save(buf)
buf.seek(0)
f2 = ttLib.TTFont(buf)
instantiateVariableFont(f2, {"wght": 400, "GRAD": 0, "opsz": 24}, inplace=True)
f2.flavor = "woff2"
f2.save("src/assets/material-symbols-subset.woff2")
print("wrote src/assets/material-symbols-subset.woff2 with", len(ICONS), "icons")
