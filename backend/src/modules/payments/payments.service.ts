/**
 * Stripe integration — ARCHITECTURE IN PLACE, IMPLEMENTATION STUBBED.
 *
 * Production flow (documented for the real implementation):
 *  1. On booking, create a Stripe PaymentIntent (amount = totalCents,
 *     capture_method: 'manual' so funds are only captured once the
 *     technician confirms / the appointment completes).
 *  2. Store paymentIntentId on the Payment row (already modelled).
 *  3. Client confirms the PaymentIntent with Stripe.js Elements.
 *  4. Webhook (payment_intent.succeeded / .payment_failed) transitions
 *     Payment.status; on cancellation within policy, refund via the API.
 *  5. Payouts to technicians via Stripe Connect Express accounts, with the
 *     platform fee (PlatformSetting.platformFeePercent) as application_fee.
 */
import { PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export const paymentsService = {
  /** Placeholder: returns a fake intent. Swap with stripe.paymentIntents.create. */
  async createIntentData(amountCents: number): Promise<Prisma.PaymentCreateWithoutAppointmentInput> {
    return {
      amountCents,
      currency: 'usd',
      status: PaymentStatus.REQUIRES_PAYMENT,
      stripePaymentIntentId: `pi_placeholder_${Math.random().toString(36).slice(2, 12)}`,
    };
  },

  /** Placeholder "payment succeeded" transition (called by the stub checkout). */
  markPaid(): { status: PaymentStatus } {
    return { status: PaymentStatus.PAID };
  },

  /** Placeholder refund. */
  markRefunded(): { status: PaymentStatus } {
    return { status: PaymentStatus.REFUNDED };
  },
};
