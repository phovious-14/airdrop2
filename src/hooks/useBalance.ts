import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState, useEffect } from "react";

export const useBalance = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const updateBalance = async () => {
      if (!connection || !wallet.publicKey) {
        console.error("Wallet not connected or connection unavailable");
        return;
      }

      try {
        connection.onAccountChange(
          wallet.publicKey,
          (updatedAccountInfo) => {
            setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
          },
          "confirmed"
        );

        const accountInfo = await connection.getAccountInfo(wallet.publicKey);

        if (accountInfo) {
          setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        } else {
          throw new Error("Account info not found");
        }
      } catch (error) {
        console.error("Failed to retrieve account info:", error);
      }
    };

    updateBalance();
  }, [connection, wallet.publicKey]);

  return balance;
};
