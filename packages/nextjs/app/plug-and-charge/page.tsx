"use client";

import { useState, useEffect } from "react";
import { formatEther, keccak256, parseEther, stringToBytes } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Zap, Shield, Coins, Wallet, Battery, Car, MapPin, Clock } from "lucide-react";
import "~~/styles/plug-and-charge.css";

export default function PlugAndChargePage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState("vehicles");
  const [particles, setParticles] = useState<Array<{id: number, left: string, delay: string, duration: string}>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Generate particles only on client side
    const generatedParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 20}s`,
      duration: `${15 + Math.random() * 10}s`
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#030712] to-[#0a0a0a] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-purple-500/30 to-cyan-500/30 rounded-full blur-3xl animate-float-slow mix-blend-screen"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full blur-3xl animate-float-medium mix-blend-screen"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/30 to-pink-500/30 rounded-full blur-3xl animate-float-fast mix-blend-screen"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-float-slow mix-blend-screen"></div>
        <div className="absolute bottom-1/3 right-10 w-88 h-88 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full blur-3xl animate-float-medium mix-blend-screen"></div>
        <div className="absolute top-1/3 left-1/2 w-56 h-56 bg-gradient-to-r from-pink-500/30 to-cyan-500/30 rounded-full blur-3xl animate-float-fast mix-blend-screen"></div>
        
        {/* Floating Particles */}
        {isClient && particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full animate-particle opacity-30"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          ></div>
        ))}
        
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 animate-grid-rotate"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            Plug & Charge
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Decentralized EV charging ecosystem powered by blockchain technology. 
            Register vehicles, manage chargers, and process payments seamlessly.
          </p>
        </div>

        {!address && (
          <div className="glass-card border-red-500/50 bg-red-500/10 mb-8">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-400" />
              <span className="text-red-300">Please connect your wallet to interact with the contracts</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="glass-card p-2 flex gap-2">
            {[
              { id: "vehicles", label: "Vehicles", icon: Car },
              { id: "chargers", label: "Chargers", icon: MapPin },
              { id: "sessions", label: "Sessions", icon: Battery },
              { id: "usdc", label: "USDC", icon: Coins },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === id
                    ? "bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                onClick={() => setActiveTab(id)}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === "vehicles" && <VehicleManagement />}
          {activeTab === "chargers" && <ChargerManagement />}
          {activeTab === "sessions" && <SessionManagement />}
          {activeTab === "usdc" && <USDCManagement />}
        </div>
      </div>
    </div>
  );
}

function VehicleManagement() {
  const [vehicleId, setVehicleId] = useState("");
  const [chipId, setChipId] = useState("");
  const [iso15118Enabled, setIso15118Enabled] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [checkVehicleId, setCheckVehicleId] = useState("");

  const { writeContractAsync: writeVehicleRegistry } = useScaffoldWriteContract({
    contractName: "VehicleRegistry",
  });

  const { data: vehicleOwner } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "ownerOfVehicle",
    args: checkVehicleId ? [keccak256(stringToBytes(checkVehicleId))] : undefined,
  });

  const registerVehicle = async () => {
    if (!vehicleId || !chipId) return;
    try {
      await writeVehicleRegistry({
        functionName: "registerVehicle",
        args: [
          keccak256(stringToBytes(vehicleId)),
          keccak256(stringToBytes(chipId))
        ],
      });
      setVehicleId("");
      setChipId("");
      setIso15118Enabled(false);
      setPublicKey("");
    } catch (error) {
      console.error("Error registering vehicle:", error);
    }
  };

  const unregisterVehicle = async () => {
    if (!vehicleId) return;
    try {
      await writeVehicleRegistry({
        functionName: "unregisterVehicle",
        args: [keccak256(stringToBytes(vehicleId))],
      });
      setVehicleId("");
    } catch (error) {
      console.error("Error unregistering vehicle:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Vehicle Management
        </h2>
        <p className="text-slate-400">Register and manage your electric vehicles on the blockchain</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Register Vehicle Card */}
        <div className="glass-card group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-xl">
                <Car className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Register Vehicle</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vehicle ID
                </label>
                <input
                  type="text"
                  placeholder="e.g., TESLA_MODEL_3_ABC123"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Chip ID
                </label>
                <input
                  type="text"
                  placeholder="e.g., CHIP_123456789"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                  value={chipId}
                  onChange={e => setChipId(e.target.value)}
                />
              </div>


              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="iso15118"
                  className="w-5 h-5 text-purple-500 bg-slate-800 border-slate-700 rounded focus:ring-purple-500/50"
                  checked={iso15118Enabled}
                  onChange={e => setIso15118Enabled(e.target.checked)}
                />
                <label htmlFor="iso15118" className="text-sm font-medium text-slate-300">
                  Enable ISO 15118 (Plug & Charge)
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
                  onClick={registerVehicle}
                >
                  Register Vehicle
                </button>
                <button 
                  className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-105"
                  onClick={unregisterVehicle}
                >
                  Unregister
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Check Vehicle Card */}
        <div className="glass-card group hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-xl">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Check Vehicle Owner</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vehicle ID
                </label>
                <input
                  type="text"
                  placeholder="e.g., TESLA_MODEL_3_ABC123"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all duration-300"
                  value={checkVehicleId}
                  onChange={e => setCheckVehicleId(e.target.value)}
                />
              </div>
              
              {vehicleOwner && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-400">Vehicle Found</span>
                  </div>
                  <p className="text-white">
                    <span className="text-slate-400">Owner:</span> <Address address={vehicleOwner} />
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChargerManagement() {
  const [chargerId, setChargerId] = useState("");
  const [chargerOwner, setChargerOwner] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [pricePerKWh, setPricePerKWh] = useState("");
  const [powerKW, setPowerKW] = useState("");
  const [checkChargerId, setCheckChargerId] = useState("");

  const { writeContractAsync: writeChargerRegistry } = useScaffoldWriteContract({
    contractName: "ChargerRegistry",
  });

  const { data: chargerOwnerCheck } = useScaffoldReadContract({
    contractName: "ChargerRegistry",
    functionName: "ownerOf",
    args: checkChargerId ? [BigInt(checkChargerId)] : undefined,
  });

  const { data: chargerDetails } = useScaffoldReadContract({
    contractName: "ChargerRegistry",
    functionName: "get",
    args: checkChargerId ? [BigInt(checkChargerId)] : undefined,
  });

  const registerCharger = async () => {
    if (!chargerId || !chargerOwner) return;
    try {
      await writeChargerRegistry({
        functionName: "registerCharger",
        args: [
          BigInt(chargerId),
          chargerOwner as `0x${string}`,
          Math.round(parseFloat(lat) * 1e7), // Convert to E7 format
          Math.round(parseFloat(lng) * 1e7),
          Math.round(parseFloat(pricePerKWh) * 1000), // Convert to milliUSD
          parseInt(powerKW),
        ],
      });
      // Reset form
      setChargerId("");
      setChargerOwner("");
    } catch (error) {
      console.error("Error registering charger:", error);
    }
  };

  const updateCharger = async () => {
    if (!chargerId) return;
    try {
      await writeChargerRegistry({
        functionName: "updateCharger",
        args: [
          BigInt(chargerId),
          Math.round(parseFloat(lat) * 1e7),
          Math.round(parseFloat(lng) * 1e7),
          Math.round(parseFloat(pricePerKWh) * 1000),
          parseInt(powerKW),
        ],
      });
    } catch (error) {
      console.error("Error updating charger:", error);
    }
  };

  const setChargerActive = async (active: boolean) => {
    if (!chargerId) return;
    try {
      await writeChargerRegistry({
        functionName: "setActive",
        args: [BigInt(chargerId), active],
      });
    } catch (error) {
      console.error("Error setting charger active status:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🔌 Charger Management</h2>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Register Charger</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Charger ID</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1"
                className="input input-bordered"
                value={chargerId}
                onChange={e => setChargerId(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Charger Owner</span>
              </label>
              <AddressInput value={chargerOwner} onChange={setChargerOwner} placeholder="0x..." />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Latitude</span>
              </label>
              <input
                type="number"
                step="0.0000001"
                placeholder="e.g., 50.0755"
                className="input input-bordered"
                value={lat}
                onChange={e => setLat(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Longitude</span>
              </label>
              <input
                type="number"
                step="0.0000001"
                placeholder="e.g., 14.4378"
                className="input input-bordered"
                value={lng}
                onChange={e => setLng(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Price per kWh (USD)</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 0.25"
                className="input input-bordered"
                value={pricePerKWh}
                onChange={e => setPricePerKWh(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Power (kW)</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 50"
                className="input input-bordered"
                value={powerKW}
                onChange={e => setPowerKW(e.target.value)}
              />
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" onClick={registerCharger}>
              Register Charger
            </button>
            <button className="btn btn-secondary" onClick={updateCharger}>
              Update Charger
            </button>
            <button className="btn btn-accent" onClick={() => setChargerActive(true)}>
              Activate
            </button>
            <button className="btn btn-warning" onClick={() => setChargerActive(false)}>
              Deactivate
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Check Charger</h3>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Charger ID</span>
            </label>
            <input
              type="number"
              placeholder="1"
              className="input input-bordered"
              value={checkChargerId}
              onChange={e => setCheckChargerId(e.target.value)}
            />
          </div>
          {chargerOwnerCheck && (
            <div className="mt-4 space-y-2">
              <p>
                <strong>Owner:</strong> <Address address={chargerOwnerCheck} />
              </p>
              {chargerDetails && (
                <>
                  <p>
                    <strong>Latitude:</strong> {Number(chargerDetails.latE7) / 1e7}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {Number(chargerDetails.lngE7) / 1e7}
                  </p>
                  <p>
                    <strong>Price per kWh:</strong> ${Number(chargerDetails.pricePerKWhMilliUSD) / 1000}
                  </p>
                  <p>
                    <strong>Power:</strong> {Number(chargerDetails.powerKW)} kW
                  </p>
                  <p>
                    <strong>Active:</strong> {chargerDetails.active ? "✅" : "❌"}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionManagement() {
  const [vehicleId, setVehicleId] = useState("");
  const [chargerId, setChargerId] = useState("");
  const [sessionSalt, setSessionSalt] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [trustedChargerId, setTrustedChargerId] = useState("");
  const [trusted, setTrusted] = useState(true);

  const { writeContractAsync: writePlugAndCharge } = useScaffoldWriteContract({
    contractName: "PlugAndChargeCore",
  });

  const { data: session } = useScaffoldReadContract({
    contractName: "PlugAndChargeCore",
    functionName: "getSession",
    args: sessionId ? [BigInt(sessionId)] : undefined,
  });

  // const { data: trustedCharger } = useScaffoldReadContract({
  //   contractName: "PlugAndChargeCore",
  //   functionName: "trustedChargers",
  //   args: trustedChargerId ? [trustedChargerId as `0x${string}`, BigInt(chargerId)] : undefined,
  // });

  const createSession = async () => {
    if (!vehicleId || !chargerId || !sessionSalt || !initialDeposit) return;
    try {
      await writePlugAndCharge({
        functionName: "createSession",
        args: [
          keccak256(stringToBytes(vehicleId)),
          BigInt(chargerId),
          keccak256(stringToBytes(sessionSalt)),
          BigInt(parseFloat(initialDeposit) * 1e6), // Convert to USDC units
          sponsor || "0x0000000000000000000000000000000000000000",
          false,
          {
            value: 0n,
            deadline: 0n,
            v: 0,
            r: "0x0000000000000000000000000000000000000000000000000000000000000000",
            s: "0x0000000000000000000000000000000000000000000000000000000000000000",
          },
        ],
      });
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const setTrustedCharger = async () => {
    if (!trustedChargerId) return;
    try {
      await writePlugAndCharge({
        functionName: "setTrustedCharger",
        args: [address as `0x${string}`, BigInt(trustedChargerId), trusted],
      });
      setTrustedChargerId("");
    } catch (error) {
      console.error("Error setting trusted charger:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">⚡ Session Management</h2>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Create Charging Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Vehicle ID</span>
              </label>
              <input
                type="text"
                placeholder="TESLA_MODEL_3_ABC123"
                className="input input-bordered"
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Charger ID</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1"
                className="input input-bordered"
                value={chargerId}
                onChange={e => setChargerId(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Session Salt</span>
              </label>
              <input
                type="text"
                placeholder="session_salt_123"
                className="input input-bordered"
                value={sessionSalt}
                onChange={e => setSessionSalt(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Initial Deposit (USDC)</span>
              </label>
              <EtherInput value={initialDeposit} onChange={setInitialDeposit} placeholder="50" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Sponsor (optional)</span>
              </label>
              <AddressInput value={sponsor} onChange={setSponsor} placeholder="0x... (leave empty for no sponsor)" />
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" onClick={createSession}>
              Create Session
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Trusted Chargers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Charger ID</span>
              </label>
              <input
                type="number"
                placeholder="e.g., 1"
                className="input input-bordered"
                value={trustedChargerId}
                onChange={e => setTrustedChargerId(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Trust Level</span>
              </label>
              <select
                className="select select-bordered"
                value={trusted.toString()}
                onChange={e => setTrusted(e.target.value === "true")}
              >
                <option value="true">Trusted</option>
                <option value="false">Not Trusted</option>
              </select>
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-secondary" onClick={setTrustedCharger}>
              Set Trusted Charger
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Check Session</h3>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Session ID</span>
            </label>
            <input
              type="number"
              placeholder="1"
              className="input input-bordered"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
            />
          </div>
          {session && (
            <div className="mt-4 space-y-2">
              <p>
                <strong>Driver:</strong> <Address address={session.driver} />
              </p>
              <p>
                <strong>Sponsor:</strong>{" "}
                {session.sponsor === "0x0000000000000000000000000000000000000000" ? (
                  "None"
                ) : (
                  <Address address={session.sponsor} />
                )}
              </p>
              <p>
                <strong>Charger ID:</strong> {session.chargerId.toString()}
              </p>
               <p>
                 <strong>Reserved:</strong> {formatUSDC(session.reserved)} USDC
               </p>
               <p>
                 <strong>Proposed:</strong> {formatUSDC(session.proposed)} USDC
               </p>
              <p>
                <strong>State:</strong>{" "}
                {["Init", "Active", "Proposed", "Disputed", "Settled", "Refunded"][Number(session.state)]}
              </p>
              <p>
                <strong>Start Time:</strong> {new Date(Number(session.startTs) * 1000).toLocaleString()}
              </p>
              {session.endTs > 0 && (
                <p>
                  <strong>End Time:</strong> {new Date(Number(session.endTs) * 1000).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function USDCManagement() {
  const [faucetAmount, setFaucetAmount] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [mintTo, setMintTo] = useState("");

  const { writeContractAsync: writeMockUSDC } = useScaffoldWriteContract({
    contractName: "MockUSDC",
  });

  const { data: balance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "balanceOf",
    args: mintTo ? [mintTo as `0x${string}`] : undefined,
  });

  const formatUSDC = (amount: bigint | undefined) => {
    if (!amount) return "0";
    return (Number(amount) / 1e6).toFixed(6);
  };

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "totalSupply",
  });

  const useFaucet = async () => {
    if (!faucetAmount) return;
    try {
      // Convert to USDC units (6 decimals)
      const amount = BigInt(parseFloat(faucetAmount) * 1e6);
      await writeMockUSDC({
        functionName: "faucet",
        args: [amount],
      });
    } catch (error) {
      console.error("Error using faucet:", error);
    }
  };

  const useQuickFaucet = async () => {
    try {
      await writeMockUSDC({
        functionName: "quickFaucet",
        args: [],
      });
    } catch (error) {
      console.error("Error using quick faucet:", error);
    }
  };

  const mintTokens = async () => {
    if (!mintAmount || !mintTo) return;
    try {
      // Convert to USDC units (6 decimals)
      const amount = BigInt(parseFloat(mintAmount) * 1e6);
      await writeMockUSDC({
        functionName: "mint",
        args: [mintTo as `0x${string}`, amount],
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          USDC Management
        </h2>
        <p className="text-slate-400">Manage your USDC tokens for testing the charging system</p>
      </div>

      {/* Total Supply Stats */}
      <div className="glass-card">
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl">
              <Coins className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Total Supply</h3>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {formatUSDC(totalSupply)} USDC
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Faucet Card */}
        <div className="glass-card group hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl">
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Free Faucet</h3>
            </div>
            
            <p className="text-slate-400 mb-6">Get free USDC tokens for testing (up to 10,000 USDC)</p>
            
            {/* Quick Faucet Button */}
            <div className="mb-6">
              <button 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3"
                onClick={useQuickFaucet}
              >
                <Zap className="w-5 h-5" />
                Quick Faucet - Get 1000 USDC
              </button>
            </div>
            
            {/* Custom Amount Faucet */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Or specify custom amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 100"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all duration-300"
                  value={faucetAmount}
                  onChange={e => setFaucetAmount(e.target.value)}
                />
              </div>
              
              <button 
                className="w-full bg-gradient-to-r from-slate-700 to-slate-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-slate-500/25 transition-all duration-300 transform hover:scale-105"
                onClick={useFaucet}
              >
                Get Custom Amount
              </button>
            </div>
          </div>
        </div>

        {/* Mint Card */}
        <div className="glass-card group hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl">
                <Coins className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Mint USDC</h3>
            </div>
            
            <p className="text-slate-400 mb-6">Mint new USDC tokens (Owner only)</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1000"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                  value={mintAmount}
                  onChange={e => setMintAmount(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mint To Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
                  value={mintTo}
                  onChange={e => setMintTo(e.target.value)}
                />
              </div>
              
              <button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
                onClick={mintTokens}
              >
                Mint USDC
              </button>
            </div>
            
            {balance && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-400">Balance Found</span>
                </div>
                <p className="text-white">
                  <span className="text-slate-400">Balance:</span> {formatUSDC(balance)} USDC
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
