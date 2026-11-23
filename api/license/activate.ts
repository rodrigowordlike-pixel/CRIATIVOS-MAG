import crypto from 'crypto';
import {
  DAY_MS,
  EXPIRING_SOON_DAYS,
  getHeader,
  LICENSE_COOKIE_NAME,
  LICENSE_HASH_CATALOG,
  signStatelessToken,
} from '../_lib/core';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errorCode: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' });
  }

  if (getHeader(req, 'x-requested-with') !== 'XMLHttpRequest') {
    return res.status(403).json({ errorCode: 'FORBIDDEN_CSRF', message: 'Requisição inválida.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const rawKey = body?.key;
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

  const now = Date.now();
  const isLifetime = spec.durationDays === null;
  const expiresAt = isLifetime ? null : now + (spec.durationDays as number) * DAY_MS;
  const msLeft = isLifetime ? 3650 * DAY_MS : (expiresAt as number) - now;
  const daysRemaining = isLifetime ? 9999 : Math.max(1, Math.ceil(msLeft / DAY_MS));
  const isExpiringSoon = !isLifetime && daysRemaining <= EXPIRING_SOON_DAYS;
  const token = signStatelessToken(keyHash, now, expiresAt);

  res.setHeader(
    'Set-Cookie',
    `${LICENSE_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${Math.floor(msLeft / 1000)}; SameSite=None; Secure; Partitioned`
  );

  return res.status(200).json({
    active: true,
    planId: spec.planId,
    planLabel: spec.planLabel,
    maxAngles: spec.maxAngles,
    activatedAt: now,
    expiresAt,
    daysRemaining,
    isExpiringSoon,
    isExpired: false,
    isLifetime,
    token,
  });
}
