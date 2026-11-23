import { useEffect, useState } from 'react';
import { AlertTriangle, Check, KeyRound, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LicenseStatus } from '@/src/types/creative';

export interface PlayfulMessage {
  greeting: string;
  body: string[];
  ctaHint: string;
}

const PLAYFUL_MESSAGES: PlayfulMessage[] = [
  {
    greeting: 'Opa, querido(a)! 👀',
    body: [
      'Você achou que tudo aqui seria de graça para sempre? KKKK',
      'Manter esse sistema no ar também custa, viu?!',
    ],
    ctaHint: 'Então bora colaborar! Escolha seu plano e garanta seu acesso! 🔑',
  },
  {
    greeting: 'Olá, meu consagrado(a)! 😂',
    body: [
      'Aqui a ferramenta trabalha, entrega resultado e não vive de vento, né?!',
      'Para manter tudo funcionando a todo vapor, precisamos liberar sua chave.',
    ],
    ctaHint: 'Bora garantir mais dias de criativos magnéticos? 🔥',
  },
  {
    greeting: 'E aí, querido(a)! Tudo na paz? 😏',
    body: [
      'O sistema é bom, funciona e facilita sua vida... mas pagar os boletos ele ainda não consegue!',
      'Ajude a manter tudo no ar e continue anunciando sem limites.',
    ],
    ctaHint: 'Escolha seu plano abaixo e peça sua chave agora! 🚀',
  },
  {
    greeting: 'Olá, querido(a)! ❤️',
    body: [
      'A ferramenta é maravilhosa, eu sei... mas infelizmente ainda não aceita pagamento em elogios!',
      'Para continuarmos gerando anúncios que vendem de verdade, bora ativar seu plano.',
    ],
    ctaHint: 'Qual pacote combina mais com a sua operação hoje? 🔐',
  },
  {
    greeting: 'Ei, chefe! Calma lá! 😎',
    body: [
      'Seu primeiro teste já mostrou o poder dos criativos magnéticos, né?',
      'Agora o servidor pediu um café reforçado pra continuar trabalhando pra você!',
    ],
    ctaHint: 'Escolha um plano rapidinho e destrave novas gerações! ⚡',
  },
];

interface PlanOption {
  id: '30d' | '90d' | '120d';
  durationLabel: string;
  price: string;
  perDay: string;
  badge?: string;
  perks: string[];
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: '30d',
    durationLabel: '30 Dias',
    price: 'R$ 9,99',
    perDay: 'Até 3 ângulos / clique',
    perks: ['Gerações ilimitadas por 30 dias', '4 formatos oficiais (9:16 a 1:1)', 'Kit de copy AIDA completo'],
  },
  {
    id: '90d',
    durationLabel: '90 Dias',
    price: 'R$ 29,99',
    perDay: 'Até 5 ângulos / clique',
    badge: 'Mais Popular',
    perks: ['Acesso contínuo por 3 meses', 'Desbloqueia 5 ângulos juntos', 'Exportação em lote (.ZIP)'],
  },
  {
    id: '120d',
    durationLabel: '120 Dias',
    price: 'R$ 59,99',
    perDay: 'Até 10 ângulos / clique',
    badge: 'Máximo Poder',
    perks: ['4 meses de estúdio completo', 'Desbloqueia 10 ângulos juntos', 'Editor ao vivo + Zonas Seguras'],
  },
];

const WHATSAPP_NUMBER = '5541998221261';

