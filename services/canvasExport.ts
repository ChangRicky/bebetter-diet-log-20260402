import type { MealRecord, BehaviorRecord, FoodItem, FoodTag } from '../types';
import { CARD_THEMES, sortTags, FOOD_TAGS, SLEEP_QUALITY_SCORE, BOWEL_TO_NUMBER, DEFAULT_PROTEIN_GRAMS_PER_CUP, PROTEIN_GRAMS_PER_SERVING } from '../constants';

const CARD_WIDTH = 1080;
const PAD = 48;
const BRAND_FONT_SIZE = 28;
const TITLE_FONT_SIZE = 34;
const CHIP_FONT_SIZE = 38;    // meal card chip text (enlarged for nutritionist readability)
const BEHAVIOR_FONT_SIZE = 32; // behavior card row text
const NOTE_FONT_SIZE = 26;
const LINE_HEIGHT = 1.6;
const CHIP_PADDING_H = 24;
const CHIP_PADDING_V = 12;
const CHIP_GAP = 10;
const CHIP_RADIUS = 14;
const ROW_HEIGHT = 80;

const BRAND_PRIMARY = '#d0502a';
const BRAND_GOLD = '#efa93b';

/** Polyfill for CanvasRenderingContext2D.roundRect — missing on older Safari/Chrome */
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number | number[]
) {
  const radius = typeof r === 'number' ? r : r[0] ?? 0;
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  // Manual fallback using arcs
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') { lines.push(''); continue; }
    let cur = '';
    for (const char of paragraph) {
      const test = cur + char;
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = char; }
      else cur = test;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

function fmtQty(qty: number): string {
  return `${qty}份`;
}

/** Draw elegant brand footer bar with optional user name */
function drawBrandFooter(ctx: CanvasRenderingContext2D, y: number, width: number, light: boolean, userName?: string | null) {
  const footerH = 72;
  // Gradient accent line
  const grad = ctx.createLinearGradient(0, y, width, y);
  grad.addColorStop(0, BRAND_PRIMARY);
  grad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, width, 3);

  // Footer background
  ctx.fillStyle = light ? '#FAFAFA' : 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, y + 3, width, footerH);

  // Brand text (left side) — enlarged & more visible
  ctx.textBaseline = 'middle';
  const centerY = y + 3 + footerH / 2;

  ctx.font = `bold 28px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, centerY);
  const bw = ctx.measureText('BeBetter').width;

  ctx.font = `24px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = light ? '#6B7280' : 'rgba(255,255,255,0.5)';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bw, centerY);

  // User name (right side)
  if (userName) {
    ctx.font = `bold 26px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = light ? '#4B5563' : 'rgba(255,255,255,0.7)';
    const nameW = ctx.measureText(userName).width;
    ctx.fillText(userName, width - PAD - nameW, centerY);
  }

  return footerH + 3;
}

// ─── Meal card ────────────────────────────────────────────────────────────────

export async function composeMealCard(record: MealRecord, userName?: string | null): Promise<string> {
  const img = await loadImage(record.imageDataUrl);

  // Support both portrait and landscape photos
  // For portrait: limit max height to avoid overly tall cards
  // For landscape: use full width
  const aspectRatio = img.naturalHeight / img.naturalWidth;
  const maxPhotoRatio = 1.5; // limit portrait to 3:2 max
  const effectiveRatio = Math.min(aspectRatio, maxPhotoRatio);
  const photoDrawHeight = Math.round(CARD_WIDTH * effectiveRatio);

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;

  // Pre-compute chip layout for multi-tag items
  const safeItems = Array.isArray(record.items) ? record.items.filter(i => i.name && Array.isArray(i.tags)) : [];
  tempCtx.font = `${CHIP_FONT_SIZE}px "Noto Sans TC", sans-serif`;
  const chipRows = layoutItemChips(tempCtx, safeItems, CARD_WIDTH - PAD * 2);
  const chipSectionH = chipRows.length > 0
    ? chipRows.length * (CHIP_FONT_SIZE + CHIP_PADDING_V * 2 + CHIP_GAP) - CHIP_GAP
    : 0;

  let noteSectionH = 0;
  if (record.note.trim()) {
    tempCtx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    const nl = wrapText(tempCtx, record.note, CARD_WIDTH - PAD * 2);
    noteSectionH = nl.length * (NOTE_FONT_SIZE * LINE_HEIGHT) + 10;
  }

  const infoH = PAD
    + TITLE_FONT_SIZE * LINE_HEIGHT + 8
    + (chipSectionH > 0 ? chipSectionH + 16 : 0)
    + (noteSectionH > 0 ? noteSectionH + 8 : 0)
    + PAD;

  const brandFooterH = 59;
  const totalHeight = photoDrawHeight + infoH + brandFooterH;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Photo — center-crop for portrait images exceeding max ratio
  if (aspectRatio > maxPhotoRatio) {
    // Center crop: show middle portion
    const srcH = img.naturalWidth * maxPhotoRatio;
    const srcY = (img.naturalHeight - srcH) / 2;
    ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, CARD_WIDTH, photoDrawHeight);
  } else {
    ctx.drawImage(img, 0, 0, CARD_WIDTH, photoDrawHeight);
  }

  // Top-left gradient overlay for brand badge
  const badgeGrad = ctx.createLinearGradient(0, 0, 240, 0);
  badgeGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
  badgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = badgeGrad;
  ctx.fillRect(0, 0, 260, 48);

  // Brand badge on photo
  ctx.textBaseline = 'middle';
  ctx.font = `bold 22px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('BeBetter', 16, 24);

  // Info strip
  let y = photoDrawHeight + PAD;

  // Meal type pill + datetime
  const dateStr = new Date(record.timestamp).toLocaleString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Meal type pill
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.font = `bold ${TITLE_FONT_SIZE - 6}px "Noto Sans TC", sans-serif`;
  const pillText = record.mealType;
  const pillW = ctx.measureText(pillText).width + 32;
  ctx.beginPath();
  safeRoundRect(ctx, PAD, y - 4, pillW, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, PAD + 16, y + 16);

  // Date text
  ctx.fillStyle = '#6B7280';
  ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
  ctx.fillText(dateStr, PAD + pillW + 12, y + 16);
  ctx.textBaseline = 'top';

  y += TITLE_FONT_SIZE * LINE_HEIGHT + 8;

  // Food item chips
  if (safeItems.length > 0) {
    ctx.font = `${CHIP_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    y = drawItemChips(ctx, safeItems, PAD, y, CARD_WIDTH - PAD * 2);
    y += 16;
  }

  // Note
  if (record.note.trim()) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    for (const line of wrapText(ctx, record.note, CARD_WIDTH - PAD * 2)) {
      ctx.fillText(line, PAD, y);
      y += NOTE_FONT_SIZE * LINE_HEIGHT;
    }
  }

  // Brand footer
  const footerY = totalHeight - brandFooterH;
  drawBrandFooter(ctx, footerY, CARD_WIDTH, true, userName);

  return canvas.toDataURL('image/jpeg', 0.92);
}

interface ChipLayout { label: string; x: number; y: number; width: number; height: number; }

function layoutItemChips(ctx: CanvasRenderingContext2D, items: FoodItem[], maxWidth: number): ChipLayout[][] {
  const rows: ChipLayout[][] = [];
  let curRow: ChipLayout[] = [];
  let rowX = 0, rowY = 0;
  const chipH = CHIP_FONT_SIZE + CHIP_PADDING_V * 2;

  for (const item of items) {
    const tagParts = sortTags(item.tags).map(t => `${t.tag}${fmtQty(t.qty)}`).join(' ');
    const label = `${item.name}：${tagParts}`;
    const w = ctx.measureText(label).width + CHIP_PADDING_H * 2;
    if (rowX + w > maxWidth && curRow.length > 0) {
      rows.push(curRow); curRow = []; rowX = 0; rowY += chipH + CHIP_GAP;
    }
    curRow.push({ label, x: rowX, y: rowY, width: w, height: chipH });
    rowX += w + CHIP_GAP;
  }
  if (curRow.length > 0) rows.push(curRow);
  return rows;
}

function drawItemChips(ctx: CanvasRenderingContext2D, items: FoodItem[], sx: number, sy: number, maxW: number): number {
  const rows = layoutItemChips(ctx, items, maxW);
  let lastY = sy;
  for (const row of rows) {
    for (const chip of row) {
      // Warm background chip
      ctx.fillStyle = '#FFF3E8';
      ctx.beginPath();
      safeRoundRect(ctx, sx + chip.x, sy + chip.y, chip.width, chip.height, CHIP_RADIUS);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#FDDCB5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      safeRoundRect(ctx, sx + chip.x, sy + chip.y, chip.width, chip.height, CHIP_RADIUS);
      ctx.stroke();

      ctx.fillStyle = '#92400E';
      ctx.textBaseline = 'middle';
      ctx.fillText(chip.label, sx + chip.x + CHIP_PADDING_H, sy + chip.y + chip.height / 2);
      lastY = Math.max(lastY, sy + chip.y + chip.height);
    }
  }
  ctx.textBaseline = 'top';
  return lastY;
}

// ─── Behavior card (elegant dark theme, NO watermark) ────────────────────────

export async function composeBehaviorCard(record: BehaviorRecord, userName?: string | null): Promise<string> {
  const theme = CARD_THEMES.find(t => t.id === record.cardTheme) || CARD_THEMES[0];
  const BG = theme.bg;
  const TEXT = theme.text;
  const MUTED = 'rgba(255,255,255,0.45)';
  const ROW_BG = 'rgba(255,255,255,0.07)';

  // Calculate dynamic height
  let estH = PAD + 80 + 16 + rows_count(record) * ROW_HEIGHT + 20;
  if (record.generalNote?.trim()) estH += 120;
  estH += 80; // footer

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = estH + 300; // generous buffer
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle gradient overlay for depth
  const overlayGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  overlayGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
  overlayGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  overlayGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = PAD;

  // Top accent line
  const accentGrad = ctx.createLinearGradient(PAD, 0, CARD_WIDTH - PAD, 0);
  accentGrad.addColorStop(0, BRAND_PRIMARY);
  accentGrad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(PAD, y, CARD_WIDTH - PAD * 2, 3);
  y += 20;

  // Brand header
  ctx.textBaseline = 'top';
  ctx.font = `bold 32px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.fillText('BeBetter', PAD, y);
  const brandW = ctx.measureText('BeBetter').width;
  ctx.fillStyle = TEXT;
  ctx.font = `bold 28px "Noto Sans TC", sans-serif`;
  ctx.fillText(' 行為指標', PAD + brandW, y + 2);
  y += 42;

  // Date
  ctx.fillStyle = MUTED;
  ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
  const displayDate = formatRecordDate(record.recordDate);
  ctx.fillText(displayDate, PAD, y);
  y += NOTE_FONT_SIZE * LINE_HEIGHT + 12;

  // Build indicator rows
  const waterVal = record.waterMl !== null ? `${record.waterMl} ml` : null;
  const proteinVal = record.proteinCups !== null
    ? (record.proteinCups === 0 ? '沒喝' : `${record.proteinCups} 杯${record.proteinGrams ? ` (${record.proteinGrams}g/杯)` : ''}`)
    : null;
  let exerciseVal: string | null = null;
  if (record.exercise === true) {
    const ex1Parts = [record.exerciseNote || '有', record.exerciseDuration ? `${record.exerciseDuration}分鐘` : ''].filter(Boolean);
    let val = ex1Parts.join('・');
    if (record.exercise2Note?.trim()) {
      const ex2Parts = [record.exercise2Note, record.exercise2Duration ? `${record.exercise2Duration}分鐘` : ''].filter(Boolean);
      val += ` + ${ex2Parts.join('・')}`;
    }
    exerciseVal = val;
  } else if (record.exercise === false) {
    exerciseVal = '沒有';
  }
  const stepsVal = record.stepsCount ? `${Number(record.stepsCount).toLocaleString()} 步` : null;
  let sleepVal: string | null = null;
  if (record.sleep) {
    const parts: string[] = [record.sleep];
    if (record.sleepQuality) parts.push(`（${record.sleepQuality}）`);
    if (record.bedtime) parts.push(`・${record.bedtime}就寢`);
    if (record.sleepNote?.trim()) parts.push(`・${record.sleepNote}`);
    sleepVal = parts.join('');
  } else if (record.bedtime) {
    sleepVal = `${record.bedtime}就寢`;
  }
  const bowelVal = record.bowel ? (record.bowelNote?.trim() ? `${record.bowel}（${record.bowelNote}）` : record.bowel) : null;
  const junkFoodVal = record.junkFood === true ? '有吃' : record.junkFood === false ? '沒有' : null;
  const supplementsVal = record.supplements?.trim() || null;

  const indicatorRows = [
    { icon: '💧', label: '喝水量', value: waterVal },
    { icon: '🥛', label: '高蛋白', value: proteinVal },
    { icon: '🏃', label: '運動', value: exerciseVal },
    { icon: '🚶', label: '走路', value: stepsVal },
    { icon: '😴', label: '睡眠', value: sleepVal },
    { icon: '🚽', label: '排便', value: bowelVal },
    { icon: '🚫', label: '垃圾食物', value: junkFoodVal },
    { icon: '💊', label: '保健品', value: supplementsVal },
  ];

  for (const row of indicatorRows) {
    // Row background
    ctx.fillStyle = ROW_BG;
    ctx.beginPath();
    safeRoundRect(ctx, PAD, y, CARD_WIDTH - PAD * 2, ROW_HEIGHT - 8, 12);
    ctx.fill();

    const centerY = y + (ROW_HEIGHT - 8) / 2;
    ctx.font = `${BEHAVIOR_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = TEXT;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${row.icon}  ${row.label}`, PAD + 16, centerY);

    const valText = row.value ?? '—';
    const valColor = row.value === null ? MUTED : indicatorColorDark(row.value);
    ctx.fillStyle = valColor;
    ctx.font = `bold ${BEHAVIOR_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    const valW = ctx.measureText(valText).width;
    ctx.fillText(valText, CARD_WIDTH - PAD - 16 - valW, centerY);

    y += ROW_HEIGHT;
  }

  // General note section
  if (record.generalNote?.trim()) {
    y += 8;
    ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    const noteLines = wrapText(ctx, record.generalNote, CARD_WIDTH - PAD * 2 - 32);
    const noteBlockH = (NOTE_FONT_SIZE) * LINE_HEIGHT + noteLines.length * (NOTE_FONT_SIZE * LINE_HEIGHT) + CHIP_PADDING_V * 3;
    ctx.textBaseline = 'top';
    ctx.fillStyle = ROW_BG;
    ctx.beginPath();
    safeRoundRect(ctx, PAD, y, CARD_WIDTH - PAD * 2, noteBlockH, 12);
    ctx.fill();

    ctx.fillStyle = TEXT;
    ctx.font = `bold ${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    ctx.fillText('📝 備註', PAD + 16, y + CHIP_PADDING_V);
    let ny = y + CHIP_PADDING_V + NOTE_FONT_SIZE * LINE_HEIGHT;
    ctx.fillStyle = MUTED;
    ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    for (const line of noteLines) { ctx.fillText(line, PAD + 16, ny); ny += NOTE_FONT_SIZE * LINE_HEIGHT; }
    y += noteBlockH;
  }

  y += 16;

  // Bottom accent line
  ctx.fillStyle = accentGrad;
  ctx.fillRect(PAD, y, CARD_WIDTH - PAD * 2, 2);
  y += 12;

  // Bottom brand text + user name (enlarged & more visible)
  ctx.textBaseline = 'top';
  ctx.font = `bold 28px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.globalAlpha = 0.85;
  ctx.fillText('BeBetter', PAD, y);
  const bbwBehavior = ctx.measureText('BeBetter').width;
  ctx.font = `26px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bbwBehavior, y);
  if (userName) {
    ctx.font = `bold 26px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const nameW = ctx.measureText(userName).width;
    ctx.fillText(userName, CARD_WIDTH - PAD - nameW, y);
  }
  ctx.globalAlpha = 1;
  y += 44;

  // Trim canvas to actual height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = CARD_WIDTH;
  finalCanvas.height = y;
  const fctx = finalCanvas.getContext('2d');
  if (!fctx) throw new Error('Canvas 2D context not available');
  fctx.drawImage(canvas, 0, 0, CARD_WIDTH, y, 0, 0, CARD_WIDTH, y);

  return finalCanvas.toDataURL('image/jpeg', 0.92);
}

function rows_count(record: BehaviorRecord): number {
  return 8; // 8 indicator rows (water, protein, exercise, steps, sleep, bowel, junkFood, supplements)
}

function formatRecordDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function indicatorColorDark(value: string): string {
  const green = ['足夠', '超標', '有喝', '有', '8000+', '7-8hr', '8hr+', '1次', '2次', '3次以上', '很好'];
  const yellow = ['5000-8000', '6-7hr', '還好'];
  const red = ['<5000', '<6hr', '沒有', '沒喝', '0', '不太好', '很差'];
  if (green.some(v => value.includes(v) || value === v)) return '#4ADE80';
  if (yellow.some(v => value.includes(v))) return '#FBBF24';
  if (red.some(v => value.includes(v))) return '#F87171';
  return '#E5E7EB';
}

// ─── Weekly Report Card (table format for nutritionists) ─────────────────────

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const INDICATOR_LABELS = ['💧 喝水(ml)', '🥛 高蛋白', '🏃 運動', '🚶 步數', '😴 睡眠', '🚽 排便', '🚫 垃圾食物', '💊 保健品'];

interface WeeklyReportInput {
  weekNum: number;
  startDate: Date;
  endDate: Date;
  behaviorRecords: BehaviorRecord[];
  mealRecords: MealRecord[];
  mealCounts: number[]; // per day (Mon-Sun)
  userName?: string | null;
}

export async function composeWeeklyReport(input: WeeklyReportInput): Promise<string> {
  const { weekNum, startDate, endDate, behaviorRecords, mealRecords, mealCounts, userName } = input;

  const COL_HEADER_W = 130;
  const COL_W = 120;
  const TABLE_W = COL_HEADER_W + COL_W * 7;
  const CARD_W = Math.max(TABLE_W + PAD * 2, 1080);
  const ROW_H = 52;

  // Map behavior records to days (0=Mon, 6=Sun)
  const dayBehaviors: (BehaviorRecord | null)[] = Array(7).fill(null);
  for (const b of behaviorRecords) {
    const d = b.recordDate ? new Date(b.recordDate + 'T00:00:00') : new Date(b.timestamp);
    const dayIdx = (d.getDay() + 6) % 7;
    dayBehaviors[dayIdx] = b;
  }

  // Compute average daily food tag portions
  const tagTotals: Record<string, number> = {};
  const tagDays = new Set<string>(); // unique days with meal records
  for (const m of mealRecords) {
    const d = new Date(m.timestamp);
    tagDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    for (const item of m.items) {
      for (const t of item.tags) {
        tagTotals[t.tag] = (tagTotals[t.tag] || 0) + t.qty;
      }
    }
  }
  const numDays = Math.max(tagDays.size, 1);
  const tagAverages = FOOD_TAGS
    .map(tag => ({ tag, avg: tagTotals[tag] ? Math.round((tagTotals[tag] / numDays) * 10) / 10 : 0 }))
    .filter(t => t.avg > 0);

  // Calculate height — use generous estimate, trim to actual at end
  const headerH = 120;
  const tableHeaderH = 44;
  const indicatorRows = INDICATOR_LABELS.length;
  const mealRowH = ROW_H;
  const tableH = tableHeaderH + (indicatorRows + 1) * ROW_H; // +1 for meal row
  const summaryH = 120;
  const tagAvgH = tagAverages.length > 0 ? 120 : 0;
  const footerH = 80;
  const totalH = headerH + tableH + summaryH + tagAvgH + footerH + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = totalH + 100; // extra buffer to prevent cutoff
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, totalH);

  let y = PAD;

  // Header gradient bar
  const hGrad = ctx.createLinearGradient(0, y, CARD_W, y);
  hGrad.addColorStop(0, BRAND_PRIMARY);
  hGrad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, y, CARD_W, 4);
  y += 16;

  // Title
  ctx.textBaseline = 'top';
  ctx.font = `bold 32px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, y);
  const bw = ctx.measureText('BeBetter').width;
  ctx.font = `bold 28px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#374151';
  ctx.fillText(` 第 ${weekNum} 週行為指標報告`, PAD + bw, y + 2);
  y += 40;

  // Date range + user
  const fmtD = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const endD = new Date(endDate.getTime() - 86400000);
  ctx.font = `${NOTE_FONT_SIZE}px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#6B7280';
  let dateText = `${fmtD(startDate)} ~ ${fmtD(endD)}`;
  if (userName) dateText += `  |  ${userName}`;
  ctx.fillText(dateText, PAD, y);
  y += NOTE_FONT_SIZE * LINE_HEIGHT + 8;

  // Table starts here
  const tableX = (CARD_W - TABLE_W) / 2;

  // Table header row (weekdays)
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y, TABLE_W, tableHeaderH, [8, 8, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 20px "Noto Sans TC", sans-serif`;
  ctx.textBaseline = 'middle';

  // Empty top-left cell
  ctx.fillText('項目', tableX + 16, y + tableHeaderH / 2);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const label = `${WEEKDAYS[i]} ${d.getDate()}`;
    const cx = tableX + COL_HEADER_W + i * COL_W + COL_W / 2;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, cx - tw / 2, y + tableHeaderH / 2);
  }
  y += tableHeaderH;

  // Meal count row
  drawTableRow(ctx, tableX, y, TABLE_W, COL_HEADER_W, COL_W, ROW_H,
    '🍽 飲食紀錄', mealCounts.map(c => c > 0 ? `${c}筆` : '—'), '#FFF8F0', true);
  y += ROW_H;

  // Indicator rows
  const rowConfigs = [
    (b: BehaviorRecord | null) => b?.waterMl != null ? `${b.waterMl}` : '—',
    (b: BehaviorRecord | null) => b?.proteinCups != null ? (b.proteinCups === 0 ? '0杯' : `${b.proteinCups}杯${b.proteinGrams ? `\n(${b.proteinGrams}g)` : ''}`) : '—',
    (b: BehaviorRecord | null) => b?.exercise === true ? (b.exerciseNote ? `${b.exerciseNote}\n${b.exerciseDuration || ''}分` : '有') : b?.exercise === false ? '沒有' : '—',
    (b: BehaviorRecord | null) => b?.stepsCount ? `${Number(b.stepsCount).toLocaleString()}` : '—',
    (b: BehaviorRecord | null) => {
      if (!b?.sleep) return '—';
      let s = b.sleep;
      if (b.sleepQuality) s += `\n${b.sleepQuality}`;
      if (b.bedtime) s += `\n${b.bedtime}`;
      return s;
    },
    (b: BehaviorRecord | null) => b?.bowel ? (b.bowelNote?.trim() ? `${b.bowel}\n${b.bowelNote}` : b.bowel) : '—',
    (b: BehaviorRecord | null) => b?.junkFood === true ? '有吃' : b?.junkFood === false ? '沒有' : '—',
    (b: BehaviorRecord | null) => b?.supplements?.trim() || '—',
  ];

  for (let ri = 0; ri < indicatorRows; ri++) {
    const isAlt = ri % 2 === 0;
    const values = dayBehaviors.map(b => rowConfigs[ri](b));
    drawTableRow(ctx, tableX, y, TABLE_W, COL_HEADER_W, COL_W, ROW_H,
      INDICATOR_LABELS[ri], values, isAlt ? '#F9FAFB' : '#FFFFFF', false);
    y += ROW_H;
  }

  // Table border
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y - (indicatorRows + 1) * ROW_H - tableHeaderH, TABLE_W, tableHeaderH + (indicatorRows + 1) * ROW_H, 8);
  ctx.stroke();

  y += 16;

  // Weekly summary stats
  const waterVals = dayBehaviors.filter(b => b?.waterMl != null).map(b => b!.waterMl!);
  const avgWater = waterVals.length > 0 ? Math.round(waterVals.reduce((a, b) => a + b, 0) / waterVals.length) : null;
  const exerciseDays = dayBehaviors.filter(b => b?.exercise === true).length;
  const recordDays = dayBehaviors.filter(b => b !== null).length;
  const totalMeals = mealCounts.reduce((a, b) => a + b, 0);

  ctx.fillStyle = '#FFF8F0';
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y, TABLE_W, 70, 12);
  ctx.fill();
  ctx.strokeStyle = '#FDDCB5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y, TABLE_W, 70, 12);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('📊 本週小結', tableX + 16, y + 12);

  ctx.font = `20px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#4B5563';
  const stats = [
    `📅 記錄 ${recordDays}/7 天`,
    `🍽 飲食 ${totalMeals} 筆`,
    avgWater !== null ? `💧 平均 ${avgWater}ml` : '',
    exerciseDays > 0 ? `🏃 運動 ${exerciseDays} 天` : '',
  ].filter(Boolean).join('    ');
  ctx.fillText(stats, tableX + 16, y + 42);
  y += 86;

  // Food tag daily averages
  if (tagAverages.length > 0) {
    ctx.fillStyle = '#F0FDF4';
    ctx.beginPath();
    safeRoundRect(ctx, tableX, y, TABLE_W, 80, 12);
    ctx.fill();
    ctx.strokeStyle = '#BBF7D0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    safeRoundRect(ctx, tableX, y, TABLE_W, 80, 12);
    ctx.stroke();

    ctx.textBaseline = 'top';
    ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = '#166534';
    ctx.fillText(`🥗 每日平均六大類（共 ${tagDays.size} 天）`, tableX + 16, y + 12);

    ctx.font = `20px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = '#374151';
    const tagStr = tagAverages.map(t => `${t.tag} ${t.avg}份`).join('    ');
    ctx.fillText(tagStr, tableX + 16, y + 46);
    y += 96;
  }

  // Footer — enlarged & more visible
  y += 8; // spacing before footer
  const footGrad = ctx.createLinearGradient(0, y, CARD_W, y);
  footGrad.addColorStop(0, BRAND_PRIMARY);
  footGrad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = footGrad;
  ctx.fillRect(0, y, CARD_W, 3);
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, y + 3, CARD_W, 64);

  ctx.textBaseline = 'middle';
  ctx.font = `bold 26px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, y + 35);
  const bbw = ctx.measureText('BeBetter').width;
  ctx.font = `22px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bbw, y + 35);

  if (userName) {
    ctx.font = `bold 24px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = '#4B5563';
    const nw = ctx.measureText(userName).width;
    ctx.fillText(userName, CARD_W - PAD - nw, y + 35);
  }
  y += 70;

  // Trim canvas to actual rendered height
  const out = document.createElement('canvas');
  out.width = CARD_W;
  out.height = y;
  out.getContext('2d')!.drawImage(canvas, 0, 0);
  return out.toDataURL('image/jpeg', 0.92);
}

