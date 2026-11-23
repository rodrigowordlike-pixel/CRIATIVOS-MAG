import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { TopBar } from '@/src/components/TopBar';
import { StudioSidebar } from '@/src/components/StudioSidebar';
import { CreativeGallery } from '@/src/components/CreativeGallery';
import { PaywallModal, PaywallModalMode } from '@/src/components/PaywallModal';
import { compressImageForApi, renderAllFormatsForBlueprint } from '@/src/lib/studioRenderer';
import {
  AidaCopy,
  AngleKey,
  AspectFormatId,
  DISPLAY_FORMAT_ORDER,
  GenerationCount,
  LicenseStatus,
  PlanResponse,
  ProductAnalysis,
  RenderedCreative,
} from '@/src/types/creative';

const LOADING_MESSAGES = [
  'O criativo errado pode matar uma campanha inteira antes mesmo do primeiro clique...',
  'Criativo abaixo de 2% de CTR não é criativo — é dinheiro escapando pelo leilão!',
  'Você tem menos de 0,5 segundo para parar o dedo no feed e filtrar curiosos...',
  'Conectando a dor real do comprador à oferta de forma impossível de ignorar...',
  'Blindando as zonas seguras de 12% para o Reels e TikTok não tamparem o botão...',
  'Finalizando os 4 tamanhos oficiais com copy pronta para subir agora...',
];

const DEFAULT_LICENSE: LicenseStatus = {
  active: false,
  planId: 'free',
  planLabel: 'Plano Free',
  maxAngles: 3,
  activatedAt: null,
  expiresAt: null,
  daysRemaining: 0,
  isExpiringSoon: false,
  isExpired: false,
};

const STORAGE_GEN_COUNT_KEY = 'cm_free_generations_used';
const STORAGE_AUTH_TOKEN_KEY = 'cm_license_auth_token';

function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveStoredAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage restriction
  }
}

function getStoredGenerationCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_GEN_COUNT_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveStoredGenerationCount(value: number) {
  try {
    localStorage.setItem(STORAGE_GEN_COUNT_KEY, String(value));
  } catch {
    // ignore storage restriction
  }
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function safePostJson<T>(
  url: string,
  payload: unknown,
  authToken?: string | null,
  retries = 4,
  delayMs = 1200
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI planning
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        if (res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) {
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
            continue;
          }
          throw new Error(
            'Gerando criativos otimizados... Tente clicar em Gerar novamente.'
          );
        }
        throw new Error(
          `O servidor retornou uma resposta inesperada (HTTP ${res.status}). Recarregue a página e tente novamente.`
        );
      }
      if (!res.ok) {
        const errMsg =
          data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
            ? data.message
            : `Falha na requisição (HTTP ${res.status}).`;
        throw new Error(errMsg);
      }
      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error('A geração demorou mais que o esperado (tempo limite de 45s). Tente novamente.');
      }
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Falha de conexão com o servidor. Verifique sua internet.');
}

