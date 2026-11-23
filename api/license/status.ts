import { getLicenseFromVercelReq } from '../_lib/core';

export default function handler(req: any, res: any) {
  return res.status(200).json(getLicenseFromVercelReq(req));
}
