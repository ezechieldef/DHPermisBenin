const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const quiz = fs.readFileSync(path.join(root, 'app/quiz/index.tsx'), 'utf8');
const viewer = fs.readFileSync(path.join(root, 'src/components/course-image-viewer.tsx'), 'utf8');
const audio = fs.readFileSync(path.join(root, 'src/components/audio-button.tsx'), 'utf8');
const context = fs.readFileSync(path.join(root, 'src/features/quiz-context.tsx'), 'utf8');
const appConfig = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
const result = fs.readFileSync(path.join(root, 'app/result/index.tsx'), 'utf8');
const courses = fs.readFileSync(path.join(root, 'app/(tabs)/cours.tsx'), 'utf8');
const progress = fs.readFileSync(path.join(root, 'app/(tabs)/progression.tsx'), 'utf8');
const resetProgressButton = fs.readFileSync(path.join(root, 'src/components/reset-progress-button.tsx'), 'utf8');
const queries = fs.readFileSync(path.join(root, 'src/db/queries.ts'), 'utf8');
const training = fs.readFileSync(path.join(root, 'app/(tabs)/entrainement.tsx'), 'utf8');
const exam = fs.readFileSync(path.join(root, 'app/(tabs)/examen.tsx'), 'utf8');
const brandFooter = fs.readFileSync(path.join(root, 'src/components/brand-footer.tsx'), 'utf8');
const palette = require(path.join(root, 'src/theme/colors.cjs')).colors;

test('le quiz gère fermeture Web et mobile', () => {
  assert.match(quiz, /globalThis\.confirm/);
  assert.match(quiz, /Alert\.alert\('Quitter ce sujet \?'/);
  assert.match(quiz, /accessibilityLabel="Fermer le quiz"/);
});

test('le clavier permet navigation, sélection et validation', () => {
  assert.match(quiz, /event\.key === 'ArrowDown'/);
  assert.match(quiz, /event\.key === 'ArrowUp'/);
  assert.match(quiz, /event\.key === ' '/);
  assert.match(quiz, /event\.key === 'Enter'/);
  assert.match(quiz, /setFocusedOption/);
});

test('la question et ses options sont dans une zone verticale défilable', () => {
  assert.match(quiz, /<ScrollView/);
  assert.match(quiz, /contentScrollRef\.current\?\.scrollTo/);
  assert.match(quiz, /question\.statement[\s\S]*question\.options\.map[\s\S]*<\/ScrollView>/);
});

test('le quiz permet de revenir à la question précédente', () => {
  assert.match(quiz, /accessibilityLabel="Question précédente"/);
  assert.match(quiz, /setIndex\(\(current\) => current - 1\)/);
  assert.match(quiz, /index === 0/);
});

test('toutes les questions permettent plusieurs sélections sans révéler leur type', () => {
  assert.doesNotMatch(quiz, /question\.answer_type === 'single'/);
  assert.match(quiz, /accessibilityRole="checkbox"/);
  assert.match(quiz, /selected\.includes\(letter\)/);
});

test('le focus clavier ne colore pas une option sur Android', () => {
  assert.match(quiz, /Platform\.OS === 'web' && optionIndex === focusedOption/);
});

test('la visionneuse plein écran possède sa propre racine gestuelle', () => {
  assert.match(viewer, /GestureHandlerRootView/);
  assert.match(viewer, /Gesture\.Exclusive\(doubleTap, Gesture\.Simultaneous\(pinch, pan\)\)/);
  assert.match(viewer, /collapsable=\{false\}/);
});

test('le lecteur de cours propose les quatre commandes et la vitesse', () => {
  for (const label of ['Précédent', 'Pause', 'Suivant', 'Recommencer', 'Vitesse de lecture']) assert.match(audio, new RegExp(label));
  assert.match(audio, /Math\.max\(0\.5/);
  assert.match(audio, /Math\.min\(2\.5/);
  assert.match(audio, /setPlaybackRate\(rate\)/);
});

test('les lecteurs natifs ne sont pas mis en pause après leur libération automatique', () => {
  const quizAudio = fs.readFileSync(path.join(root, 'src/components/quiz-audio-player.tsx'), 'utf8');
  assert.doesNotMatch(audio, /useEffect\(\(\) => \(\) => player\.pause\(\)/);
  assert.doesNotMatch(quizAudio, /useEffect\(\(\) => \(\) => player\.pause\(\)/);
});

test('le résultat reçoit explicitement la session terminée avant la navigation', () => {
  assert.match(quiz, /quiz\.finish\(completedSession, saved\)/);
  assert.match(quiz, /requestAnimationFrame\(\(\) => router\.replace\('\/result'\)\)/);
  assert.match(context, /setResult\(\{ \.\.\.completedSession, \.\.\.data \}\)/);
});

test('l’identité Android publique est définitive', () => {
  assert.match(appConfig, /"name": "DH PREPA PERMIS BJ"/);
  assert.match(appConfig, /"package": "com\.dharvest\.prepapermisbenin"/);
});

test('une question peut être ignorée et reste une réponse vide', () => {
  assert.match(quiz, /\[question\.id\]: \[\]/);
  assert.match(quiz, /label="Ignorer"/);
});

test('la correction rappelle énoncé, options et réponses', () => {
  assert.match(result, /q\.statement/);
  assert.match(result, /q\.options\.map/);
  assert.match(result, /Votre réponse/);
  assert.match(result, /Bonne réponse/);
  assert.match(result, /Question ignorée/);
});

test('la progression utilise des couleurs globales contrastées', () => {
  assert.match(courses, /colors\.progressBackground/);
  assert.match(courses, /colors\.progressText/);
  assert.equal(palette.progressText, palette.ink);
  assert.notEqual(palette.progressBackground, palette.progressText);
});

test('la progression peut être entièrement réinitialisée depuis Cours et Progrès', () => {
  assert.match(courses, /<ResetProgressButton/);
  assert.match(progress, /<ResetProgressButton/);
  assert.match(resetProgressButton, /Tout réinitialiser/);
  assert.match(resetProgressButton, /globalThis\.confirm/);
  assert.match(queries, /DELETE FROM attempts/);
  assert.match(queries, /DELETE FROM question_progress/);
  assert.match(queries, /DELETE FROM course_progress/);
});

test('les pages principales affichent la signature D-HARVEST cliquable', () => {
  for (const page of [courses, training, exam, progress]) assert.match(page, /<BrandFooter/);
  assert.match(brandFooter, /made by/);
  assert.match(brandFooter, /D-HARVEST/);
  assert.match(brandFooter, /https:\/\/d-harvest\.com/);
  assert.match(brandFooter, /Linking\.openURL/);
});
