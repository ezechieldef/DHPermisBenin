import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/audio/manifest.json'), 'utf8'));
const requireAsset = (file) => `require('../../assets/audio/${file}')`;
const courseLines = Object.entries(manifest.courses).map(([id, entries]) => `  ${id}: [${entries.map((entry) => requireAsset(entry.file)).join(', ')}],`);
const courseSegmentLines = Object.entries(manifest.courses).map(([id, entries]) => `  ${id}: [${entries.map((entry) => `{ source: ${requireAsset(entry.file)}, startLine: ${entry.start_line ?? 1}, endLine: ${entry.end_line ?? 99999} }`).join(', ')}],`);
const questionLines = Object.entries(manifest.questions).map(([id, entry]) => `  ${id}: ${requireAsset(entry.file)},`);
const optionLines = Object.entries(manifest.options).map(([id, entry]) => `  ${id}: ${requireAsset(entry.file)},`);
const output = `/* Généré par scripts/build-audio-assets.mjs — ne pas modifier manuellement. */\nimport type { AudioSource } from 'expo-audio';\n\nexport type CourseAudioSegment = { source: AudioSource; startLine: number; endLine: number };\nexport const COURSE_AUDIO: Record<number, AudioSource[]> = {\n${courseLines.join('\n')}\n};\nexport const COURSE_AUDIO_SEGMENTS: Record<number, CourseAudioSegment[]> = {\n${courseSegmentLines.join('\n')}\n};\nexport const QUESTION_AUDIO: Record<number, AudioSource> = {\n${questionLines.join('\n')}\n};\nexport const OPTION_AUDIO: Record<number, AudioSource> = {\n${optionLines.join('\n')}\n};\n\nexport function getCourseAudio(courseId: number) { return COURSE_AUDIO[courseId] ?? []; }\nexport function getCourseAudioSegments(courseId: number) { return COURSE_AUDIO_SEGMENTS[courseId] ?? []; }\nexport function getQuizAudio(questionId: number, optionIds: number[]) {\n  const sources: AudioSource[] = [];\n  const question = QUESTION_AUDIO[questionId];\n  if (question) sources.push(question);\n  optionIds.forEach((id) => { const option = OPTION_AUDIO[id]; if (option) sources.push(option); });\n  return sources;\n}\n`;
await writeFile(resolve(root, 'src/services/audio-assets.ts'), output);
console.log(`Manifeste TypeScript : ${courseLines.length} cours, ${questionLines.length} questions, ${optionLines.length} options.`);
