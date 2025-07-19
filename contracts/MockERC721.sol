// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC721
 * @dev Mock ERC721 contract for testing purposes
 */
contract MockERC721 is ERC721, Ownable {
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender) 
    {}

    /**
     * @dev Mint NFT to specified address
     * @param to Address to mint to
     * @param tokenId Token ID to mint
     */
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    /**
     * @dev Batch mint NFTs
     * @param to Address to mint to
     * @param tokenIds Array of token IDs to mint
     */
    function batchMint(address to, uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mint(to, tokenIds[i]);
        }
    }

    /**
     * @dev Burn NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender || isApprovedForAll(ownerOf(tokenId), msg.sender), "Not approved or owner");
        _burn(tokenId);
    }

    /**
     * @dev Check if token exists
     * @param tokenId Token ID to check
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
} 