function buildWhatsAppUrl(plan: PlanOption, isRenewal: boolean): string {
  const action = isRenewal ? 'renovar a chave do' : 'a chave para usar o';
  const message = `Olá! Quero ${action} plano de ${plan.durationLabel} (${plan.price}) no Criativo Magnético.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export type PaywallModalMode = 'paywall' | 'expiring' | 'activate';

interface PaywallModalProps {
  isOpen: boolean;
  mode: PaywallModalMode;
  license: LicenseStatus;
  messageIndex: number;
  onRotateMessage: () => void;
  onActivateKey: (rawKey: string) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}

export function PaywallModal({
  isOpen,
  mode,
  license,
  messageIndex,
  onRotateMessage,
  onActivateKey,
  onClose,
}: PaywallModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<'30d' | '90d' | '120d'>('90d');
  const [showKeyInput, setShowKeyInput] = useState(mode === 'activate');
  const [accessCode, setAccessCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setShowKeyInput(mode === 'activate');
      setFeedback(null);
    }
  }, [isOpen, mode]);

  const msg = PLAYFUL_MESSAGES[messageIndex % PLAYFUL_MESSAGES.length];
  const selectedPlan = PLAN_OPTIONS.find((p) => p.id === selectedPlanId) ?? PLAN_OPTIONS[1];
  const isExpiringMode = mode === 'expiring';

  const handleValidateCode = async () => {
    if (!accessCode.trim()) {
      setFeedback({ type: 'error', text: 'Digite sua chave de acesso para validar.' });
      return;
    }
    setIsValidating(true);
    setFeedback(null);
    try {
      const res = await onActivateKey(accessCode.trim());
      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
        setAccessCode('');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0E131E] shadow-2xl"
          >
            {/* Top Header */}
            <div
              className={`flex shrink-0 items-start justify-between gap-3 sm:gap-4 border-b px-4 py-4 sm:px-6 sm:py-5 ${
                isExpiringMode
                  ? 'border-amber-500/40 bg-amber-950/30'
                  : 'border-slate-800 bg-[#121826]'
              }`}
            >
              {isExpiringMode ? (
                <div className="flex items-start gap-3 space-y-0 pr-2 min-w-0 flex-1">
                  <img
                    src="/brand-icon.png"
                    alt="Criativos Magnéticos"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-1 ring-amber-500/40 shadow-md shadow-amber-500/20 shrink-0"
                  />
                  <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-amber-300">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <h2 id="paywall-title" className="font-display text-lg sm:text-xl font-extrabold truncate">
                        {license.isExpired
                          ? 'Seu plano venceu!'
                          : 'Está vencendo seu plano!!'}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                      {license.isExpired
                        ? `O acesso do seu ${license.planLabel} encerrou. Renove agora pelo WhatsApp para continuar gerando seus criativos sem interrupções.`
                        : `Faltam apenas ${license.daysRemaining} dia(s) para vencer o seu ${license.planLabel}. Garanta a renovação agora e não perca o ritmo das suas campanhas!`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 space-y-0 pr-1 min-w-0 flex-1">
                  <img
                    src="/brand-icon.png"
                    alt="Criativos Magnéticos"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-1 ring-emerald-500/40 shadow-md shadow-emerald-500/20 shrink-0"
                  />
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h2 id="paywall-title" className="font-display text-lg sm:text-xl font-extrabold text-amber-300">
                        {msg.greeting}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback(null);
                          onRotateMessage();
                        }}
                        title="Ver outra mensagem"
                        className="inline-flex min-h-[36px] sm:min-h-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Outra frase
                      </button>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm leading-relaxed text-slate-200">
                      {msg.body.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                      <p className="pt-1 font-semibold text-emerald-400">{msg.ctaHint}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar janela"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shrink-0 -mr-1.5 -mt-1.5 sm:mr-0 sm:mt-0 sm:min-h-0 sm:min-w-0 sm:p-1.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body: 3 Offer Cards -> direct WhatsApp links */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
                {PLAN_OPTIONS.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <a
                      key={plan.id}
                      href={buildWhatsAppUrl(plan, isExpiringMode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setFeedback({
                          type: 'info',
                          text: `Abrindo WhatsApp (41) 99822-1261 para solicitar a chave do plano de ${plan.durationLabel} (${plan.price}).`,
                        });
                      }}
                      className={`relative flex flex-col justify-between rounded-xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50'
                          : 'border-slate-800 bg-[#090D16] hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-white">
                            {plan.durationLabel}
                          </span>
                          {plan.badge && (
                            <span className="text-[10px] font-bold text-amber-300">
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 sm:mt-2.5 flex items-baseline justify-between sm:block gap-2">
                          <span className="font-display text-2xl font-extrabold text-white tabular-nums">
                            {plan.price}
                          </span>
                          <span className="block font-mono text-[11px] text-slate-400 tabular-nums">
                            {plan.perDay}
                          </span>
                        </div>

                        <ul className="mt-3 sm:mt-3.5 space-y-1.5 border-t border-slate-800/90 pt-2.5 sm:pt-3">
                          {plan.perks.map((perk) => (
                            <li key={perk} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </a>
                  );
                })}
              </div>

              {feedback && (
                <div
                  className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${
                    feedback.type === 'error'
                      ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
                      : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* Primary CTA -> WhatsApp + Access Code Activation */}
              <div className="space-y-3 pt-1">
                <a
                  href={buildWhatsAppUrl(selectedPlan, isExpiringMode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    setFeedback({
                      type: 'info',
                      text: `Abrindo WhatsApp (41) 99822-1261 para solicitar a chave do plano de ${selectedPlan.durationLabel} (${selectedPlan.price}).`,
                    })
                  }
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-center text-xs sm:text-sm font-extrabold leading-snug text-slate-950 transition-colors hover:bg-emerald-400 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    {isExpiringMode ? 'Renovar' : 'Pedir chave de'} {selectedPlan.durationLabel} (
                    {selectedPlan.price}) no WhatsApp
                  </span>
                </a>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowKeyInput((v) => !v)}
                    className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <span>Já tenho uma chave de acesso</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] sm:min-h-0 px-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {showKeyInput && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleValidateCode();
                        }
                      }}
                      placeholder="Cole sua chave (ex: CM30-XXXX-XXXX)"
                      className="min-h-[44px] flex-1 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-base sm:text-xs font-mono uppercase text-slate-100 placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleValidateCode}
                      disabled={isValidating}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {isValidating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Ativar Plano</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
