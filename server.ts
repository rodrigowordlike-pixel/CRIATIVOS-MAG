import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_COUNTS = new Set([1, 3, 5, 10]);
const DAY_MS = 86_400_000;
const EXPIRING_SOON_DAYS = 5;
const LICENSE_COOKIE_NAME = 'cm_license_token';
const DATA_DIR = path.resolve(__dirname, '.data');
const LICENSE_STORE_FILE = path.join(DATA_DIR, 'licenses.json');
const SESSION_SECRET_FILE = path.join(DATA_DIR, 'session.secret');

function loadOrCreateSigningSecret(): string {
  if (process.env.LICENSE_SESSION_SECRET) {
    return process.env.LICENSE_SESSION_SECRET;
  }
  try {
    if (fs.existsSync(SESSION_SECRET_FILE)) {
      const existing = fs.readFileSync(SESSION_SECRET_FILE, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const created = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SESSION_SECRET_FILE, created, 'utf8');
    return created;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const LICENSE_SIGNING_SECRET = loadOrCreateSigningSecret();

interface LicensePlanSpec {
  planId: '30d' | '90d' | '120d' | 'lifetime';
  planLabel: string;
  durationDays: number | null;
  maxAngles: number;
}

const PLAN_SPECS: Record<'30d' | '90d' | '120d' | 'lifetime', LicensePlanSpec> = {
  '30d': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '90d': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  '120d': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  lifetime: { planId: 'lifetime', planLabel: 'Acesso Vitalício', durationDays: null, maxAngles: 10 },
};

// SHA-256 hashes of the generated access keys (5 per plan + 1 owner lifetime key)
const LICENSE_HASH_CATALOG: Record<string, LicensePlanSpec> = {
  // Chave Vitalícia (Proprietário)
  '7ca4ff5c3d06f3f2e89b04650420d64b772a2d04760581aaf9b29b756b0a35ff': PLAN_SPECS.lifetime,
  // 30 Dias (5 keys)
  '6d58920df0bc47168c4de197393a062adb6175c4829afa4937aac618aca557d4': PLAN_SPECS['30d'],
  '1a4e35a7e381d61748a42c13fdd108313d0f64037105eb4a5ca6467e58c16554': PLAN_SPECS['30d'],
  '7ddaa50996e3f704254b53c8d0e66f39d4309d8d526b46d6bbcdf559b521c57c': PLAN_SPECS['30d'],
  '1d69dd22abb38f285bc3bec15826f94812535583a4400982445eb5cbd11f2ca7': PLAN_SPECS['30d'],
  '0864b92d6e158a8d71d906ce7ec645f10337b6d7299b0a5da22492fb89f4d103': PLAN_SPECS['30d'],
  // 90 Dias (5 keys)
  '8a90a25f0de6b4e699158ac5f6233361761f1724952d6b7208044002fadc9328': PLAN_SPECS['90d'],
  'f2d31e4fe91ca27cba23fd6a0c017dfdfb9a28ce2c4d7561504331d598b64630': PLAN_SPECS['90d'],
  'a0a16f50f47ec138e6edca7cda9ba9239f6165d4f9530555dbff4da1165cb0d1': PLAN_SPECS['90d'],
  '96a7823dcec1d8c852496ee1b3b8cda92951e588df47db32f5c81ade721368ea': PLAN_SPECS['90d'],
  '729293a31136122e48bd2447212b055fa371b49f82e120af7446068b35740553': PLAN_SPECS['90d'],
  // 120 Dias (5 keys)
  'c20b363e2bd457ed89bbb14366bc5eec458cb7e56deb5880fe29bd6048e9f90e': PLAN_SPECS['120d'],
  '70f96064668a820d2b73f3d83563b89627cc730c4380e2fc0639870b45217d54': PLAN_SPECS['120d'],
  '91209d08383123c87b7414e02e96315850c470d70bcc1300a41434bd78b85f18': PLAN_SPECS['120d'],
  'd43532c165d354f09566f76a57144b73c8ba71963a35a1aec35b0b260f0aadf7': PLAN_SPECS['120d'],
  '2e3a0d80935c8633be2d3d7975d10395484dceda42207da0b19b5fadf641d5a3': PLAN_SPECS['120d'],
};

interface ActivatedLicenseRecord {
  planId: '30d' | '90d' | '120d' | 'lifetime';
  activatedAt: number;
  expiresAt: number | null;
}

let memoryLicenseStore: Record<string, ActivatedLicenseRecord> = {};

function readLicenseStore(): Record<string, ActivatedLicenseRecord> {
  try {
    if (!fs.existsSync(LICENSE_STORE_FILE)) return { ...memoryLicenseStore };
    const raw = fs.readFileSync(LICENSE_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      memoryLicenseStore = parsed as Record<string, ActivatedLicenseRecord>;
      return memoryLicenseStore;
    }
    return { ...memoryLicenseStore };
  } catch {
    return { ...memoryLicenseStore };
  }
}

function writeLicenseStore(store: Record<string, ActivatedLicenseRecord>) {
  memoryLicenseStore = { ...store };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LICENSE_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Fallback gracefully to in-memory store if filesystem is read-only
  }
}

function signLicenseToken(keyHash: string): string {
  const sig = crypto.createHmac('sha256', LICENSE_SIGNING_SECRET).update(keyHash).digest('hex');
  return `${keyHash}.${sig}`;
}

function verifyLicenseToken(token: string): string | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [keyHash, sig] = parts;
  if (!/^[0-9a-f]{64}$/.test(keyHash) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const expected = crypto.createHmac('sha256', LICENSE_SIGNING_SECRET).update(keyHash).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return keyHash;
}

function extractCookieToken(req: express.Request): string | null {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  for (const pair of rawCookie.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    if (name === LICENSE_COOKIE_NAME) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

function getLicenseStatusFromRequest(req: express.Request) {
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
  };

  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
  const token = bearerToken || extractCookieToken(req);
  if (!token) return freeStatus;

  const keyHash = verifyLicenseToken(token);
  if (!keyHash) return freeStatus;

  const spec = LICENSE_HASH_CATALOG[keyHash];
  if (!spec) return freeStatus;

  const store = readLicenseStore();
  const record = store[keyHash];
  if (!record) return freeStatus;

  const isLifetime = spec.durationDays === null || record.expiresAt === null;
  const now = Date.now();
  const msLeft = isLifetime ? Number.MAX_SAFE_INTEGER : (record.expiresAt as number) - now;
  const isExpired = !isLifetime && msLeft <= 0;
  const daysRemaining = isLifetime ? 9999 : isExpired ? 0 : Math.max(1, Math.ceil(msLeft / DAY_MS));
  const isExpiringSoon = !isLifetime && !isExpired && daysRemaining <= EXPIRING_SOON_DAYS;

  return {
    active: !isExpired,
    planId: spec.planId,
    planLabel: spec.planLabel,
    maxAngles: isExpired ? 3 : spec.maxAngles,
    activatedAt: record.activatedAt,
    expiresAt: record.expiresAt,
    daysRemaining,
    isExpiringSoon,
    isExpired,
    isLifetime,
  };
}

function setLicenseSessionCookie(req: express.Request, res: express.Response, token: string, maxAgeMs: number) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${LICENSE_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.max(60, Math.floor(maxAgeMs / 1000))}`,
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    attrs.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearLicenseSessionCookie(req: express.Request, res: express.Response) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const attrs = [
    `${LICENSE_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    attrs.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

const ANGLE_CATALOG: Record<string, { label: string; focus: string }> = {
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

const DEFAULT_ANGLES_BY_COUNT: Record<number, string[]> = {
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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseDataUrl(input: string): { mimeType: string; data: string } | null {
  if (typeof input !== 'string') return null;
  const match = input.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const data = match[2];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  // Limit decoded image payload to ~12MB
  if (data.length > 16_000_000) return null;
  return { mimeType, data };
}

function mapGeminiError(err: unknown): { status: number; errorCode: string; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (rawMessage === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 500,
      errorCode: 'API_KEY_MISSING',
      message: 'Chave da API Gemini não configurada no servidor. Verifique o painel Settings > Secrets.',
    };
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('api_key_invalid')) {
    return {
      status: 403,
      errorCode: 'PAID_KEY_OR_PERMISSION_REQUIRED',
      message:
        'A chave atual não tem permissão para este modelo. Para usar geração de imagem IA (Nano Banana), selecione uma chave de API paga em Settings > Secrets ou use o Modo Estúdio HD (Gratuito).',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      errorCode: 'QUOTA_EXCEEDED',
      message:
        'Limite de cota atingido na chave gratuita ou modelo pago indisponível nesta cota. Aguarde alguns instantes ou utilize o Modo Estúdio HD (Gratuito).',
    };
  }

  return {
    status: 502,
    errorCode: 'UPSTREAM_ERROR',
    message: `Falha ao comunicar com a API Gemini: ${rawMessage.slice(0, 220)}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // License status & activation endpoints
  app.get('/api/license/status', (req, res) => {
    return res.json(getLicenseStatusFromRequest(req));
  });

  app.post('/api/license/activate', (req, res) => {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({
        errorCode: 'FORBIDDEN_CSRF',
        message: 'Requisição inválida.',
      });
    }

    const rawKey = req.body?.key;
    if (typeof rawKey !== 'string' || rawKey.trim().length < 6 || rawKey.trim().length > 64) {
      return res.status(400).json({
        errorCode: 'INVALID_KEY_FORMAT',
        message: 'Digite uma chave de acesso válida (ex: CM30-XXXX-XXXX).',
      });
    }

    const normalizedKey = rawKey
      .trim()
      .toUpperCase()
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\s+/g, '');
    const keyHash = crypto.createHash('sha256').update(normalizedKey).digest('hex');
    const spec = LICENSE_HASH_CATALOG[keyHash];

    if (!spec) {
      return res.status(404).json({
        errorCode: 'INVALID_KEY',
        message: 'Chave não reconhecida. Confira os caracteres ou solicite sua chave pelo WhatsApp.',
      });
    }

    const store = readLicenseStore();
    const now = Date.now();
    let record = store[keyHash];

    if (!record) {
      record = {
        planId: spec.planId,
        activatedAt: now,
        expiresAt: spec.durationDays === null ? null : now + spec.durationDays * DAY_MS,
      };
      store[keyHash] = record;
      writeLicenseStore(store);
    }

    const isLifetime = spec.durationDays === null || record.expiresAt === null;
    const msLeft = isLifetime ? 3650 * DAY_MS : (record.expiresAt as number) - now;
    if (!isLifetime && msLeft <= 0) {
      return res.status(403).json({
        errorCode: 'KEY_EXPIRED',
        message: 'Esta chave já venceu! Renove pelo WhatsApp (41) 99822-1261 para receber uma nova chave.',
      });
    }

    const daysRemaining = isLifetime ? 9999 : Math.max(1, Math.ceil(msLeft / DAY_MS));
    const isExpiringSoon = !isLifetime && daysRemaining <= EXPIRING_SOON_DAYS;
    const token = signLicenseToken(keyHash);
    setLicenseSessionCookie(req, res, token, msLeft);

    return res.json({
      active: true,
      planId: spec.planId,
      planLabel: spec.planLabel,
      maxAngles: spec.maxAngles,
      activatedAt: record.activatedAt,
      expiresAt: record.expiresAt,
      daysRemaining,
      isExpiringSoon,
      isExpired: false,
      isLifetime,
      token,
    });
  });

  app.post('/api/license/logout', (req, res) => {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({ errorCode: 'FORBIDDEN_CSRF', message: 'Requisição inválida.' });
    }
    clearLicenseSessionCookie(req, res);
    return res.json({ ok: true });
  });

  // 1. Analyze uploaded reference image + generate AIDA creative blueprints & ad kits
  app.post('/api/creatives/plan', async (req, res) => {
    try {
      const { imageDataUrl, briefing, count, singleAngle } = req.body ?? {};

      const parsedImage = parseDataUrl(imageDataUrl);
      if (!parsedImage) {
        return res.status(400).json({
          errorCode: 'INVALID_IMAGE',
          message: 'Envie uma imagem válida em formato PNG, JPG ou WEBP (até 12 MB).',
        });
      }

      if (typeof briefing !== 'string' || briefing.trim().length < 10 || briefing.trim().length > 2500) {
        return res.status(400).json({
          errorCode: 'INVALID_BRIEFING',
          message: 'Descreva o uso, público, dor e oferta com pelo menos 10 caracteres (máx. 2.500).',
        });
      }

      const requestedCount = Number(count);
      if (!VALID_COUNTS.has(requestedCount)) {
        return res.status(400).json({
          errorCode: 'INVALID_COUNT',
          message: 'Quantidade inválida. Escolha 1, 3, 5 ou 10 criativos.',
        });
      }

      const license = getLicenseStatusFromRequest(req);
      if (requestedCount > license.maxAngles) {
        return res.status(403).json({
          errorCode: 'PLAN_UPGRADE_REQUIRED',
          message: `Seu plano atual permite até ${license.maxAngles} ângulos por geração. Ative uma chave de 90 ou 120 dias para liberar ${requestedCount} ângulos.`,
        });
      }

      const selectedAngles =
        requestedCount === 1
          ? [typeof singleAngle === 'string' && ANGLE_CATALOG[singleAngle] ? singleAngle : 'dor']
          : DEFAULT_ANGLES_BY_COUNT[requestedCount];

      const angleInstructions = selectedAngles
        .map((key, idx) => {
          const info = ANGLE_CATALOG[key];
          return `${idx + 1}. angleKey="${key}" | angleLabel="${info.label}" | Foco: ${info.focus}`;
        })
        .join('\n');

      const ai = getGeminiClient();

      const systemInstruction = `Você é um Diretor de Criação Sênior e Copywriter de Tráfego Direto (Brasil).
Analise FIELMENTE a imagem enviada, entenda do que se trata e COMO O USUÁRIO DESEJA O CRIATIVO, e gere criativos verticais de alto CTR qualificado (filtrando curiosos e atraindo compradores).

REGRAS:
1. PRODUTO FIEL: Descreva apenas o que existe na foto/briefing. Nunca invente características falsas.
2. PORTUGUÊS DO BRASIL IMPECÁVEL: Acentuação, pontuação e valores em R$ perfeitos.
3. ESTRUTURA AIDA MOBILE (<0.5s):
   - qualifierBadge: 3 a 6 palavras em maiúsculas filtrando o comprador ideal.
   - headlineLine1: 2 a 4 palavras (máx. 24 chars).
   - headlineLine2: 2 a 4 palavras de destaque (máx. 24 chars).
   - subtitle: 1 frase direta ligando a dor ao produto (máx. 68 chars).
   - bullets: Exatamente 3 benefícios/provas curtas (máx. 36 chars cada).
   - trustLine: Garantia ou prova real do briefing (máx. 52 chars).
   - offerAnchor: Preço riscado se informado (ex: "De R$ 297,00"), senão "".
   - offerPrice: Oferta principal (máx. 32 chars).
   - urgencyTag: Gatilho ético de urgência (máx. 34 chars).
   - ctaVisualText: Texto do botão visual (ex: "TOQUE EM SAIBA MAIS").
4. CORES (HEX): bgTop/bgBottom escuros sofisticados harmonizados com o produto, accentKeyword vibrante (#FACC15/#FBBF24), accentUrgency (#F97316/#EF4444), ctaBg esmeralda (#10B981/#059669), ctaText (#FFFFFF ou #052E16).
5. KIT DE ANÚNCIO: ctaButton, adHeadline (máx. 45 chars), primaryText (copy persuasiva em 2 parágrafos curtos + 3 bullets congruentes com o ângulo).`;

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
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
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
              required: [
                'id',
                'angleKey',
                'angleLabel',
                'strategicRationale',
                'visualMood',
                'aida',
                'adKit',
                'colorScheme',
              ],
            },
          },
        },
        required: ['productAnalysis', 'creatives'],
      };

      const contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: parsedImage.mimeType,
              data: parsedImage.data,
            },
          },
          {
            text: `BRIEFING DO USUÁRIO:\n${briefing.trim()}\n\nGERAR EXATAMENTE ${selectedAngles.length} CRIATIVO(S):\n${angleInstructions}`,
          },
        ],
      };

      const attemptGenerate = async (model: string, useLowThinking: boolean) => {
        return ai.models.generateContent({
          model,
          contents: contentsPayload,
          config: {
            systemInstruction,
            ...(useLowThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            responseMimeType: 'application/json',
            responseSchema: schemaConfig,
          },
        });
      };

      let response;
      const modelsToTry: Array<{ model: string; useLowThinking: boolean }> = [
        { model: 'gemini-3.1-flash-lite', useLowThinking: false },
        { model: 'gemini-4-hydrogen', useLowThinking: true },
        { model: 'gemini-3.1-flash-lite', useLowThinking: false },
      ];

      let lastErr: unknown = null;
      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        try {
          const cfg = modelsToTry[attempt];
          response = await attemptGenerate(cfg.model, cfg.useLowThinking);
          break;
        } catch (err) {
          lastErr = err;
          const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
          const canRetry =
            msg.includes('503') ||
            msg.includes('unavailable') ||
            msg.includes('500') ||
            msg.includes('404') ||
            msg.includes('not_found') ||
            msg.includes('429');
          if (!canRetry || attempt === modelsToTry.length - 1) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      if (!response) {
        throw lastErr ?? new Error('Falha ao gerar planejamento.');
      }

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      if (!parsed || !Array.isArray(parsed.creatives) || parsed.creatives.length === 0) {
        return res.status(502).json({
          errorCode: 'INVALID_AI_RESPONSE',
          message: 'A resposta de planejamento veio vazia. Tente novamente.',
        });
      }

      return res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({
        errorCode: mapped.errorCode,
        message: mapped.message,
      });
    }
  });

  // 2. Optional Generative AI Image Mode (Nano Banana - activates seamlessly when user sets a paid GEMINI_API_KEY)
  app.post('/api/creatives/generate-ai-image', async (req, res) => {
    try {
      const { imageDataUrl, blueprint, aspectRatio, masterImageDataUrl, modelChoice } = req.body ?? {};

      const parsedRef = parseDataUrl(imageDataUrl);
      if (!parsedRef) {
        return res.status(400).json({
          errorCode: 'INVALID_IMAGE',
          message: 'Imagem de referência inválida.',
        });
      }

      const validRatios = new Set(['9:16', '3:4', '1:1']);
      const targetRatio = validRatios.has(aspectRatio) ? aspectRatio : '9:16';
      const selectedModel =
        modelChoice === 'gemini-nano-banana-2.1' ? 'gemini-nano-banana-2.1' : 'gemini-3.1-flash-lite-image';

      if (!blueprint || typeof blueprint !== 'object' || !blueprint.aida) {
        return res.status(400).json({
          errorCode: 'INVALID_BLUEPRINT',
          message: 'Blueprint AIDA inválido.',
        });
      }

      const { aida, visualScenePrompt } = blueprint;
      const ai = getGeminiClient();

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [
        {
          inlineData: {
            mimeType: parsedRef.mimeType,
            data: parsedRef.data,
          },
        },
      ];

      const parsedMaster = masterImageDataUrl ? parseDataUrl(masterImageDataUrl) : null;
      if (parsedMaster) {
        parts.push({
          inlineData: {
            mimeType: parsedMaster.mimeType,
            data: parsedMaster.data,
          },
        });
      }

      const safeZoneInstruction =
        targetRatio === '9:16'
          ? 'Keep the top 12% and bottom 12% completely free of critical text or buttons for Instagram Stories/Reels/TikTok UI safe zones.'
          : 'Adapt the exact same creative layout cleanly to this aspect ratio with balanced margins and zero cropped text.';

      const bulletsText = Array.isArray(aida.bullets) ? aida.bullets.slice(0, 3).join(' | ') : '';

      const prompt = `Create a full-bleed high-converting Brazilian Portuguese vertical ad creative (${targetRatio}) with ZERO white or gray borders.
CRITICAL PRODUCT PRESERVATION: Keep the exact product/subject from the first reference image completely faithful, recognizable, and unaltered in shape, color, and label details. Do NOT invent fake product details.
${parsedMaster ? 'VISUAL CONSISTENCY: Match the exact visual style, colors, lighting, and AIDA design of the second reference creative image, adapted cleanly for this ' + targetRatio + ' frame.' : ''}
Scene & Lighting: ${visualScenePrompt || 'High-contrast dark studio commercial photography around the product with dramatic rim light.'}
${safeZoneInstruction}

Render ALL text below in crisp, ultra-legible Brazilian Portuguese with dark contrast scrims behind text:
- Top qualifier badge: "${aida.qualifierBadge}"
- Giant 2-line Stop-Scroll Headline: Line 1 (white): "${aida.headlineLine1}" / Line 2 (vibrant amber yellow): "${aida.headlineLine2}"
- Subtitle: "${aida.subtitle}"
- 3 short benefit bullets: ${bulletsText}
- Trust line: "${aida.trustLine}"
- Offer: "${aida.offerAnchor ? aida.offerAnchor + ' -> ' : ''}${aida.offerPrice}"
- Urgency tag: "${aida.urgencyTag}"
- High-CTR emerald green CTA button: "${aida.ctaVisualText}"`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: targetRatio,
            ...(selectedModel === 'gemini-nano-banana-2.1' ? { imageSize: '1K' } : {}),
          },
        },
      });

      let outputDataUrl: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          outputDataUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!outputDataUrl) {
        return res.status(502).json({
          errorCode: 'NO_IMAGE_RETURNED',
          message: 'O modelo não retornou imagem para este ângulo. Tente novamente ou use o Modo Estúdio HD.',
        });
      }

      return res.json({ imageDataUrl: outputDataUrl });
    } catch (err) {
      const mapped = mapGeminiError(err);
      return res.status(mapped.status).json({
        errorCode: mapped.errorCode,
        message: mapped.message,
      });
    }
  });

  // Always return JSON for unmatched /api/* routes (never fall through to SPA HTML)
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      errorCode: 'API_ROUTE_NOT_FOUND',
      message: 'Rota da API não encontrada.',
    });
  });

  // JSON error middleware (prevents Express from returning HTML on PayloadTooLargeError or bad JSON)
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      const status = typeof (err as { status?: number })?.status === 'number' ? (err as { status: number }).status : 400;
      const msg =
        status === 413
          ? 'A imagem enviada é muito pesada. Reduza o tamanho do arquivo ou envie outra foto.'
          : err instanceof Error
          ? err.message
          : 'Erro interno ao processar requisição da API.';
      return res.status(status).json({ errorCode: 'REQUEST_ERROR', message: msg });
    }
    return next(err);
  });

  const distPath = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== 'production' || !hasDistBuild) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gerador de Criativos Magnéticos server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
