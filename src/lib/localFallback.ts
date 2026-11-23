import {
  ANGLE_OPTIONS,
  AngleKey,
  CreativeBlueprint,
  GenerationCount,
  LicensePlanId,
  LicenseStatus,
  PlanResponse,
} from '@/src/types/creative';

const DEFAULT_ANGLES_BY_COUNT: Record<GenerationCount, AngleKey[]> = {
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

interface ParsedBriefingInfo {
  productName: string;
  anchorPrice: string;
  mainPrice: string;
  actionText: string;
  trustText: string;
  audienceHint: string;
}

export function parseBriefingInfo(rawBriefing: string): ParsedBriefingInfo {
  const clean = rawBriefing.replace(/\s+/g, ' ').trim();
  const firstSentence = clean.split(/[.!?\n]/)[0]?.trim() || clean;
  const productName =
    firstSentence.length > 48 ? firstSentence.slice(0, 45).trimEnd() + '...' : firstSentence;

  // Extract prices like "R$ 189,90", "12x de R$ 29,70", "R$ 490"
  const priceMatches = (clean.match(/(?:\d+x\s*de\s*)?R\$\s*\d+(?:[.,]\d{1,2})?/gi) ?? []).map((p) =>
    p.trim(),
  );
  const firstPrice = priceMatches[0] ?? '';
  const secondPrice = priceMatches[1] ?? '';
  let anchorPrice = '';
  let mainPrice = 'Condição Especial Hoje';

  if (firstPrice && secondPrice) {
    anchorPrice = `De ${firstPrice}`;
    mainPrice = `Por ${secondPrice}`;
  } else if (firstPrice) {
    mainPrice = `Por ${firstPrice}`;
  }

  const lower = clean.toLowerCase();
  let actionText = 'TOQUE EM SAIBA MAIS';
  if (lower.includes('whatsapp') || lower.includes('mensagem') || lower.includes('agendar')) {
    actionText = 'TOQUE E FALE AGORA';
  } else if (lower.includes('comprar') || lower.includes('pedido')) {
    actionText = 'GARANTIR OFERTA AGORA';
  }

  let trustText = 'Compra segura com garantia e entrega garantida';
  const guaranteeMatch = clean.match(/garantia[^.,;!\n]{0,40}/i);
  if (guaranteeMatch) {
    trustText = guaranteeMatch[0].trim();
  } else if (lower.includes('frete grátis') || lower.includes('frete gratis')) {
    trustText = 'Frete grátis e envio imediato com garantia';
  } else if (lower.includes('acesso imediato')) {
    trustText = 'Acesso imediato após a confirmação';
  }

  let audienceHint = 'EXCLUSIVO PARA QUEM BUSCA RESULTADO';
  if (lower.includes('mulher')) audienceHint = 'PARA MULHERES EXIGENTES';
  else if (lower.includes('homem') || lower.includes('homens')) audienceHint = 'PARA HOMENS DECIDIDOS';
  else if (lower.includes('negócio') || lower.includes('empresa') || lower.includes('local')) {
    audienceHint = 'PARA DONOS DE NEGÓCIO';
  } else if (lower.includes('clínica') || lower.includes('dente') || lower.includes('odonto')) {
    audienceHint = 'ATENDIMENTO ESPECIALIZADO';
  }

  return {
    productName,
    anchorPrice,
    mainPrice,
    actionText,
    trustText,
    audienceHint,
  };
}

const ANGLE_TEMPLATES: Record<
  AngleKey,
  {
    line1: string;
    line2: string;
    subtitle: (p: ParsedBriefingInfo) => string;
    bullets: string[];
    urgency: string;
    ctaLabel: string;
    palette: {
      bgTop: string;
      bgBottom: string;
      accentKeyword: string;
      accentUrgency: string;
      ctaBg: string;
      ctaText: string;
    };
  }
> = {
  dor: {
    line1: 'CHEGA DE SOFRER',
    line2: 'RESOLVA ISSO HOJE',
    subtitle: (p) => `Pare de perder tempo e dinheiro sem ${p.productName.toLowerCase()}.`,
    bullets: [
      'Ataca a causa real do problema',
      'Resultado rápido sem complicação',
      'Pronto para usar imediatamente',
    ],
    urgency: 'Últimas unidades com condição de hoje',
    ctaLabel: 'Saiba mais',
    palette: {
      bgTop: '#0F172A',
      bgBottom: '#1E293B',
      accentKeyword: '#FACC15',
      accentUrgency: '#EF4444',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
  desejo: {
    line1: 'O RESULTADO QUE',
    line2: 'VOCÊ SEMPRE QUIS',
    subtitle: (p) => `Eleve seu padrão com ${p.productName.toLowerCase()} na prática.`,
    bullets: [
      'Transformação visível logo no início',
      'Acabamento e qualidade superiores',
      'Mais praticidade no seu dia a dia',
    ],
    urgency: 'Condição liberada por tempo limitado',
    ctaLabel: 'Quero garantir',
    palette: {
      bgTop: '#111827',
      bgBottom: '#1F2937',
      accentKeyword: '#FBBF24',
      accentUrgency: '#F97316',
      ctaBg: '#059669',
      ctaText: '#FFFFFF',
    },
  },
  antes_depois: {
    line1: 'ANTES FRUSTRAÇÃO',
    line2: 'AGORA RESULTADO',
    subtitle: () => 'Veja a diferença real entre improvisar e usar a solução certa.',
    bullets: [
      'Saia do improviso definitivamente',
      'Desempenho consistente todos os dias',
      'Mudança perceptível desde o 1º uso',
    ],
    urgency: 'Oferta válida somente hoje',
    ctaLabel: 'Ver detalhes',
    palette: {
      bgTop: '#090D16',
      bgBottom: '#1E293B',
      accentKeyword: '#FACC15',
      accentUrgency: '#EF4444',
      ctaBg: '#10B981',
      ctaText: '#052E16',
    },
  },
  prova_social: {
    line1: 'ESCOLHA DE QUEM',
    line2: 'EXIGE QUALIDADE',
    subtitle: () => 'Aprovado por clientes reais que buscavam entrega e confiança.',
    bullets: [
      'Altíssimo índice de aprovação',
      'Recomendado por quem já testou',
      'Padrão validado na prática',
    ],
    urgency: 'Lote promocional com alta procura',
    ctaLabel: 'Saiba mais',
    palette: {
      bgTop: '#0F172A',
      bgBottom: '#0B1324',
      accentKeyword: '#FBBF24',
      accentUrgency: '#F97316',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
  ancoragem_preco: {
    line1: 'QUALIDADE TOPO',
    line2: 'VALOR IMBATÍVEL',
    subtitle: (p) => `Aproveite ${p.productName.toLowerCase()} com o melhor custo-benefício.`,
    bullets: [
      'Economia real sem perder qualidade',
      'Entrega completa sem taxas ocultas',
      'Condição direta sem intermediários',
    ],
    urgency: 'Desconto ativo somente nesta campanha',
    ctaLabel: 'Pegar desconto',
    palette: {
      bgTop: '#022C22',
      bgBottom: '#064E3B',
      accentKeyword: '#FACC15',
      accentUrgency: '#EF4444',
      ctaBg: '#10B981',
      ctaText: '#052E16',
    },
  },
  escassez: {
    line1: 'ÚLTIMAS HORAS',
    line2: 'GARANTA O SEU',
    subtitle: () => 'Quando este lote encerrar, a condição promocional sai do ar.',
    bullets: [
      'Estoque reduzido nesta oferta',
      'Prioridade de envio imediato',
      'Preço protegido somente hoje',
    ],
    urgency: 'Restam poucas vagas / unidades',
    ctaLabel: 'Garantir agora',
    palette: {
      bgTop: '#18181B',
      bgBottom: '#09090B',
      accentKeyword: '#FACC15',
      accentUrgency: '#EF4444',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
  quebra_objecao: {
    line1: 'SEM COMPLICAÇÃO',
    line2: 'FUNCIONA MESMO',
    subtitle: () => 'Direto ao ponto, fácil de aplicar e com respaldo completo.',
    bullets: [
      'Sem burocracia ou letras miúdas',
      'Suporte rápido em português',
      'Testado para entrega imediata',
    ],
    urgency: 'Condição especial liberada agora',
    ctaLabel: 'Saiba mais',
    palette: {
      bgTop: '#0F172A',
      bgBottom: '#172554',
      accentKeyword: '#FBBF24',
      accentUrgency: '#F97316',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
  mecanismo: {
    line1: 'MÉTODO ÚNICO',
    line2: 'MUITO SUPERIOR',
    subtitle: () => 'Entenda por que esta solução entrega mais em menos tempo.',
    bullets: [
      'Diferencial claro frente aos comuns',
      'Foco total em eficiência real',
      'Mais previsibilidade no resultado',
    ],
    urgency: 'Disponível nesta campanha',
    ctaLabel: 'Conhecer agora',
    palette: {
      bgTop: '#111827',
      bgBottom: '#0F172A',
      accentKeyword: '#FACC15',
      accentUrgency: '#F97316',
      ctaBg: '#059669',
      ctaText: '#FFFFFF',
    },
  },
  curiosidade: {
    line1: 'O DETALHE QUE',
    line2: 'MUDA O JOGO',
    subtitle: () => 'Quem entende de resultado já está aplicando exatamente isso.',
    bullets: [
      'Descubra o diferencial na página',
      'Feito para quem busca conversão real',
      'Veja os detalhes antes de decidir',
    ],
    urgency: 'Acesso rápido pelo botão abaixo',
    ctaLabel: 'Ver agora',
    palette: {
      bgTop: '#0B0F17',
      bgBottom: '#1E293B',
      accentKeyword: '#FBBF24',
      accentUrgency: '#EF4444',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
  risco_zero: {
    line1: 'RISCO ZERO',
    line2: 'SATISFAÇÃO TOTAL',
    subtitle: (p) => `${p.trustText}. Peça hoje com tranquilidade absoluta.`,
    bullets: [
      'Garantia clara sem enrolação',
      'Transparência total no pedido',
      'Suporte dedicado pós-compra',
    ],
    urgency: 'Proteção garantida nesta oferta',
    ctaLabel: 'Garantir sem risco',
    palette: {
      bgTop: '#064E3B',
      bgBottom: '#0F172A',
      accentKeyword: '#FACC15',
      accentUrgency: '#F97316',
      ctaBg: '#10B981',
      ctaText: '#FFFFFF',
    },
  },
};

export function buildLocalCreativePlan(
  briefing: string,
  count: GenerationCount,
  singleAngle: AngleKey
): PlanResponse {
  const info = parseBriefingInfo(briefing);
  const selectedAngles: AngleKey[] =
    count === 1 ? [singleAngle || 'dor'] : DEFAULT_ANGLES_BY_COUNT[count] ?? ['dor', 'desejo', 'ancoragem_preco'];

  const creatives: CreativeBlueprint[] = selectedAngles.map((angleKey, index) => {
    const meta = ANGLE_OPTIONS.find((a) => a.key === angleKey) ?? ANGLE_OPTIONS[0];
    const tpl = ANGLE_TEMPLATES[angleKey] ?? ANGLE_TEMPLATES.dor;

    return {
      id: `cm_${angleKey}_${index + 1}`,
      angleKey,
      angleLabel: meta.label,
      strategicRationale: `Ângulo de ${meta.label.toLowerCase()} estruturado com filtro de comprador e foco em CTR qualificado.`,
      visualScenePrompt: '',
      visualMood: 'impact',
      aida: {
        qualifierBadge: info.audienceHint,
        headlineLine1: tpl.line1,
        headlineLine2: tpl.line2,
        subtitle: tpl.subtitle(info),
        bullets: tpl.bullets,
        trustLine: info.trustText,
        offerAnchor: info.anchorPrice,
        offerPrice: info.mainPrice,
        urgencyTag: tpl.urgency,
        ctaVisualText: info.actionText,
      },
      adKit: {
        ctaButton: tpl.ctaLabel,
        adHeadline: `${info.productName} — ${info.mainPrice}`.slice(0, 48),
        primaryText: `${tpl.subtitle(info)}\n\n${briefing.trim()}\n\n• ${tpl.bullets.join('\n• ')}\n\nToque no botão abaixo e garanta agora.`,
      },
      colorScheme: tpl.palette,
    };
  });

  return {
    productAnalysis: {
      productName: info.productName,
      visualPreservationNotes: 'Imagem original preservada fielmente no centro sem distorções.',
      idealContext: briefing.trim(),
    },
    creatives,
  };
}

// One-way SHA-256 digests only (never plaintext keys) for offline/static-host license validation
const ONE_WAY_LICENSE_HASHES: Record<
  string,
  { planId: Exclude<LicensePlanId, 'free'>; planLabel: string; durationDays: number | null; maxAngles: number }
> = {
  '7ca4ff5c3d06f3f2e89b04650420d64b772a2d04760581aaf9b29b756b0a35ff': {
    planId: 'lifetime',
    planLabel: 'Acesso Vitalício',
    durationDays: null,
    maxAngles: 10,
  },
  '6d58920df0bc47168c4de197393a062adb6175c4829afa4937aac618aca557d4': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '1a4e35a7e381d61748a42c13fdd108313d0f64037105eb4a5ca6467e58c16554': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '7ddaa50996e3f704254b53c8d0e66f39d4309d8d526b46d6bbcdf559b521c57c': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '1d69dd22abb38f285bc3bec15826f94812535583a4400982445eb5cbd11f2ca7': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '0864b92d6e158a8d71d906ce7ec645f10337b6d7299b0a5da22492fb89f4d103': { planId: '30d', planLabel: 'Plano 30 Dias', durationDays: 30, maxAngles: 3 },
  '8a90a25f0de6b4e699158ac5f6233361761f1724952d6b7208044002fadc9328': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  'f2d31e4fe91ca27cba23fd6a0c017dfdfb9a28ce2c4d7561504331d598b64630': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  'a0a16f50f47ec138e6edca7cda9ba9239f6165d4f9530555dbff4da1165cb0d1': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  '96a7823dcec1d8c852496ee1b3b8cda92951e588df47db32f5c81ade721368ea': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  '729293a31136122e48bd2447212b055fa371b49f82e120af7446068b35740553': { planId: '90d', planLabel: 'Plano 90 Dias', durationDays: 90, maxAngles: 5 },
  'c20b363e2bd457ed89bbb14366bc5eec458cb7e56deb5880fe29bd6048e9f90e': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  '70f96064668a820d2b73f3d83563b89627cc730c4380e2fc0639870b45217d54': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  '91209d08383123c87b7414e02e96315850c470d70bcc1300a41434bd78b85f18': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  'd43532c165d354f09566f76a57144b73c8ba71963a35a1aec35b0b260f0aadf7': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
  '2e3a0d80935c8633be2d3d7975d10395484dceda42207da0b19b5fadf641d5a3': { planId: '120d', planLabel: 'Plano 120 Dias', durationDays: 120, maxAngles: 10 },
};

const LOCAL_LICENSE_KEY = 'cm_local_license_state';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getLocalLicenseStatus(): LicenseStatus | null {
  try {
    const raw = localStorage.getItem(LOCAL_LICENSE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      keyHash: string;
      activatedAt: number;
      expiresAt: number | null;
    };
    const spec = ONE_WAY_LICENSE_HASHES[saved.keyHash];
    if (!spec) return null;

    const isLifetime = spec.durationDays === null || saved.expiresAt === null;
    const msLeft = isLifetime ? Number.MAX_SAFE_INTEGER : (saved.expiresAt as number) - Date.now();
    const isExpired = !isLifetime && msLeft <= 0;
    const daysRemaining = isLifetime ? 9999 : isExpired ? 0 : Math.max(1, Math.ceil(msLeft / 86_400_000));
    const isExpiringSoon = !isLifetime && !isExpired && daysRemaining <= 5;

    return {
      active: !isExpired,
      planId: spec.planId,
      planLabel: spec.planLabel,
      maxAngles: isExpired ? 3 : spec.maxAngles,
      activatedAt: saved.activatedAt,
      expiresAt: saved.expiresAt,
      daysRemaining,
      isExpiringSoon,
      isExpired,
      isLifetime,
    };
  } catch {
    return null;
  }
}

export async function activateKeyLocally(
  rawKey: string
): Promise<{ ok: true; status: LicenseStatus } | { ok: false; message: string }> {
  const normalized = rawKey
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '');
  if (normalized.length < 6) {
    return { ok: false, message: 'Digite uma chave de acesso válida (ex: CM30-XXXX-XXXX).' };
  }

  const keyHash = await sha256Hex(normalized);
  const spec = ONE_WAY_LICENSE_HASHES[keyHash];
  if (!spec) {
    return {
      ok: false,
      message: 'Chave não reconhecida. Confira os caracteres ou solicite sua chave pelo WhatsApp.',
    };
  }

  const now = Date.now();
  const expiresAt = spec.durationDays === null ? null : now + spec.durationDays * 86_400_000;
  try {
    localStorage.setItem(
      LOCAL_LICENSE_KEY,
      JSON.stringify({ keyHash, activatedAt: now, expiresAt })
    );
  } catch {
    // ignore storage failure
  }

  const isLifetime = spec.durationDays === null;
  return {
    ok: true,
    status: {
      active: true,
      planId: spec.planId,
      planLabel: spec.planLabel,
      maxAngles: spec.maxAngles,
      activatedAt: now,
      expiresAt,
      daysRemaining: isLifetime ? 9999 : (spec.durationDays as number),
      isExpiringSoon: false,
      isExpired: false,
      isLifetime,
    },
  };
}
