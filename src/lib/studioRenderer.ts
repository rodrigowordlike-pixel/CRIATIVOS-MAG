import {
  AspectFormatId,
  CreativeBlueprint,
  DISPLAY_FORMAT_ORDER,
  FORMAT_SPECS,
} from '@/src/types/creative';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem para renderização.'));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  minSize: number,
  weight: number,
  family: string
): number {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 2;
  }
  return minSize;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const remaining = [current, ...words.slice(i + 1)].join(' ');
        let clipped = remaining;
        while (ctx.measureText(clipped).width > maxWidth && clipped.length > 4) {
          clipped = clipped.slice(0, -4).trimEnd() + '...';
        }
        lines.push(clipped);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(15, 23, 42, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawAmbientBackground(
  ctx: CanvasRenderingContext2D,
  refImg: HTMLImageElement,
  width: number,
  height: number,
  bgTop: string,
  bgBottom: string,
  accentKeyword: string,
  ctaBg: string
) {
  // 1. Deep studio gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, bgTop || '#090D16');
  grad.addColorStop(1, bgBottom || '#111827');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Fast pre-blurred ambient layer (tiny offscreen canvas scaled up = ~2ms vs ~400ms)
  ctx.save();
  ctx.globalAlpha = 0.25;
  const tiny = document.createElement('canvas');
  tiny.width = 160;
  tiny.height = 160;
  const tctx = tiny.getContext('2d');
  if (tctx) {
    tctx.filter = 'blur(10px) saturate(1.25)';
    const tScale = Math.max(tiny.width / refImg.width, tiny.height / refImg.height);
    const tdw = refImg.width * tScale;
    const tdh = refImg.height * tScale;
    tctx.drawImage(refImg, (tiny.width - tdw) / 2, (tiny.height - tdh) / 2, tdw, tdh);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tiny, 0, 0, width, height);
  }
  ctx.restore();

  // 3. Measured high-contrast editorial scrims
  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, 'rgba(5, 8, 15, 0.86)');
  scrim.addColorStop(0.36, 'rgba(5, 8, 15, 0.52)');
  scrim.addColorStop(0.68, 'rgba(5, 8, 15, 0.66)');
  scrim.addColorStop(1, 'rgba(5, 8, 15, 0.94)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // 4. Subtle diagonal studio light sweep
  ctx.save();
  const beamGrad = ctx.createLinearGradient(0, 0, width, height * 0.75);
  beamGrad.addColorStop(0, hexToRgba(accentKeyword || '#FACC15', 0.08));
  beamGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
  beamGrad.addColorStop(1, hexToRgba(ctaBg || '#10B981', 0.06));
  ctx.fillStyle = beamGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 5. Fast 36px dot-matrix pattern fill
  ctx.save();
  const tile = document.createElement('canvas');
  tile.width = 36;
  tile.height = 36;
  const pctx = tile.getContext('2d');
  if (pctx) {
    pctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    pctx.fillRect(18, 18, 2, 2);
    const pattern = ctx.createPattern(tile, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  }
  ctx.restore();

  // 6. Radial studio spotlight behind the hero product
  const spotY = height * 0.44;
  const spotGrad = ctx.createRadialGradient(width * 0.5, spotY, 20, width * 0.5, spotY, width * 0.65);
  spotGrad.addColorStop(0, hexToRgba(accentKeyword || '#FACC15', 0.17));
  spotGrad.addColorStop(0.6, hexToRgba(ctaBg || '#10B981', 0.05));
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height);
}

