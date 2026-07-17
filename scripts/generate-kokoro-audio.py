#!/usr/bin/env python3
"""Generate resumable French Kokoro audio assets from the embedded SQLite database."""

import argparse
import json
import re
import sqlite3
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf
import numpy as np
from kokoro_onnx import Kokoro
from kokoro_onnx.config import MAX_PHONEME_LENGTH, SAMPLE_RATE

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "assets/database/permis.sqlite"
MODEL = ROOT / "work/kokoro-model/kokoro-v1.0.int8.onnx"
VOICES = ROOT / "work/kokoro-model/voices-v1.0.bin"
OUTPUT = ROOT / "assets/audio"
VOICE = "ff_siwis"
LANG = "fr-fr"


class MobileOnnxKokoro(Kokoro):
    """Compatibility layer for the quantized onnx-community export."""

    def _create_audio(self, phonemes, voice, speed):
        phonemes = phonemes[:MAX_PHONEME_LENGTH]
        tokens = np.array(self.tokenizer.tokenize(phonemes), dtype=np.int64)
        style = np.asarray(voice[len(tokens)], dtype=np.float32)[None, :]
        audio = self.sess.run(None, {
            "input_ids": np.asarray([[0, *tokens, 0]], dtype=np.int64),
            "style": style,
            "speed": np.asarray([speed], dtype=np.float32),
        })[0]
        return np.asarray(audio).squeeze(), SAMPLE_RATE


def spoken_text(value: str) -> str:
    value = re.sub(r"!\[[^]]*]\([^)]+\)", " ", value or "")
    value = re.sub(r"https?://\S+", " ", value)
    value = value.replace("PTAC", "P T A C").replace("PTRA", "P T R A")
    value = value.replace("TIR", "T I R").replace("TCR", "T C R")
    value = value.replace("SAMU", "S A M U").replace("SMUR", "S M U R")
    value = re.sub(r"[#>*_`]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def split_course(markdown: str) -> list[str]:
    markdown = re.sub(r"!\[[^]]*]\([^)]+\)", "\n", markdown)
    blocks = re.split(r"\n\s*\n|(?=^#{2,3}\s)", markdown, flags=re.MULTILINE)
    chunks: list[str] = []
    for block in blocks:
        text = spoken_text(block)
        if not text:
            continue
        sentences = re.split(r"(?<=[.!?;:])\s+", text)
        current = ""
        for sentence in sentences:
            if current and len(current) + len(sentence) + 1 > 480:
                chunks.append(current)
                current = ""
            if len(sentence) > 480:
                pieces = re.split(r"(?<=,)\s+", sentence)
            else:
                pieces = [sentence]
            for piece in pieces:
                if current and len(current) + len(piece) + 1 > 480:
                    chunks.append(current)
                    current = piece
                else:
                    current = f"{current} {piece}".strip()
        if current:
            chunks.append(current)
    return chunks


def valid_audio(path: Path) -> bool:
    return path.exists() and path.stat().st_size > 900


def synthesize(kokoro: Kokoro, text: str, target: Path) -> None:
    if valid_audio(target):
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    samples, sample_rate = kokoro.create(text, voice=VOICE, speed=0.96, lang=LANG)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
        wav = Path(handle.name)
    try:
        sf.write(wav, samples, sample_rate)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-ar", "24000", "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", str(target)],
            check=True,
        )
    finally:
        wav.unlink(missing_ok=True)


