/**
 * MEDiKIOSK Backend — Foundation 03: AI Diagnostics Controller
 * Provides non-clinical AI health checks and connectivity diagnostics.
 * Never exposes API keys, internal objects, or sensitive tokens.
 */

import { Request, Response } from 'express';
// DEMO MODE: OpenRouter is the only active AI provider
// Gemini import kept for future restoration but NOT used in the live runtime path
import { geminiService } from '../services/gemini.service.js';
import { openRouterService } from '../services/openrouter.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getAiHealth(req: Request, res: Response): Promise<void> {
  const provider = (req.query.provider as string || 'gemini').toLowerCase();
  const testClinical = req.query.testClinical === 'true' || req.query.clinical === 'true';

  if (provider === 'openrouter') {
    if (testClinical) {
      try {
        const clinicalResult = await openRouterService.testMinimalClinicalRequest();
        sendSuccess(
          res,
          {
            status: 'healthy',
            provider: 'openrouter',
            model: clinicalResult.model,
            connected: true,
            clinicalTestPassed: true,
            extractedData: clinicalResult.extractedData
          },
          'OpenRouter AI service clinical test succeeded.'
        );
        return;
      } catch (err: any) {
        sendError(
          res,
          'OPENROUTER_CLINICAL_TEST_FAILED',
          err.message || 'OpenRouter clinical test failed.',
          502,
          {
            status: 'unhealthy',
            provider: 'openrouter',
            model: openRouterService.getModel(),
            connected: false,
            clinicalTestPassed: false
          }
        );
        return;
      }
    }

    const result = await openRouterService.verifyConnectivity();
    if (result.connected) {
      sendSuccess(
        res,
        {
          status: 'healthy',
          provider: 'openrouter',
          model: result.model,
          connected: true
        },
        'OpenRouter AI service is operational.'
      );
    } else {
      sendError(
        res,
        'OPENROUTER_UNAVAILABLE',
        result.error || 'OpenRouter AI service is not operational.',
        503,
        {
          status: 'unhealthy',
          provider: 'openrouter',
          model: result.model,
          connected: false
        }
      );
    }
    return;
  }

  // [DEMO MODE] Default: OpenRouter is the only live AI provider. Gemini health check disabled.
  const result = await openRouterService.verifyConnectivity();

  if (result.connected) {
    sendSuccess(
      res,
      {
        status: 'healthy',
        provider: 'openrouter',
        model: result.model,
        connected: true
      },
      'OpenRouter AI service is operational (Demo Mode — Primary Provider).'
    );
  } else {
    sendError(
      res,
      'OPENROUTER_UNAVAILABLE',
      result.error || 'OpenRouter AI service is not operational.',
      503,
      {
        status: 'unhealthy',
        provider: 'openrouter',
        model: result.model,
        connected: false
      }
    );
  }
}
