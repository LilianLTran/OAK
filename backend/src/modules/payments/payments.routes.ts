import { Router, raw } from 'express';
import { asyncHandler } from '../../utils/errors';
import { logger } from '../../lib/logger';

export const paymentRoutes = Router();

/**
 * Stripe webhook endpoint (stub). In production:
 *   const event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret)
 * and handle payment_intent.succeeded / payment_intent.payment_failed /
 * charge.refunded by updating the Payment row.
 */
paymentRoutes.post(
  '/webhook',
  raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    logger.info('Stripe webhook received (stub)', { length: req.body?.length });
    res.json({ received: true });
  })
);
