import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError.js';

type Bucket = { windowStarted: number; count: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now(); const key = `${options.keyPrefix}:${req.ip}:${req.path}`; const current = buckets.get(key);
    const bucket = !current || now - current.windowStarted >= options.windowMs ? { windowStarted: now, count: 0 } : current;
    bucket.count += 1; buckets.set(key, bucket);
    if (buckets.size > 10000) for (const [bucketKey, value] of buckets) if (now - value.windowStarted >= options.windowMs) buckets.delete(bucketKey);
    if (bucket.count > options.max) { next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMITED')); return; }
    next();
  };
}
