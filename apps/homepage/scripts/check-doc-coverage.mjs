import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allElementKinds, elementCatalog } from '../src/data/element-catalog.mjs';
import { elementReferences, requiredReferenceSections } from '../src/data/element-reference-catalog.mjs';
import { featureCatalog } from '../../../docs/homepage-feature-catalog.mjs';

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
const referenceErrors = [];
const referenceKinds = new Set();
const referenceRoutes = new Set();
const missingRoutes = [];
const missingFeatureRoutes = [];
const missingFeatureSources = [];
const duplicateFeatureIds = featureCatalog
  .filter((feature, index) => featureCatalog.findIndex((candidate) => candidate.id === feature.id) !== index)
  .map((feature) => feature.id);
const validImplementationStatuses = new Set(['observed', 'not-code-derived']);
const validPublicationStatuses = new Set([
  'candidate-v1',
  'review-before-v1',
  'needs-product-decision',
  'confirmed-user-policy',
]);

const findContentPage = async (route) => {
  const relative = route.replace(/^\//, '').replace(/\/$/, '');
  const candidates = [
    resolve(import.meta.dirname, `../src/content/docs/${relative}.md`),
    resolve(import.meta.dirname, `../src/content/docs/${relative}.mdx`),
    resolve(import.meta.dirname, `../src/content/docs/${relative}/index.md`),
    resolve(import.meta.dirname, `../src/content/docs/${relative}/index.mdx`),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported content format.
    }
  }
  return null;
};

const contentPageExists = async (route) => await findContentPage(route) !== null;

for (const route of routes) {
  if (!await contentPageExists(route)) missingRoutes.push(route);
}

for (const reference of elementReferences) {
  if (!registeredKinds.includes(reference.kind)) referenceErrors.push(`Unknown reference kind: ${reference.kind}`);
  if (referenceKinds.has(reference.kind)) referenceErrors.push(`Duplicate reference kind: ${reference.kind}`);
  if (referenceRoutes.has(reference.page)) referenceErrors.push(`Duplicate individual reference route: ${reference.page}`);
  referenceKinds.add(reference.kind);
  referenceRoutes.add(reference.page);
  if (reference.status !== 'source-reviewed') referenceErrors.push(`Invalid review status: ${reference.kind}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reference.reviewedAt)) referenceErrors.push(`Missing review date: ${reference.kind}`);
  if (!reference.sources?.length) referenceErrors.push(`No source evidence: ${reference.kind}`);
  const page = await findContentPage(reference.page);
  if (!page) {
    referenceErrors.push(`Missing individual reference page: ${reference.kind} → ${reference.page}`);
  } else {
    const content = await readFile(page, 'utf8');
    for (const section of requiredReferenceSections) {
      if (!content.split(/\r?\n/).includes(`## ${section}`)) {
        referenceErrors.push(`Missing reference section: ${reference.kind} → ${section}`);
      }
    }
    if (!content.includes(`<ElementReferenceEvidence kind="${reference.kind}" />`)) {
      referenceErrors.push(`Missing matching evidence component: ${reference.kind}`);
    }
  }
  for (const source of reference.sources ?? []) {
    try {
      await access(resolve(repoRoot, source));
    } catch {
      referenceErrors.push(`Missing reference evidence: ${reference.kind} → ${source}`);
    }
  }
}

for (const feature of featureCatalog) {
  if (!validImplementationStatuses.has(feature.implementation)) {
    console.error(`Invalid implementation status for ${feature.id}: ${feature.implementation}`);
  }
  if (!validPublicationStatuses.has(feature.publication)) {
    console.error(`Invalid publication status for ${feature.id}: ${feature.publication}`);
  }
  if (!await contentPageExists(feature.page)) missingFeatureRoutes.push(`${feature.id} → ${feature.page}`);
  for (const source of feature.sources) {
    try {
      await access(resolve(repoRoot, source));
    } catch {
      missingFeatureSources.push(`${feature.id} → ${source}`);
    }
  }
}

const invalidStatuses = featureCatalog.filter((feature) =>
  !validImplementationStatuses.has(feature.implementation)
  || !validPublicationStatuses.has(feature.publication),
);

if (
  duplicates.length || missing.length || stale.length || missingRoutes.length
  || missingFeatureRoutes.length || missingFeatureSources.length
  || duplicateFeatureIds.length || invalidStatuses.length
  || referenceErrors.length
) {
  console.error('Documentation catalogs do not match the current source tree.');
  if (duplicates.length) console.error(`Duplicate catalog entries: ${[...new Set(duplicates)].join(', ')}`);
  if (missing.length) console.error(`Missing catalog entries: ${missing.join(', ')}`);
  if (stale.length) console.error(`No longer registered: ${stale.join(', ')}`);
  if (missingRoutes.length) console.error(`Catalog links point to missing pages: ${missingRoutes.join(', ')}`);
  if (missingFeatureRoutes.length) console.error(`Features link to missing pages: ${missingFeatureRoutes.join(', ')}`);
  if (missingFeatureSources.length) console.error(`Feature evidence files not found: ${missingFeatureSources.join(', ')}`);
  if (duplicateFeatureIds.length) console.error(`Duplicate feature IDs: ${[...new Set(duplicateFeatureIds)].join(', ')}`);
  if (invalidStatuses.length) console.error('Feature catalog contains invalid implementation or publication statuses.');
  referenceErrors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else {
  console.log(`Element catalog covers all ${registeredKinds.length} registered element kinds across ${elementCatalog.length} groups; all ${routes.length} linked pages exist.`);
  console.log(`Feature catalog contains ${featureCatalog.length} entries; all linked pages and ${featureCatalog.reduce((total, feature) => total + feature.sources.length, 0)} source references exist.`);
  console.log(`Individual references cover ${elementReferences.length}/${registeredKinds.length} element kinds; all required sections and ${elementReferences.reduce((total, reference) => total + reference.sources.length, 0)} source references exist. Desktop release verification is tracked separately.`);
}
