// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NFTEscrow.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DealFactory
 * @dev Factory contract for deploying and managing NFT Escrow contracts
 * Tracks all active deals and provides global statistics
 */
contract DealFactory is Ownable, Pausable, ReentrancyGuard {
    
    // Deal Factory version
    string public constant VERSION = "1.0.0";
    
    // Escrow contract template
    address public immutable escrowTemplate;
    
    // Global state
    uint256 public totalDeals;
    uint256 public totalCompletedDeals;
    uint256 public totalCancelledDeals;
    uint256 public totalVolume; // Total trading volume in wei
    
    // Mapping of deal ID to escrow contract address
    mapping(uint256 => address) public dealToEscrow;
    
    // Mapping of user to their deal IDs
    mapping(address => uint256[]) public userDeals;
    
    // Mapping of escrow contract to deal IDs
    mapping(address => uint256[]) public escrowDeals;
    
    // Array of all escrow contracts
    address[] public allEscrows;
    
    // Deal information struct
    struct DealInfo {
        uint256 dealId;
        address escrowContract;
        address creator;
        address counterparty;
        NFTEscrow.DealType dealType;
        NFTEscrow.DealStatus status;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    // Platform settings
    uint256 public platformFee = 250; // 2.5% in basis points
    address public feeRecipient;
    uint256 public maxDealDuration = 30 days;
    
    // Events
    event EscrowDeployed(
        address indexed escrowContract,
        address indexed creator,
        uint256 indexed dealId
    );
    
    event DealCreated(
        uint256 indexed dealId,
        address indexed escrowContract,
        address indexed creator,
        NFTEscrow.DealType dealType
    );
    
    event DealStatusUpdated(
        uint256 indexed dealId,
        address indexed escrowContract,
        NFTEscrow.DealStatus oldStatus,
        NFTEscrow.DealStatus newStatus
    );
    
    event DealCompleted(
        uint256 indexed dealId,
        address indexed escrowContract,
        address indexed creator,
        address counterparty,
        uint256 volume
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event MaxDealDurationUpdated(uint256 oldDuration, uint256 newDuration);
    
    // Modifiers
    modifier onlyEscrow() {
        require(isEscrowContract(msg.sender), "Only escrow contracts can call this");
        _;
    }
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        
        // Deploy template escrow contract
        escrowTemplate = address(new NFTEscrow(_feeRecipient));
        
        totalDeals = 0;
        totalCompletedDeals = 0;
        totalCancelledDeals = 0;
        totalVolume = 0;
    }
    
    /**
     * @dev Create a new deal by deploying an escrow contract
     * @param _dealType Type of deal (BUY, SELL, SWAP)
     * @param _counterparty Address of counterparty (can be zero for open deals)
     * @param _nftContract Address of NFT contract
     * @param _tokenId Token ID of the NFT
     * @param _price Price for BUY/SELL deals
     * @param _swapNftContract NFT contract for swap deals
     * @param _swapTokenId Token ID for swap deals
     */
    function createDeal(
        NFTEscrow.DealType _dealType,
        address _counterparty,
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        address _swapNftContract,
        uint256 _swapTokenId
    ) external whenNotPaused nonReentrant returns (uint256, address) {
        require(_nftContract != address(0), "Invalid NFT contract");
        
        // Generate global deal ID first
        uint256 dealId = totalDeals;
        
        // Deploy new escrow contract
        NFTEscrow escrow = new NFTEscrow(feeRecipient);
        address escrowAddress = address(escrow);
        
        // Create deal in the escrow contract with the global deal ID
        escrow.createDeal(
            dealId,
            _dealType,
            msg.sender,
            _counterparty,
            _nftContract,
            _tokenId,
            _price,
            _swapNftContract,
            _swapTokenId
        );
        
        // Update global state
        totalDeals++;
        dealToEscrow[dealId] = escrowAddress;
        userDeals[msg.sender].push(dealId);
        
        if (_counterparty != address(0)) {
            userDeals[_counterparty].push(dealId);
        }
        
        escrowDeals[escrowAddress].push(dealId);
        allEscrows.push(escrowAddress);
        
        emit EscrowDeployed(escrowAddress, msg.sender, dealId);
        emit DealCreated(dealId, escrowAddress, msg.sender, _dealType);
        
        return (dealId, escrowAddress);
    }
    
    /**
     * @dev Get deal information
     * @param _dealId Deal ID to query
     */
    function getDealInfo(uint256 _dealId) external view returns (DealInfo memory) {
        address escrowAddress = dealToEscrow[_dealId];
        require(escrowAddress != address(0), "Deal does not exist");
        
        NFTEscrow escrow = NFTEscrow(escrowAddress);
        NFTEscrow.Deal memory deal = escrow.getDeal(_dealId);
        
        return DealInfo({
            dealId: deal.dealId,
            escrowContract: escrowAddress,
            creator: deal.creator,
            counterparty: deal.counterparty,
            dealType: deal.dealType,
            status: deal.status,
            nftContract: deal.nftContract,
            tokenId: deal.tokenId,
            price: deal.price,
            createdAt: deal.createdAt,
            expiresAt: deal.expiresAt
        });
    }
    
    /**
     * @dev Get multiple deals information
     * @param _dealIds Array of deal IDs
     */
    function getDealsInfo(uint256[] calldata _dealIds) 
        external 
        view 
        returns (DealInfo[] memory) 
    {
        DealInfo[] memory dealsInfo = new DealInfo[](_dealIds.length);
        
        for (uint256 i = 0; i < _dealIds.length; i++) {
            address escrowAddress = dealToEscrow[_dealIds[i]];
            if (escrowAddress != address(0)) {
                NFTEscrow escrow = NFTEscrow(escrowAddress);
                NFTEscrow.Deal memory deal = escrow.getDeal(_dealIds[i]);
                
                dealsInfo[i] = DealInfo({
                    dealId: deal.dealId,
                    escrowContract: escrowAddress,
                    creator: deal.creator,
                    counterparty: deal.counterparty,
                    dealType: deal.dealType,
                    status: deal.status,
                    nftContract: deal.nftContract,
                    tokenId: deal.tokenId,
                    price: deal.price,
                    createdAt: deal.createdAt,
                    expiresAt: deal.expiresAt
                });
            }
        }
        
        return dealsInfo;
    }
    
    /**
     * @dev Get user's deals
     * @param _user User address
     */
    function getUserDeals(address _user) external view returns (uint256[] memory) {
        return userDeals[_user];
    }
    
    /**
     * @dev Get user's deals with full information
     * @param _user User address
     */
    function getUserDealsInfo(address _user) external view returns (DealInfo[] memory) {
        uint256[] memory dealIds = userDeals[_user];
        DealInfo[] memory dealsInfo = new DealInfo[](dealIds.length);
        
        for (uint256 i = 0; i < dealIds.length; i++) {
            address escrowAddress = dealToEscrow[dealIds[i]];
            if (escrowAddress != address(0)) {
                NFTEscrow escrow = NFTEscrow(escrowAddress);
                NFTEscrow.Deal memory deal = escrow.getDeal(dealIds[i]);
                
                dealsInfo[i] = DealInfo({
                    dealId: deal.dealId,
                    escrowContract: escrowAddress,
                    creator: deal.creator,
                    counterparty: deal.counterparty,
                    dealType: deal.dealType,
                    status: deal.status,
                    nftContract: deal.nftContract,
                    tokenId: deal.tokenId,
                    price: deal.price,
                    createdAt: deal.createdAt,
                    expiresAt: deal.expiresAt
                });
            }
        }
        
        return dealsInfo;
    }
    
    /**
     * @dev Get deals by status
     * @param _status Deal status to filter by
     * @param _offset Pagination offset
     * @param _limit Pagination limit
     */
    function getDealsByStatus(
        NFTEscrow.DealStatus _status,
        uint256 _offset,
        uint256 _limit
    ) external view returns (DealInfo[] memory) {
        require(_limit > 0 && _limit <= 100, "Invalid limit");
        
        DealInfo[] memory filteredDeals = new DealInfo[](_limit);
        uint256 count = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 0; i < allEscrows.length && count < _limit; i++) {
            address escrowAddress = allEscrows[i];
            uint256[] memory dealIds = escrowDeals[escrowAddress];
            
            for (uint256 j = 0; j < dealIds.length && count < _limit; j++) {
                NFTEscrow escrow = NFTEscrow(escrowAddress);
                NFTEscrow.Deal memory deal = escrow.getDeal(dealIds[j]);
                
                if (deal.status == _status) {
                    if (skipped >= _offset) {
                        filteredDeals[count] = DealInfo({
                            dealId: deal.dealId,
                            escrowContract: escrowAddress,
                            creator: deal.creator,
                            counterparty: deal.counterparty,
                            dealType: deal.dealType,
                            status: deal.status,
                            nftContract: deal.nftContract,
                            tokenId: deal.tokenId,
                            price: deal.price,
                            createdAt: deal.createdAt,
                            expiresAt: deal.expiresAt
                        });
                        count++;
                    } else {
                        skipped++;
                    }
                }
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(filteredDeals, count)
        }
        
        return filteredDeals;
    }
    
    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 _totalDeals,
        uint256 _totalCompletedDeals,
        uint256 _totalCancelledDeals,
        uint256 _totalVolume,
        uint256 _totalActiveDeals
    ) {
        return (
            totalDeals,
            totalCompletedDeals,
            totalCancelledDeals,
            totalVolume,
            totalDeals - totalCompletedDeals - totalCancelledDeals
        );
    }
    
    /**
     * @dev Callback function for deal status updates (called by escrow contracts)
     * @param _dealId Deal ID
     * @param _oldStatus Previous status
     * @param _newStatus New status
     * @param _volume Deal volume (for completed deals)
     */
    function updateDealStatus(
        uint256 _dealId,
        NFTEscrow.DealStatus _oldStatus,
        NFTEscrow.DealStatus _newStatus,
        uint256 _volume
    ) external onlyEscrow {
        // Update global counters
        if (_newStatus == NFTEscrow.DealStatus.COMPLETED) {
            totalCompletedDeals++;
            totalVolume += _volume;
        } else if (_newStatus == NFTEscrow.DealStatus.CANCELLED) {
            totalCancelledDeals++;
        }
        
        emit DealStatusUpdated(_dealId, msg.sender, _oldStatus, _newStatus);
        
        if (_newStatus == NFTEscrow.DealStatus.COMPLETED) {
            // Get deal info for the completed event
            NFTEscrow escrow = NFTEscrow(msg.sender);
            NFTEscrow.Deal memory deal = escrow.getDeal(_dealId);
            
            emit DealCompleted(
                _dealId,
                msg.sender,
                deal.creator,
                deal.counterparty,
                _volume
            );
        }
    }
    
    /**
     * @dev Check if address is a valid escrow contract
     * @param _escrow Address to check
     */
    function isEscrowContract(address _escrow) public view returns (bool) {
        // Check if the address is in our escrow contracts list
        for (uint256 i = 0; i < allEscrows.length; i++) {
            if (allEscrows[i] == _escrow) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get all escrow contracts
     */
    function getAllEscrows() external view returns (address[] memory) {
        return allEscrows;
    }
    
    /**
     * @dev Get escrow contract for a deal
     * @param _dealId Deal ID
     */
    function getEscrowForDeal(uint256 _dealId) external view returns (address) {
        return dealToEscrow[_dealId];
    }
    
    /**
     * @dev Update platform fee (only owner)
     * @param _newFee New fee in basis points
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFee;
        platformFee = _newFee;
        emit PlatformFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @dev Update fee recipient (only owner)
     * @param _newRecipient New fee recipient address
     */
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }
    
    /**
     * @dev Update max deal duration (only owner)
     * @param _newDuration New max duration in seconds
     */
    function updateMaxDealDuration(uint256 _newDuration) external onlyOwner {
        require(_newDuration >= 1 days && _newDuration <= 90 days, "Invalid duration");
        uint256 oldDuration = maxDealDuration;
        maxDealDuration = _newDuration;
        emit MaxDealDurationUpdated(oldDuration, _newDuration);
    }
    
    /**
     * @dev Pause the factory (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the factory (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency function to pause all escrow contracts (only owner)
     */
    function emergencyPauseAllEscrows() external onlyOwner {
        for (uint256 i = 0; i < allEscrows.length; i++) {
            try NFTEscrow(allEscrows[i]).pause() {} catch {}
        }
    }
    
    /**
     * @dev Emergency function to unpause all escrow contracts (only owner)
     */
    function emergencyUnpauseAllEscrows() external onlyOwner {
        for (uint256 i = 0; i < allEscrows.length; i++) {
            try NFTEscrow(allEscrows[i]).unpause() {} catch {}
        }
    }
} 