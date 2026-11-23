import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

interface CreativeItem {
  angleKey: string;
  folderName: string;
  badge: string;
  h1: string;
  h2: string;
  sub1: string;
  sub2: string;
  bullets: string[];
  trust: string;
  anchor: string;
  price: string;
  urgency: string;
  ctaText: string;
  accentColor: string;
  ctaBg: string;
  metaHeadline: string;
  metaCta: string;
  metaCopy: string;
}

const CREATIVES: CreativeItem[] = [
  {
    angleKey: 'dor_urgente',
    folderName: '01_dor_urgente',
    badge: 'PARA QUEM ANUNCIA NO META ADS',
    h1: 'CHEGA DE QUEIMAR',
    h2: 'DINHEIRO EM ANÚNCIO',
    sub1: '90% das campanhas no Meta Ads falham pelo mesmo motivo:',
    sub2: 'criativos amadores que ninguém clica e não geram vendas.',
    bullets: [
      'Filtra curiosos antes do clique',
      'Estrutura AIDA pronta em 30 segundos',
      '4 formatos oficiais do Instagram juntos',
    ],
    trust: 'Criado para quem busca ROI real no Meta Ads',
    anchor: 'De R$ 97,00',
    price: 'Por Apenas R$ 9,99',
    urgency: 'Oferta Especial de Lançamento',
    ctaText: 'CRIAR ANÚNCIOS AGORA',
    accentColor: '#FBBF24',
    ctaBg: '#10B981',
    metaHeadline: 'Seus anúncios não vendem? Mude isso hoje',
    metaCta: 'Saiba mais',
    metaCopy: `Você já colocou R$ 50, R$ 100 ou R$ 500 por dia no Gerenciador de Anúncios e viu os cliques vindo de curiosos que nunca compram nada?

O problema NÃO é o algoritmo e quase nunca é o público. O problema são criativos amadores que as pessoas ignoram no primeiro segundo.

Com o Criativos Magnéticos 9:16, você transforma qualquer foto em anúncios de alta conversão nos 4 formatos do Instagram (9:16, 4:5, 3:4 e 1:1) com copy AIDA validada e pronta para colar no Meta Ads.

👉 Toque em Saiba Mais e destrave seus criativos agora mesmo!`,
  },
  {
    angleKey: 'quebra_objecao',
    folderName: '02_quebra_objecao',
    badge: 'ZERO PHOTOSHOP · ZERO CANVA',
    h1: 'NÃO SABE FAZER DESIGN?',
    h2: 'A GENTE FAZ EM 1 MINUTO',
    sub1: 'Suba qualquer foto do seu produto e receba anúncios verticais',
    sub2: 'com copy AIDA psicológica pronta para rodar no Meta Ads.',
    bullets: [
      'Safe zones do Instagram 100% blindadas',
      'Copy persuasiva que converte visualização em lead',
      'Download em lote com arquivo de copy pronto',
    ],
    trust: 'Sem mensalidades caras · Acesso imediato',
    anchor: 'Condição Especial',
    price: 'Por Apenas R$ 9,99',
    urgency: 'Acesso instantâneo sem complicação',
    ctaText: 'EXPERIMENTAR AGORA',
    accentColor: '#38BDF8',
    ctaBg: '#10B981',
    metaHeadline: 'Criativos profissionais sem gastar horas no design',
    metaCta: 'Obter oferta',
    metaCopy: `Ficar horas encarando uma tela em branco no Canva sem saber qual headline colocar é a forma mais rápida de travar suas vendas.

Agora você não precisa ser designer nem redator profissional para ter anúncios que chamam atenção e geram vendas no Instagram.

1. Suba a foto do seu produto ou serviço
2. Digite sua oferta em 2 linhas
3. Receba na hora 4 tamanhos oficiais com copy AIDA psicológica de alta conversão

Economize tempo e comece a anunciar como os grandes players.

👉 Clique abaixo e experimente agora mesmo!`,
  },
  {
    angleKey: 'mecanismo_unico',
    folderName: '03_mecanismo_unico',
    badge: 'MÉTODO MAGNÉTICO 9:16',
    h1: 'O SEGREDO DO CTR ALTO',
    h2: 'NO FEED E NOS STORIES',
    sub1: 'Anúncios milimétricos no enquadramento exato que para o scroll',
    sub2: 'do seu cliente ideal nos primeiros 0,5 segundos de tela.',
    bullets: [
      'Zonas seguras de 12% respeitadas para Reels',
      'Gatilhos de ancoragem de preço e escassez',
      'Formatos 9:16, 4:5, 3:4 e 1:1 gerados de uma só vez',
    ],
    trust: 'Garantia de 7 dias e suporte dedicado',
    anchor: 'De R$ 97,00',
    price: 'Por Apenas R$ 9,99',
    urgency: 'Aumente o retorno dos seus anúncios hoje',
    ctaText: 'DESTRAVAR MEUS CRIATIVOS',
    accentColor: '#FDE047',
    ctaBg: '#10B981',
    metaHeadline: 'Multiplique o retorno das suas campanhas Meta Ads',
    metaCta: 'Saiba mais',
    metaCopy: `Sabe por que a maioria dos criativos tem CTR abaixo de 1%?

Porque eles são cortados no Reels, os textos ficam ilegíveis no celular e a copy não cria conexão emocional com o comprador.

O Criativos Magnéticos aplica o método AIDA em anúncios milimetricamente calibrados nos formatos oficiais da Meta: 9:16 (Stories/Reels), 4:5 (Feed Retrato), 3:4 (Grid) e 1:1 (Quadrado).

Você baixa tudo pronto em um único arquivo .ZIP com os arquivos de imagem e o texto pronto para colar no Gerenciador de Anúncios.

👉 Toque em Saiba Mais e suba o nível das suas campanhas!`,
  },
];

