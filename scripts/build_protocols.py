"""
Build src/protocols/protocols.json from src/protocols/barn-protocols.md.

Each "# Title {#id}" section becomes {"id": {"title": ..., "html": ...}}.
ClickUp links are stripped: barn staff have no ClickUp accounts, and the
products they name are already listed (and tappable) under each symptom.

    pip install markdown
    python3 scripts/build_protocols.py
"""
import json
import pathlib
import re

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "protocols" / "barn-protocols.md"
OUT = ROOT / "src" / "protocols" / "protocols.json"

CLICKUP_PAREN = re.compile(r"\s*\(\[https?://app\.clickup\.com[^\]]*\]\([^)]*\)\)")
CLICKUP_LINK = re.compile(r"\[([^\]]+)\]\(https?://app\.clickup\.com[^)]*\)")
SECTION = re.compile(r"^# (.+?)\s*\{#([\w-]+)\}\s*$", re.M)


def main():
    text = SRC.read_text(encoding="utf-8")
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = CLICKUP_PAREN.sub("", text)
    text = CLICKUP_LINK.sub(r"\1", text)

    heads = list(SECTION.finditer(text))
    out = {}
    for i, m in enumerate(heads):
        body = text[m.end(): heads[i + 1].start() if i + 1 < len(heads) else len(text)]
        html = markdown.markdown(body.strip(), extensions=["tables", "sane_lists"])
        out[m.group(2)] = {"title": m.group(1).strip(), "html": html}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {', '.join(out)}")


if __name__ == "__main__":
    main()
