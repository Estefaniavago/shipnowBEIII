import crypto from 'node:crypto';

export const generateTrackingCode = () => `SN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
