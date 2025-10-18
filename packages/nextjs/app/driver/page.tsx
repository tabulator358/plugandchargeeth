"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { 
  TruckIcon as CarIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  BoltIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";
import { 
  useScaffoldReadContract, 
  useScaffoldWriteContract,
  useScaffoldEventHistory 
} from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";
import { parseUnits, formatUnits } from "viem";
import Link from "next/link";

interface Vehicle {
  vehicleHash: string;
  chipId: string;
  iso15118Enabled: boolean;
  publicKeyHash: string;
}

interface Charger {
  chargerId: string;
  owner: string;
  latE7: number;
  lngE7: number;
  pricePerKWhMilliUSD: number;
  powerKW: number;
  active: boolean;
}

interface ChargingSession {
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

const DriverPage = () => {
  const { address: connectedAddress } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trustedChargers, setTrustedChargers] = useState<Charger[]>([]);
  const [activeSessions, setActiveSessions] = useState<ChargingSession[]>([]);
  const [showAddCharger, setShowAddCharger] = useState(false);
  const [newChargerId, setNewChargerId] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newChipId, setNewChipId] = useState("");
  const [newIso15118Enabled, setNewIso15118Enabled] = useState(true);
  const [newIso15118Identifier, setNewIso15118Identifier] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("");
  const [addChargerMode, setAddChargerMode] = useState<"id" | "operator">("id");
  const [selectedChargerId, setSelectedChargerId] = useState("");
  const [approvalAmount, setApprovalAmount] = useState("1000");
  const [operatorChargers, setOperatorChargers] = useState<number[]>([]);
  
  // Refs to prevent infinite updates
  const processingRef = useRef(false);
  const lastProcessedEvents = useRef<{
    vehicles: any[];
    chargers: any[];
    sessions: any[];
  }>({ vehicles: [], chargers: [], sessions: [] });

  // Read USDC balance
  const { data: usdcBalance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
  });

  // Read USDC allowance for PlugAndChargeCore
  const { data: usdcAllowance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "allowance",
    args: connectedAddress ? [connectedAddress, "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"] : undefined,
  });

  // Read chargers by operator
  const { data: operatorChargersData } = useScaffoldReadContract({
    contractName: "ChargerRegistry",
    functionName: "getChargersByOwner",
    args: selectedOperator ? [selectedOperator as `0x${string}`] : undefined,
  });

  // Write contract hooks
  const { writeContractAsync: writeUSDCAsync } = useScaffoldWriteContract({
    contractName: "MockUSDC",
  });

  const { writeContractAsync: writePlugAndChargeAsync } = useScaffoldWriteContract({
    contractName: "PlugAndChargeCore",
  });

  const { writeContractAsync: writeVehicleRegistryAsync } = useScaffoldWriteContract({
    contractName: "VehicleRegistry",
  });

  const { writeContractAsync: writeChargerRegistryAsync } = useScaffoldWriteContract({
    contractName: "ChargerRegistry",
  });

  // Event history for vehicles
  const { data: vehicleEvents } = useScaffoldEventHistory({
    contractName: "VehicleRegistry",
    eventName: "VehicleRegistered",
    watch: true,
  });

  // Event history for trusted chargers
  const { data: trustedChargerEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "TrustedChargerSet",
    watch: true,
  });

  // Event history for charging sessions
  const { data: sessionEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "SessionCreated",
    watch: true,
  });

  // Stable address for comparison
  const stableAddress = useMemo(() => connectedAddress?.toLowerCase(), [connectedAddress]);

  // Update operator chargers when data changes
  useEffect(() => {
    if (operatorChargersData) {
      setOperatorChargers(operatorChargersData.map(id => Number(id)));
    } else {
      setOperatorChargers([]);
    }
  }, [operatorChargersData]);

  // Memoize processed vehicles to prevent infinite loops
  const processedVehicles = useMemo(() => {
    if (!vehicleEvents || !stableAddress) return [];
    
    return vehicleEvents
      .filter(event => event.args.driver?.toLowerCase() === stableAddress)
      .map(event => ({
        vehicleHash: event.args.vehicleHash || "",
        chipId: event.args.chipId || "",
        iso15118Enabled: event.args.iso15118Enabled || false,
        publicKeyHash: "", // Would need additional call to get this - for now empty
      }));
  }, [vehicleEvents, stableAddress]);

  // Load vehicles for connected address
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const vehiclesChanged = JSON.stringify(processedVehicles) !== JSON.stringify(lastProcessedEvents.current.vehicles);
    if (vehiclesChanged) {
      processingRef.current = true;
      setVehicles(processedVehicles);
      lastProcessedEvents.current.vehicles = processedVehicles;
      processingRef.current = false;
    }
  }, [processedVehicles]);

  // Memoize processed trusted chargers to prevent infinite loops
  const processedTrustedChargers = useMemo(() => {
    if (!trustedChargerEvents || !stableAddress) return [];
    
    return trustedChargerEvents
      .filter(event => 
        event.args.driver?.toLowerCase() === stableAddress && 
        event.args.trusted === true
      )
      .map(event => ({
        chargerId: event.args.chargerId?.toString() || "",
        owner: event.args.chargerId?.toString() || "", // Would need to fetch from ChargerRegistry
        latE7: 0,
        lngE7: 0,
        pricePerKWhMilliUSD: 0,
        powerKW: 0,
        active: true,
      }));
  }, [trustedChargerEvents, stableAddress]);

  // Load trusted chargers
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const chargersChanged = JSON.stringify(processedTrustedChargers) !== JSON.stringify(lastProcessedEvents.current.chargers);
    if (chargersChanged) {
      processingRef.current = true;
      setTrustedChargers(processedTrustedChargers);
      lastProcessedEvents.current.chargers = processedTrustedChargers;
      processingRef.current = false;
    }
  }, [processedTrustedChargers]);

  // Memoize processed active sessions to prevent infinite loops
  const processedActiveSessions = useMemo(() => {
    if (!sessionEvents || !stableAddress) return [];
    
    return sessionEvents
      .filter(event => event.args.driver?.toLowerCase() === stableAddress)
      .map(event => ({
        sessionId: event.args.sessionId?.toString() || "",
        driver: event.args.driver || "",
        sponsor: event.args.sponsor || "",
        vehicleHash: event.args.vehicleHash || "",
        chargerId: event.args.chargerId?.toString() || "",
        state: 1, // Active state
        reserved: event.args.initialDeposit?.toString() || "0",
        proposed: "0",
        startTs: 0,
        endTs: 0,
        proposeTs: 0,
      }));
  }, [sessionEvents, stableAddress]);

  // Load active sessions
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const sessionsChanged = JSON.stringify(processedActiveSessions) !== JSON.stringify(lastProcessedEvents.current.sessions);
    if (sessionsChanged) {
      processingRef.current = true;
      setActiveSessions(processedActiveSessions);
      lastProcessedEvents.current.sessions = processedActiveSessions;
      processingRef.current = false;
    }
  }, [processedActiveSessions]);

  // Approve USDC for PlugAndChargeCore
  const handleApproveUSDC = async () => {
    if (!connectedAddress || !approvalAmount) return;
    
    try {
      await writeUSDCAsync({
        functionName: "approve",
        args: ["0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", parseUnits(approvalAmount, 6)],
      });
    } catch (error) {
      console.error("Error approving USDC:", error);
    }
  };

  // Add trusted charger
  const handleAddTrustedCharger = async () => {
    if (!connectedAddress || !newChargerId) return;
    
    try {
      await writePlugAndChargeAsync({
        functionName: "setTrustedCharger",
        args: [connectedAddress, BigInt(newChargerId), true],
      });
      setNewChargerId("");
      setShowAddCharger(false);
    } catch (error) {
      console.error("Error adding trusted charger:", error);
    }
  };

  // Remove trusted charger
  const handleRemoveTrustedCharger = async (chargerId: string) => {
    if (!connectedAddress) return;
    
    try {
      await writePlugAndChargeAsync({
        functionName: "setTrustedCharger",
        args: [connectedAddress, BigInt(chargerId), false],
      });
    } catch (error) {
      console.error("Error removing trusted charger:", error);
    }
  };

  // Add vehicle
  const handleAddVehicle = async () => {
    if (!newVehicleName || !newChipId || !newIso15118Identifier) return;
    
    try {
      // Convert strings to bytes32 hashes
      const vehicleHash = `0x${Buffer.from(newVehicleName).toString('hex').padStart(64, '0')}` as `0x${string}`;
      const chipId = `0x${Buffer.from(newChipId).toString('hex').padStart(64, '0')}` as `0x${string}`;
      const publicKeyHash = `0x${Buffer.from(newIso15118Identifier).toString('hex').padStart(64, '0')}` as `0x${string}`;
      
      await writeVehicleRegistryAsync({
        functionName: "registerVehicle",
        args: [
          vehicleHash,
          chipId,
          newIso15118Enabled,
          publicKeyHash
        ],
      });
      setNewVehicleName("");
      setNewChipId("");
      setNewIso15118Identifier("");
      setShowAddVehicle(false);
    } catch (error) {
      console.error("Error adding vehicle:", error);
    }
  };

  // Add all chargers by operator
  const handleAddAllChargersByOperator = async () => {
    if (!connectedAddress || !selectedOperator || operatorChargers.length === 0) return;
    
    try {
      // Add each charger as trusted
      for (const chargerId of operatorChargers) {
        await writePlugAndChargeAsync({
          functionName: "setTrustedCharger",
          args: [connectedAddress, BigInt(chargerId), true],
        });
      }
      
      setShowAddCharger(false);
      setSelectedOperator("");
      setOperatorChargers([]);
    } catch (error) {
      console.error("Error adding all chargers by operator:", error);
    }
  };


  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-cyan-400">Driver Dashboard</h1>
          <p className="text-xl text-gray-300">Please connect your wallet to access the driver dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Driver Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Manage your vehicles and charging sessions</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Connected as:</p>
              <Address address={connectedAddress} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* USDC Balance & Approval */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-cyan-500/20">
            <div className="flex items-center gap-3 mb-4">
              <CurrencyDollarIcon className="w-8 h-8 text-cyan-400" />
              <h3 className="text-xl font-bold text-cyan-400">USDC Balance</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {usdcBalance ? formatUnits(usdcBalance, 6) : "0"} USDC
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
              <h3 className="text-xl font-bold text-green-400">USDC Approval</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Allowance: {usdcAllowance ? formatUnits(usdcAllowance, 6) : "0"} USDC
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Approval Amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount..."
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setApprovalAmount("100")}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                >
                  100
                </button>
                <button
                  onClick={() => setApprovalAmount("500")}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                >
                  500
                </button>
                <button
                  onClick={() => setApprovalAmount("1000")}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                >
                  1000
                </button>
              </div>
              <button
                onClick={handleApproveUSDC}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                Approve {approvalAmount} USDC
              </button>
            </div>
          </div>
        </div>

        {/* Active Charging Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-orange-400 flex items-center gap-2">
              <BoltIcon className="w-6 h-6" />
              Active Charging Sessions
            </h2>
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <div key={session.sessionId} className="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm p-6 rounded-3xl border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-orange-400">Session #{session.sessionId}</h3>
                      <p className="text-gray-300">Charger ID: {session.chargerId}</p>
                      <p className="text-gray-300">Reserved: {formatUnits(BigInt(session.reserved), 6)} USDC</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">Charging</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Vehicles */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
              <CarIcon className="w-6 h-6" />
              My Vehicles ({vehicles.length})
            </h2>
            <button
              onClick={() => setShowAddVehicle(!showAddVehicle)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>

          {showAddVehicle && (
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20 mb-4">
              <h3 className="text-lg font-bold text-blue-400 mb-4">Register New Vehicle</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Tesla Model 3"
                    value={newVehicleName}
                    onChange={(e) => setNewVehicleName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chip ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CHIP123456"
                    value={newChipId}
                    onChange={(e) => setNewChipId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ISO 15118 Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ISO15118_ID_123"
                    value={newIso15118Identifier}
                    onChange={(e) => setNewIso15118Identifier(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ISO-15118 Support
                  </label>
                  <select
                    value={newIso15118Enabled.toString()}
                    onChange={(e) => setNewIso15118Enabled(e.target.value === "true")}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleAddVehicle}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Register Vehicle
                </button>
                <button
                  onClick={() => setShowAddVehicle(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {vehicles.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 text-center">
              <CarIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No vehicles registered</h3>
              <p className="text-gray-500">Register your vehicle to start using Plug&Charge</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((vehicle, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <CarIcon className="w-8 h-8 text-blue-400" />
                    <h3 className="text-lg font-bold text-blue-400">Vehicle #{index + 1}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Hash:</span>
                      <p className="text-gray-300 font-mono text-xs break-all">{vehicle.vehicleHash}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Chip ID:</span>
                      <p className="text-gray-300 font-mono text-xs break-all">{vehicle.chipId}</p>
                    </div>
                    {vehicle.publicKeyHash && (
                      <div>
                        <span className="text-gray-500">Public Key Hash:</span>
                        <p className="text-gray-300 font-mono text-xs break-all">{vehicle.publicKeyHash}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">ISO-15118:</span>
                      {vehicle.iso15118Enabled ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trusted Chargers */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
              <StarIcon className="w-6 h-6" />
              Trusted Chargers ({trustedChargers.length})
            </h2>
            <button
              onClick={() => setShowAddCharger(!showAddCharger)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add Charger
            </button>
          </div>

          {showAddCharger && (
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20 mb-4">
              <h3 className="text-lg font-bold text-green-400 mb-4">Add Trusted Charger</h3>
              
              {/* Mode Selection */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setAddChargerMode("id")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    addChargerMode === "id" 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Add by Charger ID
                </button>
                <button
                  onClick={() => setAddChargerMode("operator")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    addChargerMode === "operator" 
                      ? "bg-green-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Add by Operator
                </button>
              </div>

              {addChargerMode === "id" ? (
                <div className="flex gap-4">
                  <input
                    type="number"
                    placeholder="Charger ID"
                    value={newChargerId}
                    onChange={(e) => setNewChargerId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                  <button
                    onClick={handleAddTrustedCharger}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddCharger(false)}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Charging Station Operator Address
                    </label>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the wallet address of the charging station operator
                    </p>
                  </div>
                  {selectedOperator && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">
                        <strong>Operator Address:</strong> {selectedOperator}
                      </p>
                      {operatorChargers.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-sm text-gray-300 mb-2">
                            Found {operatorChargers.length} charger(s): {operatorChargers.join(", ")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mb-4">No chargers found for this operator</p>
                      )}
                      <div className="flex gap-4">
                        <button
                          onClick={handleAddAllChargersByOperator}
                          disabled={operatorChargers.length === 0}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                        >
                          Add All Chargers ({operatorChargers.length})
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCharger(false);
                            setSelectedOperator("");
                            setOperatorChargers([]);
                          }}
                          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {trustedChargers.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 text-center">
              <StarIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No trusted chargers</h3>
              <p className="text-gray-500">Add chargers you trust for seamless charging</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trustedChargers.map((charger) => (
                <div key={charger.chargerId} className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <BoltIcon className="w-8 h-8 text-green-400" />
                      <h3 className="text-lg font-bold text-green-400">Charger #{charger.chargerId}</h3>
                    </div>
                    <button
                      onClick={() => handleRemoveTrustedCharger(charger.chargerId)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Owner:</span> {charger.owner.slice(0, 10)}...
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Power:</span> {charger.powerKW} kW
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Price:</span> ${charger.pricePerKWhMilliUSD / 1000}/kWh
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Status:</span>
                      {charger.active ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-xs">Inactive</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Charging Session */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-purple-400 flex items-center gap-2">
            <BoltIcon className="w-6 h-6" />
            Start Charging Session
          </h2>
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-6 rounded-3xl border border-purple-500/20">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Vehicle
                </label>
                <select className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                  <option value="">Choose your vehicle...</option>
                  {vehicles.map((vehicle, index) => (
                    <option key={index} value={vehicle.vehicleHash}>
                      Vehicle #{index + 1} {vehicle.iso15118Enabled ? "(ISO-15118)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Charger ID
                </label>
                <input
                  type="text"
                  placeholder="Enter charger ID (e.g., 1, 2, 3...)"
                  value={selectedChargerId}
                  onChange={(e) => setSelectedChargerId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter the ID of the charger you want to use
                </p>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Initial Deposit (USDC)
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Enter amount..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors">
                  Start Session
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Minimum deposit: 10 USDC | Maximum deposit: 1000 USDC
              </p>
            </div>
          </div>
        </div>

        {/* Charging History */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-purple-400 flex items-center gap-2">
            <ClockIcon className="w-6 h-6" />
            Recent Charging Sessions
          </h2>
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 text-center">
            <ClockIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No charging history</h3>
            <p className="text-gray-500">Your charging sessions will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverPage;
