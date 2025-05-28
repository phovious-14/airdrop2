import BN from "bn.js";
import { ICalculateUnlockedAmount } from "../types/distributor";

export const calculateUnlockedAmount = ({
  depositedAmount,
  cliff,
  cliffAmount,
  end,
  currentTimestamp,
  lastRateChangeTime,
  period,
  amountPerPeriod,
  fundsUnlockedAtLastRateChange,
}: ICalculateUnlockedAmount): BN => {
  const deposited = depositedAmount;

  if (currentTimestamp < cliff) return new BN(0);
  if (currentTimestamp > end) return deposited;

  const savedUnlockedFunds =
    lastRateChangeTime === 0 ? cliffAmount : fundsUnlockedAtLastRateChange;
  const savedUnlockedFundsTime =
    lastRateChangeTime === 0 ? cliff : lastRateChangeTime;

  const streamed = new BN(
    Math.floor((currentTimestamp - savedUnlockedFundsTime) / period)
  )
    .mul(amountPerPeriod)
    .add(savedUnlockedFunds);

  return streamed.lt(deposited) ? streamed : deposited;
};
