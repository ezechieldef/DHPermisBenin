const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const database = path.join(root, 'assets/database/permis.sqlite');
const sql = (query) => execFileSync('sqlite3', [database, query], { encoding: 'utf8' }).trim();

test('la base embarquée est complète et cohérente', () => {
  assert.equal(sql('PRAGMA integrity_check;'), 'ok');
  assert.equal(sql('SELECT COUNT(*) FROM questions;'), '929');
  assert.equal(sql('SELECT COUNT(*) FROM options;'), '3171');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE image_path IS NOT NULL;"), '230');
  assert.equal(sql('SELECT COUNT(*) FROM questions q WHERE NOT EXISTS (SELECT 1 FROM options o WHERE o.question_id=q.id AND o.is_correct=1);'), '0');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type='B';"), '775');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type='A1, A2, A3' AND number BETWEEN 646 AND 678;"), '33');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type='B1' AND number BETWEEN 679 AND 688;"), '10');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type='C, C1' AND number BETWEEN 689 AND 738;"), '50');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type='D' AND number BETWEEN 739 AND 799;"), '61');
  assert.equal(sql("SELECT COUNT(*) FROM questions WHERE permis_type IS NULL OR permis_type='';"), '0');
});

test('la migration locale crée les tables de progression', () => {
  const migrationSource = fs.readFileSync(path.join(root, 'src/db/migrations.ts'), 'utf8');
  const migration = migrationSource.match(/db\.execAsync\(`([\s\S]*?)`\)/)?.[1];
  assert.ok(migration, 'SQL de migration introuvable');
  const temp = path.join(os.tmpdir(), `dhp-permis-${process.pid}.sqlite`);
  fs.copyFileSync(database, temp);
  try {
    execFileSync('sqlite3', [temp], { input: migration });
    const tables = execFileSync('sqlite3', [temp, "SELECT group_concat(name,',') FROM sqlite_master WHERE type='table' AND name IN ('attempts','attempt_answers','question_progress','settings') ORDER BY name;"], { encoding:'utf8' }).trim().split(',').sort();
    assert.deepEqual(tables, ['attempt_answers','attempts','question_progress','settings']);
  } finally { fs.rmSync(temp, { force:true }); }
});

test('seule la question 586 manque dans la numérotation', () => {
  const missing = sql(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<930)
    SELECT group_concat(x) FROM n WHERE x NOT IN (SELECT number FROM questions);`);
  assert.equal(missing, '586');
});

test('les sujets couvrent toutes les catégories', () => {
  const rows = sql('SELECT c.id||":"||COUNT(q.id) FROM categories c LEFT JOIN questions q ON q.category_id=c.id GROUP BY c.id ORDER BY c.id;').split('\n');
  assert.deepEqual(rows, ['1:205','2:154','3:45','4:103','5:137','6:33','7:10','8:50','9:61','10:131']);
});

test('tous les assets de questions sont présents et référencés', () => {
  const files = fs.readdirSync(path.join(root, 'assets/questions')).filter((name) => name.endsWith('.webp'));
  assert.equal(files.length, 230);
  const map = fs.readFileSync(path.join(root, 'src/services/question-images.ts'), 'utf8');
  for (const file of files) assert.ok(map.includes(file), `${file} absent du manifeste`);
});

test('le cours contient ses sept illustrations hors ligne', () => {
  const markdown = sql("SELECT content_markdown FROM cours WHERE title='Généralités';");
  const links = [...markdown.matchAll(/assets\/cours\/generalites\/([^\s)]+\.svg)/g)].map((match) => match[1]);
  assert.equal(new Set(links).size, 7);
  for (const name of new Set(links)) assert.ok(fs.existsSync(path.join(root, 'assets/course', `${name}.png`)), `${name}.png absent`);
});

test('les couleurs proviennent du thème global partagé avec Tailwind', () => {
  const { colors } = require(path.join(root, 'src/theme/colors.cjs'));
  assert.equal(colors.primary, '#0B8F6A');
  assert.equal(colors.background, '#F6F8F7');
  assert.ok(fs.readFileSync(path.join(root, 'tailwind.config.js'), 'utf8').includes("./src/theme/colors.cjs"));
});

test('les variables du thème sont injectées par une View native', () => {
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  assert.match(layout, /<GestureHandlerRootView style=\{\{ flex: 1 \}\}>/);
  assert.match(layout, /<View style=\{\[\{ flex: 1 \}, themeVariables\]\}>/);
  assert.doesNotMatch(layout, /<GestureHandlerRootView[^>]+themeVariables/);
});

test('le thème sombre utilise un fond presque noir et une barre système lisible', () => {
  const { darkColors } = require(path.join(root, 'src/theme/colors.cjs'));
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.equal(darkColors.background, '#030504');
  assert.match(layout, /scheme === 'dark' \? 'light' : 'dark'/);
  assert.equal(appConfig.expo.userInterfaceStyle, 'automatic');
  assert.deepEqual(appConfig.expo.ios.infoPlist.UIBackgroundModes, ['audio']);
});
