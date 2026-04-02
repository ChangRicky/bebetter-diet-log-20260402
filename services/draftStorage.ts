/** Auto-save / restore form drafts in localStorage */

const BEHAVIOR_DRAFT_KEY = 'bebetter-behavior-draft';
const MEAL_DRAFT_KEY = 'bebetter-meal-draft';

export interface BehaviorDraft {
  recordDate: string;
  waterMl: number | null;
  customWater: string;
  proteinCups: number | null;
  proteinGrams: string;
  exercise: boolean | null;
  exerciseNote: string;
  exerciseDuration: string;
  stepsCount: string;
  sleep: string | null;
  sleepQuality: string | null;
  bowel: string | null;
  generalNote: string;
  cardTheme: string;
  savedAt: number;
}

export interface MealDraft {
  items: Array<{ name: string; tags: Array<{ tag: string; qty: number }> }>;
  mealType: string;
  note: string;
  showNote: boolean;
  savedAt: number;
}

export function saveBehaviorDraft(draft: Omit<BehaviorDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(BEHAVIOR_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* storage full, ignore */ }
}

export function loadBehaviorDraft(): BehaviorDraft | null {
  try {
    const raw = localStorage.getItem(BEHAVIOR_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BehaviorDraft;
    // Expire after 24 hours
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      clearBehaviorDraft();
      return null;
    }
    return draft;
  } catch { return null; }
}

export function clearBehaviorDraft(): void {
  localStorage.removeItem(BEHAVIOR_DRAFT_KEY);
}

export function saveMealDraft(draft: Omit<MealDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(MEAL_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* storage full, ignore */ }
}

export function loadMealDraft(): MealDraft | null {
  try {
    const raw = localStorage.getItem(MEAL_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as MealDraft;
    // Expire after 24 hours
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      clearMealDraft();
      return null;
    }
    return draft;
  } catch { return null; }
}

export function clearMealDraft(): void {
  localStorage.removeItem(MEAL_DRAFT_KEY);
}
