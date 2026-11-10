export type ChargeInput = {
  donationId: string;
  donorId: string;
  amountGbp: number;
  currency: 'GBP';
};

export type ChargeResult =
  | { ok: true; providerReference: string }
  | { ok: false; errorCode: string; errorMessage: string };

/**
 * Boundary for a real PSP (Stripe, GoCardless, etc.). The simulator implements this contract.
 */
export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

function randomRef(): string {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Simulates network/issuer failures. Tune with PAYMENT_SIMULATED_FAILURE_RATE (0–1).
 * Replace with HTTP client to your PSP without changing donation state logic.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  constructor(private readonly failureRate: number) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.amountGbp <= 0 || Number.isNaN(input.amountGbp)) {
      return {
        ok: false,
        errorCode: 'invalid_amount',
        errorMessage: 'Amount must be positive',
      };
    }

    await new Promise((r) => setTimeout(r, 10 + Math.floor(Math.random() * 40)));

    if (Math.random() < this.failureRate) {
      const transient = Math.random() < 0.85;
      return {
        ok: false,
        errorCode: transient ? 'issuer_timeout' : 'card_declined',
        errorMessage: transient
          ? 'Simulated timeout from payment network'
          : 'Simulated hard decline',
      };
    }

    return { ok: true, providerReference: randomRef() };
  }
}

export function createPaymentProviderFromEnv(): PaymentProvider {
  const raw = process.env.PAYMENT_SIMULATED_FAILURE_RATE;
  const rate = raw === undefined ? 0.1 : Math.min(1, Math.max(0, Number(raw)));
  if (Number.isNaN(rate)) {
    return new SimulatedPaymentProvider(0.1);
  }
  return new SimulatedPaymentProvider(rate);
}
