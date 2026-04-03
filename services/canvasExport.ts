import type { MealRecord, BehaviorRecord, FoodItem, FoodTag } from '../types';
import { CARD_THEMES, sortTags, FOOD_TAGS } from '../constants';

const CARD_WIDTH = 1080;
const PAD = 48;
const BRAND_FONT_SIZE = 28;
const TITLE_FONT_SIZE = 34;
const ITEM_FONT_SIZE = 34;
const NOTE_FONT_SIZE = 24;
const LINE_HEIGHT = 1.6;
const CHIP_PADDING_H = 24;
const CHIP_PADDING_V = 12;
const CHIP_GAP = 10;
const CHIP_RADIUS = 14;
const ROW_HEIGHT = 72;

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
  const footerH = 56;
  // Gradient accent line
  const grad = ctx.createLinearGradient(0, y, width, y);
  grad.addColorStop(0, BRAND_PRIMARY);
  grad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, width, 3);

  // Footer background
  ctx.fillStyle = light ? '#FAFAFA' : 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, y + 3, width, footerH);

  // Brand text (left side)
  ctx.textBaseline = 'middle';
  const centerY = y + 3 + footerH / 2;

  ctx.font = `bold 22px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, centerY);
  const bw = ctx.measureText('BeBetter').width;

  ctx.font = `20px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = light ? '#9CA3AF' : 'rgba(255,255,255,0.4)';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bw, centerY);

  // User name (right side)
  if (userName) {
    ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = light ? '#6B7280' : 'rgba(255,255,255,0.6)';
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
  tempCtx.font = `${ITEM_FONT_SIZE}px "Noto Sans TC", sans-serif`;
  const chipRows = layoutItemChips(tempCtx, safeItems, CARD_WIDTH - PAD * 2);
  const chipSectionH = chipRows.length > 0
    ? chipRows.length * (ITEM_FONT_SIZE + CHIP_PADDING_V * 2 + CHIP_GAP) - CHIP_GAP
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
    ctx.font = `${ITEM_FONT_SIZE}px "Noto Sans TC", sans-serif`;
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
  const chipH = ITEM_FONT_SIZE + CHIP_PADDING_V * 2;

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
  canvas.height = estH + 200; // extra buffer
  const ctx = canvas.getContext('2d')!;

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
    const parts = [record.exerciseNote || '有', record.exerciseDuration ? `${record.exerciseDuration} 分鐘` : ''].filter(Boolean);
    exerciseVal = parts.join('・');
  } else if (record.exercise === false) {
    exerciseVal = '沒有';
  }
  const stepsVal = record.stepsCount ? `${Number(record.stepsCount).toLocaleString()} 步` : null;
  let sleepVal: string | null = null;
  if (record.sleep) {
    const parts: string[] = [record.sleep];
    if (record.sleepQuality) parts.push(`（${record.sleepQuality}）`);
    if (record.bedtime) parts.push(`・${record.bedtime}就寢`);
    sleepVal = parts.join('');
  } else if (record.bedtime) {
    sleepVal = `${record.bedtime}就寢`;
  }
  const bowelVal = record.bowel ? (record.bowelNote?.trim() ? `${record.bowel}（${record.bowelNote}）` : record.bowel) : null;
  const supplementsVal = record.supplements?.trim() || null;

  const indicatorRows = [
    { icon: '💧', label: '喝水量', value: waterVal },
    { icon: '🥛', label: '高蛋白', value: proteinVal },
    { icon: '🏃', label: '運動', value: exerciseVal },
    { icon: '🚶', label: '走路', value: stepsVal },
    { icon: '😴', label: '睡眠', value: sleepVal },
    { icon: '🚽', label: '排便', value: bowelVal },
    { icon: '💊', label: '保健品', value: supplementsVal },
  ];

  for (const row of indicatorRows) {
    // Row background
    ctx.fillStyle = ROW_BG;
    ctx.beginPath();
    safeRoundRect(ctx, PAD, y, CARD_WIDTH - PAD * 2, ROW_HEIGHT - 8, 12);
    ctx.fill();

    const centerY = y + (ROW_HEIGHT - 8) / 2;
    ctx.font = `${ITEM_FONT_SIZE}px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = TEXT;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${row.icon}  ${row.label}`, PAD + 16, centerY);

    const valText = row.value ?? '—';
    const valColor = row.value === null ? MUTED : indicatorColorDark(row.value);
    ctx.fillStyle = valColor;
    ctx.font = `bold ${ITEM_FONT_SIZE}px "Noto Sans TC", sans-serif`;
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

  // Bottom brand text + user name
  ctx.textBaseline = 'top';
  ctx.font = `20px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.globalAlpha = 0.6;
  ctx.fillText('BeBetter — 陪你成為更好的自己', PAD, y);
  if (userName) {
    ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const nameW = ctx.measureText(userName).width;
    ctx.fillText(userName, CARD_WIDTH - PAD - nameW, y);
  }
  ctx.globalAlpha = 1;
  y += 36;

  // Trim canvas to actual height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = CARD_WIDTH;
  finalCanvas.height = y;
  const fctx = finalCanvas.getContext('2d')!;
  fctx.drawImage(canvas, 0, 0);

  return finalCanvas.toDataURL('image/jpeg', 0.92);
}

function rows_count(record: BehaviorRecord): number {
  return 7; // 7 indicator rows (water, protein, exercise, steps, sleep, bowel, supplements)
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
const INDICATOR_LABELS = ['💧 喝水(ml)', '🥛 高蛋白', '🏃 運動', '🚶 步數', '😴 睡眠', '🚽 排便', '💊 保健品'];

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

  // Calculate height
  const headerH = 100;
  const tableHeaderH = 44;
  const indicatorRows = INDICATOR_LABELS.length;
  const mealRowH = ROW_H;
  const tableH = tableHeaderH + (indicatorRows + 1) * ROW_H; // +1 for meal row
  const summaryH = 100;
  const tagAvgH = tagAverages.length > 0 ? 100 : 0; // food tag average section
  const footerH = 60;
  const totalH = headerH + tableH + summaryH + tagAvgH + footerH + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = totalH;
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

  // Footer
  const footGrad = ctx.createLinearGradient(0, y, CARD_W, y);
  footGrad.addColorStop(0, BRAND_PRIMARY);
  footGrad.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = footGrad;
  ctx.fillRect(0, y, CARD_W, 3);
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, y + 3, CARD_W, 50);

  ctx.textBaseline = 'middle';
  ctx.font = `bold 20px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, y + 28);
  const bbw = ctx.measureText('BeBetter').width;
  ctx.font = `18px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bbw, y + 28);

  if (userName) {
    ctx.font = `bold 20px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = '#6B7280';
    const nw = ctx.measureText(userName).width;
    ctx.fillText(userName, CARD_W - PAD - nw, y + 28);
  }
  y += 53;

  // Trim
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

