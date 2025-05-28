import React from "react";
import "./App.css";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Airdrop from "./components/Airdrop";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <WalletMultiButton />
        <Airdrop />
      </header>
    </div>
  );
}

export default App;
