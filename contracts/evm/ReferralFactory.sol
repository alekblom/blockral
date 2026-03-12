// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReferralProgram.sol";

/**
 * @title ReferralFactory
 * @notice Deploys EIP-1167 minimal proxy clones of ReferralProgram.
 */
contract ReferralFactory {
    address public immutable implementation;

    event ProgramCreated(address indexed programAddress, address indexed creator, string name);

    constructor() {
        implementation = address(new ReferralProgram());
    }

    function createProgram(
        string calldata _name,
        uint16 _commissionBps,
        uint16 _platformFeeBps,
        address payable _platformWallet,
        address _verificationAuthority
    ) external returns (address program) {
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, _name));
        program = _cloneDeterministic(implementation, salt);

        ReferralProgram(payable(program)).initialize(
            _name,
            msg.sender,
            _commissionBps,
            _platformFeeBps,
            _platformWallet,
            _verificationAuthority
        );

        emit ProgramCreated(program, msg.sender, _name);
    }

    function predictAddress(address _creator, string calldata _name) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(_creator, _name));
        return _predictDeterministicAddress(implementation, salt);
    }

    // --- EIP-1167 Minimal Proxy ---

    function _cloneDeterministic(address impl, bytes32 salt) internal returns (address instance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, impl))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create2(0, ptr, 0x37, salt)
        }
        require(instance != address(0), "Clone failed");
    }

    function _predictDeterministicAddress(address impl, bytes32 salt) internal view returns (address predicted) {
        bytes32 bytecodeHash;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, impl))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            bytecodeHash := keccak256(ptr, 0x37)
        }
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }
}
