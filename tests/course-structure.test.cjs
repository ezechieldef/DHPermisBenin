const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const service = import(pathToFileURL(path.join(process.cwd(), 'src/services/course-structure.ts')).href);

test('une partie affiche une couverture, une introduction facultative puis ses sections', async () => {
  const { parseCourseStructure } = await service;
  const result = parseCourseStructure('# Cours\n\nPréambule\n\n## Signalisation\n\nIntroduction locale\n\n### Panneaux\n\nContenu', 'Cours');
  assert.deepEqual(result.steps.map((step) => step.type), ['cover', 'intro', 'section']);
  assert.equal(result.steps[1].markdown.includes('Préambule'), true);
  assert.equal(result.steps[1].markdown.includes('Introduction locale'), true);
  assert.equal(result.sectionKeys.length, 1);
});

test('une partie sans introduction passe directement de la couverture à la section', async () => {
  const { parseCourseStructure } = await service;
  const result = parseCourseStructure('# Cours\n\n## Priorités\n\n### Priorité à droite\n\nContenu', 'Cours');
  assert.deepEqual(result.steps.map((step) => step.type), ['cover', 'section']);
});

test('un ancien cours sans titre de niveau 2 reçoit une partie implicite', async () => {
  const { parseCourseStructure } = await service;
  const result = parseCourseStructure('# Mécanique\n\nUne introduction.\n\n### Pneus\n\nPression.', 'Mécanique');
  assert.equal(result.parts.length, 1);
  assert.deepEqual(result.steps.map((step) => step.type), ['cover', 'intro', 'section']);
  assert.equal(result.steps.at(-1).title, 'Pneus');
});