function drawFaithfulProductBox(
  ctx: CanvasRenderingContext2D,
  refImg: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  accentColor: string
) {
  // Fit the reference image completely inside [boxW, boxH] preserving exact aspect ratio (never distorts or crops product)
  const imgRatio = refImg.width / refImg.height;
  const boxRatio = boxW / boxH;

  let drawW = boxW;
  let drawH = boxH;
  if (imgRatio > boxRatio) {
    drawW = boxW;
    drawH = boxW / imgRatio;
  } else {
    drawH = boxH;
    drawW = boxH * imgRatio;
  }

  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;

  // Soft studio rim-glow behind product
  ctx.save();
  const glow = ctx.createRadialGradient(
    drawX + drawW / 2,
    drawY + drawH / 2,
    Math.min(drawW, drawH) * 0.08,
    drawX + drawW / 2,
    drawY + drawH / 2,
    Math.max(drawW, drawH) * 0.78
  );
  glow.addColorStop(0, hexToRgba(accentColor, 0.28));
  glow.addColorStop(0.55, hexToRgba(accentColor, 0.08));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(boxX - 50, boxY - 50, boxW + 100, boxH + 100);
  ctx.restore();

  // Deep commercial drop shadow + clipped rounded showcase
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 52;
  ctx.shadowOffsetY = 22;
  drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 28);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 28);
  ctx.clip();
  ctx.drawImage(refImg, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Specular rim border with subtle gradient highlight
  ctx.save();
  drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 28);
  const rimGrad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  rimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  rimGrad.addColorStop(1, hexToRgba(accentColor, 0.45));
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawQualifierBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  accentColor: string,
  fontSize: number
): number {
  const upper = text.trim().toUpperCase();
  const displayFamily = '"Plus Jakarta Sans", sans-serif';
  const fitted = fitFontSize(ctx, upper, maxWidth - 48, fontSize, 15, 700, displayFamily);
  ctx.font = `700 ${fitted}px ${displayFamily}`;
  const textW = ctx.measureText(upper).width;
  const pillW = Math.min(maxWidth, textW + 44);
  const pillH = fitted + 22;
  const pillX = centerX - pillW / 2;

  ctx.save();
  drawRoundedRect(ctx, pillX, y, pillW, pillH, 10);
  ctx.fillStyle = hexToRgba(accentColor, 0.14);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accentColor, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(upper, centerX, y + pillH / 2 + 1);
  ctx.restore();

  return y + pillH;
}

function drawCtaButton(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  ctaBg: string,
  ctaText: string
) {
  const displayFamily = '"Plus Jakarta Sans", sans-serif';
  const label = `${text.trim().toUpperCase()}  ▸`;
  const fitted = fitFontSize(ctx, label, w - 56, 32, 20, 800, displayFamily);

  ctx.save();
  ctx.shadowColor = hexToRgba(ctaBg || '#10B981', 0.45);
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;
  drawRoundedRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = ctaBg || '#10B981';
  ctx.fill();
  ctx.restore();

  // Top inner specular edge
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 20);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = ctaText || '#FFFFFF';
  ctx.font = `800 ${fitted}px ${displayFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function drawBulletList(
  ctx: CanvasRenderingContext2D,
  bullets: string[],
  x: number,
  y: number,
  maxWidth: number,
  centered: boolean,
  ctaBg: string,
  fontSize: number,
  rowGap: number
): number {
  const bodyFamily = '"DM Sans", sans-serif';
  let curY = y;

  for (const item of bullets.slice(0, 3)) {
    ctx.font = `600 ${fontSize}px ${bodyFamily}`;
    const lines = wrapLines(ctx, item, maxWidth - 52, 2);
    const blockH = Math.max(44, lines.length * (fontSize * 1.28) + 18);

    if (centered) {
      const cardW = maxWidth;
      ctx.save();
      drawRoundedRect(ctx, x, curY, cardW, blockH, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.065)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Check circle
      const cx = x + 28;
      const cy = curY + blockH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(ctaBg || '#10B981', 0.22);
      ctx.fill();
      ctx.strokeStyle = ctaBg || '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = ctaBg || '#10B981';
      ctx.font = `800 16px ${bodyFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', cx, cy + 1);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = `600 ${fontSize}px ${bodyFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lineH = fontSize * 1.24;
      const startTextY = curY + blockH / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, x + 54, startTextY + idx * lineH);
      });
      ctx.restore();
    } else {
      ctx.save();
      drawRoundedRect(ctx, x, curY, maxWidth, blockH, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.065)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const cx = x + 26;
      const cy = curY + blockH / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(ctaBg || '#10B981', 0.22);
      ctx.fill();
      ctx.strokeStyle = ctaBg || '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = ctaBg || '#10B981';
      ctx.font = `800 15px ${bodyFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', cx, cy + 1);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = `600 ${fontSize}px ${bodyFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lineH = fontSize * 1.24;
      const startTextY = curY + blockH / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, x + 50, startTextY + idx * lineH);
      });
      ctx.restore();
    }

    curY += blockH + rowGap;
  }

  return curY;
}

