// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReferralProgram
 * @notice Implementation contract for referral programs. Deployed as EIP-1167 clones.
 * @dev Each program has a creator (owner), configurable referrer commission, and optional platform fee.
 */
contract ReferralProgram {
    struct ReferralLink {
        address payable referrer;
        uint256 totalReceived;
        uint256 referrerClaimed;
        uint256 ownerClaimed;
        uint256 platformClaimed;
        uint256 paymentCount;
        uint256 createdAt;
    }

    string public name;
    address public creator;
    uint16 public referrerCommissionBps;
    uint16 public platformFeeBps;
    address payable public platformWallet;
    address public verificationAuthority;
    bool public active;
    bool public initialized;
    uint256 public createdAt;

    // referrer address => link data
    mapping(address => ReferralLink) public links;
    address[] public referrerList;

    event ProgramCreated(string name, address indexed creator, uint16 commissionBps);
    event ReferrerJoined(address indexed referrer, address indexed program);
    event PaymentReceived(address indexed referrer, address indexed payer, uint256 amount);
    event Distributed(address indexed referrer, uint256 ownerAmount, uint256 referrerAmount, uint256 platformAmount);
    event ProgramPaused(address indexed creator);
    event ProgramResumed(address indexed creator);

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    function initialize(
        string calldata _name,
        address _creator,
        uint16 _commissionBps,
        uint16 _platformFeeBps,
        address payable _platformWallet,
        address _verificationAuthority
    ) external {
        require(!initialized, "Already initialized");
        require(_commissionBps >= 1 && _commissionBps <= 5000, "Commission 0.01-50%");
        require(_commissionBps + _platformFeeBps <= 10000, "Total exceeds 100%");

        name = _name;
        creator = _creator;
        referrerCommissionBps = _commissionBps;
        platformFeeBps = _platformFeeBps;
        platformWallet = _platformWallet;
        verificationAuthority = _verificationAuthority;
        active = true;
        initialized = true;
        createdAt = block.timestamp;

        emit ProgramCreated(_name, _creator, _commissionBps);
    }

    /**
     * @notice Join as a referrer.
     */
    function joinProgram() external {
        require(initialized && active, "Program not active");
        require(links[msg.sender].createdAt == 0, "Already joined");

        links[msg.sender] = ReferralLink({
            referrer: payable(msg.sender),
            totalReceived: 0,
            referrerClaimed: 0,
            ownerClaimed: 0,
            platformClaimed: 0,
            paymentCount: 0,
            createdAt: block.timestamp
        });
        referrerList.push(msg.sender);

        emit ReferrerJoined(msg.sender, address(this));
    }

    /**
     * @notice Make a payment through a referral link. msg.value goes into the link's balance.
     * @param _referrer The referrer whose link is being used.
     */
    function pay(address _referrer) external payable {
        require(initialized && active, "Program not active");
        require(links[_referrer].createdAt != 0, "Referrer not found");
        require(msg.value > 0, "No payment");

        links[_referrer].totalReceived += msg.value;
        links[_referrer].paymentCount += 1;

        emit PaymentReceived(_referrer, msg.sender, msg.value);
    }

    /**
     * @notice Distribute a referral link's balance to owner, referrer, and platform.
     */
    function distribute(address _referrer) external {
        require(initialized, "Not initialized");
        ReferralLink storage link = links[_referrer];
        require(link.createdAt != 0, "Referrer not found");

        uint256 undistributed = link.totalReceived - link.referrerClaimed - link.ownerClaimed - link.platformClaimed;
        require(undistributed > 0, "Nothing to distribute");

        uint256 referrerShare = (undistributed * referrerCommissionBps) / 10000;
        uint256 platformShare = platformFeeBps > 0 ? (undistributed * platformFeeBps) / 10000 : 0;
        uint256 ownerShare = undistributed - referrerShare - platformShare;

        link.referrerClaimed += referrerShare;
        link.ownerClaimed += ownerShare;
        link.platformClaimed += platformShare;

        link.referrer.transfer(referrerShare);
        payable(creator).transfer(ownerShare);
        if (platformShare > 0 && platformWallet != address(0)) {
            platformWallet.transfer(platformShare);
        }

        emit Distributed(_referrer, ownerShare, referrerShare, platformShare);
    }

    function pause() external onlyCreator {
        require(active, "Already paused");
        active = false;
        emit ProgramPaused(creator);
    }

    function resume() external onlyCreator {
        require(!active, "Already active");
        active = true;
        emit ProgramResumed(creator);
    }

    function totalReferrers() external view returns (uint256) {
        return referrerList.length;
    }

    function getReferrerList() external view returns (address[] memory) {
        return referrerList;
    }

    function getLinkBalance(address _referrer) external view returns (uint256) {
        ReferralLink storage link = links[_referrer];
        return link.totalReceived - link.referrerClaimed - link.ownerClaimed - link.platformClaimed;
    }
}
