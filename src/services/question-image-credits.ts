import imageSources from '@/assets/questions/SOURCES.json';

type CreditSource = {
  sourcePage: string;
  archiveEntry?: string;
  authorHtml?: string;
  authors?: string[];
  license: string;
  licenseUrl: string;
  components?: CreditSource[];
};

const records = imageSources.records as { svg: string; modified: boolean; source: CreditSource }[];
const groups = new Map<string, {
  id: string; title: string; authors: string; sourceUrl: string; license: string;
  licenseUrl: string; files: string[]; adaptedFiles: string[];
}>();

for (const record of records) {
  for (const source of record.source.components ?? [record.source]) {
    const id = `${source.sourcePage}|${source.archiveEntry ?? ''}|${source.license}`;
    if (!groups.has(id)) {
      const title = source.archiveEntry ?? decodeURIComponent(source.sourcePage.split('/').pop() ?? '').replace(/^File:/, '').replaceAll('_', ' ');
      const authors = source.authors?.join(', ') ?? source.authorHtml?.replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').trim() ?? '';
      groups.set(id, { id, title, authors, sourceUrl: source.sourcePage, license: source.license, licenseUrl: source.licenseUrl, files: [], adaptedFiles: [] });
    }
    const credit = groups.get(id)!;
    credit.files.push(record.svg);
    if (record.modified) credit.adaptedFiles.push(record.svg);
  }
}

export const QUESTION_IMAGE_CREDITS = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
