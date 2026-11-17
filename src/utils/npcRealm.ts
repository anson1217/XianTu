import type { Realm } from '@/types/game';

const aliases: Record<string, string> = {
  練: '练', 煉: '炼', 氣: '气', 體: '体', 嬰: '婴', 虛: '虚',
  羅: '罗', 後: '后', 圓: '圆', 滿: '满', 極: '极', 層: '层', 階: '阶',
};
const simplified = (s: string) => s.replace(/[練煉氣體嬰虛羅後圓滿極層階]/g, (c) => aliases[c]);
const clean = (s: string) => simplified(s.trim()).replace(/[\s·・‧•.．/_—–\-:：()（）【】]/g, '');
const realmPattern = /^(凡人|练气|炼气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫|真仙|金仙|太乙|大罗|淬体|凝气|通玄|化真|破虚|登天)(?:境)?(.*)$/;
const stagePattern = /^(?:初期|早期|中期|后期|晚期|圆满|大圆满|巅峰|极境|第?[一二三四五六七八九十百零〇两\d]+层)?$/;

function parseText(raw: string): { 名称: string; 阶段: string } | null {
  const match = clean(raw).match(realmPattern);
  if (!match || !stagePattern.test(match[2])) return null;
  const name = match[1] === '炼气' ? '练气' : match[1];
  if (name === '凡人' && match[2]) return null;
  return { 名称: name, 阶段: match[2].replace(/^早期$/, '初期').replace(/^晚期$/, '后期') };
}

const validNumber = (v: unknown, min: number, fallback: number) => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= min ? n : fallback;
};

/** NPC 专用；不修改输入、不把数字层数换成早中后期。无法识别的字符串返回 null。 */
export function normalizeNpcRealm(value: unknown): Realm | null {
  let fields: { 名称: string; 阶段: string } | null = null;
  let source: Record<string, unknown> = {};
  if (typeof value === 'string') fields = parseText(value);
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    source = value as Record<string, unknown>;
    if (typeof source.名称 !== 'string' || !source.名称.trim()) return null;
    if (source.阶段 !== undefined && typeof source.阶段 !== 'string') return null;
    // 已有对象允许自定义世界的境界名称；不覆盖已有名称、阶段或有效进度。
    fields = {
      名称: source.名称,
      阶段: typeof source.阶段 === 'string' ? source.阶段 : '',
    };
    if (source.阶段 === undefined) fields = parseText(source.名称) ?? fields;
  }
  if (!fields) return null;
  return {
    ...source,
    ...fields,
    当前进度: validNumber(source.当前进度, 0, 0),
    下一级所需: validNumber(source.下一级所需, 1, 100),
    突破描述: typeof source.突破描述 === 'string' ? source.突破描述 : '',
  };
}

/** 旧档修复不能凭空猜境界。保留未知原值供人工核对，绝不默认成凡人。 */
export function repairNpcRealm(value: unknown): Realm {
  const normalized = normalizeNpcRealm(value);
  if (normalized) return normalized;
  console.warn('[NPC境界] 无法识别境界，保留原值待核对:', value);
  return {
    名称: typeof value === 'string' && value.trim() ? value : '未知',
    阶段: '', 当前进度: 0, 下一级所需: 100,
    突破描述: '境界资料待核对，未推定为凡人',
    ...{ 原始境界: value ?? null },
  };
}
