import crypto from 'crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export const DAY_MS = 86_400_000;
export const EXPIRING_SOON_DAYS = 5;
export const LICENSE_COOKIE_NAME = 'cm_license_token';
export const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const VALID_COUNTS = new Set([1, 3, 5, 10]);

const SIGNING_SECRET =
  process.env.LICENSE_SESSION_SECRET ||
  crypto.createHash('sha256').update(process.env.VERCEL_URL || 'criativo-magnetico-serverless').digest('hex');

export interface LicensePlanSpec {
  planId: '30d' | '90d' | '120d' | 'lifetime';
  planLabel: string;
  durationDays: number | null;
  maxAngles: number;
}

export const PLAN_SPECS: Record<'30d' | '90d' | '120d' | 'lifetime', LicensePlanSpec> = {
  '30d': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '90d': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  '120d': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  lifetime: { planId: 'lifetime', planLabel: 'Acesso Vitalício', durationDays: null, maxAngles: 10 },
};

export const LICENSE_HASH_CATALOG: Record<string, LicensePlanSpec> = {
  '7ca4ff5c3d06f3f2e89b04650420d64b772a2d04760581aaf9b29b756b0a35ff': PLAN_SPECS.lifetime,
  '6d58920df0bc47168c4de197393a062adb6175c4829afa4937aac618aca557d4': PLAN_SPECS['30d'],
  '1a4e35a7e381d61748a42c13fdd108313d0f64037105eb4a5ca6467e58c16554': PLAN_SPECS['30d'],
  '7ddaa50996e3f704254b53c8d0e66f39d4309d8d526b46d6bbcdf559b521c57c': PLAN_SPECS['30d'],
  '1d69dd22abb38f285bc3bec15826f94812535583a4400982445eb5cbd11f2ca7': PLAN_SPECS['30d'],
  '0864b92d6e158a8d71d906ce7ec645f10337b6d7299b0a5da22492fb89f4d103': PLAN_SPECS['30d'],
  '8a90a25f0de6b4e699158ac5f6233361761f1724952d6b7208044002fadc9328': PLAN_SPECS['90d'],
  'f2d31e4fe91ca27cba23fd6a0c017dfdfb9a28ce2c4d7561504331d598b64630': PLAN_SPECS['90d'],
  'a0a16f50f47ec138e6edca7cda9ba9239f6165d4f9530555dbff4da1165cb0d1': PLAN_SPECS['90d'],
  '96a7823dcec1d8c852496ee1b3b8cda92951e588df47db32f5c81ade721368ea': PLAN_SPECS['90d'],
  '729293a31136122e48bd2447212b055fa371b49f82e120af7446068b35740553': PLAN_SPECS['90d'],
  'c20b363e2bd457ed89bbb14366bc5eec458cb7e56deb5880fe29bd6048e9f90e': PLAN_SPECS['120d'],
  '70f96064668a820d2b73f3d83563b89627cc730c4380e2fc0639870b45217d54': PLAN_SPECS['120d'],
  '91209d08383123c87b7414e02e96315850c470d70bcc1300a41434bd78b85f18': PLAN_SPECS['120d'],
  'd43532c165d354f09566f76a57144b73c8ba71963a35a1aec35b0b260f0aadf7': PLAN_SPECS['120d'],
  '2e3a0d80935c8633be2d3d7975d10395484dceda42207da0b19b5fadf641d5a3': PLAN_SPECS['120d'],
};

