/**
 * MEDiKIOSK Backend — Phase 01: Health Controller
 * Implements authoritative health checking and service diagnostics.
 */

import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { getDatabaseStatus } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

export interface HealthCheckData {
  service: string;
  status: 'healthy' | 'degraded';
  version: string;
  environment: string;
  uptimeSeconds: number;
  database: {
    status: string;
    host: string | null;
  };
}

export function getHealth(req: Request, res: Response): void {
  const dbStatus = getDatabaseStatus();
  const isHealthy = dbStatus.status === 'connected' || config.NODE_ENV === 'development';

  const data: HealthCheckData = {
    service: 'MEDiKIOSK Backend',
    status: isHealthy ? 'healthy' : 'degraded',
    version: '0.1.0',
    environment: config.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus.status,
      host: dbStatus.host
    }
  };

  sendSuccess(res, data, 'MEDiKIOSK backend service is operational.');
}
