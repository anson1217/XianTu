// Offline regression loader: real production code, mocked AI/storage/UI boundaries only.
import { registerHooks, stripTypeScriptTypes, createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const lodashUrl = pathToFileURL(createRequire(import.meta.url).resolve('lodash')).href;
globalThis.localStorage ??= { getItem: () => null };
const mock = new URL('./test-runtime-mocks.mjs', import.meta.url).href;
const boundaries = new Set([
  'utils/tavernCore', 'utils/tavern', 'utils/toast',
  'stores/gameStateStore', 'stores/characterStore', 'stores/uiStore',
  'services/aiService', 'services/defaultPrompts', 'services/storyImageRunner',
  'utils/prompts/promptAssembler',
]);
registerHooks({
  resolve(specifier, context, next) {
    let target;
    if (specifier.startsWith('@/')) target = path.join(root, 'src', specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) target = fileURLToPath(new URL(specifier, context.parentURL));
    if (target) {
      const relative = path.relative(path.join(root, 'src'), target).replaceAll('\\', '/').replace(/\.ts$/, '');
      if (boundaries.has(relative)) return { url: mock, shortCircuit: true };
      if (!path.extname(target) && existsSync(target + '.ts')) target += '.ts';
      return next(pathToFileURL(target).href, context);
    }
    if (specifier === 'lodash') return { url: 'mock:lodash', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:lodash') {
      return { format: 'module', shortCircuit: true, source: `import _ from ${JSON.stringify(lodashUrl)}; export const {set,get,unset,cloneDeep}= _;` };
    }
    if (url.startsWith('file:') && url.endsWith('.ts')) return {
      format: 'module', shortCircuit: true,
      source: stripTypeScriptTypes(
        process.env.REGRESSION_BASELINE === '1' && /\/(dataRepair|dataValidation|sectContentService)\.ts$/.test(url)
          ? execFileSync('git', ['show', `bc94e2645581b7370dec17921217e21dbca5ea1f:${path.relative(root, fileURLToPath(url)).replaceAll('\\', '/')}`], {encoding:'utf8'})
          : readFileSync(fileURLToPath(url), 'utf8'),
        { mode: 'transform' }),
    };
    return next(url, context);
  },
});
