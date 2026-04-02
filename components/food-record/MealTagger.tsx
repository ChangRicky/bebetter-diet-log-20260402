import React, { useState, useRef, useEffect } from 'react';
import { FOOD_TAGS, MEAL_TYPES, snapToHalf } from '../../constants';
import { saveMealDraft, loadMealDraft, clearMealDraft } from '../../services/draftStorage';
import type { MealType, FoodTag, FoodItem, FoodTagEntry } from '../../types';

interface MealTaggerProps {
  imagePreviewUrl: string;
  initialMealType: MealType;
  onComplete: (data: { mealType: MealType; items: FoodItem[]; note: string }) => void;
  onBack: () => void;
}

const emptyItem = (): FoodItem => ({ name: '', tags: [] });

export const MealTagger: React.FC<MealTaggerProps> = ({
  imagePreviewUrl,
  initialMealType,
  onComplete,
  onBack,
}) => {
  const savedDraft = useRef(loadMealDraft());
  const [mealType, setMealType] = useState<MealType>((savedDraft.current?.mealType as MealType) ?? initialMealType);
  const [items, setItems] = useState<FoodItem[]>(
    savedDraft.current?.items?.length ? savedDraft.current.items as FoodItem[] : [emptyItem()]
  );
  const [note, setNote] = useState(savedDraft.current?.note ?? '');
  const [showNote, setShowNote] = useState(savedDraft.current?.showNote ?? false);

  // Auto-save draft
  useEffect(() => {
    saveMealDraft({ items, mealType, note, showNote });
  }, [items, mealType, note, showNote]);

  const updateItem = (index: number, patch: Partial<FoodItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const toggleTag = (itemIndex: number, tag: FoodTag) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item;
      const existing = item.tags.find(t => t.tag === tag);
      if (existing) {
        return { ...item, tags: item.tags.filter(t => t.tag !== tag) };
      }
      return { ...item, tags: [...item.tags, { tag, qty: 1 }] };
    }));
  };

  const updateTagQty = (itemIndex: number, tag: FoodTag, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item;
      return {
        ...item,
        tags: item.tags.map(t => {
          if (t.tag !== tag) return t;
          const next = snapToHalf(t.qty + delta);
          return { ...t, qty: Math.max(0.5, next) };
        }),
      };
    }));
  };

  const setTagQtyDirect = (itemIndex: number, tag: FoodTag, value: number) => {
    const snapped = snapToHalf(Math.max(0.5, value));
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item;
      return {
        ...item,
        tags: item.tags.map(t => t.tag !== tag ? t : { ...t, qty: snapped }),
      };
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const canDone = items.some(item => item.name.trim() !== '' && item.tags.length > 0);

  const handleDone = () => {
    const validItems = items.filter(item => item.name.trim() !== '' && item.tags.length > 0);
    clearMealDraft();
    onComplete({ mealType, items: validItems, note });
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Photo preview + back */}
      <div className="relative">
        <img
          src={imagePreviewUrl}
          alt="餐點照片"
          className="w-full rounded-xl bg-gray-50"
          style={{ maxHeight: '40vh', objectFit: 'contain' }}
        />
        <button
          onClick={onBack}
          className="absolute top-3 left-3 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
        >
          ←
        </button>
      </div>

      {/* Meal type */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-2">餐別</label>
        <div className="flex gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mealType === type
                  ? 'bg-[#d0502a] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Food item list */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-2">
          食物項目
        </label>
        <p className="text-xs text-gray-400 mb-3">輸入名稱 → 勾選分類 → 點擊份數可直接輸入</p>

        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              {/* Row 1: Name + remove */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  placeholder="食物名稱（如：蛋餅、豆漿）"
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50 focus:border-[#efa93b]"
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-lg active:bg-gray-200 flex-shrink-0"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Row 2: Category chips (multi-select) */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {FOOD_TAGS.map((tag) => {
                  const selected = item.tags.some(t => t.tag === tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(index, tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selected
                          ? 'bg-[#d0502a] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Selected tags with qty steppers */}
              {item.tags.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-100">
                  {item.tags.map((entry) => (
                    <div key={entry.tag} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">{entry.tag}</span>
                      <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-1 py-1">
                        <button
                          onClick={() => updateTagQty(index, entry.tag, -0.5)}
                          disabled={entry.qty <= 0.5}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:bg-gray-50 disabled:opacity-30 font-bold text-sm"
                        >
                          −
                        </button>
                        <QtyInput
                          value={entry.qty}
                          onChange={(v) => setTagQtyDirect(index, entry.tag, v)}
                        />
                        <button
                          onClick={() => updateTagQty(index, entry.tag, 0.5)}
                          className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:bg-gray-50 font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="mt-2 w-full py-2.5 border-2 border-dashed border-[#efa93b] text-[#d0502a] text-sm font-medium rounded-xl active:bg-[#FFF8F0] transition-colors"
        >
          + 新增食物
        </button>
      </div>

      {/* Optional note */}
      <div>
        {!showNote ? (
          <button
            onClick={() => setShowNote(true)}
            className="text-sm text-[#d0502a] font-medium"
          >
            + 加備註
          </button>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">備註</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="例：外食便當、自己煮、有加湯..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#efa93b]/50"
            />
          </div>
        )}
      </div>

      {/* Done */}
      <button
        onClick={handleDone}
        disabled={!canDone}
        className="w-full py-4 text-white text-lg font-bold rounded-xl transition-colors disabled:bg-gray-200 disabled:text-gray-400"
        style={{ background: canDone ? 'linear-gradient(135deg, #d0502a, #efa93b)' : undefined }}
      >
        完成
      </button>
    </div>
  );
};

/** Tappable qty display — click to type a number directly */
const QtyInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n) && n > 0) onChange(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        step="0.5"
        min="0.5"
        className="w-14 text-center text-sm font-semibold text-gray-700 border border-[#efa93b] rounded-lg p-0.5 focus:outline-none focus:ring-1 focus:ring-[#efa93b]"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="w-12 text-center text-sm font-semibold text-[#d0502a] underline decoration-dotted underline-offset-2"
    >
      {value}份
    </button>
  );
};
