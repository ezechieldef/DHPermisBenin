#!/usr/bin/env python3
"""Génère une question et ses options séparées avec OpenAI Speech."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "assets/database/permis.sqlite"
OUTPUT = ROOT / "assets/audio"
MODEL = "gpt-4o-mini-tts-2025-12-15"
VOICE = "marin"

QUESTION_INSTRUCTIONS = (
    "Parle en français avec une voix humaine, naturelle, chaleureuse et pédagogique. "
    "Lis ceci comme une vraie question d'examen du permis de conduire : adopte une "
    "intonation clairement interrogative, avec une légère montée naturelle à la fin. "
    "Articule calmement, sans ton robotique, publicitaire ou théâtral. Ne donne aucun "
    "indice sur la réponse correcte."
)
OPTION_INSTRUCTIONS = (
    "Parle en français avec la même voix humaine, naturelle, chaleureuse et pédagogique. "
    "Lis cette proposition de réponse sur un ton neutre et parfaitement impartial. "
    "Prononce d'abord uniquement la lettre de l'option, marque une très courte pause, puis lis "
    "son contenu. Ne suggère jamais si l'option est correcte ou incorrecte."
)


def create_audio(api_key: str, text: str, instructions: str, target: Path, force: bool = False) -> bool:
    if not force and target.exists() and target.stat().st_size > 1_000:
        return False
    payload = json.dumps({
        "model": MODEL,
        "voice": VOICE,
        "input": text,
        "instructions": instructions,
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
            return True
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ConnectionError, OSError) as error:
            if attempt == 4:
                raise RuntimeError(f"Échec pour {target.name}: {error}") from error
            time.sleep(2 ** attempt)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--question-number", type=int, default=1)
    parser.add_argument("--all", action="store_true", help="Générer toutes les questions et options")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("OPENAI_API_KEY est absente de l'environnement.")

    database = sqlite3.connect(DB)
    database.row_factory = sqlite3.Row
    question = database.execute("SELECT id,number,statement FROM questions WHERE number=?", (args.question_number,)).fetchone()
    if not question:
        raise SystemExit(f"Question {args.question_number} introuvable.")
    manifest_path = OUTPUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {
        "version": 2, "provider": "openai", "model": MODEL, "voice": VOICE,
        "codec": "AAC", "courses": {}, "questions": {}, "options": {},
    }
    if args.all:
        questions = database.execute("SELECT id,number,statement FROM questions ORDER BY number").fetchall()
        options = database.execute("SELECT o.id,o.letter,o.text,q.number FROM options o JOIN questions q ON q.id=o.question_id ORDER BY q.number,o.display_order").fetchall()
        jobs = []
        for row in questions:
            relative = f"questions/q-{row['number']:04d}.aac"
            jobs.append(("question", row["id"], relative, row["statement"], QUESTION_INSTRUCTIONS))
        for row in options:
            relative = f"options/q-{row['number']:04d}-{row['letter'].lower()}.aac"
            spoken = f"{row['letter']}. {row['text']}"
            jobs.append(("option", row["id"], relative, spoken, OPTION_INSTRUCTIONS))
        lock = threading.Lock()
        completed = 0
        generated = 0
        print(f"Génération de {len(jobs)} fichiers avec {args.workers} requêtes parallèles…", flush=True)

        def run(job):
            kind, row_id, relative, spoken, instructions = job
            created = create_audio(api_key, spoken, instructions, OUTPUT / relative, args.force)
            return kind, row_id, relative, spoken, created

        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = [executor.submit(run, job) for job in jobs]
            for future in as_completed(futures):
                kind, row_id, relative, spoken, created = future.result()
                with lock:
                    bucket = "questions" if kind == "question" else "options"
                    manifest[bucket][str(row_id)] = {"file": relative, "text": spoken}
                    completed += 1
                    generated += int(created)
                    if completed % 10 == 0 or completed == len(jobs):
                        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                    if completed % 25 == 0 or completed == len(jobs):
                        print(f"{completed}/{len(jobs)} — {generated} nouveaux fichiers", flush=True)
        print(f"Terminé : {generated} fichiers générés, {len(jobs)-generated} déjà présents.")
        return

    options = database.execute("SELECT id,letter,text FROM options WHERE question_id=? ORDER BY display_order", (question["id"],)).fetchall()
    question_file = f"questions/q-{question['number']:04d}.aac"
    print(f"Question {question['number']} — intonation interrogative", flush=True)
    create_audio(api_key, question["statement"], QUESTION_INSTRUCTIONS, OUTPUT / question_file, args.force)
    manifest["questions"][str(question["id"])] = {"file": question_file, "text": question["statement"]}

    for option in options:
        relative = f"options/q-{question['number']:04d}-{option['letter'].lower()}.aac"
        spoken = f"{option['letter']}. {option['text']}"
        print(f"Option {option['letter']} — intonation neutre", flush=True)
        create_audio(api_key, spoken, OPTION_INSTRUCTIONS, OUTPUT / relative, args.force)
        manifest["options"][str(option["id"])] = {"file": relative, "text": spoken}
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Terminé : question {question['number']} et {len(options)} options.")


if __name__ == "__main__":
    main()
