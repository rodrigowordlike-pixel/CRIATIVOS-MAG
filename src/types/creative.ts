export type AspectFormatId = '9:16' | '4:5' | '3:4' | '1:1';

export interface FormatSpec {
  id: AspectFormatId;
  label: string;
  shortName: string;
  width: number;
  height: number;
  placement: string;
}

export const FORMAT_SPECS: Record<AspectFormatId, FormatSpec> = {
  '4:5': {
    id: '4:5',
    label: 'Post 4:5',
    shortName: 'Feed Retrato',
    width: 1080,
    height: 1350,
    placement: 'Feed Instagram & Facebook',
  },
  '3:4': {
    id: '3:4',
    label: 'Grid 3:4',
    shortName: 'Grid / Carrossel',
    width: 1080,
    height: 1440,
    placement: 'Grid Instagram & Pins',
  },
  '1:1': {
    id: '1:1',
    label: 'Square 1:1',
    shortName: 'Quadrado',
    width: 1080,
    height: 1080,
    placement: 'Feed Universal & Catálogo',
  },
  '9:16': {
    id: '9:16',
    label: 'Story 9:16',
    shortName: 'Stories / Reels / TikTok',
    width: 1080,
    height: 1920,
    placement: 'Stories, Reels & TikTok Ads',
  },
};

export const DISPLAY_FORMAT_ORDER: AspectFormatId[] = ['4:5', '3:4', '1:1', '9:16'];

export type AngleKey =
  | 'dor'
  | 'desejo'
  | 'antes_depois'
  | 'prova_social'
  | 'ancoragem_preco'
  | 'escassez'
  | 'quebra_objecao'
  | 'mecanismo'
  | 'curiosidade'
  | 'risco_zero';

export interface AngleOption {
  key: AngleKey;
  label: string;
  focus: string;
}

export const ANGLE_OPTIONS: AngleOption[] = [
  { key: 'dor', label: 'Dor Urgente', focus: 'Ataca o problema imediato e o custo de não agir' },
  { key: 'desejo', label: 'Desejo e Transformação', focus: 'Projeta o resultado ideal e o ganho de status/tempo' },
  { key: 'antes_depois', label: 'Antes x Depois', focus: 'Contrasta o cenário atual frustrante com a transformação' },
  { key: 'prova_social', label: 'Prova Social', focus: 'Usa validação, números reais e confiança coletiva' },
  { key: 'ancoragem_preco', label: 'Ancoragem de Preço', focus: 'Empilha valor percebido e mostra custo-benefício claro' },
  { key: 'escassez', label: 'Escassez e Urgência', focus: 'Cria motivo real e ético para clicar hoje' },
  { key: 'quebra_objecao', label: 'Quebra de Objeção', focus: 'Elimina a principal dúvida que trava a compra' },
  { key: 'mecanismo', label: 'Mecanismo Único', focus: 'Mostra por que este produto funciona diferente dos outros' },
  { key: 'curiosidade', label: 'Curiosidade Qualificada', focus: 'Desperta atenção apenas no comprador com perfil ideal' },
  { key: 'risco_zero', label: 'Garantia e Risco Zero', focus: 'Remove o medo de perder dinheiro na página de destino' },
];

export type GenerationCount = 1 | 3 | 5 | 10;

export type RenderEngine = 'studio_free' | 'nano_banana_ai';

export interface AidaCopy {
  qualifierBadge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  bullets: string[];
  trustLine: string;
  offerAnchor: string;
  offerPrice: string;
  urgencyTag: string;
  ctaVisualText: string;
}

export interface AdKit {
  ctaButton: string;
  adHeadline: string;
  primaryText: string;
}

export interface CreativeColorScheme {
  bgTop: string;
  bgBottom: string;
  accentKeyword: string;
  accentUrgency: string;
  ctaBg: string;
  ctaText: string;
}

export interface CreativeBlueprint {
  id: string;
  angleKey: AngleKey;
  angleLabel: string;
  strategicRationale: string;
  visualScenePrompt: string;
  visualMood?: 'impact' | 'luxury' | 'urgency' | 'clean_trust';
  aida: AidaCopy;
  adKit: AdKit;
  colorScheme: CreativeColorScheme;
}

export interface ProductAnalysis {
  productName: string;
  visualPreservationNotes: string;
  idealContext: string;
}

export interface PlanResponse {
  productAnalysis: ProductAnalysis;
  creatives: CreativeBlueprint[];
}

export interface RenderedCreative {
  blueprint: CreativeBlueprint;
  images: Record<AspectFormatId, string>;
}

export type LicensePlanId = 'free' | '30d' | '90d' | '120d' | 'lifetime';

export interface LicenseStatus {
  active: boolean;
  planId: LicensePlanId;
  planLabel: string;
  maxAngles: number;
  activatedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  isLifetime?: boolean;
}
