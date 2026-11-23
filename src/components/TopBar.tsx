import { Download, Plus } from 'lucide-react';

interface TopBarProps {
  hasResults: boolean;
  isExportingZip: boolean;
  onDownloadAllZip: () => void;
  onStartNew: () => void;
}

export function TopBar({
  hasResults,
  isExportingZip,
  onDownloadAllZip,
  onStartNew,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B0F17]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-8 px-6">
        {/* Zone 1: Single-element wordmark */}
        <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          Criativo Magnético
        </span>

        {/* Zone 2: Clean single-line studio section links */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium" aria-label="Navegação principal">
          <button
            type="button"
            onClick={onStartNew}
            className="whitespace-nowrap shrink-0 py-1 text-white border-b-2 border-amber-400 cursor-pointer"
          >
            Estúdio
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          {hasResults ? (
            <button
              type="button"
              onClick={onDownloadAllZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {isExportingZip ? 'Compactando...' : 'Baixar Tudo (.ZIP)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Novo Criativo
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
