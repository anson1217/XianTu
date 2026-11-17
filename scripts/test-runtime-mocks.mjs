export const runtime = { save: null, response: {}, warnings: [], commits: 0 };
export const useGameStateStore = () => ({
  getCurrentSaveData: () => structuredClone(runtime.save),
  loadFromSaveData: (save) => { runtime.save = structuredClone(save); },
  addToShortTermMemory: () => {},
});
export const useCharacterStore = () => ({ saveCurrentGame: async () => { runtime.commits++; } });
export const useUIStore = () => ({});
export const generateWithRawPrompt = async () => JSON.stringify(runtime.response);
export const aiService = { isForceJsonEnabled: () => false };
export const toast = Object.fromEntries(['warning','error','info','success'].map(k => [k, s => runtime.warnings.push(s)]));
export const isTavernEnv = () => false;
export const getTavernHelper = () => null;
export const getPrompt = async () => '';
export const assembleSystemPrompt = () => '';
export const appendStoryImages = () => {};
export const resolveImageApi = () => null;
export const runPendingStoryImages = async () => {};
