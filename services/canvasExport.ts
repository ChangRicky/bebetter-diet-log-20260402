import type { MealRecord, BehaviorRecord, FoodItem } from '../types';
import { CARD_THEMES } from '../constants';

const CARD_WIDTH = 1080;
const PAD = 48;
const BRAND_FONT_SIZE = 28;
const TITLE_FONT_SIZE = 34;
const ITEM_FONT_SIZE = 28;
const NOTE_FONT_SIZE = 24;
const LINE_HEIGHT = 1.6;
const CHIP_PADDING_H = 20;
const CHIP_PADDING_V = 10;
const CHIP_GAP = 10;
const CHIP_RADIUS = 14;
const ROW_HEIGHT = 72;

const BRAND_PRIMARY = '#d0502a';
const BRAND_GOLD = '#efa93b';

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

/** Draw elegant brand footer bar */
function drawBrandFooter(ctx: CanvasRenderingContext2D, y: number, width: number, light: boolean) {
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

  // Brand text
  ctx.textBaseline = 'middle';
  const centerY = y + 3 + footerH / 2;

  ctx.font = `bold 22px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText('BeBetter', PAD, centerY);
  const bw = ctx.measureText('BeBetter').width;

  ctx.font = `20px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = light ? '#9CA3AF' : 'rgba(255,255,255,0.4)';
  ctx.fillText(' — 陪你成為更好的自己', PAD + bw, centerY);

  return footerH + 3;
}

// ─── Meal card ────────────────────────────────────────────────────────────────

export async function composeMealCard(record: MealRecord): Promise<string> {
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
  ctx.roundRect(PAD, y - 4, pillW, 40, 20);
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
  drawBrandFooter(ctx, footerY, CARD_WIDTH, true);

  return canvas.toDataURL('image/jpeg', 0.92);
}

interface ChipLayout { label: string; x: number; y: number; width: number; height: number; }

function layoutItemChips(ctx: CanvasRenderingContext2D, items: FoodItem[], maxWidth: number): ChipLayout[][] {
  const rows: ChipLayout[][] = [];
  let curRow: ChipLayout[] = [];
  let rowX = 0, rowY = 0;
  const chipH = ITEM_FONT_SIZE + CHIP_PADDING_V * 2;

  for (const item of items) {
    const tagParts = item.tags.map(t => `${t.tag}${fmtQty(t.qty)}`).join(' ');
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
      ctx.roundRect(sx + chip.x, sy + chip.y, chip.width, chip.height, CHIP_RADIUS);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#FDDCB5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sx + chip.x, sy + chip.y, chip.width, chip.height, CHIP_RADIUS);
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

export async function composeBehaviorCard(record: BehaviorRecord): Promise<string> {
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
  const sleepVal = record.sleep
    ? (record.sleepQuality ? `${record.sleep}（${record.sleepQuality}）` : record.sleep)
    : null;
  const bowelVal = record.bowel;

  const indicatorRows = [
    { icon: '💧', label: '喝水量', value: waterVal },
    { icon: '🥛', label: '高蛋白', value: proteinVal },
    { icon: '🏃', label: '運動', value: exerciseVal },
    { icon: '🚶', label: '走路', value: stepsVal },
    { icon: '😴', label: '睡眠', value: sleepVal },
    { icon: '🚽', label: '排便', value: bowelVal },
  ];

  for (const row of indicatorRows) {
    // Row background
    ctx.fillStyle = ROW_BG;
    ctx.beginPath();
    ctx.roundRect(PAD, y, CARD_WIDTH - PAD * 2, ROW_HEIGHT - 8, 12);
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
    ctx.roundRect(PAD, y, CARD_WIDTH - PAD * 2, noteBlockH, 12);
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

  // Bottom brand text
  ctx.textBaseline = 'top';
  ctx.font = `20px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = BRAND_GOLD;
  ctx.globalAlpha = 0.6;
  ctx.fillText('BeBetter — 陪你成為更好的自己', PAD, y);
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
  return 6; // 6 indicator rows always
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
