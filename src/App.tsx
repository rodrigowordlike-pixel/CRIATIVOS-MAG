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
  authToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
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
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallModalMode>('paywall');
  const [paywallMsgIdx, setPaywallMsgIdx] = useState(0);

  // Check license status on mount and show "Está vencendo seu plano!!" popup whenever close to expiry or expired
  useEffect(() => {
    let cancelled = false;
    fetch('/api/license/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((status: LicenseStatus | null) => {
        if (cancelled || !status) return;
        setLicense(status);
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
      });
      return {
        ok: true,
        message: `${res.planLabel} ativado com sucesso! Liberado até ${res.maxAngles} ângulos por geração (${res.daysRemaining} dias restantes).`,
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100">
      <TopBar
        hasResults={currentItems.length > 0}
        isExportingZip={isExportingZip}
        onDownloadAllZip={() => exportItemsAsZip(currentItems, 'criativos_magneticos_pack')}
        onStartNew={handleStartNew}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
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

        <CreativeGallery
          items={currentItems}
          productAnalysis={productAnalysis}
          isGenerating={isGenerating}
          progressText={progressText}
          onDownloadSingle={triggerDownload}
          onUpdateItemAida={handleUpdateItemAida}
        />
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
