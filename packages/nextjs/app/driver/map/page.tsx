"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAccount } from "wagmi";
import { 
  MapPinIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { Address } from "~~/components/scaffold-eth/Address/Address";
import Link from "next/link";

interface Charger {
  chargerId: string;
  owner: string;
  latE7: number;
  lngE7: number;
  pricePerKWhMilliUSD: number;
  powerKW: number;
  active: boolean;
}

interface Vehicle {
  vehicleHash: string;
  chipId: string;
  iso15118Enabled: boolean;
  publicKeyHash: string;
}

const DriverMapPage = () => {
  const { address: connectedAddress } = useAccount();
  
  // State management
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [sessionDeposit, setSessionDeposit] = useState("");
  const [sessionSalt, setSessionSalt] = useState("");
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPower, setMinPower] = useState("");
  
  // Refs to prevent infinite updates
  const processingRef = useRef(false);
  const lastProcessedEvents = useRef<{
    chargers: any[];
    vehicles: any[];
  }>({ chargers: [], vehicles: [] });

  // Contract write hooks
  const { writeContractAsync: writePlugAndChargeAsync } = useScaffoldWriteContract({
    contractName: "PlugAndChargeCore",
  });

  // Event history for chargers
  const { data: chargerEvents } = useScaffoldEventHistory({
    contractName: "ChargerRegistry",
    eventName: "ChargerRegistered",
    watch: false,
  });

  // Event history for vehicles
  const { data: vehicleEvents } = useScaffoldEventHistory({
    contractName: "VehicleRegistry",
    eventName: "VehicleRegistered",
    watch: false,
  });

  // Stable address for comparison
  const stableAddress = useMemo(() => connectedAddress?.toLowerCase(), [connectedAddress]);

  // Load all chargers
  useEffect(() => {
    if (processingRef.current) return;
    
    if (chargerEvents) {
      const allChargers = chargerEvents.map(event => ({
        chargerId: event.args.chargerId?.toString() || "",
        owner: event.args.owner || "",
        latE7: event.args.latE7 || 0,
        lngE7: event.args.lngE7 || 0,
        pricePerKWhMilliUSD: event.args.pricePerKWhMilliUSD || 0,
        powerKW: event.args.powerKW || 0,
        active: true, // Default to active, would need additional call to get current status
      }));
      
      // Only update if data has actually changed
      const chargersChanged = JSON.stringify(allChargers) !== JSON.stringify(lastProcessedEvents.current.chargers);
      if (chargersChanged) {
        processingRef.current = true;
        setChargers(allChargers);
        lastProcessedEvents.current.chargers = allChargers;
        processingRef.current = false;
      }
    }
  }, [chargerEvents]);

  // Load user vehicles
  useEffect(() => {
    if (processingRef.current) return;
    
    if (vehicleEvents && stableAddress) {
      const userVehicles = vehicleEvents
        .filter(event => event.args.driver?.toLowerCase() === stableAddress)
        .map(event => ({
          vehicleHash: event.args.vehicleHash || "",
          chipId: event.args.chipId || "",
          iso15118Enabled: event.args.iso15118Enabled || false,
          publicKeyHash: "", // Would need additional call to get this
        }));
      
      // Only update if data has actually changed
      const vehiclesChanged = JSON.stringify(userVehicles) !== JSON.stringify(lastProcessedEvents.current.vehicles);
      if (vehiclesChanged) {
        processingRef.current = true;
        setVehicles(userVehicles);
        lastProcessedEvents.current.vehicles = userVehicles;
        processingRef.current = false;
      }
    } else if (!stableAddress) {
      setVehicles([]);
      lastProcessedEvents.current.vehicles = [];
    }
  }, [vehicleEvents, stableAddress]);

  // Generate random session salt
  const generateSessionSalt = () => {
    const randomBytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
    const hex = randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    setSessionSalt(`0x${hex}`);
  };

  // Filter chargers
  const filteredChargers = useMemo(() => {
    let filtered = chargers.filter(c => c.active);

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.chargerId.toLowerCase().includes(term) ||
        c.owner.toLowerCase().includes(term)
      );
    }

    // Filter by max price
    if (maxPrice) {
      const maxPriceWei = parseFloat(maxPrice) * 1000; // Convert to milliUSD
      filtered = filtered.filter(c => c.pricePerKWhMilliUSD <= maxPriceWei);
    }

    // Filter by min power
    if (minPower) {
      const minPowerNum = parseInt(minPower);
      filtered = filtered.filter(c => c.powerKW >= minPowerNum);
    }

    return filtered;
  }, [chargers, searchTerm, maxPrice, minPower]);

  // Start charging session
  const handleStartSession = async () => {
    if (!selectedCharger || !selectedVehicle || !sessionDeposit || !sessionSalt) return;
    
    try {
      const vehicleHash = selectedVehicle as `0x${string}`;
      const sessionSaltBytes = sessionSalt as `0x${string}`;
      const initialDeposit = BigInt(Math.round(parseFloat(sessionDeposit) * 1e6)); // USDC has 6 decimals
      
      await writePlugAndChargeAsync({
        functionName: "createSession",
        args: [
          vehicleHash,
          BigInt(selectedCharger.chargerId),
          sessionSaltBytes,
          initialDeposit,
          "0x0000000000000000000000000000000000000000", // No sponsor
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
      setSelectedCharger(null);
      setSelectedVehicle("");
      setSessionDeposit("");
      setSessionSalt("");
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  // Convert coordinates to display format
  const formatCoordinates = (latE7: number, lngE7: number) => {
    const lat = latE7 / 1e7;
    const lng = lngE7 / 1e7;
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Calculate distance (simple approximation)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <MapPinIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h1 className="text-2xl font-bold mb-2">Charger Map</h1>
          <p className="text-gray-400">Please connect your wallet to view available chargers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border-b border-blue-500/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Charger Map
            </h1>
            <p className="text-gray-400">Find and start charging at nearby stations</p>
          </div>
          <Link
            href="/driver"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Back to Driver Dashboard
          </Link>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Simple Map Visualization */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <MapPinIcon className="w-24 h-24 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">Interactive Map</h3>
              <p className="text-gray-500 max-w-md">
                This would be an interactive map showing all charging stations. 
                For now, use the charger list on the right to find and select chargers.
              </p>
            </div>
          </div>

          {/* Charger Markers (simplified visualization) */}
          <div className="absolute inset-0 pointer-events-none">
            {filteredChargers.map((charger, index) => {
              // Simple grid positioning for visualization
              const x = 20 + (index % 4) * 20;
              const y = 20 + Math.floor(index / 4) * 20;
              
              return (
                <div
                  key={charger.chargerId}
                  className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer pointer-events-auto transform -translate-x-2 -translate-y-2 hover:scale-125 transition-transform"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => setSelectedCharger(charger)}
                  title={`Charger #${charger.chargerId} - ${charger.powerKW}kW - $${(charger.pricePerKWhMilliUSD / 1000).toFixed(3)}/kWh`}
                />
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-gray-800/50 backdrop-blur-sm border-l border-gray-600 overflow-y-auto">
          {/* Filters */}
          <div className="p-4 border-b border-gray-600">
            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Filters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search chargers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Price (USD/kWh)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="e.g., 0.50"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Min Power (kW)</label>
                <input
                  type="number"
                  placeholder="e.g., 50"
                  value={minPower}
                  onChange={(e) => setMinPower(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Chargers List */}
          <div className="p-4">
            <h3 className="text-lg font-bold text-green-400 mb-4">
              Available Chargers ({filteredChargers.length})
            </h3>
            
            <div className="space-y-3">
              {filteredChargers.map((charger) => (
                <div
                  key={charger.chargerId}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedCharger?.chargerId === charger.chargerId
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedCharger(charger)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white">Charger #{charger.chargerId}</h4>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{formatCoordinates(charger.latE7, charger.lngE7)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BoltIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{charger.powerKW}kW</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">${(charger.pricePerKWhMilliUSD / 1000).toFixed(3)}/kWh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Address address={charger.owner} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      {selectedCharger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-blue-500/20 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-blue-400 mb-4">Start Charging Session</h3>
            
            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <h4 className="font-bold text-white mb-2">Selected Charger</h4>
              <p className="text-sm text-gray-300">Charger #{selectedCharger.chargerId}</p>
              <p className="text-sm text-gray-300">{selectedCharger.powerKW}kW • ${(selectedCharger.pricePerKWhMilliUSD / 1000).toFixed(3)}/kWh</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Vehicle
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Choose a vehicle...</option>
                  {vehicles.map((vehicle, index) => (
                    <option key={vehicle.vehicleHash} value={vehicle.vehicleHash}>
                      Vehicle #{index + 1} {vehicle.iso15118Enabled ? "(ISO-15118)" : ""}
                    </option>
                  ))}
                </select>
              </div>

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
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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
                  Initial Deposit (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 10.00"
                  value={sessionDeposit}
                  onChange={(e) => setSessionDeposit(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleStartSession}
                disabled={!selectedVehicle || !sessionDeposit || !sessionSalt}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                Start Session
              </button>
              <button
                onClick={() => setSelectedCharger(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverMapPage;
