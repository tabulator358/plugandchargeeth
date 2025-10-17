// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

// Renamed to avoid clash with concrete registry contracts
interface IVehicleRegistry {
    function ownerOfVehicle(bytes32 vehicleHash) external view returns (address);
}

interface IChargerRegistry {
    struct Charger {
        address owner;
        int32 latE7;
        int32 lngE7;
        uint32 pricePerKWhMilliUSD;
        uint16 powerKW;
        bool active;
    }
    function ownerOf(uint256 chargerId) external view returns (address);
    function get(uint256 chargerId) external view returns (Charger memory);
}

contract PlugAndChargeCore is Ownable2Step, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IVehicleRegistry public immutable vehicleRegistry;
    IChargerRegistry public immutable chargerRegistry;

    uint256 public minDeposit;
    uint256 public maxDeposit;
    uint256 public refundTimeout;

    // driver => chargerId => trusted?
    mapping(address => mapping(uint256 => bool)) public trustedChargers;

    // sessionId => Session
    mapping(uint256 => Session) private _sessions;
    uint256 private _nextSessionId = 1;

    // EIP-712 typehash for disputes
    bytes32 private constant DISPUTE_TYPEHASH =
        keccak256("Dispute(uint256 sessionId,bytes32 reasonHash)");

    struct Session {
        address driver;      // registered driver or payer for guest
        address sponsor;     // optional sponsor (payer != driver)
        bytes32 vehicleHash; // opaque vehicle id hash
        uint256 chargerId;
        bytes32 commitment;  // keccak(vehicleHash, chargerId, sessionSalt)
        uint256 reserved;    // escrowed USDC
        uint256 proposed;    // proposed charge
        uint64 startTs;
        uint64 endTs;
        uint64 proposeTs;
        uint8 state;         // 0=Init,1=Active,2=Proposed,3=Disputed,4=Settled,5=Refunded
    }

    struct PermitData {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // Errors
    error ErrNotOwner();
    error ErrNotChargerOwner();
    error ErrInvalidCommitment();
    error ErrOutOfBounds();
    error ErrWrongState();
    error ErrTooSoon();
    error ErrInsufficientReserve();
    error ErrNotDriver();
    error ErrNotTrusted();
    error ErrTokenTransfer();
    error ErrNotRegistered();
    error ErrBadSignature();

    // Events
    event TrustedChargerSet(address indexed driver, uint256 indexed chargerId, bool trusted);
    event SessionCreated(
        uint256 indexed sessionId,
        address driver,
        address sponsor,
        bytes32 vehicleHash,
        uint256 chargerId,
        uint256 initialDeposit
    );
    event DepositAdded(uint256 indexed sessionId, uint256 amount);
    event ChargeProposed(uint256 indexed sessionId, uint256 amount);
    event Disputed(uint256 indexed sessionId, bytes32 reasonHash);
    event Settled(uint256 indexed sessionId, uint256 driverAmount, uint256 chargerAmount);
    event Refunded(uint256 indexed sessionId, uint256 amount);
    event ParamsUpdated(uint256 minDeposit, uint256 maxDeposit, uint256 refundTimeout);

    constructor(
        IERC20 _usdc,
        IVehicleRegistry _vehicleRegistry,
        IChargerRegistry _chargerRegistry,
        uint256 _minDeposit,
        uint256 _maxDeposit,
        uint256 _refundTimeout,
        address initialOwner
    ) Ownable(initialOwner) EIP712("PlugAndChargeCore", "1") {
        usdc = _usdc;
        vehicleRegistry = _vehicleRegistry;
        chargerRegistry = _chargerRegistry;
        minDeposit = _minDeposit;
        maxDeposit = _maxDeposit;
        refundTimeout = _refundTimeout;
        emit ParamsUpdated(_minDeposit, _maxDeposit, _refundTimeout);
    }

    // -------- Admin --------

    function updateParams(
        uint256 _minDeposit,
        uint256 _maxDeposit,
        uint256 _refundTimeout
    ) external onlyOwner {
        minDeposit = _minDeposit;
        maxDeposit = _maxDeposit;
        refundTimeout = _refundTimeout;
        emit ParamsUpdated(_minDeposit, _maxDeposit, _refundTimeout);
    }

    // -------- Driver prefs --------

    function setTrustedCharger(address driver, uint256 chargerId, bool trusted) external {
        if (msg.sender != driver) revert ErrNotDriver();
        trustedChargers[driver][chargerId] = trusted;
        emit TrustedChargerSet(driver, chargerId, trusted);
    }

    // -------- Sessions (driver/sponsor initiated) --------

    function createSession(
        bytes32 vehicleHash,
        uint256 chargerId,
        bytes32 sessionSalt,
        uint256 initialDeposit,
        address sponsorOrZero,
        bool usePermit,
        PermitData calldata permit
    ) external nonReentrant {
        // Charger must be active
        IChargerRegistry.Charger memory c = chargerRegistry.get(chargerId);
        if (!c.active) revert ErrNotRegistered();

        // Driver must be registered owner of vehicle
        address driver = vehicleRegistry.ownerOfVehicle(vehicleHash);
        if (driver == address(0)) revert ErrNotRegistered();

        // Caller must be payer (driver or sponsor)
        address payer = (sponsorOrZero == address(0)) ? driver : sponsorOrZero;
        if (msg.sender != payer) revert ErrNotDriver();

        // Bounds
        if (initialDeposit < minDeposit || initialDeposit > maxDeposit) revert ErrOutOfBounds();

        // Commitment
        bytes32 commitment = keccak256(abi.encode(vehicleHash, chargerId, sessionSalt));

        // Optional permit
        if (usePermit) _tryPermit(payer, initialDeposit, permit);

        // Pull funds
        usdc.safeTransferFrom(payer, address(this), initialDeposit);

        // Create
        uint256 sessionId = _nextSessionId++;
        _sessions[sessionId] = Session({
            driver: driver,
            sponsor: sponsorOrZero,
            vehicleHash: vehicleHash,
            chargerId: chargerId,
            commitment: commitment,
            reserved: initialDeposit,
            proposed: 0,
            startTs: uint64(block.timestamp),
            endTs: 0,
            proposeTs: 0,
            state: 1 // Active
        });

        emit SessionCreated(sessionId, driver, sponsorOrZero, vehicleHash, chargerId, initialDeposit);
    }

    // -------- Sessions (charger-initiated, trusted) --------

    function createSessionByCharger(
        bytes32 vehicleHash,
        uint256 chargerId,
        bytes32 sessionSalt,
        address payer,
        uint256 initialDeposit,
        bool usePermit,
        PermitData calldata permit
    ) external nonReentrant {
        // Charger ownership & active
        address chargerOwner = chargerRegistry.ownerOf(chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();
        if (chargerOwner != msg.sender) revert ErrNotChargerOwner();
        IChargerRegistry.Charger memory c = chargerRegistry.get(chargerId);
        if (!c.active) revert ErrNotRegistered();

        // Driver must match registry
        address driver = vehicleRegistry.ownerOfVehicle(vehicleHash);
        if (driver == address(0)) revert ErrNotRegistered();

        // Must be trusted
        if (!trustedChargers[driver][chargerId]) revert ErrNotTrusted();

        // Bounds
        if (initialDeposit < minDeposit || initialDeposit > maxDeposit) revert ErrOutOfBounds();

        // Commitment
        bytes32 commitment = keccak256(abi.encode(vehicleHash, chargerId, sessionSalt));

        // Optional permit
        if (usePermit) _tryPermit(payer, initialDeposit, permit);

        // Pull funds
        usdc.safeTransferFrom(payer, address(this), initialDeposit);

        // Sponsor if payer != driver
        address sponsor = (payer == driver) ? address(0) : payer;

        // Create
        uint256 sessionId = _nextSessionId++;
        _sessions[sessionId] = Session({
            driver: driver,
            sponsor: sponsor,
            vehicleHash: vehicleHash,
            chargerId: chargerId,
            commitment: commitment,
            reserved: initialDeposit,
            proposed: 0,
            startTs: uint64(block.timestamp),
            endTs: 0,
            proposeTs: 0,
            state: 1 // Active
        });

        emit SessionCreated(sessionId, driver, sponsor, vehicleHash, chargerId, initialDeposit);
    }

    // -------- Sessions (guest, charger-initiated) --------

    function createSessionGuestByCharger(
        bytes32 vehicleHash, // opaque label for guest scenario
        uint256 chargerId,
        bytes32 sessionSalt,
        address payer,
        uint256 initialDeposit,
        bool usePermit,
        PermitData calldata permit
    ) external nonReentrant {
        // Charger ownership & active
        address chargerOwner = chargerRegistry.ownerOf(chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();
        if (chargerOwner != msg.sender) revert ErrNotChargerOwner();
        IChargerRegistry.Charger memory c = chargerRegistry.get(chargerId);
        if (!c.active) revert ErrNotRegistered();

        if (initialDeposit < minDeposit || initialDeposit > maxDeposit) revert ErrOutOfBounds();

        bytes32 commitment = keccak256(abi.encode(vehicleHash, chargerId, sessionSalt));

        if (usePermit) _tryPermit(payer, initialDeposit, permit);

        usdc.safeTransferFrom(payer, address(this), initialDeposit);

        uint256 sessionId = _nextSessionId++;
        _sessions[sessionId] = Session({
            driver: payer,              // in guest mode, payer acts as driver
            sponsor: address(0),
            vehicleHash: vehicleHash,   // opaque/ephemeral
            chargerId: chargerId,
            commitment: commitment,
            reserved: initialDeposit,
            proposed: 0,
            startTs: uint64(block.timestamp),
            endTs: 0,
            proposeTs: 0,
            state: 1
        });

        emit SessionCreated(sessionId, payer, address(0), vehicleHash, chargerId, initialDeposit);
    }

    // -------- Funding / Pulls --------

    function addDeposit(uint256 sessionId, uint256 amount) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 1) revert ErrWrongState();
        address payer = (s.sponsor != address(0)) ? s.sponsor : s.driver;
        if (msg.sender != payer && msg.sender != s.driver) revert ErrNotDriver();
        if (s.reserved + amount > maxDeposit) revert ErrOutOfBounds();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        s.reserved += amount;
        emit DepositAdded(sessionId, amount);
    }

    function trustedPullDeposit(
        uint256 sessionId,
        uint256 amount,
        address payer,
        bool usePermit,
        PermitData calldata permit
    ) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 1) revert ErrWrongState();

        address chargerOwner = chargerRegistry.ownerOf(s.chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();
        if (chargerOwner != msg.sender) revert ErrNotChargerOwner();
        if (!trustedChargers[s.driver][s.chargerId]) revert ErrNotTrusted();
        if (s.reserved + amount > maxDeposit) revert ErrOutOfBounds();

        if (usePermit) _tryPermit(payer, amount, permit);
        usdc.safeTransferFrom(payer, address(this), amount);

        s.reserved += amount;
        emit DepositAdded(sessionId, amount);
    }

    // -------- End / Propose / Dispute / Settle --------

    function endAndPropose(uint256 sessionId, uint256 amountC) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 1) revert ErrWrongState();

        address chargerOwner = chargerRegistry.ownerOf(s.chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();
        if (chargerOwner != msg.sender) revert ErrNotChargerOwner();
        if (amountC > s.reserved) revert ErrInsufficientReserve();

        s.proposed = amountC;
        s.endTs = uint64(block.timestamp);
        s.proposeTs = uint64(block.timestamp);
        s.state = 2; // Proposed
        emit ChargeProposed(sessionId, amountC);
    }

    function dispute(uint256 sessionId, bytes32 reasonHash, bytes calldata sig) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 2) revert ErrWrongState();
        if (block.timestamp > s.proposeTs + refundTimeout) revert ErrTooSoon(); // semantic note: "too late"

        // Verify EIP-712 signature of payer
        bytes32 structHash = keccak256(abi.encode(DISPUTE_TYPEHASH, sessionId, reasonHash));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, sig);
        address payer = (s.sponsor != address(0)) ? s.sponsor : s.driver;
        if (signer != payer) revert ErrBadSignature();

        s.state = 3; // Disputed
        emit Disputed(sessionId, reasonHash);
    }

    function resolveDispute(
        uint256 sessionId,
        uint256 driverAmount,
        uint256 chargerAmount
    ) external onlyOwner nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 3) revert ErrWrongState();
        if (driverAmount + chargerAmount > s.reserved) revert ErrOutOfBounds();

        address payer = (s.sponsor != address(0)) ? s.sponsor : s.driver;
        address chargerOwner = chargerRegistry.ownerOf(s.chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();

        usdc.safeTransfer(chargerOwner, chargerAmount);
        usdc.safeTransfer(payer, driverAmount);

        s.state = 4; // Settled
        emit Settled(sessionId, driverAmount, chargerAmount);
    }

    function finalizeIfNoDispute(uint256 sessionId) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 2) revert ErrWrongState();
        if (block.timestamp <= s.proposeTs + refundTimeout) revert ErrTooSoon();

        uint256 chargerAmount = s.proposed;
        uint256 driverAmount = s.reserved - chargerAmount;

        address payer = (s.sponsor != address(0)) ? s.sponsor : s.driver;
        address chargerOwner = chargerRegistry.ownerOf(s.chargerId);
        if (chargerOwner == address(0)) revert ErrNotRegistered();

        usdc.safeTransfer(chargerOwner, chargerAmount);
        usdc.safeTransfer(payer, driverAmount);

        s.state = 4; // Settled
        emit Settled(sessionId, driverAmount, chargerAmount);
    }

    function refundIfStale(uint256 sessionId) external nonReentrant {
        Session storage s = _sessions[sessionId];
        if (s.state != 1) revert ErrWrongState();
        if (block.timestamp <= s.startTs + refundTimeout) revert ErrTooSoon();

        uint256 amount = s.reserved;
        address payer = (s.sponsor != address(0)) ? s.sponsor : s.driver;

        usdc.safeTransfer(payer, amount);

        s.state = 5; // Refunded
        emit Refunded(sessionId, amount);
    }

    // -------- Views --------

    function getSession(uint256 sessionId) external view returns (Session memory) {
        return _sessions[sessionId];
    }

    function escrowBalance(uint256 sessionId) external view returns (uint256) {
        return _sessions[sessionId].reserved;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // -------- Internal --------

    function _tryPermit(address owner, uint256 value, PermitData calldata p) internal {
        // best-effort: if token doesn't support permit or signature invalid, just continue and rely on allowance
        try IERC20Permit(address(usdc)).permit(
            owner,
            address(this),
            value,
            p.deadline,
            p.v,
            p.r,
            p.s
        ) {
        } catch {
            // no-op
        }
    }
}
