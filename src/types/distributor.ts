import BN from "bn.js";

export interface DistributorAccount {
  mint: string;
  tokenVault: string;
  maxTotalClaim: string;
  maxNumNodes: string;
  totalAmountClaimed: string;
  numNodesClaimed: string;
  startTs: string;
  endTs: string;
  admin: string;
  unlockPeriod: string;
}

export interface DistributorInfo {
  publicKey: string;
  account: DistributorAccount;
}

export interface ICalculateUnlockedAmount {
  depositedAmount: BN;
  cliff: number;
  cliffAmount: BN;
  end: number;
  currentTimestamp: number;
  lastRateChangeTime: number;
  period: number;
  amountPerPeriod: BN;
  fundsUnlockedAtLastRateChange: BN;
}

export interface ClaimState {
  eligible: boolean;
  claimed: boolean;
  amountUnlocked: string;
  amountLocked: string;
  proof: any[];
  clawedBack: boolean;
}
