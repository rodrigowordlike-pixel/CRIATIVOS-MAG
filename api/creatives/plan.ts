import {
  ANGLE_CATALOG,
  DEFAULT_ANGLES_BY_COUNT,
  generatePlanWithGeminiOrSmartFallback,
  getLicenseFromVercelReq,
  parseDataUrl,
  VALID_COUNTS,
} from '../_lib/core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errorCode: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { imageDataUrl, briefing, count, singleAngle } = body ?? {};
    const parsedImage = parseDataUrl(imageDataUrl);
    if (!parsedImage) {
      return res.status(400).json({
        errorCode: 'INVALID_IMAGE',
        message: 'Envie uma imagem válida em formato PNG, JPG ou WEBP.',
      });
    }

    if (typeof briefing !== 'string' || briefing.trim().length < 10 || briefing.trim().length > 2500) {
      return res.status(400).json({
        errorCode: 'INVALID_BRIEFING',
        message: 'Descreva o uso, público, dor e oferta com pelo menos 10 caracteres.',
      });
    }

    const requestedCount = Number(count);
    if (!VALID_COUNTS.has(requestedCount)) {
      return res.status(400).json({
        errorCode: 'INVALID_COUNT',
        message: 'Quantidade inválida. Escolha 1, 3, 5 ou 10 criativos.',
      });
    }

    const license = getLicenseFromVercelReq(req);
    if (requestedCount > license.maxAngles) {
      return res.status(403).json({
        errorCode: 'PLAN_UPGRADE_REQUIRED',
        message: `Seu plano atual permite até ${license.maxAngles} ângulos por geração.`,
      });
    }

    const selectedAngles =
      requestedCount === 1
        ? [typeof singleAngle === 'string' && ANGLE_CATALOG[singleAngle] ? singleAngle : 'dor']
        : DEFAULT_ANGLES_BY_COUNT[requestedCount];

    const plan = await generatePlanWithGeminiOrSmartFallback({
      parsedImage,
      briefing,
      selectedAngles,
    });

    return res.status(200).json(plan);
  } catch {
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Erro ao processar geração.',
    });
  }
}
