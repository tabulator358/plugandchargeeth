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
  UserIcon
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";

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
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  
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

  // Memoize processed active sessions to prevent infinite loops
  const processedActiveSessions = useMemo(() => {
    if (!sessionEvents || !stableAddress || chargers.length === 0) return [];
    
    const ownedChargerIds = chargers
      .filter(c => c.owner.toLowerCase() === stableAddress)
      .map(c => c.chargerId);
    
    return sessionEvents
      .filter(event => ownedChargerIds.includes(event.args.chargerId?.toString() || ""))
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
  }, [sessionEvents, stableAddress, chargers]);

  // Load active sessions for owned chargers
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
    } catch (error) {
      console.error("Error registering charger:", error);
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
    if (!sessionVehicleHash || !sessionChargerId || !sessionSalt || !sessionPayer || !sessionDeposit) return;
    
    try {
      const vehicleHash = `0x${Buffer.from(sessionVehicleHash).toString('hex').padStart(64, '0')}` as `0x${string}`;
      const sessionSaltBytes = sessionSalt as `0x${string}`;
      const initialDeposit = BigInt(Math.round(parseFloat(sessionDeposit) * 1e6)); // USDC has 6 decimals
      
      if (sessionMode === "trusted") {
        await writePlugAndChargeAsync({
          functionName: "createSessionByCharger",
          args: [
            vehicleHash,
            BigInt(sessionChargerId),
            sessionSaltBytes,
            sessionPayer as `0x${string}`,
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
      } else {
        await writePlugAndChargeAsync({
          functionName: "createSessionGuestByCharger",
          args: [
            vehicleHash,
            BigInt(sessionChargerId),
            sessionSaltBytes,
            sessionPayer as `0x${string}`,
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
      }
      
      // Reset form
      setSessionVehicleHash("");
      setSessionChargerId("");
      setSessionSalt("");
      setSessionDeposit("");
      setShowStartSession(false);
    } catch (error) {
      console.error("Error starting session:", error);
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
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newChargerOwner}
                    onChange={(e) => setNewChargerOwner(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
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
              <div className="flex gap-4">
                <button
                  onClick={handleRegisterCharger}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  Register Charger
                </button>
                <button
                  onClick={() => setShowRegisterCharger(false)}
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
              
              {/* Session Mode Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Session Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="trusted"
                      checked={sessionMode === "trusted"}
                      onChange={(e) => setSessionMode(e.target.value as "trusted" | "guest")}
                      className="text-purple-600"
                    />
                    <span className="text-white">Trusted Driver Session</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="guest"
                      checked={sessionMode === "guest"}
                      onChange={(e) => setSessionMode(e.target.value as "trusted" | "guest")}
                      className="text-purple-600"
                    />
                    <span className="text-white">Guest Session</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {sessionMode === "trusted" 
                    ? "Driver must have set this charger as trusted" 
                    : "No trust requirement, any payer can use"
                  }
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Hash
                  </label>
                  <input
                    type="text"
                    placeholder={sessionMode === "trusted" ? "Registered vehicle hash" : "Guest vehicle label"}
                    value={sessionVehicleHash}
                    onChange={(e) => setSessionVehicleHash(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Charger ID
                  </label>
                  <select
                    value={sessionChargerId}
                    onChange={(e) => setSessionChargerId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select a charger...</option>
                    {chargers.filter(c => c.active).map((charger) => (
                      <option key={charger.chargerId} value={charger.chargerId}>
                        Charger #{charger.chargerId} - {charger.powerKW}kW
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Salt
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={sessionSalt}
                      onChange={(e) => setSessionSalt(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    />
                    <button
                      onClick={generateSessionSalt}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payer Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={sessionPayer}
                    onChange={(e) => setSessionPayer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initial Deposit (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 10.00"
                  value={sessionDeposit}
                  onChange={(e) => setSessionDeposit(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStartSession}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                >
                  Start Session
                </button>
                <button
                  onClick={() => setShowStartSession(false)}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

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

      </div>
    </div>
  );
};

export default ChargerPage;
