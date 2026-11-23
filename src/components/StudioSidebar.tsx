import React, { useRef, useState } from 'react';
import { ImagePlus, KeyRound, Loader2, Lock, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { ANGLE_OPTIONS, AngleKey, GenerationCount, LicenseStatus } from '@/src/types/creative';
import { normalizeReferenceImage } from '@/src/lib/studioRenderer';

interface StudioSidebarProps {
  referenceImage: string | null;
  referenceMeta: { name: string; dimensions: string } | null;
  onImageSelected: (dataUrl: string, name: string, dimensions: string) => void;
  onClearImage: () => void;
  briefing: string;
  onBriefingChange: (val: string) => void;
  count: GenerationCount;
  onCountChange: (count: GenerationCount) => void;
  singleAngle: AngleKey;
  onSingleAngleChange: (angle: AngleKey) => void;
  license: LicenseStatus;
  isGenerating: boolean;
  progressText: string;
  errorMsg: string | null;
  onUpgradeClick: () => void;
  onOpenKeyModal: () => void;
  onSubmit: () => void;
}

const BRIEFING_PRESETS = [
  {
    label: 'Criativos Magnéticos (Meta)',
    text: 'A imagem é a logo do sistema Criativos Magnéticos. Crie anúncios verticais de alto impacto para Meta Ads (Instagram/Facebook) focados na dor de quem gasta dinheiro com anúncios amadores que não convertem. Destaque que agora é muito mais fácil que nunca gerar anúncios nos 4 formatos com copy AIDA validada em segundos. Oferta a partir de R$ 9,99 com garantia total. Ação: tocar em Saiba Mais.',
  },
  {
    label: 'Produto Físico',
    text: 'A imagem mostra um Sérum Capilar Reparador 60ml. Quero um criativo sofisticado e direto ao ponto para Instagram Stories, Reels e Feed. Público: mulheres 25-45 anos que sofrem com queda de cabelo. Oferta: de R$ 189,90 por R$ 119,90 hoje com frete grátis e garantia de 30 dias. Ação: tocar em Saiba Mais para comprar.',
  },
  {
    label: 'Infoproduto / Método',
    text: 'A imagem é a capa do Método Tráfego Local em 14 Dias. Desejo um criativo de impacto forte para Reels e TikTok Ads, focado em donos de negócios locais que querem agenda lotada sem depender de indicação. Oferta: 12x de R$ 29,70 com acesso imediato e garantia de 7 dias. Ação: clicar em Saiba Mais.',
  },
  {
    label: 'Serviço / Clínica',
    text: 'A foto mostra atendimento odontológico estético. Quero um criativo que passe muita confiança e limpeza para Instagram Stories e Feed 4:5 (público local). Dor: medo de sensibilidade ao clarear os dentes. Oferta: Avaliação + Clareamento a Laser por R$ 490 nesta semana. Ação: enviar mensagem para agendar.',
  },
];

const COUNT_OPTIONS: { value: GenerationCount; label: string }[] = [
  { value: 1, label: '1 Focado' },
  { value: 3, label: '3 Ângulos' },
  { value: 5, label: '5 Ângulos' },
  { value: 10, label: '10 Ângulos' },
];

export function StudioSidebar({
  referenceImage,
  referenceMeta,
  onImageSelected,
  onClearImage,
  briefing,
  onBriefingChange,
  count,
  onCountChange,
  singleAngle,
  onSingleAngleChange,
  license,
  isGenerating,
  progressText,
  errorMsg,
  onUpgradeClick,
  onOpenKeyModal,
  onSubmit,
}: StudioSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setUploadError(null);
    if (file.type && !file.type.startsWith('image/')) {
      setUploadError('Formato inválido. Selecione uma imagem (PNG, JPG ou WEBP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Imagem muito grande. Máximo permitido: 25 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result);
        const normalized = await normalizeReferenceImage(dataUrl);
        onImageSelected(normalized.dataUrl, file.name, normalized.dimensions);
      } catch {
        setUploadError('Não foi possível abrir esta foto. Tente outra imagem JPG ou PNG.');
      }
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const canSubmit = Boolean(referenceImage) && briefing.trim().length >= 10 && !isGenerating;

  return (
    <aside className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/90 bg-[#0E131E] p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
      <div className="flex items-start gap-3">
        <img
          src="/brand-icon.png"
          alt="Criativos Magnéticos"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover ring-1 ring-emerald-500/40 shadow-md shadow-emerald-500/20 shrink-0 mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white truncate">
              Criativos Magnéticos
            </h1>
            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              9:16
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            Transforme qualquer foto em anúncios verticais de alta conversão nos 4 formatos do Instagram com copy AIDA pronta.
          </p>
        </div>
      </div>

      {/* 1. Reference Image Upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200">
            1. Imagem de referência (obrigatório)
          </label>
          {referenceMeta && (
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {referenceMeta.dimensions}
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {referenceImage ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-[#090D16] p-3">
            <div className="flex items-center gap-3">
              <img
                src={referenceImage}
                alt="Produto de referência enviado"
                referrerPolicy="no-referrer"
                className="h-20 w-20 rounded-lg object-cover border border-slate-800 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-100">
                  {referenceMeta?.name ?? 'imagem-referencia'}
                </p>
                <p className="mt-1 text-[11px] text-emerald-400">
                  Produto preservado sem distorções
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[40px] sm:min-h-0 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs sm:text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Trocar foto
                  </button>
                  <button
                    type="button"
                    onClick={onClearImage}
                    aria-label="Remover imagem"
                    className="inline-flex min-h-[40px] sm:min-h-0 items-center gap-1 rounded-md border border-slate-800 px-3 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-amber-400 bg-amber-400/5'
                : 'border-slate-700 bg-[#090D16]/70 hover:border-slate-500'
            }`}
          >
            <UploadCloud className="h-7 w-7 text-slate-400 mb-2.5" />
            <p className="text-xs font-semibold text-slate-200">
              Arraste a foto ou capa do produto aqui
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Ou clique para selecionar · PNG, JPG ou WEBP
            </p>
          </div>
        )}

        {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
      </div>

      {/* 2. Sobre a imagem e como deseja */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="briefing-input" className="text-xs font-semibold text-slate-200">
            2. Do que se trata a imagem e como deseja que seja
          </label>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            {briefing.length}/2500
          </span>
        </div>

        <textarea
          id="briefing-input"
          rows={4}
          maxLength={2500}
          value={briefing}
          onChange={(e) => onBriefingChange(e.target.value)}
          placeholder="Conte do que se trata a imagem enviada, como deseja que o criativo fique (estilo, clima, cores), quem é o público, qual a dor, preço/oferta e a ação esperada ao clicar."
          className="w-full rounded-xl border border-slate-700/90 bg-[#090D16] px-3.5 py-3 sm:py-2.5 text-base sm:text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-slate-500 mr-1">Exemplos:</span>
          {BRIEFING_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onBriefingChange(preset.text)}
              className="min-h-[38px] sm:min-h-0 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Modo / Quantidade (Unlocked dynamically per plan) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-200">
            3. Quantidade de ângulos
          </label>
          <button
            type="button"
            onClick={onOpenKeyModal}
            className={`inline-flex min-h-[38px] sm:min-h-0 items-center gap-1 px-2 -mr-2 sm:px-0 sm:mr-0 text-xs sm:text-[11px] font-medium cursor-pointer ${
              license.active
                ? license.isExpiringSoon
                  ? 'text-amber-300 hover:text-amber-200'
                  : 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            {license.active ? (
              <span>
                {license.isLifetime || license.planId === 'lifetime'
                  ? 'Acesso Vitalício'
                  : `${license.planLabel} · ${license.daysRemaining}d`}
              </span>
            ) : (
              <span>Ativar chave</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-1 rounded-lg bg-[#090D16] p-1 border border-slate-800">
          {COUNT_OPTIONS.map((opt) => {
            const isLocked = opt.value > license.maxAngles;
            const isActive = count === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    onUpgradeClick();
                    return;
                  }
                  onCountChange(opt.value);
                }}
                className={`inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1 rounded-md py-2 text-xs sm:text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isLocked
                    ? 'text-slate-500 hover:text-slate-300'
                    : isActive
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isLocked && <Lock className="h-3 w-3 text-amber-400/70 shrink-0" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {count === 1 ? (
          <div className="space-y-1.5">
            <label htmlFor="single-angle-select" className="block text-[11px] text-slate-400">
              Ângulo persuasivo focado:
            </label>
            <select
              id="single-angle-select"
              value={singleAngle}
              onChange={(e) => onSingleAngleChange(e.target.value as AngleKey)}
              className="min-h-[44px] sm:min-h-0 w-full rounded-lg border border-slate-700/80 bg-[#090D16] px-3 py-2 text-base sm:text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
            >
              {ANGLE_OPTIONS.map((ang) => (
                <option key={ang.key} value={ang.key}>
                  {ang.label} — {ang.focus}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-400">
            Esteira automática com {count} ângulos distintos para teste rápido com copy AIDA completa.
          </p>
        )}
      </div>

      {/* Objetivo Fixo */}
      <div className="border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <span>Objetivo fixo:</span>
        <span className="font-medium text-slate-200 text-right">
          CTR qualificado · Filtro de comprador
        </span>
      </div>

      {/* Error Display */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs leading-relaxed text-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Primary Generate CTA */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-auto inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Criando seus anúncios...</span>
          </>
        ) : (
          <>
            {referenceImage ? <Sparkles className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
            <span>
              Gerar {count === 1 ? '1 Criativo' : `${count} Ângulos`} em 4 Tamanhos
            </span>
          </>
        )}
      </button>
    </aside>
  );
}
