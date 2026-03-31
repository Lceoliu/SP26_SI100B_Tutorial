"""
MkDocs hook: generate tutorials.json during build.

Reads the nav config to find all tutorials, extracts `description`
from each markdown file's YAML frontmatter, and writes a JSON manifest
to the site output directory.

Homepage JS fetches this file to render the Curriculum Index dynamically.
"""

import json
import os
import re


def on_post_build(config, **kwargs):
    docs_dir = config["docs_dir"]
    site_dir = config["site_dir"]
    nav = config.get("nav", [])

    tutorials = []

    for item in nav:
        if not isinstance(item, dict):
            continue
        for section_name, section_items in item.items():
            if not isinstance(section_items, list):
                continue
            for entry in section_items:
                if not isinstance(entry, dict):
                    continue
                for title, path in entry.items():
                    md_path = os.path.join(docs_dir, path)
                    desc = ""
                    if os.path.exists(md_path):
                        with open(md_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
                        if m:
                            for line in m.group(1).split("\n"):
                                line = line.strip()
                                if line.startswith("description:"):
                                    desc = line[len("description:"):].strip()
                                    desc = desc.strip('"').strip("'")

                    loc = path.replace("\\", "/").replace(".md", "/")
                    tutorials.append({
                        "title": title,
                        "location": loc,
                        "description": desc,
                    })

    out_path = os.path.join(site_dir, "tutorials.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(tutorials, f, ensure_ascii=False, indent=2)
