import { Prisma } from "@prisma/client";
import { Money, money } from "../../common/money";

/**
 * Ch56: fare calculation is a pure function of (distance, base rate, surge
 * multiplier, promotions) — fully unit-testable, fully reproducible for
 * audit/dispute purposes. Ch8: base fare, distance component, and surge
 * multiplier must each be individually visible to the user before
 * confirmation — never collapsed into one opaque number — and promotions are
 * a separate ledger line, never silently baked into the base fare. See ADR 0012.
 */
export interface FareInputs {
  distanceKm: Money;
  baseFare: Money;
  perKmRate: Money;
  /** 1.00 = no surge. Must not exceed maxSurgeMultiplier. */
  surgeMultiplier: Money;
  /** Ch8 — surge must be capped and explainable, never opaque. */
  maxSurgeMultiplier: Money;
  /** Absolute amount, not a percentage — see Ch8's "separate ledger line" rule. */
  promotionDiscount: Money;
}

export interface FareBreakdown {
  baseFare: Money;
  distanceComponent: Money;
  surgeMultiplier: Money;
  /** (baseFare + distanceComponent) * surgeMultiplier, before promotions. */
  subtotal: Money;
  promotionDiscount: Money;
  /** subtotal - promotionDiscount, floored at 0. */
  totalAmount: Money;
}

export class SurgeCapExceededError extends Error {
  constructor(surgeMultiplier: Money, maxSurgeMultiplier: Money) {
    super(
      `surgeMultiplier ${surgeMultiplier.toFixed(2)} exceeds the cap of ${maxSurgeMultiplier.toFixed(2)}`,
    );
  }
}

export function calculateFare(inputs: FareInputs): FareBreakdown {
  if (inputs.distanceKm.isNegative()) {
    throw new Error("distanceKm must not be negative");
  }
  if (inputs.surgeMultiplier.lessThan(1)) {
    throw new Error("surgeMultiplier must be at least 1.00 (1.00 = no surge)");
  }
  if (inputs.surgeMultiplier.greaterThan(inputs.maxSurgeMultiplier)) {
    throw new SurgeCapExceededError(inputs.surgeMultiplier, inputs.maxSurgeMultiplier);
  }
  if (inputs.promotionDiscount.isNegative()) {
    throw new Error("promotionDiscount must not be negative");
  }

  const distanceComponent = inputs.perKmRate
    .mul(inputs.distanceKm)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const subtotal = inputs.baseFare
    .add(distanceComponent)
    .mul(inputs.surgeMultiplier)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const totalAmount = Prisma.Decimal.max(subtotal.sub(inputs.promotionDiscount), money("0.00"));

  return {
    baseFare: inputs.baseFare,
    distanceComponent,
    surgeMultiplier: inputs.surgeMultiplier,
    subtotal,
    promotionDiscount: inputs.promotionDiscount,
    totalAmount,
  };
}
