import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError.js';

type Bucket = { windowStarted: number; count: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip}`;
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStarted >= options.windowMs) {
      if (buckets.size >= 10000) {
        for (const [bucketKey, value] of buckets) if (now - value.windowStarted >= options.windowMs) buckets.delete(bucketKey);
      }
      if (!buckets.has(key) && buckets.size >= 10000) { next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMITED')); return; }
      bucket = { windowStarted: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((options.windowMs - (now - bucket.windowStarted)) / 1000))));
      next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'));
      return;
    }
    next();
  };
}
