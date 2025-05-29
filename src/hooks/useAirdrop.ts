import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";
import { useState, useCallback, useMemo } from "react";
import BN from "bn.js";
import { DistributorInfo, ClaimState } from "../types/distributor";
import { calculateUnlockedAmount } from "../utils/calculations";
import { getMint } from "@solana/spl-token";
import {
  convertRawToTokenAmount,
  convertTokenToRawAmount,
} from "../utils/token";

// Add token metadata interface
interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  mint: string;
}

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

  // Add state for token metadata
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null
  );

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

  // Initialize Solana connection for devnet
  const connection = useMemo(
    () => new Connection("https://api.devnet.solana.com"),
    []
  );

  // Initialize Solana distributor client for devnet
  const client = useMemo(
    () =>
      new SolanaDistributorClient({
        clusterUrl: "https://api.devnet.solana.com",
        cluster: ICluster.Devnet,
      }),
    []
  );

  // Add function to fetch token metadata
  const fetchTokenMetadata = useCallback(
    async (mintAddress: string) => {
      try {
        const mintPubkey = new PublicKey(mintAddress);
        const mintInfo = await getMint(connection, mintPubkey);

        // Default metadata
        const metadata = {
          name: "Unknown Token",
          symbol: "UNKNOWN",
          decimals: mintInfo.decimals,
          mint: mintAddress,
        };

        // Known token addresses

        const devnetTokens: {
          [key: string]: { name: string; symbol: string };
        } = {
          So11111111111111111111111111111111111111112: {
            name: "Solana",
            symbol: "SOL",
          },
        };

        // Check if it's a known token
        if (devnetTokens[mintAddress]) {
          metadata.name = devnetTokens[mintAddress].name;
          metadata.symbol = devnetTokens[mintAddress].symbol;
        } else {
          // Try to fetch from token registry
          try {
            const response = await fetch(
              `https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/${mintAddress}.json`
            );
            if (response.ok) {
              const registryData = await response.json();
              metadata.name = registryData.name;
              metadata.symbol = registryData.symbol;
            }
          } catch (error) {
            console.warn(
              "Failed to fetch token metadata from registry:",
              error
            );
          }
        }

        setTokenMetadata(metadata);
        return metadata;
      } catch (error) {
        console.error("Error fetching token metadata:", error);
        setError(
          "Failed to fetch token metadata. Please verify the token address."
        );
        return null;
      }
    },
    [connection]
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

        // Fetch token metadata before setting distributor info
        const metadata = await fetchTokenMetadata(
          formattedDistributor.account.mint
        );
        if (!metadata) {
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;
        }

        setDistributorInfo(formattedDistributor);

        // Only fetch claim information if wallet is connected
        if (!wallet.publicKey) {
          setClaim(createClaimState(false, false, "0", "0", [], false, false));
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;
        }

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

        //check airdrop has limit 1
        if (
          distributors[0]?.claimsLimit === 1 &&
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

        const partialClaimDetail = await res.json();

        if (partialClaimDetail.code === "CLAIMANT_DOES_NOT_EXIST") {
          setClaim(createClaimState(false, false, "0", "0", [], false, false));
          setIsLoading((prev) => ({ ...prev, search: false }));
          return;
        }

        //check airdrop type
        if (Number(formattedDistributor.account.unlockPeriod) === 1) {
          handleInstantAirdrop(
            res,
            claims,
            partialClaimDetail,
            metadata.decimals
          );
        } else {
          handleVestedAirdrop(
            claims,
            partialClaimDetail,
            distributors[0],
            metadata.decimals
          );
        }
      } catch (error) {
        console.error("Error fetching distributors:", error);
        setError("Failed to fetch airdrop details. Please try again.");
      } finally {
        setIsLoading((prev) => ({ ...prev, search: false }));
      }
    },
    [wallet.publicKey, client, fetchTokenMetadata]
  );

  /**
   * Handles instant airdrop claim logic
   * Sets claim state based on response and claim status
   */
  const handleInstantAirdrop = (
    res: Response,
    claims: any[],
    data: any,
    decimals: number
  ) => {
    const amountLocked = convertRawToTokenAmount(
      data.amountLocked.toString(),
      decimals
    );

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
        const amountUnlocked = convertRawToTokenAmount(
          data.amountUnlocked.toString(),
          decimals
        );
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
  const handleVestedAirdrop = (
    claims: any[],
    data: any,
    distributor: any,
    decimals: number
  ) => {
    const amountLocked = convertRawToTokenAmount(
      data.amountLocked.toString(),
      decimals
    );

    if (claims[0] === null && "proof" in data) {
      //check user eligible or not and if yes then allow set state for claim airdrop
      const amountUnlocked = convertRawToTokenAmount(
        data.amountUnlocked.toString(),
        decimals
      );
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
      const amountUnlocked = convertRawToTokenAmount(
        availableToClaim.toString(),
        decimals
      );

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
    if (!wallet.publicKey || !distributorInfo || !tokenMetadata) return;

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
          amountUnlocked: convertTokenToRawAmount(
            Number(claim.amountUnlocked),
            tokenMetadata.decimals
          ),
          amountLocked: convertTokenToRawAmount(
            Number(claim.amountLocked),
            tokenMetadata.decimals
          ),
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
  }, [wallet, distributorInfo, claim, getAirdrops, client, tokenMetadata]);

  return {
    distributorInfo,
    claim,
    getAirdrops,
    handleClaimAirdrop,
    isLoading,
    error,
    tokenMetadata,
  };
};
