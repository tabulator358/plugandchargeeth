"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { 
  BoltIcon as PowerIcon, 
  PlusIcon, 
  PencilIcon,
  PlayIcon,
  StopIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";
import { formatUSDC } from "~~/utils/formatting";

interface Charger {
  chargerId: string;
  owner: string;
  latE7: number;
  lngE7: number;
  pricePerKWhMilliUSD: number;
  powerKW: number;
  active: boolean;
}

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

const ChargerPage = () => {
  const { address: connectedAddress } = useAccount();
  
  // State management
  const [chargers, setChargers] = useState<Charger[]>([]);
  
  // Form states for register charger
  const [showRegisterCharger, setShowRegisterCharger] = useState(false);
  const [newChargerId, setNewChargerId] = useState("");
  const [newChargerOwner, setNewChargerOwner] = useState("");
  const [newChargerLat, setNewChargerLat] = useState("");
  const [newChargerLng, setNewChargerLng] = useState("");
  const [newChargerPrice, setNewChargerPrice] = useState("");
  const [newChargerPower, setNewChargerPower] = useState("");
  
  // Form states for edit charger
  const [editingCharger, setEditingCharger] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);
  
  // Form states for start session
  const [showStartSession, setShowStartSession] = useState(false);
  const [sessionMode, setSessionMode] = useState<"trusted" | "guest">("trusted");
  const [sessionVehicleHash, setSessionVehicleHash] = useState("");
  const [sessionChargerId, setSessionChargerId] = useState("");
  const [sessionSalt, setSessionSalt] = useState("");
  const [sessionPayer, setSessionPayer] = useState("");
  const [sessionDeposit, setSessionDeposit] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sessionChipId, setSessionChipId] = useState("");
  const [sessionIso15118Id, setSessionIso15118Id] = useState("");
  
  // Form states for session actions
  const [proposingSessionId, setProposingSessionId] = useState<string | null>(null);
  const [proposeAmount, setProposeAmount] = useState("");
  
  // Refs to prevent infinite updates
  const processingRef = useRef(false);
  const lastProcessedEvents = useRef<{
    chargers: any[];
    sessions: any[];
  }>({ chargers: [], sessions: [] });

  // Contract write hooks
  const { writeContractAsync: writeChargerRegistryAsync } = useScaffoldWriteContract({
    contractName: "ChargerRegistry",
  });

  const { writeContractAsync: writePlugAndChargeAsync } = useScaffoldWriteContract({
    contractName: "PlugAndChargeCore",
  });

  // Vehicle lookup by hash
  const { data: vehicleOwner } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "ownerOfVehicle",
    args: sessionVehicleHash ? [sessionVehicleHash as `0x${string}`] : undefined,
  } as any);

  // Vehicle lookup by chip ID
  const { data: vehicleHashByChip } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "getVehicleByChip",
    args: sessionChipId ? [`0x${Buffer.from(sessionChipId).toString('hex').padStart(64, '0')}` as `0x${string}`] : undefined,
  } as any);

  // Vehicle lookup by ISO-15118 identifier using new contract function
  const { data: vehicleHashByIso15118 } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "getVehicleByIso15118Identifier",
    args: sessionIso15118Id && sessionIso15118Id.trim().length > 0 ? [sessionIso15118Id.trim()] : undefined,
  } as any);

  // Debug logging for ISO-15118 lookup
  useEffect(() => {
    if (sessionIso15118Id) {
      console.log("🔍 ISO-15118 lookup - Input:", sessionIso15118Id);
      console.log("🔍 ISO-15118 lookup - Vehicle Hash:", vehicleHashByIso15118);
    }
  }, [sessionIso15118Id, vehicleHashByIso15118]);

  // Get the actual vehicle hash (not the driver address)
  const actualVehicleHash = sessionVehicleHash || vehicleHashByChip || vehicleHashByIso15118;

  // Get driver address from the vehicle hash
  const { data: driverAddressFromHash } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "ownerOfVehicle",
    args: actualVehicleHash ? [actualVehicleHash as `0x${string}`] : undefined,
  } as any);

  const driverAddress = driverAddressFromHash;

  // Debug logging for all lookup methods
  useEffect(() => {
    console.log("🔍 All lookup methods:");
    console.log("  - sessionVehicleHash:", sessionVehicleHash);
    console.log("  - vehicleHashByChip:", vehicleHashByChip);
    console.log("  - vehicleHashByIso15118:", vehicleHashByIso15118);
    console.log("  - actualVehicleHash:", actualVehicleHash);
    console.log("  - driverAddress:", driverAddress);
  }, [sessionVehicleHash, vehicleHashByChip, vehicleHashByIso15118, actualVehicleHash, driverAddress]);

  // Verify trusted relationship
  const { data: isTrusted } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "trustedChargers",
    args: driverAddress && sessionChargerId ? [driverAddress as `0x${string}`, BigInt(sessionChargerId)] : undefined,
  } as any);

  // Event history for chargers
  const { data: chargerEvents } = useScaffoldEventHistory({
    contractName: "ChargerRegistry",
    eventName: "ChargerRegistered",
    watch: true,
  });

  // Event history for charger updates
  const { data: chargerUpdateEvents } = useScaffoldEventHistory({
    contractName: "ChargerRegistry",
    eventName: "ChargerUpdated",
    watch: true,
  });

  // Event history for charger active status changes
  const { data: chargerActiveEvents } = useScaffoldEventHistory({
    contractName: "ChargerRegistry",
    eventName: "ChargerActiveSet",
    watch: true,
  });

  // Event history for sessions
  const { data: sessionEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "SessionCreated",
    watch: true,
  });

  // Event history for charge proposals
  const { data: chargeProposedEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "ChargeProposed",
    watch: true,
  });

  // Event history for session disputes
  const { data: sessionDisputedEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "Disputed",
    watch: true,
  });

  // Event history for session settlement
  const { data: sessionSettledEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "Settled",
    watch: true,
  });

  // Event history for refund claims
  const { data: refundClaimedEvents } = useScaffoldEventHistory({
    contractName: "PlugAndChargeCore",
    eventName: "Refunded",
    watch: true,
  });

  // Stable address for comparison
  const stableAddress = useMemo(() => connectedAddress?.toLowerCase(), [connectedAddress]);

  // Memoize processed chargers to prevent infinite loops
  const processedChargers = useMemo(() => {
    if (!chargerEvents) return [];
    
    // Start with registered chargers
    const allChargers = chargerEvents.map(event => ({
      chargerId: event.args.chargerId?.toString() || "",
      owner: event.args.owner || "",
      latE7: Number(event.args.latE7) || 0,
      lngE7: Number(event.args.lngE7) || 0,
      pricePerKWhMilliUSD: Number(event.args.pricePerKWhMilliUSD) || 0,
      powerKW: Number(event.args.powerKW) || 0,
      active: true,
    }));

    // Apply updates from ChargerUpdated events
    if (chargerUpdateEvents) {
      chargerUpdateEvents.forEach(event => {
        const chargerId = event.args.chargerId?.toString() || "";
        const chargerIndex = allChargers.findIndex(c => c.chargerId === chargerId);
        if (chargerIndex !== -1) {
          allChargers[chargerIndex] = {
            ...allChargers[chargerIndex],
            latE7: Number(event.args.latE7) || allChargers[chargerIndex].latE7,
            lngE7: Number(event.args.lngE7) || allChargers[chargerIndex].lngE7,
            pricePerKWhMilliUSD: Number(event.args.pricePerKWhMilliUSD) || allChargers[chargerIndex].pricePerKWhMilliUSD,
            powerKW: Number(event.args.powerKW) || allChargers[chargerIndex].powerKW,
          };
        }
      });
    }

    // Apply active status changes from ChargerActiveSet events
    if (chargerActiveEvents) {
      chargerActiveEvents.forEach(event => {
        const chargerId = event.args.chargerId?.toString() || "";
        const chargerIndex = allChargers.findIndex(c => c.chargerId === chargerId);
        if (chargerIndex !== -1) {
          allChargers[chargerIndex] = {
            ...allChargers[chargerIndex],
            active: event.args.active || false,
          };
        }
      });
    }
    
    return allChargers;
  }, [chargerEvents, chargerUpdateEvents, chargerActiveEvents]);

  // Load all chargers
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const chargersChanged = JSON.stringify(processedChargers) !== JSON.stringify(lastProcessedEvents.current.chargers);
    if (chargersChanged) {
      processingRef.current = true;
      setChargers(processedChargers);
      lastProcessedEvents.current.chargers = processedChargers;
      processingRef.current = false;
    }
  }, [processedChargers]);

  // Get all session IDs for owned chargers
  const sessionIds = useMemo(() => {
    if (!sessionEvents || !stableAddress || chargers.length === 0) return [];
    
    const ownedChargerIds = chargers
      .filter(c => c.owner.toLowerCase() === stableAddress)
      .map(c => c.chargerId);
    
    return sessionEvents
      .filter(event => ownedChargerIds.includes(event.args.chargerId?.toString() || ""))
      .map(event => event.args.sessionId?.toString() || "")
      .filter(id => id !== "");
  }, [sessionEvents, stableAddress, chargers]);

  // Process complete session data from events with state tracking
  const processedSessions = useMemo(() => {
    if (!sessionEvents || !stableAddress || chargers.length === 0) return [];
    
    const ownedChargerIds = chargers
      .filter(c => c.owner.toLowerCase() === stableAddress)
      .map(c => c.chargerId);
    
    return sessionEvents
      .filter(event => ownedChargerIds.includes(event.args.chargerId?.toString() || ""))
      .map(event => {
        const sessionId = event.args.sessionId?.toString() || "";
        
        // Determine session state from events
        let state = 1; // Default to active
        let proposed = "0";
        let proposeTs = 0;
        
        // Check if charge was proposed
        const chargeProposed = chargeProposedEvents?.find(e => e.args.sessionId?.toString() === sessionId);
        if (chargeProposed) {
          state = 2; // Proposed
          proposed = chargeProposed.args.amount?.toString() || "0";
          proposeTs = Number(chargeProposed.blockNumber) || 0;
        }
        
        // Note: We don't have a separate "ProposalAccepted" event, 
        // the proposal stays in state 2 until settled or disputed
        
        // Check if session was disputed
        const sessionDisputed = sessionDisputedEvents?.find(e => e.args.sessionId?.toString() === sessionId);
        if (sessionDisputed) {
          state = 3; // Disputed
        }
        
        // Check if session was settled
        const sessionSettled = sessionSettledEvents?.find(e => e.args.sessionId?.toString() === sessionId);
        if (sessionSettled) {
          state = 4; // Settled
        }
        
        // Check if refund was claimed
        const refundClaimed = refundClaimedEvents?.find(e => e.args.sessionId?.toString() === sessionId);
        if (refundClaimed) {
          state = 5; // Refunded
        }
        
        return {
          sessionId,
        driver: event.args.driver || "",
        sponsor: event.args.sponsor || "",
        vehicleHash: event.args.vehicleHash || "",
        chargerId: event.args.chargerId?.toString() || "",
          state,
        reserved: event.args.initialDeposit?.toString() || "0",
          proposed,
          startTs: Number(event.blockNumber) || 0,
        endTs: 0,
          proposeTs,
        };
      });
  }, [sessionEvents, stableAddress, chargers, chargeProposedEvents, sessionDisputedEvents, sessionSettledEvents, refundClaimedEvents]);

  // Split sessions by state
  const activeSessions = processedSessions.filter(s => s.state === 1);
  const proposedSessions = processedSessions.filter(s => s.state === 2);
  const completedSessions = processedSessions.filter(s => s.state === 4);

  // Update sessions when data changes
  useEffect(() => {
    if (processingRef.current) return;
    
    // Only update if data has actually changed
    const sessionsChanged = JSON.stringify(processedSessions) !== JSON.stringify(lastProcessedEvents.current.sessions);
    if (sessionsChanged) {
      processingRef.current = true;
      lastProcessedEvents.current.sessions = processedSessions;
      processingRef.current = false;
    }
  }, [processedSessions]);

  // Set default values when connected
  useEffect(() => {
    if (connectedAddress) {
      setNewChargerOwner(connectedAddress);
      setSessionPayer(connectedAddress);
    }
  }, [connectedAddress]);

  // Generate random session salt
  const generateSessionSalt = () => {
    const randomBytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
    const hex = randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    setSessionSalt(`0x${hex}`);
  };

  // Register new charger
  const handleRegisterCharger = async () => {
    if (!newChargerId || !newChargerOwner || !newChargerLat || !newChargerLng || !newChargerPrice || !newChargerPower) return;
    
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      const latE7 = Math.round(parseFloat(newChargerLat) * 1e7);
      const lngE7 = Math.round(parseFloat(newChargerLng) * 1e7);
      const pricePerKWhMilliUSD = Math.round(parseFloat(newChargerPrice) * 1000);
      const powerKW = parseInt(newChargerPower);
      
      await writeChargerRegistryAsync({
        functionName: "registerCharger",
        args: [
          BigInt(newChargerId),
          newChargerOwner as `0x${string}`,
          latE7,
          lngE7,
          pricePerKWhMilliUSD,
          powerKW
        ],
      });
      
      // Reset form
      setNewChargerId("");
      setNewChargerLat("");
      setNewChargerLng("");
      setNewChargerPrice("");
      setNewChargerPower("");
      setShowRegisterCharger(false);
      setSuccessMessage("Charger registered successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error: any) {
      console.error("Error registering charger:", error);
      
      // Parse error message for user-friendly display
      if (error?.message?.includes("ErrAlreadyRegistered")) {
        setErrorMessage("This charger ID is already registered. Please choose a different ID.");
      } else if (error?.message?.includes("ErrNotChargerOwner")) {
        setErrorMessage("You are not authorized to register this charger.");
      } else {
        setErrorMessage("Failed to register charger. Please check your inputs and try again.");
      }
    }
  };

  // Update charger
  const handleUpdateCharger = async (chargerId: string) => {
    if (!editPrice) return;
    
    try {
      const charger = chargers.find(c => c.chargerId === chargerId);
      if (!charger) return;
      
      const pricePerKWhMilliUSD = Math.round(parseFloat(editPrice) * 1000);
      
      await writeChargerRegistryAsync({
        functionName: "updateCharger",
        args: [
          BigInt(chargerId),
          charger.latE7,
          charger.lngE7,
          pricePerKWhMilliUSD,
          charger.powerKW
        ],
      });
      
      setEditingCharger(null);
      setEditPrice("");
    } catch (error) {
      console.error("Error updating charger:", error);
    }
  };

  // Set charger active status
  const handleSetChargerActive = async (chargerId: string, active: boolean) => {
    try {
      await writeChargerRegistryAsync({
        functionName: "setActive",
        args: [BigInt(chargerId), active],
      });
    } catch (error) {
      console.error("Error setting charger active status:", error);
    }
  };

  // Start charging session
  const handleStartSession = async () => {
    if (!sessionChargerId || !sessionDeposit || !driverAddress) return;
    
    setErrorMessage("");
    setSuccessMessage("");
    
    try {
      // Verify trusted relationship
      if (!isTrusted) {
        setErrorMessage("This charger is not trusted by the driver!");
        return;
      }
      
      // Use the actual vehicle hash we found
      if (!actualVehicleHash) {
        setErrorMessage("Please provide vehicle hash, chip ID, or ISO-15118 identifier!");
        return;
      }
      
      const vehicleHash = actualVehicleHash;
      
      // Auto-generate session salt
      const randomBytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      const autoSessionSalt = `0x${randomBytes.map(b => b.toString(16).padStart(2, '0')).join('')}`;
      
      const initialDeposit = BigInt(Math.round(parseFloat(sessionDeposit) * 1e6)); // USDC has 6 decimals
      
        await writePlugAndChargeAsync({
          functionName: "createSessionByCharger",
          args: [
          vehicleHash as `0x${string}`,
            BigInt(sessionChargerId),
          autoSessionSalt as `0x${string}`,
          driverAddress as `0x${string}`, // DRIVER as payer!
            initialDeposit,
            false,
            {
              value: 0n,
              deadline: 0n,
              v: 0,
              r: "0x0000000000000000000000000000000000000000000000000000000000000000",
              s: "0x0000000000000000000000000000000000000000000000000000000000000000"
            }
          ],
        });
      
      // Reset form
      setSessionChargerId("");
      setSessionDeposit("");
      setSessionVehicleHash("");
      setSessionChipId("");
      setSessionIso15118Id("");
      setShowStartSession(false);
      setSuccessMessage("Charging session started successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error: any) {
      console.error("Error starting session:", error);
      
      // Parse error message for user-friendly display
      if (error?.message?.includes("ErrNotTrusted")) {
        setErrorMessage("This charger is not trusted by the driver!");
      } else if (error?.message?.includes("ErrNotRegistered")) {
        setErrorMessage("Vehicle or charger not found!");
      } else {
        setErrorMessage("Failed to start charging session. Please check your inputs and try again.");
      }
    }
  };

  // Charger claiming functions
  const handleProposeCharge = async (sessionId: string, amount: string) => {
    try {
      const amountInWei = BigInt(Math.round(parseFloat(amount) * 1e6)); // USDC has 6 decimals
      
      await writePlugAndChargeAsync({
        functionName: "endAndPropose",
        args: [BigInt(sessionId), amountInWei],
      });
      
      setSuccessMessage("Charge proposed successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error proposing charge:", error);
      setErrorMessage("Failed to propose charge. Please try again.");
    }
  };

  const handleSettleSession = async (sessionId: string) => {
    try {
      await writePlugAndChargeAsync({
        functionName: "finalizeIfNoDispute",
        args: [BigInt(sessionId)],
      });
      
      setSuccessMessage("Session settled successfully!");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error settling session:", error);
      setErrorMessage("Failed to settle session. Please try again.");
    }
  };

  // End session and propose charge
  const handleEndAndPropose = async (sessionId: string) => {
    if (!proposeAmount) return;
    
    try {
      const amountC = BigInt(Math.round(parseFloat(proposeAmount) * 1e6)); // USDC has 6 decimals
      
      await writePlugAndChargeAsync({
        functionName: "endAndPropose",
        args: [BigInt(sessionId), amountC],
      });
      
      setProposingSessionId(null);
      setProposeAmount("");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <PowerIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h1 className="text-2xl font-bold mb-2">Charger Operator Dashboard</h1>
          <p className="text-gray-400">Please connect your wallet to manage your charging stations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Charger Operator Dashboard
              </h1>
              <div className="text-gray-400">
                Connected as: <Address address={connectedAddress} />
              </div>
            </div>
          </div>
        </div>


        {/* My Chargers Section */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-blue-500/20 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
              <PowerIcon className="w-6 h-6" />
              My Chargers
            </h2>
            <button
              onClick={() => setShowRegisterCharger(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Register New Charger
            </button>
          </div>

          {/* Register Charger Form */}
          {showRegisterCharger && (
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-600 mb-6">
              <h3 className="text-lg font-bold text-blue-400 mb-4">Register New Charger</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Charger ID
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1, 2, 3..."
                    value={newChargerId}
                    onChange={(e) => setNewChargerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Owner Address
                  </label>
                  <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newChargerOwner}
                    onChange={(e) => setNewChargerOwner(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <button
                      onClick={() => setNewChargerOwner(connectedAddress || "")}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
                    >
                      Use My Address
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="e.g., 50.0755"
                    value={newChargerLat}
                    onChange={(e) => setNewChargerLat(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="e.g., 14.4378"
                    value={newChargerLng}
                    onChange={(e) => setNewChargerLng(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price per kWh (USD)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g., 0.30"
                    value={newChargerPrice}
                    onChange={(e) => setNewChargerPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Power (kW)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 50"
                    value={newChargerPower}
                    onChange={(e) => setNewChargerPower(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              {/* Error/Success Messages */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-400 text-sm">{successMessage}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleRegisterCharger}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Register Charger
                </button>
                <button
                  onClick={() => {
                    setShowRegisterCharger(false);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chargers List */}
          <div className="space-y-4">
            {chargers.filter(c => c.owner.toLowerCase() === stableAddress).length === 0 ? (
              <p className="text-gray-400 text-center py-8">No chargers registered yet</p>
            ) : (
              chargers.filter(c => c.owner.toLowerCase() === stableAddress).map((charger) => (
                <div key={charger.chargerId} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-bold text-white">Charger #{charger.chargerId}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          charger.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {charger.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          {/* Location icon */}
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            {charger.latE7 / 1e7}, {charger.lngE7 / 1e7}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            ${(charger.pricePerKWhMilliUSD / 1000).toFixed(3)}/kWh
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PowerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{charger.powerKW}kW</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <Address address={charger.owner} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCharger(charger.chargerId);
                          setEditPrice((charger.pricePerKWhMilliUSD / 1000).toString());
                          setEditActive(charger.active);
                        }}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors flex items-center gap-1"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleSetChargerActive(charger.chargerId, !charger.active)}
                        className={`px-3 py-1 rounded-lg text-white text-sm transition-colors ${
                          charger.active 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {charger.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {editingCharger === charger.chargerId && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h4 className="text-md font-bold text-blue-400 mb-3">Edit Charger</h4>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Price per kWh (USD)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Active Status
                          </label>
                          <select
                            value={editActive.toString()}
                            onChange={(e) => setEditActive(e.target.value === "true")}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleUpdateCharger(charger.chargerId)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                        >
                          Update Price
                        </button>
                        <button
                          onClick={() => setEditingCharger(null)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Start New Charging Session Section */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-purple-500/20 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
              <PlayIcon className="w-6 h-6" />
              Start New Charging Session
            </h2>
            <button
              onClick={() => setShowStartSession(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Start Session
            </button>
          </div>

          {/* Start Session Form */}
          {showStartSession && (
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-600">
              <h3 className="text-lg font-bold text-purple-400 mb-4">Start Charging Session</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Your Charger
                  </label>
                  <select
                    value={sessionChargerId}
                    onChange={(e) => setSessionChargerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Choose your charger...</option>
                    {chargers.filter(c => c.active && c.owner.toLowerCase() === stableAddress).map((charger) => (
                      <option key={charger.chargerId} value={charger.chargerId}>
                        Charger #{charger.chargerId} - {charger.powerKW}kW - ${(charger.pricePerKWhMilliUSD / 1000).toFixed(3)}/kWh
                      </option>
                    ))}
                  </select>
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Driver Identification
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Vehicle Hash (0x...)"
                      value={sessionVehicleHash}
                      onChange={(e) => setSessionVehicleHash(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <div className="text-center text-gray-400 text-sm">OR</div>
                  <input
                    type="text"
                      placeholder="Chip ID (e.g., chip 31848912)"
                      value={sessionChipId}
                      onChange={(e) => setSessionChipId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <div className="text-center text-gray-400 text-sm">OR</div>
                    <input
                      type="text"
                      placeholder="ISO-15118 Identifier (e.g., ISO15118_ID_123)"
                      value={sessionIso15118Id}
                      onChange={(e) => setSessionIso15118Id(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                </div>
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Enter vehicle hash, chip ID, or ISO-15118 identifier to identify the driver
                  </p>
              </div>

                {/* Driver Preview */}
                {driverAddress && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">🔍 Driver Found:</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-300">Driver:</span>
                      <Address address={driverAddress as `0x${string}`} />
                    </div>
                    {sessionChargerId && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">Trusted Status:</span>
                        {isTrusted ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <span>✅</span>
                            <span className="text-sm">Trusted</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-400">
                            <span>❌</span>
                            <span className="text-sm">Not Trusted</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Deposit (USDC)
                </label>
                  <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  step="0.01"
                      placeholder="e.g., 50.00"
                  value={sessionDeposit}
                  onChange={(e) => setSessionDeposit(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <button
                      onClick={() => setSessionDeposit("50")}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
                    >
                      50
                    </button>
                    <button
                      onClick={() => setSessionDeposit("100")}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
                    >
                      100
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    💡 This amount will be reserved for the charging session. You'll only pay for the energy you actually use.
                  </p>
                </div>

                {/* Error/Success Messages */}
                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{errorMessage}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-green-400 text-sm">{successMessage}</p>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">ℹ️ How it works:</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Select your charger and identify the driver using any method:</li>
                    <li>  - Vehicle Hash: Direct vehicle identifier</li>
                    <li>  - Chip ID: Physical chip identifier (e.g., "chip 31848912")</li>
                    <li>  - ISO-15118: Standard vehicle-to-grid identifier</li>
                    <li>• System will verify the driver trusts this charger</li>
                    <li>• Driver's wallet will be charged for the session</li>
                    <li>• The session will start immediately after confirmation</li>
                  </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStartSession}
                    disabled={!sessionChargerId || !sessionDeposit || !driverAddress || !isTrusted}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                    🚗 Start Charging Session
                </button>
                <button
                  onClick={() => setShowStartSession(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                </div>
                
                {driverAddress && sessionChargerId && !isTrusted && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">
                      ⚠️ This charger is not trusted by the driver. The driver must add this charger to their trusted list first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Proposed Sessions - Pending Driver Approval */}
        {proposedSessions.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 backdrop-blur-sm p-6 rounded-3xl border border-yellow-500/20 mb-6">
            <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2 mb-6">
              <ClockIcon className="w-6 h-6" />
              Pending Driver Approval ({proposedSessions.length})
            </h2>
            <div className="space-y-4">
              {proposedSessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-bold text-white">Session #{session.sessionId}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Proposed
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Driver: <Address address={session.driver} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PowerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Charger #{session.chargerId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Proposed: {formatUSDC(BigInt(session.proposed))}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Proposed: {new Date(session.proposeTs * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSettleSession(session.sessionId)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                      >
                        💰 Claim Payment
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Charging Sessions Section */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20 mb-6">
          <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-6">
            <PlayIcon className="w-6 h-6" />
            My Active Charging Sessions
          </h2>

          <div className="space-y-4">
            {activeSessions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active charging sessions</p>
            ) : (
              activeSessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-bold text-white">Session #{session.sessionId}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Active
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Driver: <Address address={session.driver} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PowerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Charger #{session.chargerId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            ${(parseInt(session.reserved) / 1e6).toFixed(2)} reserved
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProposingSessionId(session.sessionId)}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm transition-colors flex items-center gap-1"
                      >
                        <StopIcon className="w-4 h-4" />
                        End & Propose
                      </button>
                    </div>
                  </div>

                  {/* Propose Charge Form */}
                  {proposingSessionId === session.sessionId && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h4 className="text-md font-bold text-orange-400 mb-3">End Session & Propose Charge</h4>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Charge Amount (USDC)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 5.50"
                          value={proposeAmount}
                          onChange={(e) => setProposeAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Maximum: ${(parseInt(session.reserved) / 1e6).toFixed(2)} USDC
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleEndAndPropose(session.sessionId)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-medium transition-colors"
                        >
                          End & Propose Charge
                        </button>
                        <button
                          onClick={() => setProposingSessionId(null)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Sessions - History */}
        {completedSessions.length > 0 && (
          <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 backdrop-blur-sm p-6 rounded-3xl border border-green-500/20 mb-6">
            <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-6">
              <CheckCircleIcon className="w-6 h-6" />
              Completed Sessions ({completedSessions.length})
            </h2>
            <div className="space-y-4">
              {completedSessions.map((session) => (
                <div key={session.sessionId} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-bold text-white">Session #{session.sessionId}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Settled
                        </span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Driver: <Address address={session.driver} />
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <PowerIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Charger #{session.chargerId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Final: {formatUSDC(BigInt(session.proposed))}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Started: {new Date(session.startTs * 1000).toLocaleString()}
                        {session.endTs > 0 && (
                          <span> • Ended: {new Date(session.endTs * 1000).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-green-400">
                      <span className="text-sm">✅ Payment received</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChargerPage;
