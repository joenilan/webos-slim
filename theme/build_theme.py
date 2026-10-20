#!/usr/bin/env python3
"""Build the system-UI theme overlay from a rootfs extract.

Copies every QML/JS/JSON file under usr/lib/qml that contains a mapped color,
rewrites the colors, and writes manifest.tsv (path, original sha256, patched
sha256). The TV hook only bind-mounts a file whose live hash matches.
"""
import hashlib
import pathlib
import re
import sys

ROOTFS = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
QML = ROOTFS / 'usr/lib/qml'
# LG magenta focus -> GPUI purple (launcher --ui-selected); white text stays readable.
COLORS = {'cf0652': '9333ea'}
# Modules for features that are disabled or hidden on this TV.
SKIP = ('Nudge/', 'SportsAlarm/', 'Voice/')
pattern = re.compile('#(' + '|'.join(COLORS) + ')', re.IGNORECASE)

rows = []
for src in sorted(QML.rglob('*')):
    rel = src.relative_to(QML).as_posix()
    if not src.is_file() or src.suffix not in ('.qml', '.js', '.json') or rel.startswith(SKIP):
        continue
    data = src.read_bytes()
    text = data.decode('utf-8', 'surrogateescape')
    if not pattern.search(text):
        continue
    new = pattern.sub(lambda m: '#' + COLORS[m.group(1).lower()], text).encode('utf-8', 'surrogateescape')
    dst = OUT / 'files' / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(new)
    rows.append('%s\t%s\t%s' % ('/usr/lib/qml/' + rel, hashlib.sha256(data).hexdigest(), hashlib.sha256(new).hexdigest()))

(OUT / 'manifest.tsv').write_text('\n'.join(rows) + '\n')
print('%d files patched' % len(rows))