// ─── Program Summary (multi-week trend) ──────────────────────────────────────

interface ProgramSummaryInput {
  weeks: Array<{
    weekNum: number;
    startDate: Date;
    avgWater: number | null;
    exerciseDays: number;
    mealCount: number;
    behaviorCount: number;
    recordDays: number;
  }>;
  totalWeeks: number;
  userName?: string | null;
}

export async function composeProgramSummary(input: ProgramSummaryInput): Promise<string> {
  const { weeks, totalWeeks, userName } = input;
  const CARD_W = 1080;
  const BAR_AREA_W = CARD_W - PAD * 2 - 60;
  const BAR_H = 28;
  const BAR_GAP = 8;

  const headerH = 120;
  const chartH = weeks.length * (BAR_H + BAR_GAP) + 40;
  const statsH = 120;
  const footerH = 60;
  const totalH = headerH + chartH + statsH + footerH + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CARD_W, totalH);

  let y = PAD;

  // Accent line
  const ag = ctx.createLinearGradient(PAD, 0, CARD_W - PAD, 0);
  ag.addColorStop(0, BRAND_PRIMARY);
  ag.addColorStop(1, BRAND_GOLD);
  ctx.fillStyle = ag;
  ctx.fillRect(PAD, y, CARD_W - PAD * 2, 3);
  y += 20;

  // Title
  ctx.textBaseline = 'top';
  ctx.font = `bold 34px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.fillText('BeBetter', PAD, y);
  const bw2 = ctx.measureText('BeBetter').width;
  ctx.font = `bold 30px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(` ${totalWeeks} 週課程總覽`, PAD + bw2, y + 2);
  y += 44;

  if (userName) {
    ctx.font = `22px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(userName, PAD, y);
    y += 30;
  }
  y += 12;

  // Bar chart: each week shows record days as bar
  const maxRecordDays = 7;
  ctx.font = `bold 18px "Noto Sans TC", sans-serif`;

  for (const w of weeks) {
    // Week label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textBaseline = 'middle';
    ctx.fillText(`W${w.weekNum}`, PAD, y + BAR_H / 2);

    // Bar background
    const barX = PAD + 50;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    safeRoundRect(ctx, barX, y, BAR_AREA_W, BAR_H, 6);
    ctx.fill();

    // Filled bar
    const ratio = w.recordDays / maxRecordDays;
    if (ratio > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + BAR_AREA_W * ratio, 0);
      barGrad.addColorStop(0, BRAND_PRIMARY);
      barGrad.addColorStop(1, BRAND_GOLD);
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      safeRoundRect(ctx, barX, y, BAR_AREA_W * ratio, BAR_H, 6);
      ctx.fill();
    }

    // Stats text inside bar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `14px "Noto Sans TC", sans-serif`;
    const statText = `${w.recordDays}/7天  🍽${w.mealCount}  📋${w.behaviorCount}${w.avgWater != null ? `  💧${w.avgWater}ml` : ''}  🏃${w.exerciseDays}天`;
    ctx.fillText(statText, barX + 10, y + BAR_H / 2);

    ctx.font = `bold 18px "Noto Sans TC", sans-serif`;
    y += BAR_H + BAR_GAP;
  }

  y += 16;

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
  safeRoundRect(ctx, PAD, y, CARD_W - PAD * 2, 80, 12);
  ctx.fill();

  ctx.textBaseline = 'top';
  ctx.font = `bold 22px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.fillText('🏆 整期成果', PAD + 16, y + 12);

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
  ctx.fillText(summaryLine, PAD + 16, y + 46);
  y += 96;

  // Footer
  ctx.fillStyle = ag;
  ctx.fillRect(PAD, y, CARD_W - PAD * 2, 2);
  y += 12;
  ctx.font = `18px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.globalAlpha = 0.6;
  ctx.fillText('BeBetter — 陪你成為更好的自己', PAD, y);
  ctx.globalAlpha = 1;
  y += 36;

  const out = document.createElement('canvas');
  out.width = CARD_W;
  out.height = y;
  out.getContext('2d')!.drawImage(canvas, 0, 0);
  return out.toDataURL('image/jpeg', 0.92);
}