def write_manifest(data: dict) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "manifest.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["preview", "courses", "questions", "options", "manifest", "all"], default="all")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--shard-index", type=int, default=0)
    parser.add_argument("--shard-count", type=int, default=1)
    args = parser.parse_args()
    if not 0 <= args.shard_index < args.shard_count:
        raise SystemExit("shard-index doit être inférieur à shard-count")
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    manifest: dict = {"version": 1, "voice": VOICE, "codec": "AAC-LC", "bitrate": 32000, "sampleRate": 24000, "courses": {}, "questions": {}, "options": {}}

    if args.only == "manifest":
        for row in db.execute("SELECT id,content_markdown FROM cours WHERE is_published=1 ORDER BY display_order"):
            entries = [{"file": f"courses/course-{row['id']:03d}/section-{index:03d}.m4a", "text": text} for index, text in enumerate(split_course(row["content_markdown"]), 1)]
            manifest["courses"][str(row["id"])] = [entry for entry in entries if valid_audio(OUTPUT / entry["file"])]
        for row in db.execute("SELECT id,number,statement FROM questions ORDER BY number"):
            relative = f"questions/q-{row['number']:04d}.m4a"
            if valid_audio(OUTPUT / relative): manifest["questions"][str(row["id"])] = {"file": relative, "text": spoken_text(row["statement"])}
        for row in db.execute("SELECT o.id,o.letter,o.text,q.number FROM options o JOIN questions q ON q.id=o.question_id ORDER BY q.number,o.display_order"):
            relative = f"options/q-{row['number']:04d}-{row['letter'].lower()}.m4a"
            if valid_audio(OUTPUT / relative): manifest["options"][str(row["id"])] = {"file": relative, "text": spoken_text(f"Option {row['letter']}. {row['text']}")}
        write_manifest(manifest)
        print(f"Manifeste : {len(manifest['courses'])} cours, {len(manifest['questions'])} questions, {len(manifest['options'])} options.")
        return
    if not MODEL.exists() or not VOICES.exists():
        raise SystemExit("Modèle Kokoro absent dans work/kokoro-model")
    kokoro = MobileOnnxKokoro(str(MODEL), str(VOICES))
    sharded = lambda rows: [row for index, row in enumerate(rows[: args.limit]) if index % args.shard_count == args.shard_index]

    if args.only == "preview":
        synthesize(kokoro, "Bienvenue dans D H P Prépa Permis Bénin. À une intersection sans signalisation, appliquez la priorité à droite.", ROOT / "work/audio-preview/kokoro-francais.m4a")
        print("Aperçu créé : work/audio-preview/kokoro-francais.m4a", flush=True)
        return

    if args.only in ("courses", "all"):
        rows = db.execute("SELECT id,title,content_markdown FROM cours WHERE is_published=1 ORDER BY display_order").fetchall()
        for row in sharded(rows):
            entries = []
            for index, text in enumerate(split_course(row["content_markdown"]), 1):
                relative = f"courses/course-{row['id']:03d}/section-{index:03d}.m4a"
                synthesize(kokoro, text, OUTPUT / relative)
                entries.append({"file": relative, "text": text})
            manifest["courses"][str(row["id"])] = entries
            if args.shard_count == 1: write_manifest(manifest)
            print(f"Cours {row['id']}/{len(rows)} : {len(entries)} sections", flush=True)

    if args.only in ("questions", "all"):
        rows = db.execute("SELECT id,number,statement FROM questions ORDER BY number").fetchall()
        selected_rows = sharded(rows)
        for pos, row in enumerate(selected_rows, 1):
            relative = f"questions/q-{row['number']:04d}.m4a"
            text = spoken_text(row["statement"])
            synthesize(kokoro, text, OUTPUT / relative)
            manifest["questions"][str(row["id"])] = {"file": relative, "text": text}
            if pos % 25 == 0:
                if args.shard_count == 1: write_manifest(manifest)
                print(f"Questions lot {args.shard_index + 1} : {pos}/{len(selected_rows)}", flush=True)
        if args.shard_count == 1: write_manifest(manifest)

    if args.only in ("options", "all"):
        rows = db.execute("SELECT o.id,o.question_id,o.letter,o.text,q.number FROM options o JOIN questions q ON q.id=o.question_id ORDER BY q.number,o.display_order").fetchall()
        selected_rows = sharded(rows)
        for pos, row in enumerate(selected_rows, 1):
            relative = f"options/q-{row['number']:04d}-{row['letter'].lower()}.m4a"
            text = spoken_text(f"Option {row['letter']}. {row['text']}")
            synthesize(kokoro, text, OUTPUT / relative)
            manifest["options"][str(row["id"])] = {"file": relative, "text": text}
            if pos % 50 == 0:
                if args.shard_count == 1: write_manifest(manifest)
                print(f"Options lot {args.shard_index + 1} : {pos}/{len(selected_rows)}", flush=True)
        if args.shard_count == 1: write_manifest(manifest)


if __name__ == "__main__":
    main()
