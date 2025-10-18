"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";

interface Session {
  sessionId: string;
  driver: string;
  sponsor: string;
  vehicleHash: string;
  chargerId: string;
  state: number;
  reserved: string;
  proposed: string;
  startTs: number;
  endTs: number;
  proposeTs: number;
}

interface SystemParams {
  minDeposit: string;
  maxDeposit: string;
  refundTimeout: string;
}

const AdminPage = () => {
  const { address: connectedAddress } = useAccount();
  
  // State management
  const [sessions, setSessions] = useState<Session[]>([]);
  const [systemParams, setSystemParams] = useState<SystemParams>({
    minDeposit: "0",
    maxDeposit: "0",
    refundTimeout: "0"
  });
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filtering and search
  const [filterState, setFilterState] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states for admin actions
  const [showResolveDispute, setShowResolveDispute] = useState<string | null>(null);
  const [driverAmount, setDriverAmount] = useState("");
  const [chargerAmount, setChargerAmount] = useState("");
  
  const [showUpdateParams, setShowUpdateParams] = useState(false);
  const [newMinDeposit, setNewMinDeposit] = useState("");
  const [newMaxDeposit, setNewMaxDeposit] = useState("");
  const [newRefundTimeout, setNewRefundTimeout] = useState("");
  
  // Refs to prevent infinite updates
  const processingRef = useRef(false);
  const lastProcessedEvents = useRef<any[]>([]);

  // Contract read hooks
  const { data: contractOwner } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "owner",
  });

  const { data: minDeposit } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "minDeposit",
  });

  const { data: maxDeposit } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "maxDeposit",
  });

  const { data: refundTimeout } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "refundTimeout",
  });

  // Contract write hooks
  const { writeContractAsync: writePlugAndChargeAsync } = useScaffoldWriteContract({
    contractName: "PlugAndChargeCore",
  });

  // Event history
  const { data: sessionEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "SessionCreated",
    watch: false,
  });

  const { data: disputeEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "Disputed",
    watch: false,
  });

  const { data: settledEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "Settled",
    watch: false,
  });

  // Check if connected wallet is owner
  useEffect(() => {
    if (contractOwner && connectedAddress) {
      setIsOwner(contractOwner.toLowerCase() === connectedAddress.toLowerCase());
    } else {
      setIsOwner(false);
    }
    setLoading(false);
  }, [contractOwner, connectedAddress]);

  // Update system parameters when contract data changes
  useEffect(() => {
    if (minDeposit && maxDeposit && refundTimeout) {
      setSystemParams({
        minDeposit: (Number(minDeposit) / 1e6).toString(), // USDC has 6 decimals
        maxDeposit: (Number(maxDeposit) / 1e6).toString(),
        refundTimeout: Number(refundTimeout).toString()
      });
    }
  }, [minDeposit, maxDeposit, refundTimeout]);

  // Memoize processed sessions to prevent infinite loops
  const processedSessions = useMemo(() => {
    if (!sessionEvents) return [];
    
    return sessionEvents.map(event => ({
      sessionId: event.args.sessionId?.toString() || "",
      driver: event.args.driver || "",
      sponsor: event.args.sponsor || "",
      vehicleHash: event.args.vehicleHash || "",
      chargerId: event.args.chargerId?.toString() || "",
      state: 1, // Default to active, would need individual calls to get current state
      reserved: event.args.initialDeposit?.toString() || "0",
      proposed: "0",
      startTs: Date.now(),
      endTs: 0,
      proposeTs: 0,
    }));
  }, [sessionEvents]);

  // Load all sessions
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const sessionsChanged = JSON.stringify(processedSessions) !== JSON.stringify(lastProcessedEvents.current);
    if (sessionsChanged) {
      processingRef.current = true;
      setSessions(processedSessions);
      lastProcessedEvents.current = processedSessions;
      processingRef.current = false;
    }
  }, [processedSessions]);

  // Set default values for update params form
  useEffect(() => {
    if (systemParams.minDeposit !== "0") {
      setNewMinDeposit(systemParams.minDeposit);
      setNewMaxDeposit(systemParams.maxDeposit);
      setNewRefundTimeout(systemParams.refundTimeout);
    }
  }, [systemParams.minDeposit, systemParams.maxDeposit, systemParams.refundTimeout]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.state === 1).length;
    const disputedSessions = sessions.filter(s => s.state === 3).length;
    const settledSessions = sessions.filter(s => s.state === 4).length;
    
    // Calculate total volume from settled events
    const totalVolume = settledEvents?.reduce((sum, event) => {
      const driverAmount = Number(event.args.driverAmount || 0);
      const chargerAmount = Number(event.args.chargerAmount || 0);
      return sum + driverAmount + chargerAmount;
    }, 0) || 0;

    return {
      totalSessions,
      activeSessions,
      disputedSessions,
      settledSessions,
      totalVolume: totalVolume / 1e6 // Convert to USDC
    };
  }, [sessions, settledEvents]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    // Filter by state
    if (filterState !== "all") {
      const stateNum = parseInt(filterState);
      filtered = filtered.filter(s => s.state === stateNum);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.sessionId.toLowerCase().includes(term) ||
        s.driver.toLowerCase().includes(term) ||
        s.chargerId.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [sessions, filterState, searchTerm]);

  // Get state label and color
  const getStateInfo = (state: number) => {
    switch (state) {
      case 1: return { label: "Active", color: "bg-green-500/20 text-green-400" };
      case 2: return { label: "Proposed", color: "bg-yellow-500/20 text-yellow-400" };
      case 3: return { label: "Disputed", color: "bg-red-500/20 text-red-400" };
      case 4: return { label: "Settled", color: "bg-blue-500/20 text-blue-400" };
      case 5: return { label: "Refunded", color: "bg-gray-500/20 text-gray-400" };
      default: return { label: "Unknown", color: "bg-gray-500/20 text-gray-400" };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Resolve dispute
  const handleResolveDispute = async (sessionId: string) => {
    if (!driverAmount || !chargerAmount) return;
    
    try {
      const driverAmountWei = BigInt(Math.round(parseFloat(driverAmount) * 1e6));
      const chargerAmountWei = BigInt(Math.round(parseFloat(chargerAmount) * 1e6));
      
      await writePlugAndChargeAsync({
        functionName: "resolveDispute",
        args: [BigInt(sessionId), driverAmountWei, chargerAmountWei],
      });
      
      setShowResolveDispute(null);
      setDriverAmount("");
      setChargerAmount("");
    } catch (error) {
      console.error("Error resolving dispute:", error);
    }
  };

  // Update system parameters
  const handleUpdateParams = async () => {
    if (!newMinDeposit || !newMaxDeposit || !newRefundTimeout) return;
    
    try {
      const minDepositWei = BigInt(Math.round(parseFloat(newMinDeposit) * 1e6));
      const maxDepositWei = BigInt(Math.round(parseFloat(newMaxDeposit) * 1e6));
      const timeoutSeconds = BigInt(newRefundTimeout);
      
      await writePlugAndChargeAsync({
        functionName: "updateParams",
        args: [minDepositWei, maxDepositWei, timeoutSeconds],
      });
      
      setShowUpdateParams(false);
    } catch (error) {
      console.error("Error updating parameters:", error);
    }
  };

  // Format timeout to human readable
  const formatTimeout = (seconds: string) => {
    const secs = parseInt(seconds);
    if (secs === 0) return "0 seconds";
    
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${secs} second${secs > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 mx-auto mb-4 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-gray-400">Please connect your wallet to access the admin dashboard</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">Only the contract owner can access this dashboard</p>
          <div className="text-sm text-gray-500">
            Connected: <Address address={connectedAddress} />
          </div>
          <div className="text-sm text-gray-500">
            Owner: <Address address={contractOwner} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="text-gray-400">
            Contract Owner: <Address address={contractOwner} />
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm p-6 rounded-2xl border border-blue-500/20">
            <div className="flex items-center gap-3 mb-2">
              <ClockIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-blue-400">Total Sessions</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm p-6 rounded-2xl border border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-bold text-green-400">Active Sessions</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeSessions}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm p-6 rounded-2xl border border-red-500/20">
            <div className="flex items-center gap-3 mb-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-bold text-red-400">Disputed Sessions</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats.disputedSessions}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-bold text-purple-400">Total Volume</h3>
            </div>
            <p className="text-3xl font-bold text-white">${stats.totalVolume.toFixed(2)}</p>
          </div>
        </div>

        {/* System Parameters */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-orange-500/20 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6" />
              System Parameters
            </h2>
            <button
              onClick={() => setShowUpdateParams(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors"
            >
              Update Parameters
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Min Deposit</label>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <p className="text-lg font-bold text-white">${systemParams.minDeposit} USDC</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Deposit</label>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <p className="text-lg font-bold text-white">${systemParams.maxDeposit} USDC</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Refund Timeout</label>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <p className="text-lg font-bold text-white">{formatTimeout(systemParams.refundTimeout)}</p>
              </div>
            </div>
          </div>

          {/* Update Parameters Form */}
          {showUpdateParams && (
            <div className="mt-6 pt-6 border-t border-gray-600">
              <h3 className="text-lg font-bold text-orange-400 mb-4">Update System Parameters</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Min Deposit (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMinDeposit}
                    onChange={(e) => setNewMinDeposit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Deposit (USDC)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMaxDeposit}
                    onChange={(e) => setNewMaxDeposit(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Refund Timeout (seconds)</label>
                  <input
                    type="number"
                    value={newRefundTimeout}
                    onChange={(e) => setNewRefundTimeout(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {newRefundTimeout && formatTimeout(newRefundTimeout)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleUpdateParams}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors"
                >
                  Update Parameters
                </button>
                <button
                  onClick={() => setShowUpdateParams(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Sessions */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <EyeIcon className="w-6 h-6" />
              All Charging Sessions
            </h2>
            <div className="flex gap-4">
              <div className="relative">
                <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                >
                  <option value="all">All States</option>
                  <option value="1">Active</option>
                  <option value="2">Proposed</option>
                  <option value="3">Disputed</option>
                  <option value="4">Settled</option>
                  <option value="5">Refunded</option>
                </select>
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white w-64"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No sessions found</p>
            ) : (
              filteredSessions.map((session) => {
                const stateInfo = getStateInfo(session.state);
                return (
                  <div key={session.sessionId} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-600">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-bold text-white">Session #{session.sessionId}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateInfo.color}`}>
                            {stateInfo.label}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Driver:</span>
                            <br />
                            <Address address={session.driver} />
                          </div>
                          <div>
                            <span className="text-gray-400">Charger:</span>
                            <br />
                            <span className="text-white">#{session.chargerId}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Reserved:</span>
                            <br />
                            <span className="text-white">${(parseInt(session.reserved) / 1e6).toFixed(2)} USDC</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Started:</span>
                            <br />
                            <span className="text-white">{formatTimestamp(session.startTs)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.state === 3 && (
                          <button
                            onClick={() => setShowResolveDispute(session.sessionId)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
                          >
                            Resolve Dispute
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Resolve Dispute Form */}
                    {showResolveDispute === session.sessionId && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <h4 className="text-md font-bold text-red-400 mb-3">Resolve Dispute</h4>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Driver Refund Amount (USDC)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 5.00"
                              value={driverAmount}
                              onChange={(e) => setDriverAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Charger Payment Amount (USDC)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 3.00"
                              value={chargerAmount}
                              onChange={(e) => setChargerAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">
                          Total reserved: ${(parseInt(session.reserved) / 1e6).toFixed(2)} USDC
                        </p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleResolveDispute(session.sessionId)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                          >
                            Resolve Dispute
                          </button>
                          <button
                            onClick={() => setShowResolveDispute(null)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
