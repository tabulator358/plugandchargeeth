"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { 
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";

const USDCPage = () => {
  const { address: connectedAddress } = useAccount();
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  // Read faucet usage
  const { data: faucetUsed } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "getFaucetUsed",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  // Contract write hooks
  const { writeContractAsync: writeMockUSDCAsync } = useScaffoldWriteContract({
    contractName: "MockUSDC",
  });

  // Handle faucet
  const handleFaucet = async () => {
    if (!faucetAmount) return;
    
    setIsLoading(true);
    setSuccess(false);
    
    try {
      const amount = BigInt(Math.round(parseFloat(faucetAmount) * 1e6)); // USDC has 6 decimals
      
      await writeMockUSDCAsync({
        functionName: "faucet",
        args: [amount],
      });
      
      setSuccess(true);
      refetchBalance();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error using faucet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick faucet
  const handleQuickFaucet = async () => {
    setIsLoading(true);
    setSuccess(false);
    
    try {
      await writeMockUSDCAsync({
        functionName: "quickFaucet",
        args: [],
      });
      
      setSuccess(true);
      refetchBalance();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error using quick faucet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <CurrencyDollarIcon className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h1 className="text-2xl font-bold mb-2">USDC Faucet</h1>
          <p className="text-gray-400">Please connect your wallet to use the USDC faucet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            USDC Faucet
          </h1>
          <div className="text-gray-400">
            Connected as: <Address address={connectedAddress} />
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            <h2 className="text-2xl font-bold text-green-400">Your USDC Balance</h2>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "0.00"} USDC
          </div>
          <p className="text-gray-400">
            Faucet used: {faucetUsed ? (Number(faucetUsed) / 1e6).toFixed(2) : "0.00"} USDC
          </p>
        </div>

        {/* Faucet Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Custom Amount Faucet */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20">
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <ArrowDownTrayIcon className="w-6 h-6" />
              Custom Amount Faucet
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                value={faucetAmount}
                onChange={(e) => setFaucetAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                placeholder="e.g., 100"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum: 10,000 USDC total per address
              </p>
            </div>

            <button
              onClick={handleFaucet}
              disabled={isLoading || !faucetAmount}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Getting USDC...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Get {faucetAmount} USDC
                </>
              )}
            </button>
          </div>

          {/* Quick Faucet */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-purple-500/20">
            <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6" />
              Quick Faucet
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-2">
                Get 1,000 USDC instantly for testing purposes.
              </p>
              <p className="text-sm text-gray-400">
                This is the fastest way to get USDC for testing the Plug&Charge system.
              </p>
            </div>

            <button
              onClick={handleQuickFaucet}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Getting USDC...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Get 1,000 USDC
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-medium">
                USDC received successfully! Your balance has been updated.
              </p>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="mt-8 bg-gradient-to-br from-gray-800/30 to-gray-700/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600">
          <h3 className="text-lg font-bold text-gray-300 mb-3">About the USDC Faucet</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• This is a test USDC faucet for development and testing purposes only</p>
            <p>• Maximum 10,000 USDC can be claimed per wallet address</p>
            <p>• USDC is required to start charging sessions in the Plug&Charge system</p>
            <p>• All transactions are on the local Hardhat network</p>
            <p>• No real USDC is involved - this is for testing only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default USDCPage;
