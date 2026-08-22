import { Prisma } from "@prisma/client";

/**
 * Money is always Prisma.Decimal, never a JS number/float, anywhere on the
 * money-handling path (CLAUDE.md's database rules; Ch14's rounding rule).
 * This module is the one place fare/commission arithmetic is allowed to live —
 * see docs/decisions/0003-*.md and 0004-*.md.
 */
export type Money = Prisma.Decimal;

export function money(value: string | number): Money {
  return new Prisma.Decimal(value);
}

export interface CommissionSplit {
  totalAmount: Money;
  commissionAmount: Money;
  providerPayoutAmount: Money;
}

/**
 * Pure function: (total, rate%) -> the three auditable amounts required by
 * Ch6/Ch57 (ADR 0003). Rounds to 2 decimal places (paise precision) using
 * round-half-up, and forces commission + payout to reconcile exactly to the
 * total by assigning any rounding remainder to the provider payout — never
 * silently drop or invent a paise.
 */
export function calculateCommissionSplit(
  totalAmount: Money,
  ratePercentage: Money,
): CommissionSplit {
  if (totalAmount.isNegative() || totalAmount.isZero()) {
    throw new Error("totalAmount must be a positive amount");
  }
  if (ratePercentage.isNegative() || ratePercentage.greaterThan(100)) {
    throw new Error("ratePercentage must be between 0 and 100");
  }

  const commissionAmount = totalAmount
    .mul(ratePercentage)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const providerPayoutAmount = totalAmount.sub(commissionAmount);

  return { totalAmount, commissionAmount, providerPayoutAmount };
}
