import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";
import { useState, useCallback, useMemo } from "react";
import BN from "bn.js";
import { DistributorInfo, ClaimState } from "../types/distributor";
import { calculateUnlockedAmount } from "../utils/calculations";

// Helper function to create claim state
const createClaimState = (
  eligible: boolean,
  claimed: boolean,
  amountUnlocked: string | number,
  amountLocked: string | number,
  proof: any[] = [],
  clawedBack: boolean = false,
  claimOnce: boolean = false
): ClaimState => ({
  eligible,
  claimed,
  amountUnlocked:
    typeof amountUnlocked === "number"
      ? amountUnlocked.toFixed(9)
      : amountUnlocked,
  amountLocked:
    typeof amountLocked === "number" ? amountLocked.toFixed(9) : amountLocked,
  proof,
  clawedBack,
  claimOnce,
});

export const useAirdrop = () => {
  const wallet = useWallet();

  // State for storing airdrop distributor information
  const [distributorInfo, setDistributorInfo] =
    useState<DistributorInfo | null>(null);

  // State for tracking claim status and amounts
  const [claim, setClaim] = useState<ClaimState>(
    createClaimState(false, false, "0", "0", [], false, false)
  );

  // Loading states for different operations
  const [isLoading, setIsLoading] = useState({
    search: false,
    claim: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize Solana distributor client for devnet
  const client = useMemo(
    () =>
      new SolanaDistributorClient({
        clusterUrl: "https://api.devnet.solana.com",
        cluster: ICluster.Devnet,
      }),
    []
  );

  /**
   * Fetches airdrop details and checks eligibility for the given airdrop ID
   * @param airdropId - The ID of the airdrop to check
   */
  const getAirdrops = useCallback(
    async (airdropId: string) => {
      setError(null);
      setIsLoading((prev) => ({ ...prev, search: true }));

      if (!airdropId) {
        setError("Please enter an airdrop ID");
        setIsLoading((prev) => ({ ...prev, search: false }));
        return;
      }

      if (!wallet.publicKey) {
        setError("Please connect your wallet first");
        setIsLoading((prev) => ({ ...prev, search: false }));
        return;
      }

      try {
        const distributors = await client.getDistributors({
          ids: [airdropId],
        });

        if (distributors.length === 0) {
          setError("No airdrop found with this ID");
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;
        }

        const formattedDistributor = {
          publicKey: airdropId,
          account: {
            mint: distributors[0]?.mint?.toString() || "",
            tokenVault: distributors[0]?.tokenVault?.toString() || "",
            admin: distributors[0]?.admin?.toString() || "",
            maxTotalClaim: distributors[0]?.maxTotalClaim?.toString() || "0",
            maxNumNodes: distributors[0]?.maxNumNodes?.toString() || "0",
            totalAmountClaimed:
              distributors[0]?.totalAmountClaimed?.toString() || "0",
            numNodesClaimed:
              distributors[0]?.numNodesClaimed?.toString() || "0",
            startTs: distributors[0]?.startTs?.toString() || "0",
            endTs: distributors[0]?.endTs?.toString() || "0",
            unlockPeriod: distributors[0]?.unlockPeriod?.toString() || "0",
          },
        };

        setDistributorInfo(formattedDistributor);

        if (distributors[0]?.clawedBack) {
          setClaim(createClaimState(false, false, "0", "0", [], true, false));
          return;
        }

        const claims = await client.getClaims([
          {
            id: airdropId,
            recipient: wallet.publicKey?.toBase58(),
          },
        ]);

        if (
          distributors[0]?.claimsLimit &&
          claims[0] &&
          "claimsCount" in claims[0] &&
          claims[0].claimsCount === 1
        ) {
          setClaim(createClaimState(false, false, "0", "0", [], false, true));
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;          
        }

        const res = await fetch(
          `https://staging-api-public.streamflow.finance/v2/api/airdrops/${airdropId}/claimants/${wallet.publicKey?.toBase58()}`
        );

        const data = await res.json();

        if (data.code === "CLAIMANT_DOES_NOT_EXIST") {
          setClaim(createClaimState(false, false, "0", "0", [], false, false));
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;
        }

        //check airdrop type

        if (Number(formattedDistributor.account.unlockPeriod) === 1) {
          handleInstantAirdrop(res, claims, data);
        } else {
          handleVestedAirdrop(claims, data, distributors[0]);
        }
      } catch (error) {
        console.error("Error fetching distributors:", error);
        setError("Failed to fetch airdrop details. Please try again.");
      } finally {
        setIsLoading((prev) => ({ ...prev, search: false }));
      }
    },
    [wallet.publicKey, client]
  );

  /**
   * Handles instant airdrop claim logic
   * Sets claim state based on response and claim status
   */
  const handleInstantAirdrop = (res: Response, claims: any[], data: any) => {
    const amountLocked =
      Number(data.amountLocked.toString()) / LAMPORTS_PER_SOL;

    if (res.status === 200) {
      //if user eligible for airdrop

      if (claims[0] && "state" in claims[0]) {
        //if user claimed airdrop
        setClaim(
          createClaimState(
            true,
            true,
            "0",
            amountLocked,
            data.proof,
            false,
            false
          )
        );
      } else {
        // not claimed yet
        const amountUnlocked =
          Number(data.amountUnlocked.toString()) / LAMPORTS_PER_SOL;
        setClaim(
          createClaimState(
            true,
            false,
            amountUnlocked,
            amountLocked,
            data.proof,
            false,
            false
          )
        );
      }
    } else {
      //not eligible
      setClaim(
        createClaimState(
          false,
          false,
          "0",
          amountLocked,
          data.proof,
          false,
          false
        )
      );
    }
  };

  /**
   * Handles vested airdrop claim logic
   * Calculates unlocked amounts and sets claim state based on vesting schedule
   */
  const handleVestedAirdrop = (claims: any[], data: any, distributor: any) => {
    const amountLocked =
      Number(data.amountLocked.toString()) / LAMPORTS_PER_SOL;

    if (claims[0] === null && "proof" in data) {
      //check user eligible or not and if yes then allow set state for claim airdrop
      const amountUnlocked =
        Number(data.amountUnlocked.toString()) / LAMPORTS_PER_SOL;
      setClaim(
        createClaimState(
          true,
          false,
          amountUnlocked,
          amountLocked,
          data.proof,
          false,
          false
        )
      );
    } else if ("state" in claims[0]) {
      //if user claimed unlocked amount for particular duration
      setClaim(
        createClaimState(
          true,
          true,
          "0",
          amountLocked,
          data.proof,
          false,
          false
        )
      );
    } else if ("unlockedAmount" in claims[0] && distributor) {
      //calculate unlocked amount based on cliff, startTS, endTS and total amount, then get available amount to claim
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const startTs = Number(distributor.startTs?.toString() || "0");
      const endTs = Number(distributor.endTs?.toString() || "0");
      const unlockPeriod = Number(distributor.unlockPeriod?.toString() || "0");

      const totalUnlocked = calculateUnlockedAmount({
        depositedAmount: claims[0].lockedAmount,
        cliff: startTs,
        cliffAmount: new BN(0),
        end: endTs,
        currentTimestamp,
        lastRateChangeTime: 0,
        period: unlockPeriod,
        amountPerPeriod: claims[0].lockedAmount.div(
          new BN(endTs - startTs).div(new BN(unlockPeriod))
        ),
        fundsUnlockedAtLastRateChange: new BN(0),
      });

      const availableToClaim = totalUnlocked.sub(
        claims[0].lockedAmountWithdrawn
      );
      const amountUnlocked =
        Number(availableToClaim.toString()) / LAMPORTS_PER_SOL;

      setClaim(
        createClaimState(
          true,
          false,
          amountUnlocked,
          amountLocked,
          data.proof,
          false,
          false
        )
      );
    } else if (claims[0] === null) {
      //not eligible for airdrop
      setClaim(
        createClaimState(
          false,
          false,
          "0",
          amountLocked,
          data.proof,
          false,
          false
        )
      );
    }
  };

  /**
   * Handles the airdrop claim process
   * Executes the claim transaction and updates the claim state
   */
  const handleClaimAirdrop = useCallback(async () => {
    if (!wallet.publicKey || !distributorInfo) return;

    setError(null);
    setIsLoading((prev) => ({ ...prev, claim: true }));

    const solanaParams = {
      invoker: wallet as any,
    };

    try {
      //claim airdrop based on setClaim state
      const claimRes = await client.claim(
        {
          id: distributorInfo.publicKey,
          proof: claim.proof || [],
          amountUnlocked: new BN(
            Number(claim.amountUnlocked) * LAMPORTS_PER_SOL
          ),
          amountLocked: new BN(Number(claim.amountLocked) * LAMPORTS_PER_SOL),
        },
        solanaParams
      );

      if (claimRes) {
        //refetch after airdrop token claimed
        await getAirdrops(distributorInfo.publicKey);
      }
    } catch (error) {
      console.error("Error claiming airdrop:", error);
      setError("Failed to claim airdrop. Please try again.");
    } finally {
      setIsLoading((prev) => ({ ...prev, claim: false }));
    }
  }, [wallet, distributorInfo, claim, getAirdrops, client]);

  return {
    distributorInfo,
    claim,
    getAirdrops,
    handleClaimAirdrop,
    isLoading,
    error,
  };
};
