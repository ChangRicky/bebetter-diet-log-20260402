export type MealType = '早餐' | '午餐' | '晚餐' | '點心';

export type FoodTag = '水果' | '乳製品' | '全穀雜糧' | '低脂肉' | '中脂肉' | '高脂肉' | '蔬菜' | '油脂';

/** One category entry within a food item — e.g. 全穀雜糧 1.5份 */
export interface FoodTagEntry {
  tag: FoodTag;
  qty: number;    // 0.5 increments
}

/** A single food item that may span multiple categories */
export interface FoodItem {
  name: string;           // e.g. "蛋餅", "無糖豆漿"
  tags: FoodTagEntry[];   // multiple categories with individual qty
}

export interface MealRecord {
  id: string;
  type: 'meal';
  imageDataUrl: string;
  items: FoodItem[];
  note: string;
  aiAnalysis: string;
  timestamp: number;
  mealType: MealType;
}

export type SleepLevel = '<6hr' | '6-7hr' | '7-8hr' | '8hr+';
export type SleepQuality = '很好' | '還好' | '不太好' | '很差';
export type BowelCount = '沒有' | '1次' | '2次' | '3次以上';

export interface BehaviorRecord {
  id: string;
  type: 'behavior';
  timestamp: number;
  /** The date being recorded (may differ from timestamp if recording past dates) */
  recordDate: string;           // YYYY-MM-DD
  waterMl: number | null;       // 毫升
  proteinCups: number | null;   // 0/1/2 杯
  proteinGrams: string;         // optional: grams per cup
  exercise: boolean | null;
  exerciseNote: string;
  exerciseDuration: string;
  stepsCount: string;
  sleep: SleepLevel | null;
  sleepQuality: SleepQuality | null;
  bedtime: string;              // e.g. "23:30"
  bowel: BowelCount | null;
  bowelNote: string;            // 排便備註
  supplements: string;          // 保健品/藥物紀錄
  generalNote: string;
  /** Card color theme */
  cardTheme: 'dark' | 'green' | 'navy' | 'purple';
}

export type AppRecord = MealRecord | BehaviorRecord;

export type TabType = 'meal' | 'behavior' | 'history';
