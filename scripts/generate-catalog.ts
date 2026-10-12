import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog } from '../src/data/catalog';
import { parseActivity } from '../src/data/validation';

catalog.forEach(parseActivity);
const contents = JSON.stringify(catalog, null, 2) + '\n';
const target = resolve('backend/data/activities.json');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== contents) throw new Error('Каталоги расходятся. Выполни npm run seed:generate.');
  console.log(`Локальный и серверный каталоги совпадают: ${catalog.length} занятий.`);
} else {
  writeFileSync(target, contents, 'utf8');
  console.log(`Создан backend/data/activities.json: ${catalog.length} занятий.`);
}
