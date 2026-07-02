/** USDC -> AED settlement quote. AED is pegged to USD, so the rate is stable. */
export interface AedQuote {
  amountUsdc: number;
  rate: number; // AED per USDC
  feeBps: number;
  amountAed: number;
  provider: string;
}

export function quoteAed(amountUsdc: number, rate: number, feeBps: number, provider: string): AedQuote {
  const gross = amountUsdc * rate;
  const amountAed = Number((gross * (1 - feeBps / 10_000)).toFixed(2));
  return { amountUsdc, rate, feeBps, amountAed, provider };
}