function drawTableRow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  headerW: number, colW: number, rowH: number,
  label: string, values: string[], bg: string, isMealRow: boolean
) {
  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, rowH);

  // Bottom border
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + rowH);
  ctx.lineTo(x + w, y + rowH);
  ctx.stroke();

  // Row label
  ctx.textBaseline = 'middle';
  ctx.font = `bold 18px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#374151';
  ctx.fillText(label, x + 12, y + rowH / 2);

  // Values
  ctx.font = `16px "Noto Sans TC", sans-serif`;
  for (let i = 0; i < 7; i++) {
    const val = values[i] || '—';
    const cx = x + headerW + i * colW + colW / 2;
    const isEmpty = val === '—';

    // Vertical divider
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + headerW + i * colW, y);
    ctx.lineTo(x + headerW + i * colW, y + rowH);
    ctx.stroke();

    ctx.fillStyle = isEmpty ? '#D1D5DB' : (isMealRow ? BRAND_PRIMARY : '#1F2937');

    // Multi-line support
    const lines = val.split('\n');
    const lineH = 18;
    const startY = y + rowH / 2 - (lines.length - 1) * lineH / 2;
    for (let li = 0; li < lines.length; li++) {
      const tw = ctx.measureText(lines[li]).width;
      ctx.fillText(lines[li], cx - tw / 2, startY + li * lineH);
    }
  }
}

// ─── Program Summary (multi-week trend with behavior metrics table) ─────────

interface ProgramWeekData {
  weekNum: number;
  startDate: Date;
  avgWater: number | null;
  exerciseDays: number;
  avgSteps: number | null;
  avgProtein: number | null;
  bowelRatio: string | null;      // e.g. "5/7"
  sleepGoodRatio: string | null;  // e.g. "4/7"
  mealCount: number;
  behaviorCount: number;
  recordDays: number;
}

interface ProgramSummaryInput {
  weeks: ProgramWeekData[];
  totalWeeks: number;
  planLabel?: string;
  userName?: string | null;
}

export async function composeProgramSummary(input: ProgramSummaryInput): Promise<string> {
  const { weeks, totalWeeks, planLabel, userName } = input;
  const CARD_W = 1080;

  // Table dimensions
  const T_PAD = PAD;
  const COL_HEADER_W = 140;
  const COL_W = Math.min(90, Math.floor((CARD_W - T_PAD * 2 - COL_HEADER_W) / Math.max(weeks.length, 1)));
  const TABLE_W = COL_HEADER_W + COL_W * weeks.length;
  const ROW_H = 48;

  // Metrics rows
  const metricLabels = ['📅 記錄天數', '🍽 飲食筆數', '📋 行為筆數', '💧 平均喝水', '🥛 高蛋白', '🏃 運動天數', '🚶 平均步數', '😴 好眠比', '🚽 排便比'];
  const metricCount = metricLabels.length;

  const headerH = 130;
  const tableHeaderH = 44;
  const tableH = tableHeaderH + metricCount * ROW_H;
  const statsH = 100;
  const footerH = 60;
  const totalH = headerH + tableH + 24 + statsH + footerH + T_PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = totalH + 200; // buffer
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CARD_W, canvas.height);

  let y = T_PAD;

  // Accent line
  const ag = ctx.createLinearGradient(T_PAD, 0, CARD_W - T_PAD, 0);
  ag.addColorStop(0, BRAND_PRIMARY);
  ag.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = ag;
  ctx.fillRect(T_PAD, y, CARD_W - T_PAD * 2, 3);
  y += 20;

  // Title
  ctx.textBaseline = 'top';
  ctx.font = `bold 34px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.fillText('BeBetter', T_PAD, y);
  const bw2 = ctx.measureText('BeBetter').width;
  ctx.font = `bold 30px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const titleText = planLabel ? ` ${planLabel} · ${totalWeeks} 週總覽` : ` ${totalWeeks} 週課程總覽`;
  ctx.fillText(titleText, T_PAD + bw2, y + 2);
  y += 44;

  if (userName) {
    ctx.font = `22px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(userName, T_PAD, y);
    y += 30;
  }
  y += 16;

  // Behavior metrics table
  const tableX = (CARD_W - TABLE_W) / 2;

  // Table header: week numbers
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y, TABLE_W, tableHeaderH, [8, 8, 0, 0]);
  ctx.fill();

  ctx.fillStyle = BRAND_GOLD;
  ctx.font = `bold 18px "Noto Sans TC", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('指標 \\ 週次', tableX + 12, y + tableHeaderH / 2);

  for (let i = 0; i < weeks.length; i++) {
    const cx = tableX + COL_HEADER_W + i * COL_W + COL_W / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 16px "Noto Sans TC", sans-serif`;
    const label = `W${weeks[i].weekNum}`;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, cx - tw / 2, y + tableHeaderH / 2);
  }
  y += tableHeaderH;

  // Build metric values per week
  const metricValues: (string | null)[][] = weeks.map(w => [
    `${w.recordDays}/7`,
    `${w.mealCount}`,
    `${w.behaviorCount}`,
    w.avgWater != null ? `${w.avgWater}` : null,
    w.avgProtein != null ? `${w.avgProtein}杯` : null,
    `${w.exerciseDays}天`,
    w.avgSteps != null ? `${Math.round(w.avgSteps / 1000)}k` : null,
    w.sleepGoodRatio,
    w.bowelRatio,
  ]);

  for (let ri = 0; ri < metricCount; ri++) {
    const isAlt = ri % 2 === 0;
    ctx.fillStyle = isAlt ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(tableX, y, TABLE_W, ROW_H);

    // Bottom border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tableX, y + ROW_H);
    ctx.lineTo(tableX + TABLE_W, y + ROW_H);
    ctx.stroke();

    // Row label
    ctx.textBaseline = 'middle';
    ctx.font = `bold 16px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(metricLabels[ri], tableX + 12, y + ROW_H / 2);

    // Values
    ctx.font = `15px "Noto Sans TC", sans-serif`;
    for (let wi = 0; wi < weeks.length; wi++) {
      const val = metricValues[wi][ri];
      const cx = tableX + COL_HEADER_W + wi * COL_W + COL_W / 2;
      const text = val ?? '—';
      ctx.fillStyle = val ? '#E5E7EB' : 'rgba(255,255,255,0.2)';
      const tw = ctx.measureText(text).width;
      ctx.fillText(text, cx - tw / 2, y + ROW_H / 2);

      // Vertical divider
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tableX + COL_HEADER_W + wi * COL_W, y);
      ctx.lineTo(tableX + COL_HEADER_W + wi * COL_W, y + ROW_H);
      ctx.stroke();
    }
    y += ROW_H;
  }

  // Table border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  safeRoundRect(ctx, tableX, y - metricCount * ROW_H - tableHeaderH, TABLE_W, tableHeaderH + metricCount * ROW_H, 8);
  ctx.stroke();

  y += 24;

  // Overall stats
  const totalRecordDays = weeks.reduce((s, w) => s + w.recordDays, 0);
  const totalMeals = weeks.reduce((s, w) => s + w.mealCount, 0);
  const totalBehaviors = weeks.reduce((s, w) => s + w.behaviorCount, 0);
  const allWaters = weeks.filter(w => w.avgWater != null).map(w => w.avgWater!);
  const overallAvgWater = allWaters.length > 0 ? Math.round(allWaters.reduce((a, b) => a + b, 0) / allWaters.length) : null;
  const totalExercise = weeks.reduce((s, w) => s + w.exerciseDays, 0);
  const completionRate = Math.round((totalRecordDays / (weeks.length * 7)) * 100);

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  safeRoundRect(ctx, T_PAD, y, CARD_W - T_PAD * 2, 80, 12);
  ctx.fill();

  ctx.textBaseline = 'top';
  ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.fillText('🏆 整期成果', T_PAD + 16, y + 12);

  ctx.font = `20px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const summaryLine = [
    `完成率 ${completionRate}%`,
    `共 ${totalRecordDays} 天`,
    `🍽 ${totalMeals} 筆`,
    `📋 ${totalBehaviors} 筆`,
    overallAvgWater != null ? `💧 均${overallAvgWater}ml` : '',
    `🏃 ${totalExercise} 天`,
  ].filter(Boolean).join('  |  ');
  ctx.fillText(summaryLine, T_PAD + 16, y + 46);
  y += 96;

  // Footer — enlarged & more visible
  ctx.fillStyle = ag;
  ctx.fillRect(T_PAD, y, CARD_W - T_PAD * 2, 2);
  y += 14;
  ctx.font = `bold 26px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.globalAlpha = 0.85;
  ctx.fillText('BeBetter', T_PAD, y);
  const progBw = ctx.measureText('BeBetter').width;
  ctx.font = `24px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(' — 陪你成為更好的自己', T_PAD + progBw, y);
  ctx.globalAlpha = 1;
  y += 44;

  const out = document.createElement('canvas');
  out.width = CARD_W;
  out.height = y;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Canvas 2D context not available');
  outCtx.drawImage(canvas, 0, 0, CARD_W, y, 0, 0, CARD_W, y);
  return out.toDataURL('image/jpeg', 0.92);
}

