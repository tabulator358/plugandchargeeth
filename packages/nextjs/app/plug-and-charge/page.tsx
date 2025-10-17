"use client";

import { useState } from "react";
import { formatEther, keccak256, parseEther, toUtf8Bytes } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function PlugAndChargePage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState("vehicles");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🔌 Plug and Charge System</h1>
        <p className="text-lg text-gray-600">
          Test the complete EV charging ecosystem with vehicle registration, charger management, and charging sessions
        </p>
      </div>

      {!address && (
        <div className="alert alert-warning mb-6">
          <span>Please connect your wallet to interact with the contracts</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "vehicles" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("vehicles")}
        >
          🚗 Vehicles
        </button>
        <button
          className={`tab ${activeTab === "chargers" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("chargers")}
        >
          🔌 Chargers
        </button>
        <button
          className={`tab ${activeTab === "sessions" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("sessions")}
        >
          ⚡ Sessions
        </button>
        <button className={`tab ${activeTab === "usdc" ? "tab-active" : ""}`} onClick={() => setActiveTab("usdc")}>
          💰 USDC
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "vehicles" && <VehicleManagement />}
      {activeTab === "chargers" && <ChargerManagement />}
      {activeTab === "sessions" && <SessionManagement />}
      {activeTab === "usdc" && <USDCManagement />}
    </div>
  );
}

function VehicleManagement() {
  const [vehicleId, setVehicleId] = useState("");
  const [checkVehicleId, setCheckVehicleId] = useState("");

  const { writeContractAsync: writeVehicleRegistry } = useScaffoldWriteContract({
    contractName: "VehicleRegistry",
  });

  const { data: vehicleOwner } = useScaffoldReadContract({
    contractName: "VehicleRegistry",
    functionName: "ownerOfVehicle",
    args: checkVehicleId ? [keccak256(toUtf8Bytes(checkVehicleId))] : undefined,
  });

  const registerVehicle = async () => {
    if (!vehicleId) return;
    try {
      await writeVehicleRegistry({
        functionName: "registerVehicle",
        args: [keccak256(toUtf8Bytes(vehicleId))],
      });
      setVehicleId("");
    } catch (error) {
      console.error("Error registering vehicle:", error);
    }
  };

  const unregisterVehicle = async () => {
    if (!vehicleId) return;
    try {
      await writeVehicleRegistry({
        functionName: "unregisterVehicle",
        args: [keccak256(toUtf8Bytes(vehicleId))],
      });
      setVehicleId("");
    } catch (error) {
      console.error("Error unregistering vehicle:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🚗 Vehicle Management</h2>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Register Vehicle</h3>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Vehicle ID</span>
            </label>
            <input
              type="text"
              placeholder="e.g., TESLA_MODEL_3_ABC123"
              className="input input-bordered"
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
            />
          </div>
          <div className="card-actions justify-end">
            <button className="btn btn-primary" onClick={registerVehicle}>
              Register Vehicle
            </button>
            <button className="btn btn-secondary" onClick={unregisterVehicle}>
              Unregister Vehicle
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Check Vehicle Owner</h3>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Vehicle ID</span>
            </label>
            <input
              type="text"
              placeholder="e.g., TESLA_MODEL_3_ABC123"
              className="input input-bordered"
              value={checkVehicleId}
              onChange={e => setCheckVehicleId(e.target.value)}
            />
          </div>
          {vehicleOwner && (
            <div className="mt-4">
              <p>
                <strong>Owner:</strong> <Address address={vehicleOwner} />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChargerManagement() {
  const [chargerId, setChargerId] = useState("");
  const [chargerOwner, setChargerOwner] = useState("");
  const [lat, setLat] = useState("50.0");
  const [lng, setLng] = useState("14.0");
  const [pricePerKWh, setPricePerKWh] = useState("0.30");
  const [powerKW, setPowerKW] = useState("50");
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
                placeholder="1"
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
                placeholder="50.0"
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
                placeholder="14.0"
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
                placeholder="0.30"
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
                placeholder="50"
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
          keccak256(toUtf8Bytes(vehicleId)),
          BigInt(chargerId),
          keccak256(toUtf8Bytes(sessionSalt)),
          parseEther(initialDeposit),
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
    if (!trustedChargerId || !chargerId) return;
    try {
      await writePlugAndCharge({
        functionName: "setTrustedCharger",
        args: [trustedChargerId as `0x${string}`, BigInt(chargerId), trusted],
      });
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
                placeholder="1"
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
                <span className="label-text">Driver Address</span>
              </label>
              <AddressInput value={trustedChargerId} onChange={setTrustedChargerId} placeholder="0x..." />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Trusted</span>
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
                <strong>Reserved:</strong> {formatEther(session.reserved)} USDC
              </p>
              <p>
                <strong>Proposed:</strong> {formatEther(session.proposed)} USDC
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
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [mintAmount, setMintAmount] = useState("1000");
  const [mintTo, setMintTo] = useState("");

  const { writeContractAsync: writeMockUSDC } = useScaffoldWriteContract({
    contractName: "MockUSDC",
  });

  const { data: balance } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "balanceOf",
    args: mintTo ? [mintTo as `0x${string}`] : undefined,
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "MockUSDC",
    functionName: "totalSupply",
  });

  const useFaucet = async () => {
    if (!faucetAmount) return;
    try {
      await writeMockUSDC({
        functionName: "faucet",
        args: [parseEther(faucetAmount)],
      });
    } catch (error) {
      console.error("Error using faucet:", error);
    }
  };

  const mintTokens = async () => {
    if (!mintAmount || !mintTo) return;
    try {
      await writeMockUSDC({
        functionName: "mint",
        args: [mintTo as `0x${string}`, parseEther(mintAmount)],
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">💰 USDC Management</h2>

      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Total Supply</div>
          <div className="stat-value">{totalSupply ? formatEther(totalSupply) : "0"} USDC</div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Faucet (Get Free USDC)</h3>
          <p className="text-sm text-gray-500 mb-4">Anyone can get up to 1000 USDC for testing</p>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (USDC)</span>
            </label>
            <EtherInput value={faucetAmount} onChange={setFaucetAmount} placeholder="100" />
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" onClick={useFaucet}>
              Get USDC
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Mint USDC (Owner Only)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount (USDC)</span>
              </label>
              <EtherInput value={mintAmount} onChange={setMintAmount} placeholder="1000" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mint To</span>
              </label>
              <AddressInput value={mintTo} onChange={setMintTo} placeholder="0x..." />
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-secondary" onClick={mintTokens}>
              Mint USDC
            </button>
          </div>
          {balance && (
            <div className="mt-4">
              <p>
                <strong>Balance:</strong> {formatEther(balance)} USDC
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
