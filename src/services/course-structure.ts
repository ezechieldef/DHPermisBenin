export type CourseStepType = 'cover' | 'intro' | 'section';

export type CourseStep = {
  key: string;
  type: CourseStepType;
  title: string;
  partKey: string;
  partTitle: string;
  markdown: string;
  startLine: number;
  endLine: number;
  sectionKey?: string;
  readingMinutes: number;
};

export type CoursePart = {
  key: string;
  title: string;
  coverStepKey: string;
  introStepKey?: string;
  sectionStepKeys: string[];
};

export type CourseStructure = {
  title: string;
  parts: CoursePart[];
  steps: CourseStep[];
  sectionKeys: string[];
};

type Heading = { line: number; title: string };

const cleanTitle = (value: string) => value.replace(/[*_`]/g, '').trim();
const hasContent = (lines: string[]) => lines.some((line) => Boolean(line.trim()));
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54) || 'section';
const minutes = (markdown: string) => Math.max(1, Math.ceil(markdown.replace(/!\[[^\]]*\]\([^)]+\)/g, '').split(/\s+/).filter(Boolean).length / 170));

function fragment(lines: string[], startLine: number, endLine: number) {
  if (endLine < startLine) return '';
  return lines.slice(startLine - 1, endLine).join('\n').trimEnd();
}

/**
 * Transforme le Markdown historique en parcours court. Dans les cours actuels,
 * les titres verts (##) sont des parties et leurs sous-titres (###) des sections.
 * Si un ancien cours n'a pas de ##, son titre devient une partie implicite.
 */
export function parseCourseStructure(markdown: string, fallbackTitle: string): CourseStructure {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const root = lines.findIndex((line) => /^#\s+/.test(line));
  const title = root >= 0 ? cleanTitle(lines[root].replace(/^#\s+/, '')) : fallbackTitle;
  const partHeadings: Heading[] = [];
  lines.forEach((line, index) => {
    const match = line.match(/^##\s+(.+)/);
    if (match) partHeadings.push({ line: index + 1, title: cleanTitle(match[1]) });
  });

  const implicit = partHeadings.length === 0;
  const headings = implicit ? [{ line: Math.max(1, root + 1), title }] : partHeadings;
  const preambleStart = root >= 0 ? root + 2 : 1;
  const preambleEnd = implicit ? headings[0].line : headings[0].line - 1;
  const preamble = fragment(lines, preambleStart, preambleEnd);
  const parts: CoursePart[] = [];
  const steps: CourseStep[] = [];
  const sectionKeys: string[] = [];

  headings.forEach((heading, partIndex) => {
    const partEnd = (headings[partIndex + 1]?.line ?? (lines.length + 1)) - 1;
    const partKey = `part:${partIndex + 1}:${slug(heading.title)}`;
    const coverStepKey = `${partKey}:cover`;
    const sectionHeadings: Heading[] = [];
    const contentStart = implicit ? (root >= 0 ? root + 2 : 1) : heading.line + 1;
    for (let line = contentStart; line <= partEnd; line += 1) {
      const match = lines[line - 1]?.match(/^###\s+(.+)/);
      if (match) sectionHeadings.push({ line, title: cleanTitle(match[1]) });
    }

    const part: CoursePart = { key: partKey, title: heading.title, coverStepKey, sectionStepKeys: [] };
    steps.push({ key: coverStepKey, type: 'cover', title: heading.title, partKey, partTitle: heading.title, markdown: '', startLine: heading.line, endLine: heading.line, readingMinutes: 0 });

    if (sectionHeadings.length) {
      const localIntroEnd = sectionHeadings[0].line - 1;
      const introStart = partIndex === 0 && preamble.trim() ? preambleStart : contentStart;
      const introLines = lines.slice(introStart - 1, localIntroEnd);
      if (!implicit && heading.line >= introStart && heading.line <= localIntroEnd) introLines[heading.line - introStart] = '';
      const introMarkdown = introLines.join('\n').trimEnd();
      if (introMarkdown.trim()) {
        const introKey = `${partKey}:intro`;
        part.introStepKey = introKey;
        steps.push({
          key: introKey, type: 'intro', title: 'Introduction', partKey, partTitle: heading.title,
          markdown: introMarkdown, startLine: introStart,
          endLine: localIntroEnd, readingMinutes: minutes(introMarkdown),
        });
      }
      sectionHeadings.forEach((section, sectionIndex) => {
        const endLine = (sectionHeadings[sectionIndex + 1]?.line ?? (partEnd + 1)) - 1;
        const body = fragment(lines, section.line + 1, endLine);
        const sectionKey = `${partKey}:section:${sectionIndex + 1}:${slug(section.title)}`;
        const stepKey = sectionKey;
        part.sectionStepKeys.push(stepKey);
        sectionKeys.push(sectionKey);
        steps.push({ key: stepKey, type: 'section', title: section.title, partKey, partTitle: heading.title, markdown: body, startLine: section.line + 1, endLine, sectionKey, readingMinutes: minutes(body) });
      });
    } else {
      const sectionStart = partIndex === 0 && preamble.trim() ? preambleStart : contentStart;
      const bodyLines = lines.slice(sectionStart - 1, partEnd);
      if (!implicit && heading.line >= sectionStart && heading.line <= partEnd) bodyLines[heading.line - sectionStart] = '';
      const body = bodyLines.join('\n').trimEnd();
      if (hasContent(body.split('\n'))) {
        const sectionKey = `${partKey}:section:1:${slug(heading.title)}`;
        part.sectionStepKeys.push(sectionKey);
        sectionKeys.push(sectionKey);
        steps.push({ key: sectionKey, type: 'section', title: heading.title, partKey, partTitle: heading.title, markdown: body, startLine: sectionStart, endLine: partEnd, sectionKey, readingMinutes: minutes(body) });
      }
    }
    parts.push(part);
  });

  return { title, parts, steps, sectionKeys };
}

export function stepIndexForKey(structure: CourseStructure, key: string | null | undefined) {
  const index = key ? structure.steps.findIndex((step) => step.key === key) : -1;
  return index >= 0 ? index : 0;
}
