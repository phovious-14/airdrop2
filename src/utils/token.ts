import BN from "bn.js";

/**
 * Converts a raw token amount (from chain) to a human-readable token amount
 */
export const convertRawToTokenAmount = (
  rawAmount: string | number,
  decimals: number
): number => {
  return Number(rawAmount) / Math.pow(10, decimals);
};

/**
 * Converts a human-readable token amount to a raw amount for chain transactions
 */
export const convertTokenToRawAmount = (
  tokenAmount: number,
  decimals: number
): BN => {
  return new BN(tokenAmount * Math.pow(10, decimals));
};

/**
 * Formats a token amount with the specified number of decimal places
 */
export const formatTokenAmount = (amount: number, decimals: number): string => {
  return amount.toFixed(decimals);
};
