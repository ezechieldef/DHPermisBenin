#!/usr/bin/env python3
"""Génère les passages audio d'un cours avec l'API Speech OpenAI.

La clé est lue exclusivement depuis OPENAI_API_KEY et n'est jamais persistée.
Le script reprend automatiquement après une interruption.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "audio"
BACKUPS = ROOT / "work" / "audio-backups"
DB = ROOT / "assets" / "database" / "permis.sqlite"
MODEL = "gpt-4o-mini-tts-2025-12-15"
VOICE = "marin"
INSTRUCTIONS = (
    "Parle en français avec une voix naturelle, chaleureuse et pédagogique. "
    "Adopte le ton calme et humain d'un excellent moniteur d'auto-école au Bénin. "
    "Articule clairement sans exagérer, évite absolument le ton publicitaire, théâtral "
    "ou robotique. Respecte le sens, les nombres et les sigles du texte. Fais des pauses "
    "naturelles et garde un rythme légèrement posé, adapté à un débutant."
)


def latest_kokoro_manifest() -> Path:
    candidates = sorted(BACKUPS.glob("kokoro-*/manifest.json"), reverse=True)
    if not candidates:
        raise SystemExit("Sauvegarde Kokoro introuvable.")
    return candidates[0]


def spoken_text(value: str) -> str:
    value = re.sub(r"!\[[^]]*]\([^)]+\)", " ", value or "")
    value = re.sub(r"[#>*_`]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def coherent_course_chunks(markdown: str, target_size: int = 1_250) -> list[dict]:
    """Regroupe titres, paragraphes et énumérations en unités de lecture naturelles."""
    lines = markdown.splitlines()
    units: list[dict] = []
    index = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line or line.startswith("!["):
            index += 1
            continue
        start = index
        if line.startswith("#"):
            units.append({"text": spoken_text(line), "start_line": start + 1, "end_line": start + 1, "kind": "heading"})
            index += 1
            continue
        if re.match(r"^[-*]\s+", line):
            items: list[str] = []
            end = index
            while index < len(lines):
                candidate = lines[index].strip()
                if not candidate:
                    index += 1
                    continue
                if not re.match(r"^[-*]\s+", candidate):
                    break
                item = spoken_text(candidate)
                projected = len(" ".join(items)) + len(item) + 1
                if items and projected > target_size:
                    break
                items.append(item)
                end = index
                index += 1
            units.append({"text": " ".join(items), "start_line": start + 1, "end_line": end + 1, "kind": "list"})
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not lines[index].lstrip().startswith(("#", "- ", "* ", "![")):
            paragraph.append(lines[index].strip())
            index += 1
        units.append({"text": spoken_text(" ".join(paragraph)), "start_line": start + 1, "end_line": index, "kind": "paragraph"})

    chunks: list[dict] = []
    current: list[dict] = []
    for unit in units:
        projected = len(" ".join(item["text"] for item in current)) + len(unit["text"]) + 1
        must_attach = bool(current and (current[-1]["kind"] == "heading" or current[-1]["text"].rstrip().endswith(":")))
        if current and projected > target_size and not must_attach:
            chunks.append({
                "text": " ".join(item["text"] for item in current),
                "start_line": current[0]["start_line"],
                "end_line": current[-1]["end_line"],
            })
            current = []
        current.append(unit)
    if current:
        chunks.append({"text": " ".join(item["text"] for item in current), "start_line": current[0]["start_line"], "end_line": current[-1]["end_line"]})
    ignored_titles = {"planches illustratives du support officiel"}
    return [chunk for chunk in chunks if chunk["text"].strip().casefold() not in ignored_titles]


def request_audio(api_key: str, text: str, target: Path) -> None:
    payload = json.dumps({
        "model": MODEL,
        "voice": VOICE,
        "input": text,
        "instructions": INSTRUCTIONS,
        "response_format": "aac",
        "speed": 0.98,
    }, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                audio = response.read()
            if len(audio) < 1_000:
                raise RuntimeError("Réponse audio anormalement petite.")
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(".tmp")
            temporary.write_bytes(audio)
            temporary.replace(target)
            return
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ConnectionError, OSError) as error:
            if attempt == 4:
                raise RuntimeError(f"Échec de génération pour {target.name}: {error}") from error
            time.sleep(2 ** attempt)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--course-id", type=int, default=2)
    parser.add_argument("--limit", type=int, help="Générer seulement les N premiers passages")
    args = parser.parse_args()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY est absente de l'environnement.")

    with sqlite3.connect(DB) as database:
        row = database.execute("SELECT content_markdown FROM cours WHERE id=?", (args.course_id,)).fetchone()
    if not row:
        raise SystemExit(f"Cours {args.course_id} introuvable.")
    entries = coherent_course_chunks(row[0])
    if args.limit:
        entries = entries[:args.limit]
    if not entries:
        raise SystemExit(f"Aucun passage trouvé pour le cours {args.course_id}.")

    manifest_path = OUTPUT / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"courses": {}, "questions": {}, "options": {}}
    manifest.update({"version": 2, "provider": "openai", "model": MODEL, "voice": VOICE, "codec": "AAC"})
    manifest.setdefault("courses", {})
    manifest.setdefault("questions", {})
    manifest.setdefault("options", {})
    manifest["courses"][str(args.course_id)] = []
    for position, entry in enumerate(entries, 1):
        relative = f"courses/course-{args.course_id:03d}/section-{position:03d}.aac"
        target = OUTPUT / relative
        if not target.exists() or target.stat().st_size < 1_000:
            print(f"[{position}/{len(entries)}] {entry['text'][:70]}", flush=True)
            request_audio(api_key, entry["text"], target)
        manifest["courses"][str(args.course_id)].append({
            "file": relative,
            "text": entry["text"],
            "start_line": entry["start_line"],
            "end_line": entry["end_line"],
        })
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUTPUT / ".complete").write_text(f"openai course {args.course_id}\n", encoding="utf-8")
    print(f"Terminé : {len(entries)} passages générés avec {MODEL} / {VOICE}.")


if __name__ == "__main__":
    main()
