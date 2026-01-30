// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QDOIRegistry {
    struct QDOI {
        bytes32 fingerprint;
        string doi;
        string txHash;
        uint256 timestamp;
    }

    mapping(bytes32 => QDOI) public registry;

    event QDOIMinted(
        bytes32 indexed fingerprint,
        string doi,
        string txHash,
        uint256 timestamp
    );

    function mint(
        bytes32 fingerprint,
        string memory doi,
        string memory txHash
    ) public {
        require(registry[fingerprint].timestamp == 0, "QDOI already exists");

        registry[fingerprint] = QDOI({
            fingerprint: fingerprint,
            doi: doi,
            txHash: txHash,
            timestamp: block.timestamp
        });

        emit QDOIMinted(fingerprint, doi, txHash, block.timestamp);
    }

    function get(bytes32 fingerprint) public view returns (QDOI memory) {
        return registry[fingerprint];
    }
}