// ─── Structured Data Export (for nutritionist Excel) ────────────────────────

interface StructuredExportInput {
  weekNum: number;
  startDate: Date;       // Monday of the week
  behaviorRecords: BehaviorRecord[];
  mealRecords: MealRecord[];
  userName?: string | null;
}

/**
 * Generate structured data for nutritionist Excel.
 * Format: each day = one line, TAB-separated (splits into columns when pasted in Excel/Numbers).
 * Title line is plain text (not tab-separated).
 *
 * Columns: 日期 步數 運動次(分) 排便 喝水 睡眠 蛋白份 高蛋白 蔬菜份 飲食紀錄 垃圾食物
 * Note: 蛋白份 = meat tags only (低脂肉+中脂肉+高脂肉), 高蛋白 = protein powder cups (separate to avoid double-counting)
 */
export function generateStructuredData(input: StructuredExportInput): string {
  const { weekNum, startDate, behaviorRecords, mealRecords, userName } = input;

  // Map records to days (0=Mon, 6=Sun)
  const dayBehaviors: (BehaviorRecord | null)[] = Array(7).fill(null);
  for (const b of behaviorRecords) {
    const d = b.recordDate ? new Date(b.recordDate + 'T00:00:00') : new Date(b.timestamp);
    const dayIdx = (d.getDay() + 6) % 7;
    dayBehaviors[dayIdx] = b;
  }

  // Meal records per day — use recordDate if available
  const dayMeals: MealRecord[][] = Array.from({ length: 7 }, () => []);
  for (const m of mealRecords) {
    const d = m.recordDate ? new Date(m.recordDate + 'T00:00:00') : new Date(m.timestamp);
    const dayIdx = (d.getDay() + 6) % 7;
    dayMeals[dayIdx].push(m);
  }

  const endDate = new Date(startDate.getTime() + 6 * 86400000);
  const fmtD = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const lines: string[] = [];

  // Header line
  lines.push(`【W${weekNum}${userName ? ' ' + userName : ''} ${fmtD(startDate)}~${fmtD(endDate)}】`);

  // Column header (tab-separated so paste into spreadsheet splits across columns)
  lines.push('日期\t步數\t運動(分)\t排便\t喝水\t睡眠\t蛋白份\t高蛋白\t蔬菜份\t飲食\t垃圾');

  // One line per day
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getTime() + i * 86400000);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const b = dayBehaviors[i];
    const meals = dayMeals[i];

    // Steps
    const steps = b?.stepsCount || '';

    // Exercise: "次數(總分鐘)" — combine both exercise types
    let exercise = '';
    if (b?.exercise === true) {
      const dur1 = Number(b.exerciseDuration) || 0;
      const dur2 = Number(b.exercise2Duration) || 0;
      const totalDur = dur1 + dur2;
      const count = 1 + (b.exercise2Note?.trim() ? 1 : 0);
      exercise = `${count}(${totalDur})`;
    } else if (b?.exercise === false) {
      exercise = '0(0)';
    }

    // Bowel
    let bowel = '';
    if (b?.bowel != null) {
      bowel = String(BOWEL_TO_NUMBER[b.bowel] ?? 0);
    }

    // Water
    const water = b?.waterMl != null ? String(b.waterMl) : '';

    // Sleep quality (1-5)
    let sleep = '';
    if (b?.sleepQuality) {
      sleep = String(SLEEP_QUALITY_SCORE[b.sleepQuality] ?? '');
    }

    // Protein (meat only, excludes 高蛋白粉 tag) — separate from powder to avoid double-counting
    let meatServings = 0;
    let dietPowderServings = 0;
    for (const m of meals) {
      for (const item of m.items) {
        for (const t of item.tags) {
          if (t.tag === '低脂肉' || t.tag === '中脂肉' || t.tag === '高脂肉') {
            meatServings += t.qty;
          }
          if (t.tag === '高蛋白粉') {
            dietPowderServings += t.qty;
          }
        }
      }
    }
    const protein = (meatServings > 0 || meals.length > 0) ? String(Math.round(meatServings * 10) / 10) : '';

    // Protein powder — take MAX of behavior-recorded vs diet-tagged to avoid double-counting
    let behaviorPowderServings = 0;
    if (b?.proteinCups != null && b.proteinCups > 0) {
      const gpc = b.proteinGrams ? Number(b.proteinGrams) : DEFAULT_PROTEIN_GRAMS_PER_CUP;
      behaviorPowderServings = Math.round((b.proteinCups * gpc / PROTEIN_GRAMS_PER_SERVING) * 10) / 10;
    }
    const finalPowder = Math.max(behaviorPowderServings, dietPowderServings);
    let powderStr = '';
    if (finalPowder > 0) {
      powderStr = String(Math.round(finalPowder * 10) / 10);
    } else if (b?.proteinCups === 0) {
      powderStr = '0';
    }

    // Vegetable servings
    let vegTotal = 0;
    for (const m of meals) {
      for (const item of m.items) {
        for (const t of item.tags) {
          if (t.tag === '蔬菜') vegTotal += t.qty;
        }
      }
    }
    const veg = (vegTotal > 0 || meals.length > 0) ? String(Math.round(vegTotal * 10) / 10) : '';

    // Diet record
    const diet = meals.length > 0 ? 'Y' : 'N';

    // Junk food
    let junk = '';
    if (b?.junkFood === true) junk = 'Y';
    else if (b?.junkFood === false) junk = 'N';

    lines.push(`${dateStr}\t${steps}\t${exercise}\t${bowel}\t${water}\t${sleep}\t${protein}\t${powderStr}\t${veg}\t${diet}\t${junk}`);
  }

  return lines.join('\n');
}
