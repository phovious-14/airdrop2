import { useState, useEffect } from "react";

export const useSolPrice = () => {
  const [solPrice, setSolPrice] = useState<number>(0);

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await response.json();
        setSolPrice(data.solana.usd);
      } catch (error) {
        console.error("Error fetching SOL price:", error);
      }
    };

    fetchSolPrice();
  }, []);

  return solPrice;
};
