import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  Maximize2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AidaCopy,
  AspectFormatId,
  DISPLAY_FORMAT_ORDER,
  FORMAT_SPECS,
  ProductAnalysis,
  RenderedCreative,
} from '@/src/types/creative';

interface CreativeGalleryProps {
  items: RenderedCreative[];
  productAnalysis: ProductAnalysis | null;
  isGenerating: boolean;
  progressText: string;
  onDownloadSingle: (dataUrl: string, filename: string) => void;
  onUpdateItemAida: (itemIndex: number, updatedAida: AidaCopy) => Promise<void>;
}

const EMPTY_FORMAT_GUIDE: { id: AspectFormatId; label: string; dims: string; ratioClass: string }[] = [
  { id: '4:5', label: 'post 4:5', dims: '1080×1350', ratioClass: 'h-36 sm:h-44 aspect-[4/5]' },
  { id: '3:4', label: 'grid 3:4', dims: '1080×1440', ratioClass: 'h-40 sm:h-48 aspect-[3/4]' },
  { id: '1:1', label: 'square 1:1', dims: '1080×1080', ratioClass: 'h-28 sm:h-36 aspect-square' },
  { id: '9:16', label: 'Story 9:16', dims: '1080×1920', ratioClass: 'h-48 sm:h-64 aspect-[9/16]' },
];

