import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState, useMemo } from "react";
import { useBalance } from "../hooks/useBalance";
import { useSolPrice } from "../hooks/useSolPrice";
import { useAirdrop } from "../hooks/useAirdrop";
import { formatDuration, formatUsdValue } from "../utils/formatters";

export default function Airdrop() {
  const wallet = useWallet();
  const [airdropId, setAirdropId] = useState<string>("");
  const balance = useBalance();
  const solPrice = useSolPrice();
  const {
    distributorInfo,
    claim,
    getAirdrops,
    handleClaimAirdrop,
    isLoading,
    error,
  } = useAirdrop();

  // Memoize calculated values
  const totalClaimed = useMemo(
    () =>
      distributorInfo
        ? Number(distributorInfo.account.totalAmountClaimed) / LAMPORTS_PER_SOL
        : 0,
    [distributorInfo]
  );

  const maxTotalClaim = useMemo(
    () =>
      distributorInfo
        ? Number(distributorInfo.account.maxTotalClaim) / LAMPORTS_PER_SOL
        : 0,
    [distributorInfo]
  );

  const totalAmount = useMemo(
    () => Number(claim.amountUnlocked) + Number(claim.amountLocked),
    [claim.amountUnlocked, claim.amountLocked]
  );

  // Helper functions for conditional rendering
  const renderClaimStatus = () => {
    if (claim.clawedBack) {
      return (
        <div className="text-gray-500 font-medium text-center">
          - Airdrop Clawbacked -
        </div>
      );
    }
    if (claim.claimOnce) {
      return (
        <div className="text-red-500 font-medium text-center">
          You have claimed 1 time and reached to limit
        </div>
      );
    }
    if (claim.claimed && !claim.clawedBack && !claim.claimOnce) {
      return (
        <div className="text-green-500 font-medium text-center">
          Airdrop Claimed
        </div>
      );
    }
    if (!claim.eligible && !claim.clawedBack && !claim.claimOnce) {
      return (
        <div className="text-red-500 font-medium text-center">
          You are not eligible to claim this airdrop
        </div>
      );
    }
    return null;
  };

  const renderClaimButton = () => {
    if (!claim.claimed && claim.eligible && Number(claim.amountUnlocked) > 0) {
      return (
        <button
          onClick={handleClaimAirdrop}
          disabled={isLoading.claim}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
            isLoading.claim
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isLoading.claim ? (
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Claiming...
            </div>
          ) : (
            `Claim ${Number(claim.amountUnlocked)} SOL`
          )}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Airdrop Claim</h1>
          {wallet.publicKey && (
            <div className="text-sm text-gray-600">
              Account Balance:{" "}
              <span className="font-semibold">{balance} SOL</span>
              {solPrice > 0 ? (
                <span className="ml-2 text-gray-400">
                  (${(Number(balance) * solPrice).toFixed(2)})
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={airdropId}
                onChange={(e) => setAirdropId(e.target.value)}
                placeholder="Enter airdrop ID"
                className="w-full border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading.search}
              />
            </div>
            <button
              onClick={() => getAirdrops(airdropId)}
              disabled={isLoading.search}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
                isLoading.search
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isLoading.search ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Searching...
                </div>
              ) : (
                "Search Airdrops"
              )}
            </button>
          </div>
          {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
        </div>

        {distributorInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Airdrop Information
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Public Key
                  </div>
                  <div className="text-sm text-gray-900 break-all">
                    {distributorInfo.publicKey}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Total Claimed
                  </div>
                  <div className="text-sm text-gray-900">
                    {totalClaimed} / {maxTotalClaim} SOL
                    {solPrice > 0 && (
                      <span className="ml-2 text-gray-400">
                        ({formatUsdValue(totalClaimed, solPrice)})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Nodes Claimed
                  </div>
                  <div className="text-sm text-gray-900">
                    {distributorInfo.account.numNodesClaimed} /{" "}
                    {distributorInfo.account.maxNumNodes}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Airdrop Type
                  </div>
                  <div className="text-sm">
                    {Number(distributorInfo.account.unlockPeriod) === 1 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Instant
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Vested (Unlock every{" "}
                        {formatDuration(
                          Number(distributorInfo.account.unlockPeriod)
                        )}
                        )
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Your Allocation
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Total Amount
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {totalAmount} SOL
                    {solPrice > 0 ? (
                      <span className="ml-2 text-sm text-gray-400">
                        ({formatUsdValue(totalAmount, solPrice)})
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Claimable Amount
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Number(claim.amountUnlocked)} SOL
                    {solPrice > 0 && (
                      <span className="ml-2 text-sm text-gray-400">
                        (
                        {formatUsdValue(Number(claim.amountUnlocked), solPrice)}
                        )
                      </span>
                    )}
                  </div>
                </div>
                {renderClaimStatus()}
                {renderClaimButton()}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