export function signStatelessToken(keyHash: string, activatedAt: number, expiresAt: number | null): string {
  const payload = Buffer.from(JSON.stringify({ keyHash, activatedAt, expiresAt }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyStatelessToken(token: string): {
  keyHash: string;
  activatedAt: number;
  expiresAt: number | null;
} | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = crypto.createHmac('sha256', SIGNING_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.keyHash !== 'string' || typeof parsed.activatedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getHeader(req: { headers?: Record<string, string | string[] | undefined> }, name: string): string | undefined {
  const val = req.headers?.[name.toLowerCase()];
  return Array.isArray(val) ? val[0] : val;
}

export function getLicenseFromVercelReq(req: { headers?: Record<string, string | string[] | undefined> }) {
  const freeStatus = {
    active: false,
    planId: 'free' as const,
    planLabel: 'Plano Free',
    maxAngles: 3,
    activatedAt: null,
    expiresAt: null,
    daysRemaining: 0,
    isExpiringSoon: false,
    isExpired: false,
    isLifetime: false,
  };

  const authHeader = getHeader(req, 'authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  let cookieToken: string | null = null;
  const rawCookie = getHeader(req, 'cookie');
  if (rawCookie) {
    for (const pair of rawCookie.split(';')) {
      const idx = pair.indexOf('=');
      if (idx !== -1 && pair.slice(0, idx).trim() === LICENSE_COOKIE_NAME) {
        cookieToken = decodeURIComponent(pair.slice(idx + 1).trim());
        break;
      }
    }
  }

  const token = bearer || cookieToken;
  if (!token) return freeStatus;

  const data = verifyStatelessToken(token);
  if (!data) return freeStatus;

  const spec = LICENSE_HASH_CATALOG[data.keyHash];
  if (!spec) return freeStatus;

  const isLifetime = spec.durationDays === null || data.expiresAt === null;
  const msLeft = isLifetime ? Number.MAX_SAFE_INTEGER : (data.expiresAt as number) - Date.now();
  const isExpired = !isLifetime && msLeft <= 0;
  const daysRemaining = isLifetime ? 9999 : isExpired ? 0 : Math.max(1, Math.ceil(msLeft / DAY_MS));
  const isExpiringSoon = !isLifetime && !isExpired && daysRemaining <= EXPIRING_SOON_DAYS;

  return {
    active: !isExpired,
    planId: spec.planId,
    planLabel: spec.planLabel,
    maxAngles: isExpired ? 3 : spec.maxAngles,
    activatedAt: data.activatedAt,
    expiresAt: data.expiresAt,
    daysRemaining,
    isExpiringSoon,
    isExpired,
    isLifetime,
  };
}

export const ANGLE_CATALOG: Record<string, { label: string; focus: string }> = {
  dor: { label: 'Dor Urgente', focus: 'Ataca o problema imediato e o custo de não agir' },
  desejo: { label: 'Desejo e Transformação', focus: 'Projeta o resultado ideal e o ganho de status ou tempo' },
  antes_depois: { label: 'Antes x Depois', focus: 'Contrasta o cenário atual frustrante com a transformação após usar' },
  prova_social: { label: 'Prova Social', focus: 'Usa validação, números específicos e confiança coletiva' },
  ancoragem_preco: { label: 'Ancoragem de Preço', focus: 'Empilha valor percebido e destaca custo-benefício claro' },
  escassez: { label: 'Escassez e Urgência', focus: 'Cria motivo real e ético para clicar agora sem perder a condição' },
  quebra_objecao: { label: 'Quebra de Objeção', focus: 'Elimina a principal dúvida que trava o comprador antes do clique' },
  mecanismo: { label: 'Mecanismo Único', focus: 'Explica o diferencial prático que torna este produto superior' },
  curiosidade: { label: 'Curiosidade Qualificada', focus: 'Filtra curiosos e gera clique apenas em quem tem intenção de compra' },
  risco_zero: { label: 'Garantia e Risco Zero', focus: 'Reduz o risco percebido com entrega garantida e segurança total' },
};

export const DEFAULT_ANGLES_BY_COUNT: Record<number, string[]> = {
  1: ['dor'],
  3: ['dor', 'desejo', 'ancoragem_preco'],
  5: ['dor', 'desejo', 'antes_depois', 'prova_social', 'escassez'],
  10: [
    'dor',
    'desejo',
    'antes_depois',
    'prova_social',
    'ancoragem_preco',
    'escassez',
    'quebra_objecao',
    'mecanismo',
    'curiosidade',
    'risco_zero',
  ],
};

export function parseDataUrl(input: string): { mimeType: string; data: string } | null {
  if (typeof input !== 'string') return null;
  const match = input.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const data = match[2];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  if (data.length > 16_000_000) return null;
  return { mimeType, data };
}

export function buildServerSmartPlan(briefingText: string, selectedAngles: string[]) {
  const clean = briefingText.replace(/\s+/g, ' ').trim();
  const firstSentence = clean.split(/[.!?\n]/)[0]?.trim() || clean;
  const productName =
    firstSentence.length > 48 ? firstSentence.slice(0, 45).trimEnd() + '...' : firstSentence;

  const prices = (clean.match(/(?:\d+x\s*de\s*)?R\$\s*\d+(?:[.,]\d{1,2})?/gi) ?? []).map((p) => p.trim());
  const firstPrice = prices[0] ?? '';
  const secondPrice = prices[1] ?? '';
  const offerAnchor = firstPrice && secondPrice ? `De ${firstPrice}` : '';
  const offerPrice =
    firstPrice && secondPrice
      ? `Por ${secondPrice}`
      : firstPrice
      ? `Por ${firstPrice}`
      : 'Condição Especial Hoje';

  const lower = clean.toLowerCase();
  const ctaVisualText =
    lower.includes('whatsapp') || lower.includes('mensagem') || lower.includes('agendar')
      ? 'TOQUE E FALE AGORA'
      : 'TOQUE EM SAIBA MAIS';
  const trustLine = clean.match(/garantia[^.,;!\n]{0,40}/i)?.[0]?.trim() || 'Compra segura com garantia';

  const creatives = selectedAngles.map((key, index) => {
    const info = ANGLE_CATALOG[key] || ANGLE_CATALOG.dor;
    return {
      id: `cm_${key}_${index + 1}`,
      angleKey: key,
      angleLabel: info.label,
      strategicRationale: `Estratégia focada em ${info.label.toLowerCase()} com copy AIDA de alta conversão.`,
      visualMood: 'impact',
      aida: {
        qualifierBadge: 'EXCLUSIVO PARA COMPRADORES',
        headlineLine1: key === 'desejo' ? 'O RESULTADO QUE' : key === 'escassez' ? 'ÚLTIMAS HORAS' : 'PARE DE PERDER',
        headlineLine2: key === 'desejo' ? 'VOCÊ SEMPRE QUIS' : key === 'escassez' ? 'GARANTA O SEU' : 'RESOLVA AGORA',
        subtitle: firstSentence.slice(0, 68),
        bullets: [
          'Focado no resultado que você busca',
          'Qualidade comprovada na prática',
          'Entrega rápida e garantia clara',
        ],
        trustLine,
        offerAnchor,
        offerPrice,
        urgencyTag: 'Condição especial por tempo limitado',
        ctaVisualText,
      },
      adKit: {
        ctaButton: 'Saiba mais',
        adHeadline: `${productName} — ${offerPrice}`.slice(0, 48),
        primaryText: `${firstSentence}\n\n${clean}\n\nToque no botão abaixo e garanta hoje mesmo!`,
      },
      colorScheme: {
        bgTop: '#0F172A',
        bgBottom: '#1E293B',
        accentKeyword: '#FBBF24',
        accentUrgency: '#EF4444',
        ctaBg: '#10B981',
        ctaText: '#FFFFFF',
      },
    };
  });

  return {
    productAnalysis: {
      productName,
      visualPreservationNotes: 'Produto preservado fielmente no centro do criativo.',
      idealContext: clean,
    },
    creatives,
  };
}

export async function generatePlanWithGeminiOrSmartFallback(params: {
  parsedImage: { mimeType: string; data: string };
  briefing: string;
  selectedAngles: string[];
}) {
  const { parsedImage, briefing, selectedAngles } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return buildServerSmartPlan(briefing, selectedAngles);
  }

  const ai = new GoogleGenAI({ apiKey });
  const angleInstructions = selectedAngles
    .map((key, idx) => {
      const info = ANGLE_CATALOG[key];
      return `${idx + 1}. angleKey="${key}" | angleLabel="${info.label}" | Foco: ${info.focus}`;
    })
    .join('\n');

  const systemInstruction = `Você é um Diretor de Criação Sênior e Copywriter de Tráfego Direto (Brasil).
Analise FIELMENTE a imagem enviada e gere criativos verticais de alto CTR qualificado (português do Brasil impecável).`;

  const schemaConfig = {
    type: Type.OBJECT,
    properties: {
      productAnalysis: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          visualPreservationNotes: { type: Type.STRING },
          idealContext: { type: Type.STRING },
        },
        required: ['productName', 'visualPreservationNotes', 'idealContext'],
      },
      creatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            angleKey: { type: Type.STRING },
            angleLabel: { type: Type.STRING },
            strategicRationale: { type: Type.STRING },
            visualMood: { type: Type.STRING },
            aida: {
              type: Type.OBJECT,
              properties: {
                qualifierBadge: { type: Type.STRING },
                headlineLine1: { type: Type.STRING },
                headlineLine2: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                trustLine: { type: Type.STRING },
                offerAnchor: { type: Type.STRING },
                offerPrice: { type: Type.STRING },
                urgencyTag: { type: Type.STRING },
                ctaVisualText: { type: Type.STRING },
              },
              required: [
                'qualifierBadge',
                'headlineLine1',
                'headlineLine2',
                'subtitle',
                'bullets',
                'trustLine',
                'offerAnchor',
                'offerPrice',
                'urgencyTag',
                'ctaVisualText',
              ],
            },
            adKit: {
              type: Type.OBJECT,
              properties: {
                ctaButton: { type: Type.STRING },
                adHeadline: { type: Type.STRING },
                primaryText: { type: Type.STRING },
              },
              required: ['ctaButton', 'adHeadline', 'primaryText'],
            },
            colorScheme: {
              type: Type.OBJECT,
              properties: {
                bgTop: { type: Type.STRING },
                bgBottom: { type: Type.STRING },
                accentKeyword: { type: Type.STRING },
                accentUrgency: { type: Type.STRING },
                ctaBg: { type: Type.STRING },
                ctaText: { type: Type.STRING },
              },
              required: ['bgTop', 'bgBottom', 'accentKeyword', 'accentUrgency', 'ctaBg', 'ctaText'],
            },
          },
          required: ['id', 'angleKey', 'angleLabel', 'strategicRationale', 'visualMood', 'aida', 'adKit', 'colorScheme'],
        },
      },
    },
    required: ['productAnalysis', 'creatives'],
  };

  const contentsPayload = {
    parts: [
      { inlineData: { mimeType: parsedImage.mimeType, data: parsedImage.data } },
      { text: `BRIEFING DO USUÁRIO:\n${briefing.trim()}\n\nGERAR EXATAMENTE ${selectedAngles.length} CRIATIVO(S):\n${angleInstructions}` },
    ],
  };

  const modelsToTry: Array<{ model: string; useLowThinking: boolean }> = [
    { model: 'gemini-3.1-flash-lite', useLowThinking: false },
    { model: 'gemini-4-hydrogen', useLowThinking: true },
  ];

  const promptPromise = (async () => {
    for (const cfg of modelsToTry) {
      try {
        const res = await ai.models.generateContent({
          model: cfg.model,
          contents: contentsPayload,
          config: {
            systemInstruction,
            ...(cfg.useLowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            responseMimeType: 'application/json',
            responseSchema: schemaConfig,
          },
        });
        const parsed = JSON.parse((res.text ?? '{}').trim());
        if (parsed && Array.isArray(parsed.creatives) && parsed.creatives.length > 0) {
          return parsed;
        }
      } catch {
        // try next model
      }
    }
    return null;
  })();

  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
  const result = await Promise.race([promptPromise, timeoutPromise]);
  return result ?? buildServerSmartPlan(briefing, selectedAngles);
}