export function CreativeGallery({
  items,
  productAnalysis,
  isGenerating,
  progressText,
  onDownloadSingle,
  onUpdateItemAida,
}: CreativeGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid4' | 'inspect916'>('grid4');
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [isEditingCopy, setIsEditingCopy] = useState(false);
  const [draftAida, setDraftAida] = useState<AidaCopy | null>(null);
  const [isReRendering, setIsReRendering] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ formatId: AspectFormatId; url: string } | null>(null);
  const [blobUrls, setBlobUrls] = useState<Partial<Record<AspectFormatId, string>>>({});

  const safeIndex = selectedIndex < items.length ? selectedIndex : 0;
  const activeItem = items[safeIndex] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
    setIsEditingCopy(false);
  }, [items]);

  useEffect(() => {
    if (activeItem) {
      setDraftAida(activeItem.blueprint.aida);
    } else {
      setDraftAida(null);
    }
  }, [activeItem]);

  // Create direct Blob object URLs so users also have a clean direct visualization link
  useEffect(() => {
    if (!activeItem) {
      setBlobUrls({});
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    async function buildBlobLinks() {
      const next: Partial<Record<AspectFormatId, string>> = {};
      for (const fmt of DISPLAY_FORMAT_ORDER) {
        const dataUrl = activeItem.images[fmt];
        if (!dataUrl) continue;
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          created.push(objUrl);
          next[fmt] = objUrl;
        } catch {
          // ignore blob failure
        }
      }
      if (!cancelled) {
        setBlobUrls(next);
      }
    }

    buildBlobLinks();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [activeItem]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const handleSaveEditedAida = async () => {
    if (!draftAida) return;
    setIsReRendering(true);
    try {
      await onUpdateItemAida(safeIndex, draftAida);
      setIsEditingCopy(false);
    } finally {
      setIsReRendering(false);
    }
  };

  if (isGenerating && items.length === 0) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-amber-400/25 bg-[#0E131E] p-4 sm:p-6">
            <p className="text-[11px] font-mono font-semibold text-amber-300">
              Preparando seus criativos magnéticos
            </p>
            <h2 className="mt-2 font-display text-lg sm:text-xl font-bold text-white transition-opacity duration-200">
              {progressText || 'Estruturando criativos de alta conversão...'}
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Gerando os 4 formatos oficiais (Post 4:5, Grid 3:4, Square 1:1 e Story 9:16) com preservação fiel da sua foto.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 items-end justify-items-center">
            {EMPTY_FORMAT_GUIDE.map((f) => (
              <div key={f.id} className="space-y-2 flex flex-col items-center w-full">
                <div className="text-center font-mono text-xs text-slate-400">{f.label}</div>
                <div
                  className={`w-auto max-w-full rounded-xl border border-slate-800 bg-slate-900/70 animate-pulse ${f.ratioClass}`}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!activeItem) {
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
        <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              Transforme uma foto comum em criativos altamente magnéticos
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-400">
              Envie sua imagem, conte do que ela se trata e como deseja o seu anúncio. Em segundos você recebe o mesmo criativo pronto nos 4 formatos oficiais, com método AIDA, zonas seguras de 12% e copy completa para subir direto nas campanhas.
            </p>
          </div>

          {/* Proportional 4-Size Chart */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0E131E] p-4 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-4 mb-6 sm:mb-8">
              <span className="font-display text-sm font-semibold text-white">
                Comparativo de entrega por criativo
              </span>
              <span className="font-mono text-[11px] sm:text-xs text-slate-400">
                PNG Alta Resolução · 1080px
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 items-end justify-items-center">
              {EMPTY_FORMAT_GUIDE.map((f) => (
                <div key={f.id} className="flex flex-col items-center w-full">
                  <span className="mb-2.5 text-xs font-semibold text-slate-200">{f.label}</span>
                  <div
                    className={`${f.ratioClass} w-auto max-w-full rounded-xl border ${
                      f.id === '9:16'
                        ? 'border-amber-400/60 bg-amber-400/5'
                        : 'border-slate-700 bg-slate-900/60'
                    } flex flex-col items-center justify-between p-3 text-center`}
                  >
                    {f.id === '9:16' && (
                      <span className="text-[10px] font-mono text-amber-300/80 border-b border-dashed border-amber-400/30 w-full pb-1">
                        12% livre topo
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-slate-400 my-auto tabular-nums">
                      {f.dims}
                    </span>
                    {f.id === '9:16' && (
                      <span className="text-[10px] font-mono text-amber-300/80 border-t border-dashed border-amber-400/30 w-full pt-1">
                        12% livre base
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-6 text-xs text-slate-400">
              <div>
                <p className="font-semibold text-slate-200">Preservação fiel da foto</p>
                <p className="mt-1 leading-relaxed">
                  Seu produto nunca é redesenhado nem distorcido — aparece reconhecível no centro da cena.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">AIDA em menos de 0,5s</p>
                <p className="mt-1 leading-relaxed">
                  Selo filtrador de comprador, headline stop-scroll, provas concretas e CTA de alto contraste.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">Kit de anúncio pronto</p>
                <p className="mt-1 leading-relaxed">
                  Cada ângulo acompanha Título, Botão (CTA) e Texto Principal congruentes para colar na campanha.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { blueprint, images } = activeItem;

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        {/* Top Context & Angle Switcher */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                <span className="truncate max-w-[180px] sm:max-w-none">{productAnalysis?.productName || 'Produto'}</span>
                <span aria-hidden="true">·</span>
                <span>4 formatos oficiais</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{items.length} ângulo(s)</span>
              </div>
              <h2 className="mt-1 font-display text-lg sm:text-xl font-bold text-white">
                {blueprint.angleLabel}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">{blueprint.strategicRationale}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-800 bg-[#0E131E] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid4')}
                  className={`flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'grid4'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  4 Tamanhos
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('inspect916')}
                  className={`flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === 'inspect916'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Inspecionar 9:16
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingCopy((v) => !v)}
                className={`inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isEditingCopy
                    ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar Copy no Criativo
              </button>
            </div>
          </div>

          {items.length > 1 && (
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1">
              {items.map((item, idx) => (
                <button
                  key={item.blueprint.id + idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`min-h-[40px] sm:min-h-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    idx === safeIndex
                      ? 'border-amber-400/80 bg-amber-400/10 text-amber-300'
                      : 'border-slate-800 bg-[#0E131E] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  0{idx + 1}. {item.blueprint.angleLabel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inline AIDA Live Editor */}
        {isEditingCopy && draftAida && (
          <div className="rounded-2xl border border-amber-400/30 bg-[#0E131E] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span>Ajuste fino do criativo (atualiza os 4 tamanhos)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCopy(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer sm:min-h-0 sm:min-w-0"
                aria-label="Fechar editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Selo Filtrador</label>
                <input
                  type="text"
                  value={draftAida.qualifierBadge}
                  onChange={(e) => setDraftAida({ ...draftAida, qualifierBadge: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Headline Linha 1 (Branco)</label>
                <input
                  type="text"
                  value={draftAida.headlineLine1}
                  onChange={(e) => setDraftAida({ ...draftAida, headlineLine1: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Headline Linha 2 (Destaque)</label>
                <input
                  type="text"
                  value={draftAida.headlineLine2}
                  onChange={(e) => setDraftAida({ ...draftAida, headlineLine2: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-amber-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={draftAida.subtitle}
                  onChange={(e) => setDraftAida({ ...draftAida, subtitle: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Botão CTA Visual</label>
                <input
                  type="text"
                  value={draftAida.ctaVisualText}
                  onChange={(e) => setDraftAida({ ...draftAida, ctaVisualText: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-emerald-300"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Preço Ancorado (Opcional)</label>
                <input
                  type="text"
                  value={draftAida.offerAnchor}
                  onChange={(e) => setDraftAida({ ...draftAida, offerAnchor: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Oferta Principal</label>
                <input
                  type="text"
                  value={draftAida.offerPrice}
                  onChange={(e) => setDraftAida({ ...draftAida, offerPrice: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Gatilho de Urgência</label>
                <input
                  type="text"
                  value={draftAida.urgencyTag}
                  onChange={(e) => setDraftAida({ ...draftAida, urgencyTag: e.target.value })}
                  className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveEditedAida}
                disabled={isReRendering}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer disabled:opacity-60"
              >
                {isReRendering ? 'Atualizando 4 formatos...' : 'Aplicar nos 4 Tamanhos'}
              </button>
            </div>
          </div>
        )}

        {/* Creative Visual Output */}
        {viewMode === 'grid4' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-end">
            {DISPLAY_FORMAT_ORDER.map((fmtId) => {
              const spec = FORMAT_SPECS[fmtId];
              const imgUrl = images[fmtId];
              const directUrl = blobUrls[fmtId];
              const filename = `${blueprint.angleKey}_${fmtId.replace(':', 'x')}.png`;

              const aspectClass =
                fmtId === '4:5'
                  ? 'aspect-[4/5]'
                  : fmtId === '3:4'
                  ? 'aspect-[3/4]'
                  : fmtId === '1:1'
                  ? 'aspect-square'
                  : 'aspect-[9/16]';

              return (
                <div key={fmtId} className="flex flex-col">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-white">{spec.label}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {spec.width}×{spec.height}
                    </span>
                  </div>

                  <div className={`relative w-full overflow-hidden rounded-xl bg-slate-950 ${aspectClass} group`}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={`${blueprint.angleLabel} no formato ${spec.label}`}
                        referrerPolicy="no-referrer"
                        onClick={() => setLightbox({ formatId: fmtId, url: imgUrl })}
                        className="h-full w-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                        Indisponível
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => imgUrl && setLightbox({ formatId: fmtId, url: imgUrl })}
                      aria-label={`Ampliar ${spec.label}`}
                      className="absolute right-2.5 top-2.5 flex min-h-[38px] min-w-[38px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg bg-slate-950/80 p-2 text-slate-200 opacity-90 sm:opacity-0 backdrop-blur-sm transition-opacity sm:group-hover:opacity-100 hover:text-white cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => imgUrl && onDownloadSingle(imgUrl, filename)}
                      disabled={!imgUrl}
                      className="flex-1 min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar
                    </button>

                    {directUrl ? (
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Link direto da imagem"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => imgUrl && setLightbox({ formatId: fmtId, url: imgUrl })}
                        className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 9:16 Safe Zone Inspector */
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 rounded-2xl border border-slate-800 bg-[#0E131E] p-4 sm:p-6">
            <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px] shrink-0 overflow-hidden rounded-2xl bg-slate-950 aspect-[9/16]">
              <img
                src={images['9:16']}
                alt="Inspeção Story 9:16"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              {showSafeZones && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[12%] border-b-2 border-dashed border-amber-400/90 bg-amber-500/15 flex items-center justify-center">
                    <span className="rounded bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                      Zona Segura Topo 12%
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[12%] border-t-2 border-dashed border-amber-400/90 bg-amber-500/15 flex items-center justify-center">
                    <span className="rounded bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                      Zona Segura Base 12%
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 space-y-5">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Auditoria Story 9:16 (Stories, Reels & TikTok)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Verifique se textos críticos e o botão CTA permanecem 100% dentro da área útil, sem sobreposição com foto de perfil no topo ou barra de legenda/ações na base dos aplicativos.
                </p>
              </div>

              <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSafeZones}
                  onChange={(e) => setShowSafeZones(e.target.checked)}
                  className="h-4 w-4 accent-amber-400 rounded"
                />
                Mostrar guias das Zonas Seguras (12% topo / 12% base)
              </label>

              {productAnalysis && (
                <div className="rounded-xl border border-slate-800 bg-[#090D16] p-4 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Preservação do Produto</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {productAnalysis.visualPreservationNotes}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  images['9:16'] &&
                  onDownloadSingle(images['9:16'], `${blueprint.angleKey}_9x16_story.png`)
                }
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Baixar Story 9:16 (1080×1920)
              </button>
            </div>
          </div>
        )}

        {/* Kit de Anúncio Complementar (Copy Pronta) */}
        <section className="rounded-2xl border border-slate-800 bg-[#0E131E] p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Kit de Anúncio Complementar — {blueprint.angleLabel}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Copy congruente com a promessa visual deste criativo para manter CTR alto e conversão na página.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copyText(
                  'kit-all',
                  `BOTÃO (CTA): ${blueprint.adKit.ctaButton}\nTÍTULO: ${blueprint.adKit.adHeadline}\n\nTEXTO PRINCIPAL:\n${blueprint.adKit.primaryText}`
                )
              }
              className="w-full sm:w-auto min-h-[42px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {copiedField === 'kit-all' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Kit Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Kit Completo</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800/90 bg-[#090D16] p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-400">
                  Botão Sugerido (CTA)
                </span>
                <p className="mt-1 text-sm font-bold text-emerald-400">
                  {blueprint.adKit.ctaButton}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('cta', blueprint.adKit.ctaButton)}
                className="rounded-lg border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                {copiedField === 'cta' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-[#090D16] p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[11px] font-medium text-slate-400">
                  Título (Headline)
                </span>
                <p className="mt-1 text-sm font-bold text-white truncate">
                  {blueprint.adKit.adHeadline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('headline', blueprint.adKit.adHeadline)}
                className="rounded-lg border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                {copiedField === 'headline' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#090D16] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Texto Principal do Anúncio</span>
              <button
                type="button"
                onClick={() => copyText('primary', blueprint.adKit.primaryText)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                {copiedField === 'primary' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-200">
              {blueprint.adKit.primaryText}
            </p>
          </div>
        </section>
      </div>

      {/* HD Lightbox Modal */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[92dvh] w-full max-w-3xl flex flex-col items-center gap-3 sm:gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap w-full items-center justify-between gap-2 text-xs text-slate-300">
              <span className="font-semibold">
                {FORMAT_SPECS[lightbox.formatId].label} ({FORMAT_SPECS[lightbox.formatId].width}×
                {FORMAT_SPECS[lightbox.formatId].height})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onDownloadSingle(
                      lightbox.url,
                      `${blueprint.angleKey}_${lightbox.formatId.replace(':', 'x')}.png`
                    )
                  }
                  className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar PNG
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="flex min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-lg bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  aria-label="Fechar visualização"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <img
              src={lightbox.url}
              alt="Visualização em alta definição"
              referrerPolicy="no-referrer"
              className="max-h-[78dvh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
