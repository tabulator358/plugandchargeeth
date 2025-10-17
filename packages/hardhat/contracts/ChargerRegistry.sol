// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ChargerRegistry is Ownable2Step {
    struct Charger {
        address owner;
        int32 latE7;
        int32 lngE7;
        uint32 pricePerKWhMilliUSD; // 1 USD = 1000 milliUSD
        uint16 powerKW;
        bool active;
    }

    // chargerId -> Charger
    mapping(uint256 => Charger) private _chargers;

    // Errors
    error ErrNotChargerOwner();
    error ErrAlreadyRegistered();
    error ErrNotRegistered();

    // Events
    event ChargerRegistered(
        uint256 indexed chargerId,
        address indexed owner,
        int32 latE7,
        int32 lngE7,
        uint32 pricePerKWhMilliUSD,
        uint16 powerKW
    );
    event ChargerUpdated(
        uint256 indexed chargerId,
        int32 latE7,
        int32 lngE7,
        uint32 pricePerKWhMilliUSD,
        uint16 powerKW
    );
    event ChargerActiveSet(uint256 indexed chargerId, bool active);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Registers a new charger, anyone can register
    function registerCharger(
        uint256 chargerId,
        address owner,
        int32 latE7,
        int32 lngE7,
        uint32 pricePerKWhMilliUSD,
        uint16 powerKW
    ) external {
        if (_chargers[chargerId].owner != address(0)) revert ErrAlreadyRegistered();
        _chargers[chargerId] = Charger({
            owner: owner,
            latE7: latE7,
            lngE7: lngE7,
            pricePerKWhMilliUSD: pricePerKWhMilliUSD,
            powerKW: powerKW,
            active: true
        });
        emit ChargerRegistered(chargerId, owner, latE7, lngE7, pricePerKWhMilliUSD, powerKW);
    }

    /// @notice Updates charger details, only by charger owner
    function updateCharger(
        uint256 chargerId,
        int32 latE7,
        int32 lngE7,
        uint32 pricePerKWhMilliUSD,
        uint16 powerKW
    ) external {
        Charger storage c = _chargers[chargerId];
        if (c.owner == address(0)) revert ErrNotRegistered();
        if (c.owner != msg.sender) revert ErrNotChargerOwner();
        c.latE7 = latE7;
        c.lngE7 = lngE7;
        c.pricePerKWhMilliUSD = pricePerKWhMilliUSD;
        c.powerKW = powerKW;
        emit ChargerUpdated(chargerId, latE7, lngE7, pricePerKWhMilliUSD, powerKW);
    }

    /// @notice Activates/deactivates charger, only by charger owner
    function setActive(uint256 chargerId, bool active) external {
        Charger storage c = _chargers[chargerId];
        if (c.owner == address(0)) revert ErrNotRegistered();
        if (c.owner != msg.sender) revert ErrNotChargerOwner();
        c.active = active;
        emit ChargerActiveSet(chargerId, active);
    }

    /// @notice Returns the owner of a charger, or address(0) if not registered
    function ownerOf(uint256 chargerId) external view returns (address) {
        return _chargers[chargerId].owner;
    }

    /// @notice Returns full charger struct, reverts if not registered
    function get(uint256 chargerId) external view returns (Charger memory) {
        Charger memory c = _chargers[chargerId];
        if (c.owner == address(0)) revert ErrNotRegistered();
        return c;
    }
}
