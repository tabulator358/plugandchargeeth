// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract VehicleRegistry is Ownable2Step {
    // Mapping vehicleHash -> driver address
    mapping(bytes32 => address) private _vehicleOwners;
    
    // Mapping chipId -> vehicleHash (for quick lookup)
    mapping(bytes32 => bytes32) private _chipToVehicle;
    
    // Mapping vehicleHash -> ISO 15118 enabled
    mapping(bytes32 => bool) private _iso15118Enabled;
    
    // Mapping vehicleHash -> public key hash
    mapping(bytes32 => bytes32) private _publicKeys;
    
    // Mapping vehicleHash -> ISO 15118 identifier string
    mapping(bytes32 => string) private _iso15118Identifiers;
    
    // Mapping ISO 15118 identifier string -> vehicleHash (reverse lookup)
    mapping(string => bytes32) private _iso15118ToVehicle;

    // Errors
    error ErrNotDriver();
    error ErrAlreadyRegistered();
    error ErrChipAlreadyRegistered();
    error ErrNotRegistered();

    // Events
    event VehicleRegistered(bytes32 indexed vehicleHash, address indexed driver, bytes32 chipId, bool iso15118Enabled);
    event VehicleUnregistered(bytes32 indexed vehicleHash, address indexed driver);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Registers a vehicle with chip and ISO 15118 support
    function registerVehicle(bytes32 vehicleHash, bytes32 chipId, bool iso15118Enabled, bytes32 publicKeyHash, string memory iso15118Identifier) external {
        if (_vehicleOwners[vehicleHash] != address(0)) revert ErrAlreadyRegistered();
        if (_chipToVehicle[chipId] != bytes32(0)) revert ErrChipAlreadyRegistered();
        
        _vehicleOwners[vehicleHash] = msg.sender;
        _chipToVehicle[chipId] = vehicleHash;
        _iso15118Enabled[vehicleHash] = iso15118Enabled;
        _publicKeys[vehicleHash] = publicKeyHash;
        _iso15118Identifiers[vehicleHash] = iso15118Identifier;
        
        // Store reverse lookup for ISO-15118 identifier
        if (bytes(iso15118Identifier).length > 0) {
            _iso15118ToVehicle[iso15118Identifier] = vehicleHash;
        }
        
        emit VehicleRegistered(vehicleHash, msg.sender, chipId, iso15118Enabled);
    }

    /// @notice Unregisters a vehicle, only current driver
    function unregisterVehicle(bytes32 vehicleHash) external {
        address driver = _vehicleOwners[vehicleHash];
        if (driver == address(0)) revert ErrNotRegistered();
        if (driver != msg.sender) revert ErrNotDriver();
        delete _vehicleOwners[vehicleHash];
        emit VehicleUnregistered(vehicleHash, driver);
    }

    /// @notice Returns the owner (driver) of a vehicle, or address(0) if not registered
    function ownerOfVehicle(bytes32 vehicleHash) external view returns (address) {
        return _vehicleOwners[vehicleHash];
    }

    /// @notice Returns vehicle hash by chip ID
    function getVehicleByChip(bytes32 chipId) external view returns (bytes32) {
        return _chipToVehicle[chipId];
    }

    /// @notice Returns if ISO 15118 is enabled for a vehicle
    function isIso15118Enabled(bytes32 vehicleHash) external view returns (bool) {
        return _iso15118Enabled[vehicleHash];
    }

    /// @notice Returns public key hash for a vehicle
    function getPublicKey(bytes32 vehicleHash) external view returns (bytes32) {
        return _publicKeys[vehicleHash];
    }
    
    /// @notice Returns ISO 15118 identifier for a vehicle
    function getIso15118Identifier(bytes32 vehicleHash) external view returns (string memory) {
        return _iso15118Identifiers[vehicleHash];
    }
    
    /// @notice Returns vehicle hash for a given ISO 15118 identifier
    function getVehicleByIso15118Identifier(string memory iso15118Identifier) external view returns (bytes32) {
        return _iso15118ToVehicle[iso15118Identifier];
    }
}
