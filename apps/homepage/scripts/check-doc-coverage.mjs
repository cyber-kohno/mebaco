import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allElementKinds, elementCatalog } from '../src/data/element-catalog.mjs';

const repoRoot = resolve(import.meta.dirname, '../../..');
const registryPath = resolve(repoRoot, 'apps/studio/src/system/workspace/element-definition/element-registry.ts');
const registry = await readFile(registryPath, 'utf8');
const registryBody = registry.split('const definitions = {')[1]?.split('} satisfies DefinitionMap')[0];

if (!registryBody) throw new Error(`Could not find the element definition map in ${registryPath}`);

const registeredKinds = [...registryBody.matchAll(/^\s*(?:'([^']+)'|([a-zA-Z][\w-]*)):\s*/gm)]
  .map((match) => match[1] ?? match[2]);
const catalogKinds = allElementKinds;
const duplicates = catalogKinds.filter((kind, index) => catalogKinds.indexOf(kind) !== index);
const missing = registeredKinds.filter((kind) => !catalogKinds.includes(kind));
const stale = catalogKinds.filter((kind) => !registeredKinds.includes(kind));
const routes = [...new Set(elementCatalog.map((group) => group.page))];
const missingRoutes = [];

for (const route of routes) {
  const relative = route.replace(/^\//, '').replace(/\/$/, '');
  const candidates = [
    resolve(import.meta.dirname, `../src/content/docs/${relative}.md`),
    resolve(import.meta.dirname, `../src/content/docs/${relative}/index.md`),
  ];
  let found = false;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      found = true;
      break;
    } catch {
      // Try the index document variant next.
    }
  }
  if (!found) missingRoutes.push(route);
}

if (duplicates.length || missing.length || stale.length || missingRoutes.length) {
  console.error('Element documentation catalog does not match ElementRegistry.');
  if (duplicates.length) console.error(`Duplicate catalog entries: ${[...new Set(duplicates)].join(', ')}`);
  if (missing.length) console.error(`Missing catalog entries: ${missing.join(', ')}`);
  if (stale.length) console.error(`No longer registered: ${stale.join(', ')}`);
  if (missingRoutes.length) console.error(`Catalog links point to missing pages: ${missingRoutes.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Element catalog covers all ${registeredKinds.length} registered element kinds across ${elementCatalog.length} groups; all ${routes.length} linked pages exist.`);
}
