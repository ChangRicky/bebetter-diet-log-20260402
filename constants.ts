import type { FoodTag, MealType, SleepLevel, SleepQuality, BowelCount } from './types';

export const FOOD_TAGS: FoodTag[] = [
  '全穀雜糧', '低脂肉', '中脂肉', '高脂肉', '蔬菜', '水果', '乳製品', '油脂',
];

export const MEAL_TYPES: MealType[] = ['早餐', '午餐', '晚餐', '點心'];

export const SLEEP_LEVELS: SleepLevel[] = ['<6hr', '6-7hr', '7-8hr', '8hr+'];
export const SLEEP_QUALITIES: SleepQuality[] = ['很好', '還好', '不太好', '很差'];
export const BOWEL_OPTIONS: BowelCount[] = ['沒有', '1次', '2次', '3次以上'];
export const PROTEIN_CUPS = [0, 1, 2];

/** Preset water amounts in ml */
export const WATER_PRESETS = [250, 500, 750, 1000, 1500, 2000, 2500, 3000];

/** Card theme options for behavior record */
export const CARD_THEMES = [
  { id: 'dark' as const, label: '深色', bg: '#1a1a2e', text: '#FFFFFF' },
  { id: 'green' as const, label: '森綠', bg: '#1b4332', text: '#FFFFFF' },
  { id: 'navy' as const, label: '深藍', bg: '#1B2A4A', text: '#FFFFFF' },
  { id: 'purple' as const, label: '紫夜', bg: '#2D1B4E', text: '#FFFFFF' },
];

export function autoDetectMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return '早餐';
  if (hour < 14) return '午餐';
  if (hour < 17) return '點心';
  return '晚餐';
}

/** Snap a number to nearest 0.5 */
export function snapToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** Format date as YYYY-MM-DD */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