function drawOfferBlock(
  ctx: CanvasRenderingContext2D,
  blueprint: CreativeBlueprint,
  centerX: number,
  y: number,
  maxWidth: number
): number {
  const displayFamily = '"Plus Jakarta Sans", sans-serif';
  const bodyFamily = '"DM Sans", sans-serif';
  const { aida, colorScheme } = blueprint;
  let curY = y;

  // Offer anchor + main offer price
  const hasAnchor = Boolean(aida.offerAnchor && aida.offerAnchor.trim().length > 0);
  const priceText = aida.offerPrice.trim();

  if (hasAnchor) {
    ctx.save();
    ctx.font = `600 26px ${bodyFamily}`;
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const anchorStr = aida.offerAnchor.trim();
    const anchorW = ctx.measureText(anchorStr).width;
    ctx.fillText(anchorStr, centerX, curY + 14);
    // Strikethrough line
    ctx.strokeStyle = colorScheme.accentUrgency || '#F97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX - anchorW / 2 - 4, curY + 14);
    ctx.lineTo(centerX + anchorW / 2 + 4, curY + 14);
    ctx.stroke();
    ctx.restore();
    curY += 36;
  }

  if (priceText) {
    const fittedPrice = fitFontSize(ctx, priceText, maxWidth, 44, 24, 800, displayFamily);
    ctx.save();
    ctx.font = `800 ${fittedPrice}px ${displayFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, centerX, curY + fittedPrice / 2);
    ctx.restore();
    curY += fittedPrice + 14;
  }

  if (aida.urgencyTag && aida.urgencyTag.trim()) {
    const urg = aida.urgencyTag.trim();
    const fittedUrg = fitFontSize(ctx, urg, maxWidth - 32, 22, 15, 700, bodyFamily);
    ctx.save();
    ctx.font = `700 ${fittedUrg}px ${bodyFamily}`;
    ctx.fillStyle = colorScheme.accentUrgency || '#FB923C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(urg, centerX, curY + 14);
    ctx.restore();
    curY += 32;
  }

  return curY;
}

export async function renderCreativeFormat(
  referenceImageDataUrl: string,
  blueprint: CreativeBlueprint,
  formatId: AspectFormatId
): Promise<string> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const refImg = await loadImage(referenceImageDataUrl);
  const spec = FORMAT_SPECS[formatId];
  const { width, height } = spec;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível neste navegador.');

  const { aida, colorScheme } = blueprint;
  const displayFamily = '"Plus Jakarta Sans", sans-serif';
  const bodyFamily = '"DM Sans", sans-serif';

  drawAmbientBackground(
    ctx,
    refImg,
    width,
    height,
    colorScheme.bgTop,
    colorScheme.bgBottom,
    colorScheme.accentKeyword,
    colorScheme.ctaBg
  );

  if (formatId === '9:16') {
    // STRICT 12% TOP (230px) & 12% BOTTOM (230px) SAFE ZONES FOR STORIES / REELS / TIKTOK
    const padX = 76;
    const contentW = width - padX * 2;
    let curY = 248; // Starts safely below 12% top (230.4px)

    curY = drawQualifierBadge(
      ctx,
      aida.qualifierBadge,
      width / 2,
      curY,
      contentW,
      colorScheme.accentKeyword,
      21
    );
    curY += 26;

    // 2-line Stop-Scroll Headline
    const h1Size = fitFontSize(ctx, aida.headlineLine1, contentW, 66, 36, 800, displayFamily);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 18;
    ctx.font = `800 ${h1Size}px ${displayFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine1, width / 2, curY);
    ctx.restore();
    curY += h1Size + 10;

    const h2Size = fitFontSize(ctx, aida.headlineLine2, contentW, 68, 36, 800, displayFamily);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 18;
    ctx.font = `800 ${h2Size}px ${displayFamily}`;
    ctx.fillStyle = colorScheme.accentKeyword || '#FACC15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine2, width / 2, curY);
    ctx.restore();
    curY += h2Size + 18;

    // Subtitle
    ctx.save();
    ctx.font = `500 28px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const subLines = wrapLines(ctx, aida.subtitle, contentW, 2);
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, curY + idx * 36);
    });
    ctx.restore();
    curY += subLines.length * 36 + 24;

    // Product Showcase Zone (ends cleanly before bullets)
    const productBottomMax = 1040;
    const productH = Math.max(300, productBottomMax - curY);
    drawFaithfulProductBox(
      ctx,
      refImg,
      padX + 20,
      curY,
      contentW - 40,
      productH,
      colorScheme.accentKeyword
    );

    // Desire Bullets
    let lowerY = 1068;
    lowerY = drawBulletList(
      ctx,
      aida.bullets,
      padX,
      lowerY,
      contentW,
      true,
      colorScheme.ctaBg,
      25,
      12
    );

    // Trust Line
    ctx.save();
    const trustSize = fitFontSize(ctx, aida.trustLine, contentW, 22, 16, 600, bodyFamily);
    ctx.font = `600 ${trustSize}px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.trustLine, width / 2, lowerY + 6);
    ctx.restore();
    lowerY += 44;

    // Action Block (Offer + CTA, must end above 1689px = 1920 - 12%)
    lowerY = drawOfferBlock(ctx, blueprint, width / 2, lowerY, contentW);

    const ctaH = 102;
    const ctaY = Math.min(1560, Math.max(lowerY + 12, 1520));
    drawCtaButton(
      ctx,
      aida.ctaVisualText,
      padX,
      ctaY,
      contentW,
      ctaH,
      colorScheme.ctaBg,
      colorScheme.ctaText
    );
  } else if (formatId === '3:4' || formatId === '4:5') {
    // 2-Column Studio Stage for Feed 3:4 (1080x1440) and Post 4:5 (1080x1350)
    const padX = 64;
    const contentW = width - padX * 2;
    let curY = formatId === '3:4' ? 70 : 56;

    curY = drawQualifierBadge(
      ctx,
      aida.qualifierBadge,
      width / 2,
      curY,
      contentW,
      colorScheme.accentKeyword,
      19
    );
    curY += 22;

    const h1Size = fitFontSize(ctx, aida.headlineLine1, contentW, 56, 32, 800, displayFamily);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    ctx.font = `800 ${h1Size}px ${displayFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine1, width / 2, curY);
    ctx.restore();
    curY += h1Size + 8;

    const h2Size = fitFontSize(ctx, aida.headlineLine2, contentW, 58, 32, 800, displayFamily);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    ctx.font = `800 ${h2Size}px ${displayFamily}`;
    ctx.fillStyle = colorScheme.accentKeyword || '#FACC15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine2, width / 2, curY);
    ctx.restore();
    curY += h2Size + 14;

    ctx.save();
    ctx.font = `500 25px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const subLines = wrapLines(ctx, aida.subtitle, contentW, 2);
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, curY + idx * 32);
    });
    ctx.restore();
    curY += subLines.length * 32 + 28;

    // 2-Column Center Stage: Left = Faithful Product, Right = Bullets + Trust
    const actionAreaH = formatId === '3:4' ? 350 : 320;
    const stageH = Math.max(360, height - curY - actionAreaH);
    const colGap = 32;
    const leftW = 468;
    const rightW = contentW - leftW - colGap;
    const rightX = padX + leftW + colGap;

    drawFaithfulProductBox(
      ctx,
      refImg,
      padX,
      curY,
      leftW,
      stageH,
      colorScheme.accentKeyword
    );

    const bulletsEnd = drawBulletList(
      ctx,
      aida.bullets,
      rightX,
      curY + 18,
      rightW,
      false,
      colorScheme.ctaBg,
      23,
      16
    );

    ctx.save();
    ctx.font = `600 20px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const trustLines = wrapLines(ctx, aida.trustLine, rightW, 2);
    trustLines.forEach((line, idx) => {
      ctx.fillText(line, rightX + 4, bulletsEnd + 10 + idx * 27);
    });
    ctx.restore();

    // Bottom Conversion Action Block
    const actionStart = curY + stageH + 28;
    const offerEnd = drawOfferBlock(ctx, blueprint, width / 2, actionStart, contentW);
    const ctaH = 98;
    const ctaY = Math.min(height - ctaH - 54, Math.max(offerEnd + 14, height - ctaH - 64));
    drawCtaButton(
      ctx,
      aida.ctaVisualText,
      padX,
      ctaY,
      contentW,
      ctaH,
      colorScheme.ctaBg,
      colorScheme.ctaText
    );
  } else {
    // 1:1 Square (1080x1080)
    const padX = 56;
    const contentW = width - padX * 2;
    let curY = 44;

    curY = drawQualifierBadge(
      ctx,
      aida.qualifierBadge,
      width / 2,
      curY,
      contentW,
      colorScheme.accentKeyword,
      18
    );
    curY += 16;

    const h1Size = fitFontSize(ctx, aida.headlineLine1, contentW, 48, 28, 800, displayFamily);
    ctx.save();
    ctx.font = `800 ${h1Size}px ${displayFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine1, width / 2, curY);
    ctx.restore();
    curY += h1Size + 6;

    const h2Size = fitFontSize(ctx, aida.headlineLine2, contentW, 50, 28, 800, displayFamily);
    ctx.save();
    ctx.font = `800 ${h2Size}px ${displayFamily}`;
    ctx.fillStyle = colorScheme.accentKeyword || '#FACC15';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(aida.headlineLine2, width / 2, curY);
    ctx.restore();
    curY += h2Size + 10;

    ctx.save();
    ctx.font = `500 22px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const subLines = wrapLines(ctx, aida.subtitle, contentW, 1);
    subLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, curY + idx * 28);
    });
    ctx.restore();
    curY += subLines.length * 28 + 20;

    // 2-Column Middle Stage
    const stageH = 420;
    const colGap = 28;
    const leftW = 440;
    const rightW = contentW - leftW - colGap;
    const rightX = padX + leftW + colGap;

    drawFaithfulProductBox(
      ctx,
      refImg,
      padX,
      curY,
      leftW,
      stageH,
      colorScheme.accentKeyword
    );

    const bulletsEnd = drawBulletList(
      ctx,
      aida.bullets,
      rightX,
      curY + 12,
      rightW,
      false,
      colorScheme.ctaBg,
      21,
      12
    );

    ctx.save();
    ctx.font = `600 18px ${bodyFamily}`;
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const trustLines = wrapLines(ctx, aida.trustLine, rightW, 2);
    trustLines.forEach((line, idx) => {
      ctx.fillText(line, rightX + 4, bulletsEnd + 6 + idx * 24);
    });
    ctx.restore();

    // Bottom Conversion Split Row (Price Left + CTA Right)
    const bottomY = curY + stageH + 28;
    const leftOfferCenter = padX + leftW / 2;
    drawOfferBlock(ctx, blueprint, leftOfferCenter, bottomY + 4, leftW);

    drawCtaButton(
      ctx,
      aida.ctaVisualText,
      rightX,
      bottomY + 16,
      rightW,
      96,
      colorScheme.ctaBg,
      colorScheme.ctaText
    );
  }

  return canvas.toDataURL('image/png');
}

export async function renderAllFormatsForBlueprint(
  referenceImageDataUrl: string,
  blueprint: CreativeBlueprint
): Promise<Record<AspectFormatId, string>> {
  const entries = await Promise.all(
    DISPLAY_FORMAT_ORDER.map(async (formatId) => {
      const url = await renderCreativeFormat(referenceImageDataUrl, blueprint, formatId);
      return [formatId, url] as const;
    })
  );
  return Object.fromEntries(entries) as Record<AspectFormatId, string>;
}

/**
 * Adapts a 3:4 generated AI image cleanly into exact 4:5 (1080x1350) full-bleed
 * using center cover crop so all 4 requested Instagram sizes are pixel-exact.
 */
export async function adaptImageTo4x5(sourceDataUrl: string): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceDataUrl;

  const scale = Math.max(width / img.width, height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  return canvas.toDataURL('image/png');
}

/**
 * Downscales large uploaded photos (max 1024px) for lightweight, fast API payloads
 * while keeping the original full-resolution photo locally for crisp 1080px Canvas rendering.
 */
export async function compressImageForApi(sourceDataUrl: string, maxDim = 512): Promise<string> {
  const img = await loadImage(sourceDataUrl);
  const largest = Math.max(img.width, img.height);
  if (largest <= maxDim && sourceDataUrl.length < 180_000) {
    return sourceDataUrl;
  }

  const ratio = largest > maxDim ? maxDim / largest : 1;
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceDataUrl;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.8);
}