export default function App() {
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceMeta, setReferenceMeta] = useState<{ name: string; dimensions: string } | null>(
    null
  );
  const [briefing, setBriefing] = useState('');
  const [count, setCount] = useState<GenerationCount>(3);
  const [singleAngle, setSingleAngle] = useState<AngleKey>('dor');

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [currentItems, setCurrentItems] = useState<RenderedCreative[]>([]);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const [generationsUsed, setGenerationsUsed] = useState<number>(() => getStoredGenerationCount());
  const [license, setLicense] = useState<LicenseStatus>(DEFAULT_LICENSE);
  const [authToken, setAuthToken] = useState<string | null>(() => getStoredAuthToken());

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallModalMode>('paywall');
  const [paywallMsgIdx, setPaywallMsgIdx] = useState(0);
  const [mobileTab, setMobileTab] = useState<'setup' | 'results'>('setup');

  // Check license status on mount and show "Está vencendo seu plano!!" popup whenever close to expiry or expired
  useEffect(() => {
    let cancelled = false;
    const savedToken = getStoredAuthToken();
    const headers: Record<string, string> = {};
    if (savedToken) {
      headers['Authorization'] = `Bearer ${savedToken}`;
    }
    fetch('/api/license/status', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((status: LicenseStatus | null) => {
        if (cancelled || !status) return;
        setLicense(status);
        if (!status.active && !status.isExpired && savedToken) {
          saveStoredAuthToken(null);
          setAuthToken(null);
        }
        if (status.isExpiringSoon || status.isExpired) {
          setPaywallMode('expiring');
          setIsPaywallOpen(true);
        }
      })
      .catch(() => {
        // stay on default free status
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMsgIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const progressText = isGenerating ? LOADING_MESSAGES[loadingMsgIdx] : '';

  const openPlayfulPaywall = (mode: PaywallModalMode = 'paywall') => {
    setPaywallMode(mode);
    if (mode === 'paywall') {
      setPaywallMsgIdx((prev) => (prev + 1) % 5);
    }
    setIsPaywallOpen(true);
  };

  const handleActivateKey = async (
    rawKey: string
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await safePostJson<LicenseStatus & { token?: string }>(
        '/api/license/activate',
        { key: rawKey },
        authToken
      );
      if (res.token) {
        setAuthToken(res.token);
        saveStoredAuthToken(res.token);
      }
      setLicense({
        active: res.active,
        planId: res.planId,
        planLabel: res.planLabel,
        maxAngles: res.maxAngles,
        activatedAt: res.activatedAt,
        expiresAt: res.expiresAt,
        daysRemaining: res.daysRemaining,
        isExpiringSoon: res.isExpiringSoon,
        isExpired: res.isExpired,
        isLifetime: res.isLifetime,
      });
      return {
        ok: true,
        message: res.isLifetime
          ? 'Acesso Vitalício ativado! Todos os 10 ângulos estão liberados para sempre sem prazo de vencimento.'
          : `${res.planLabel} ativado com sucesso! Liberado até ${res.maxAngles} ângulos por geração (${res.daysRemaining} dias restantes).`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Não foi possível validar esta chave.',
      };
    }
  };

  const handleGenerate = async () => {
    if (!referenceImage || briefing.trim().length < 10) return;

    // Refresh expiry state if active plan is expiring or expired
    if (license.isExpired) {
      openPlayfulPaywall('expiring');
      return;
    }

    // If on Free plan and this is the 2nd click on Generate -> open playful paywall popup
    if (!license.active && generationsUsed >= 1) {
      openPlayfulPaywall('paywall');
      return;
    }

    const effectiveCount: GenerationCount =
      count > license.maxAngles ? (license.maxAngles as GenerationCount) : count;

    setIsGenerating(true);
    setErrorMsg(null);
    setCurrentItems([]);
    setMobileTab('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const apiImage = await compressImageForApi(referenceImage);
      const plan = await safePostJson<PlanResponse>(
        '/api/creatives/plan',
        {
          imageDataUrl: apiImage,
          briefing: briefing.trim(),
          count: effectiveCount,
          singleAngle,
        },
        authToken
      );
      setProductAnalysis(plan.productAnalysis);

      const renderedList = await Promise.all(
        plan.creatives.map(async (bp) => ({
          blueprint: bp,
          images: await renderAllFormatsForBlueprint(referenceImage, bp),
        }))
      );
      setCurrentItems(renderedList);

      if (!license.active) {
        const nextCount = generationsUsed + 1;
        setGenerationsUsed(nextCount);
        saveStoredGenerationCount(nextCount);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao gerar criativos.';
      setErrorMsg(msg);
      setMobileTab('setup');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateItemAida = async (itemIndex: number, updatedAida: AidaCopy) => {
    if (!referenceImage || !currentItems[itemIndex]) return;
    const target = currentItems[itemIndex];
    const updatedBlueprint = {
      ...target.blueprint,
      aida: updatedAida,
    };
    const newImages = await renderAllFormatsForBlueprint(referenceImage, updatedBlueprint);
    setCurrentItems((prev) =>
      prev.map((it, idx) =>
        idx === itemIndex ? { ...it, blueprint: updatedBlueprint, images: newImages } : it
      )
    );
  };

  const exportItemsAsZip = async (itemsToZip: RenderedCreative[], baseName: string) => {
    if (itemsToZip.length === 0) return;
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < itemsToZip.length; i++) {
        const item = itemsToZip[i];
        const folderName = `${String(i + 1).padStart(2, '0')}_${item.blueprint.angleKey}`;
        const folder = zip.folder(folderName);
        if (!folder) continue;

        for (const fmtId of DISPLAY_FORMAT_ORDER as AspectFormatId[]) {
          const url = item.images[fmtId];
          if (!url) continue;
          const bytes = await dataUrlToUint8Array(url);
          folder.file(`${item.blueprint.angleKey}_${fmtId.replace(':', 'x')}.png`, bytes);
        }

        const copyDoc = [
          `ÂNGULO: ${item.blueprint.angleLabel}`,
          `ESTRATÉGIA: ${item.blueprint.strategicRationale}`,
          '',
          `BOTÃO (CTA): ${item.blueprint.adKit.ctaButton}`,
          `TÍTULO (HEADLINE): ${item.blueprint.adKit.adHeadline}`,
          '',
          'TEXTO PRINCIPAL:',
          item.blueprint.adKit.primaryText,
        ].join('\n');

        folder.file('copy_anuncio.txt', copyDoc);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const objUrl = URL.createObjectURL(blob);
      triggerDownload(objUrl, `${baseName}.zip`);
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleStartNew = () => {
    setCurrentItems([]);
    setProductAnalysis(null);
    setErrorMsg(null);
    setMobileTab('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <TopBar
        hasResults={currentItems.length > 0}
        isExportingZip={isExportingZip}
        onDownloadAllZip={() => exportItemsAsZip(currentItems, 'criativos_magneticos_pack')}
        onStartNew={handleStartNew}
      />

      {/* Mobile Workspace Switcher (< lg) */}
      <div className="lg:hidden border-b border-slate-800/90 bg-[#0E131E] px-4 py-2.5">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#090D16] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setMobileTab('setup')}
            className={`min-h-[42px] rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mobileTab === 'setup'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Configurar
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('results')}
            className={`min-h-[42px] rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mobileTab === 'results'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isGenerating
              ? '2. Gerando...'
              : currentItems.length > 0
              ? `2. Criativos (${currentItems.length})`
              : '2. Guia e Entrega'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className={mobileTab === 'setup' ? 'block lg:flex' : 'hidden lg:flex'}>
          <StudioSidebar
            referenceImage={referenceImage}
            referenceMeta={referenceMeta}
            onImageSelected={(dataUrl, name, dimensions) => {
              setReferenceImage(dataUrl);
              setReferenceMeta({ name, dimensions });
              setErrorMsg(null);
            }}
            onClearImage={() => {
              setReferenceImage(null);
              setReferenceMeta(null);
            }}
            briefing={briefing}
            onBriefingChange={setBriefing}
            count={count}
            onCountChange={setCount}
            singleAngle={singleAngle}
            onSingleAngleChange={setSingleAngle}
            license={license}
            isGenerating={isGenerating}
            progressText={progressText}
            errorMsg={errorMsg}
            onUpgradeClick={() => openPlayfulPaywall(license.isExpiringSoon ? 'expiring' : 'paywall')}
            onOpenKeyModal={() =>
              openPlayfulPaywall(license.isExpiringSoon || license.isExpired ? 'expiring' : 'activate')
            }
            onSubmit={handleGenerate}
          />
        </div>

        <div className={mobileTab === 'results' ? 'flex-1 flex flex-col min-w-0' : 'hidden lg:flex flex-1 flex-col min-w-0'}>
          <CreativeGallery
            items={currentItems}
            productAnalysis={productAnalysis}
            isGenerating={isGenerating}
            progressText={progressText}
            onDownloadSingle={triggerDownload}
            onUpdateItemAida={handleUpdateItemAida}
          />
        </div>
      </div>

      <PaywallModal
        isOpen={isPaywallOpen}
        mode={paywallMode}
        license={license}
        messageIndex={paywallMsgIdx}
        onRotateMessage={() => setPaywallMsgIdx((prev) => (prev + 1) % 5)}
        onActivateKey={handleActivateKey}
        onClose={() => setIsPaywallOpen(false)}
      />
    </div>
  );
}
