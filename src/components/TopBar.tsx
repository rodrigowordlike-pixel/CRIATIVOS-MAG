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
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6">
        {/* Brand Lockup: 3D Magnetic App Icon + Name */}
        <button
          type="button"
          onClick={onStartNew}
          className="flex items-center gap-2.5 sm:gap-3 text-left transition-opacity hover:opacity-95 cursor-pointer min-w-0 group"
          title="Criativos Magnéticos 9:16 - Início"
        >
          <div className="relative shrink-0">
            <img
              src="/brand-icon.png"
              alt="Ícone Criativos Magnéticos"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover ring-1 ring-emerald-500/40 shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap truncate">
                Criativos Magnéticos
              </span>
              <span className="hidden sm:inline-block rounded bg-gradient-to-r from-amber-400/20 to-emerald-400/20 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tracking-wider">
                9:16 PRO
              </span>
            </div>
            <span className="hidden md:block text-[10px] text-slate-400 font-medium truncate">
              Anúncios Verticais de Alta Conversão
            </span>
          </div>
        </button>

        {/* Center / Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium" aria-label="Navegação principal">
          <button
            type="button"
            onClick={onStartNew}
            className="whitespace-nowrap shrink-0 py-1 text-white border-b-2 border-amber-400 cursor-pointer"
          >
            Estúdio de Criação
          </button>
        </nav>

        {/* Right Action: Download or New Creative */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {hasResults ? (
            <button
              type="button"
              onClick={onDownloadAllZip}
              disabled={isExportingZip}
              className="inline-flex min-h-[38px] sm:min-h-0 items-center gap-1.5 sm:gap-2 rounded-lg bg-emerald-500 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-emerald-500/30"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">{isExportingZip ? 'Gerando...' : 'Baixar .ZIP'}</span>
              <span className="hidden sm:inline">
                {isExportingZip ? 'Compactando...' : 'Baixar Tudo (.ZIP)'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex min-h-[38px] sm:min-h-0 items-center gap-1.5 sm:gap-2 rounded-lg bg-slate-100 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Novo</span>
              <span className="hidden sm:inline">Novo Criativo</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
