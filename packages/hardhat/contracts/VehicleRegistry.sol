// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract VehicleRegistry is Ownable2Step {
    // Mapping vehicleHash -> driver address
    mapping(bytes32 => address) private _vehicleOwners;

    // Errors
    error ErrNotDriver();
    error ErrAlreadyRegistered();
    error ErrNotRegistered();

    // Events
    event VehicleRegistered(bytes32 indexed vehicleHash, address indexed driver);
    event VehicleUnregistered(bytes32 indexed vehicleHash, address indexed driver);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Registers a vehicle for msg.sender (driver)
    function registerVehicle(bytes32 vehicleHash) external {
        if (_vehicleOwners[vehicleHash] != address(0)) revert ErrAlreadyRegistered();
        _vehicleOwners[vehicleHash] = msg.sender;
        emit VehicleRegistered(vehicleHash, msg.sender);
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
}