function generateSvgTemplate(c: CreativeItem): string {
  const w = 1080;
  const h = 1920;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg_${c.angleKey}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="35%" stop-color="#090D16" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="glow_${c.angleKey}" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="${c.accentColor}" stop-opacity="0.22" />
      <stop offset="60%" stop-color="#10B981" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${w}" height="${h}" fill="url(#bg_${c.angleKey})" />
  <rect width="${w}" height="${h}" fill="url(#glow_${c.angleKey})" />

  <!-- Outer Aesthetic Border -->
  <rect x="28" y="28" width="${w - 56}" height="${h - 56}" rx="36" fill="none" stroke="#1E293B" stroke-width="2" />

  <!-- TOP SAFE ZONE: Content starts comfortably below 12% (y = 230+) -->

  <!-- Top Qualifier Badge -->
  <g transform="translate(540, 250)">
    <rect x="-240" y="-24" width="480" height="48" rx="24" fill="#0E131F" stroke="${c.accentColor}" stroke-width="2" />
    <text x="0" y="8" fill="${c.accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="2" text-anchor="middle">${c.badge}</text>
  </g>

  <!-- Impact Headlines -->
  <text x="540" y="360" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="54" font-weight="900" letter-spacing="0.5" text-anchor="middle" filter="url(#shadow)">${c.h1}</text>
  <text x="540" y="430" fill="${c.accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="900" letter-spacing="1" text-anchor="middle" filter="url(#shadow)">${c.h2}</text>

  <!-- Subtitle (2 wrapped lines for crystal clarity) -->
  <text x="540" y="495" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600" text-anchor="middle">
    ${c.sub1}
  </text>
  <text x="540" y="535" fill="#F1F5F9" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="700" text-anchor="middle">
    ${c.sub2}
  </text>

  <!-- Central Product Display Card (y = 590 to 1190) -->
  <g transform="translate(230, 580)">
    <!-- Shadowed card frame -->
    <rect x="0" y="0" width="620" height="620" rx="36" fill="#090D16" stroke="#334155" stroke-width="3" filter="url(#shadow)" />
    <!-- Inner border glow -->
    <rect x="8" y="8" width="604" height="604" rx="30" fill="#040711" stroke="${c.accentColor}" stroke-width="1.5" stroke-opacity="0.4" />
    
    <!-- Top badge on card -->
    <rect x="24" y="24" width="220" height="36" rx="18" fill="#0F172A" stroke="#10B981" stroke-width="1.5" />
    <circle cx="44" cy="42" r="6" fill="#10B981" />
    <text x="134" y="48" fill="#34D399" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="1" text-anchor="middle">LOGO DO SISTEMA</text>
  </g>

  <!-- Benefits Box (y = 1220 to 1430) -->
  <g transform="translate(140, 1220)">
    <rect x="0" y="0" width="800" height="210" rx="24" fill="#0E131F" stroke="#1E293B" stroke-width="2" />
    
    <!-- Bullet 1 -->
    <circle cx="50" cy="45" r="16" fill="${c.ctaBg}" />
    <path d="M43 45 L48 50 L58 39" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="85" y="52" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600">${c.bullets[0]}</text>

    <!-- Bullet 2 -->
    <circle cx="50" cy="105" r="16" fill="${c.ctaBg}" />
    <path d="M43 105 L48 110 L58 99" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="85" y="112" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600">${c.bullets[1]}</text>

    <!-- Bullet 3 -->
    <circle cx="50" cy="165" r="16" fill="${c.ctaBg}" />
    <path d="M43 165 L48 170 L58 159" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="85" y="172" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600">${c.bullets[2]}</text>
  </g>

  <!-- Trustline -->
  <g transform="translate(540, 1475)">
    <text x="0" y="0" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" text-anchor="middle">🛡️ ${c.trust}</text>
  </g>

  <!-- Price & Urgency Tag -->
  <g transform="translate(540, 1540)">
    <text x="-16" y="0" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" text-decoration="line-through" text-anchor="end">${c.anchor}</text>
    <text x="16" y="0" fill="${c.accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" text-anchor="start">${c.price}</text>
    <text x="0" y="32" fill="#F87171" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" letter-spacing="1" text-anchor="middle">🔥 ${c.urgency}</text>
  </g>

  <!-- Visual CTA Button (above bottom 12% safe zone) -->
  <g transform="translate(180, 1615)">
    <rect x="0" y="0" width="720" height="96" rx="48" fill="${c.ctaBg}" filter="url(#shadow)" />
    <rect x="10" y="6" width="700" height="40" rx="20" fill="#FFFFFF" opacity="0.18" />
    <text x="360" y="60" fill="#042F2E" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="900" letter-spacing="1.5" text-anchor="middle">
      ${c.ctaText} →
    </text>
  </g>
</svg>`;
}

async function run() {
  const zip = new JSZip();
  let fullCopyText = '========================================\nCRIATIVOS MAGNÉTICOS 9:16 — PACK DE ANÚNCIOS COM LOGO DO SISTEMA\n========================================\n\n';

  // Prepare rounded logo image buffer with Sharp
  const logoRawPath = path.join(PUBLIC_DIR, 'brand-icon.png');
  const logoSize = 520;
  const roundedMask = Buffer.from(
    `<svg width="${logoSize}" height="${logoSize}"><rect x="0" y="0" width="${logoSize}" height="${logoSize}" rx="28" ry="28" fill="#fff"/></svg>`
  );

  const preparedLogoBuffer = await sharp(logoRawPath)
    .resize(logoSize, logoSize, { fit: 'cover' })
    .composite([
      {
        input: roundedMask,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  for (let i = 0; i < CREATIVES.length; i++) {
    const item = CREATIVES[i];
    const svgTemplate = generateSvgTemplate(item);

    // Composite: Background SVG + Official System Logo in the exact center card
    // Card starts at x=230, y=580 with width 620, height 620
    // Center logo at x = 230 + (620 - 520)/2 = 280, y = 580 + (620 - 520)/2 = 630
    const pngBuffer = await sharp(Buffer.from(svgTemplate))
      .composite([
        {
          input: preparedLogoBuffer,
          left: 280,
          top: 630,
        },
      ])
      .png({ quality: 95 })
      .toBuffer();

    // 1. Save single 9:16 PNG in /public/downloads/
    const singlePngName = `criativo_${i + 1}_${item.angleKey}_9x16.png`;
    const singlePngPath = path.join(DOWNLOADS_DIR, singlePngName);
    fs.writeFileSync(singlePngPath, pngBuffer);
    console.log(`Generated with official logo: ${singlePngName}`);

    // 2. Add to ZIP folder
    const folder = zip.folder(item.folderName);
    if (folder) {
      folder.file(`${item.angleKey}_9x16.png`, pngBuffer);

      const copyDoc = [
        `========================================`,
        `ÂNGULO ${i + 1}: ${item.badge}`,
        `HEADLINE 9:16: ${item.h1} ${item.h2}`,
        `========================================`,
        ``,
        `KIT PARA GERENCIADOR DE ANÚNCIOS (META ADS):`,
        `Botão de Ação: ${item.metaCta}`,
        `Título do Anúncio (Headline): ${item.metaHeadline}`,
        ``,
        `TEXTO PRINCIPAL (COPY PARA COPIAR E COLAR):`,
        item.metaCopy,
        ``,
        `----------------------------------------`,
      ].join('\n');

      folder.file('copy_anuncio.txt', copyDoc);
      fullCopyText += copyDoc + '\n\n';
    }
  }

  // Save the full copy text file
  const copyFilePath = path.join(DOWNLOADS_DIR, 'copys_completas_meta_ads.txt');
  fs.writeFileSync(copyFilePath, fullCopyText, 'utf8');

  // Generate and save ZIP
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const zipPath = path.join(DOWNLOADS_DIR, 'criativos_magneticos_pack.zip');
  fs.writeFileSync(zipPath, zipBuffer);
  console.log(`Generated ZIP with official logo: criativos_magneticos_pack.zip (${zipBuffer.length} bytes)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
