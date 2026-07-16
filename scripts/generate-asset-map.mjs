import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = fs.readdirSync(path.join(root, 'assets/questions')).filter((name) => name.endsWith('.webp')).sort();
const lines = files.map((name) => {
  const number = Number(name.match(/q(\d+)/)?.[1]);
  return `  ${number}: require('../../assets/questions/${name}'),`;
});
const output = `import type { ImageSourcePropType } from 'react-native';\n\nexport const QUESTION_IMAGES: Record<number, ImageSourcePropType> = {\n${lines.join('\n')}\n};\n`;
fs.writeFileSync(path.join(root, 'src/services/question-images.ts'), output);
console.log(`Generated ${files.length} question image entries.`);
