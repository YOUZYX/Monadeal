// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTEscrow
 * @dev Smart contract for secure P2P NFT trading with escrow functionality
 * Supports Buy, Sell, and Swap deal types with atomic execution
 */
contract NFTEscrow is IERC721Receiver, ReentrancyGuard, Pausable, Ownable {
    
    // Deal types
    enum DealType { BUY, SELL, SWAP }
    
    // Deal status
    enum DealStatus { 
        PENDING,           // Deal created, waiting for counterparty
        AWAITING_BUYER,    // Seller deposited NFT, waiting for buyer payment
        AWAITING_SELLER,   // Buyer paid, waiting for seller NFT deposit
        LOCKED_IN_ESCROW,  // Both parties deposited, ready for execution
        COMPLETED,         // Deal successfully completed
        CANCELLED          // Deal cancelled by either party
    }
    
    // Deal structure
    struct Deal {
        uint256 dealId;
        DealType dealType;
        DealStatus status;
        address creator;
        address counterparty;
        
        // NFT details
        address nftContract;
        uint256 tokenId;
        
        // Payment details (for BUY/SELL deals)
        uint256 price;
        
        // Swap details (for SWAP deals)
        address swapNftContract;
        uint256 swapTokenId;
        
        // Deposits tracking
        bool creatorDeposited;
        bool counterpartyDeposited;
        
        // Timestamps
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    // State variables
    mapping(uint256 => Deal) public deals;
    mapping(address => uint256[]) public userDeals;
    uint256 public constant DEAL_EXPIRY_TIME = 7 days;
    uint256 public platformFee = 250; // 2.5% (basis points)
    address public feeRecipient;
    
    // Events
    event DealCreated(
        uint256 indexed dealId,
        DealType dealType,
        address indexed creator,
        address indexed counterparty,
        address nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event DealAccepted(uint256 indexed dealId, address indexed counterparty);
    event DealCancelled(uint256 indexed dealId, address indexed cancelledBy);
    event DealCompleted(uint256 indexed dealId, address indexed creator, address indexed counterparty);
    event DepositMade(uint256 indexed dealId, address indexed depositor, string depositType);
    event DealPriceUpdated(uint256 indexed dealId, uint256 oldPrice, uint256 newPrice, address indexed updatedBy);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    
    // Modifiers
    modifier onlyDealParticipant(uint256 _dealId) {
        Deal storage deal = deals[_dealId];
        require(
            msg.sender == deal.creator || msg.sender == deal.counterparty,
            "Not a deal participant"
        );
        _;
    }
    
    modifier dealExists(uint256 _dealId) {
        require(deals[_dealId].creator != address(0), "Deal does not exist");
        _;
    }
    
    modifier dealNotExpired(uint256 _dealId) {
        require(block.timestamp <= deals[_dealId].expiresAt, "Deal has expired");
        _;
    }
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Create a new deal
     * @param _dealId Global deal ID from factory
     * @param _dealType Type of deal (BUY, SELL, SWAP)
     * @param _creator Address of the deal creator
     * @param _counterparty Address of the counterparty (can be zero address for open deals)
     * @param _nftContract Address of the NFT contract
     * @param _tokenId Token ID of the NFT
     * @param _price Price for BUY/SELL deals (0 for SWAP)
     * @param _swapNftContract NFT contract for swap (only for SWAP deals)
     * @param _swapTokenId Token ID for swap (only for SWAP deals)
     */
    function createDeal(
        uint256 _dealId,
        DealType _dealType,
        address _creator,
        address _counterparty,
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        address _swapNftContract,
        uint256 _swapTokenId
    ) external whenNotPaused nonReentrant {
        require(_nftContract != address(0), "Invalid NFT contract");
        require(_creator != address(0), "Invalid creator address");
        require(deals[_dealId].creator == address(0), "Deal ID already exists");
        
        // Validate deal type specific requirements
        if (_dealType == DealType.BUY) {
            require(_price > 0, "Price must be greater than 0 for BUY deals");
        } else if (_dealType == DealType.SELL) {
            require(_price > 0, "Price must be greater than 0 for SELL deals");
            require(
                IERC721(_nftContract).ownerOf(_tokenId) == _creator,
                "Must own NFT to create SELL deal"
            );
        } else if (_dealType == DealType.SWAP) {
            require(_swapNftContract != address(0), "Invalid swap NFT contract");
            require(
                IERC721(_nftContract).ownerOf(_tokenId) == _creator,
                "Must own NFT to create SWAP deal"
            );
        }
        
        deals[_dealId] = Deal({
            dealId: _dealId,
            dealType: _dealType,
            status: DealStatus.PENDING,
            creator: _creator,
            counterparty: _counterparty,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _price,
            swapNftContract: _swapNftContract,
            swapTokenId: _swapTokenId,
            creatorDeposited: false,
            counterpartyDeposited: false,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + DEAL_EXPIRY_TIME
        });
        
        userDeals[_creator].push(_dealId);
        if (_counterparty != address(0)) {
            userDeals[_counterparty].push(_dealId);
        }

        emit DealCreated(
            _dealId,
            _dealType,
            _creator,
            _counterparty,
            _nftContract,
            _tokenId,
            _price
        );
    }
    
    /**
     * @dev Accept a deal (for open deals where counterparty is not set)
     */
    function acceptDeal(uint256 _dealId) 
        external 
        whenNotPaused 
        nonReentrant 
        dealExists(_dealId) 
        dealNotExpired(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(deal.status == DealStatus.PENDING, "Deal is not pending");
        require(deal.counterparty == address(0), "Deal already has counterparty");
        require(deal.creator != msg.sender, "Cannot accept own deal");
        
        deal.counterparty = msg.sender;
        userDeals[msg.sender].push(_dealId);
        
        emit DealAccepted(_dealId, msg.sender);
    }
    
    /**
     * @dev Deposit NFT for SELL or SWAP deals
     */
    function depositNFT(uint256 _dealId) 
        external 
        whenNotPaused 
        nonReentrant 
        dealExists(_dealId) 
        dealNotExpired(_dealId) 
        onlyDealParticipant(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(deal.status == DealStatus.PENDING, "Invalid deal status");
        require(deal.counterparty != address(0), "No counterparty set");
        
        if (deal.dealType == DealType.BUY) {
            require(msg.sender == deal.counterparty, "Only counterparty can deposit NFT for BUY");
            require(!deal.counterpartyDeposited, "NFT already deposited");
            
            IERC721(deal.nftContract).safeTransferFrom(
                msg.sender,
                address(this),
                deal.tokenId
            );
            
            deal.counterpartyDeposited = true;
            deal.status = DealStatus.AWAITING_BUYER;
            
        } else if (deal.dealType == DealType.SELL) {
            require(msg.sender == deal.creator, "Only creator can deposit NFT for SELL");
            require(!deal.creatorDeposited, "NFT already deposited");
            
            IERC721(deal.nftContract).safeTransferFrom(
                msg.sender,
                address(this),
                deal.tokenId
            );
            
            deal.creatorDeposited = true;
            deal.status = DealStatus.AWAITING_BUYER;
            
        } else if (deal.dealType == DealType.SWAP) {
            if (msg.sender == deal.creator) {
                require(!deal.creatorDeposited, "Creator NFT already deposited");
                
                IERC721(deal.nftContract).safeTransferFrom(
                    msg.sender,
                    address(this),
                    deal.tokenId
                );
                
                deal.creatorDeposited = true;
                
            } else {
                require(!deal.counterpartyDeposited, "Counterparty NFT already deposited");
                
                IERC721(deal.swapNftContract).safeTransferFrom(
                    msg.sender,
                    address(this),
                    deal.swapTokenId
                );
                
                deal.counterpartyDeposited = true;
            }
            
            // Update status based on deposits
            if (deal.creatorDeposited && deal.counterpartyDeposited) {
                deal.status = DealStatus.LOCKED_IN_ESCROW;
            }
        }
        
        emit DepositMade(_dealId, msg.sender, "NFT");
    }
    
    /**
     * @dev Deposit payment for BUY deals
     */
    function depositPayment(uint256 _dealId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
        dealExists(_dealId) 
        dealNotExpired(_dealId) 
        onlyDealParticipant(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(deal.dealType == DealType.BUY, "Not a BUY deal");
        require(deal.status == DealStatus.AWAITING_BUYER, "Invalid deal status");
        require(deal.counterparty != address(0), "No counterparty set");
        require(msg.sender == deal.creator, "Only creator can deposit payment");
        require(!deal.creatorDeposited, "Payment already deposited");
        require(msg.value == deal.price, "Incorrect payment amount");
        
        deal.creatorDeposited = true;
        deal.status = DealStatus.LOCKED_IN_ESCROW;
        
        emit DepositMade(_dealId, msg.sender, "Payment");
    }
    
    /**
     * @dev Complete a deal - executes the atomic swap
     */
    function completeDeal(uint256 _dealId) 
        external 
        payable
        whenNotPaused 
        nonReentrant 
        dealExists(_dealId) 
        onlyDealParticipant(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(
            deal.status == DealStatus.LOCKED_IN_ESCROW || 
            deal.status == DealStatus.AWAITING_BUYER || 
            deal.status == DealStatus.AWAITING_SELLER,
            "Deal not ready for completion"
        );
        
        if (deal.dealType == DealType.BUY) {
            require(deal.counterpartyDeposited && deal.creatorDeposited, "Both deposits required");
            
            // Transfer NFT from escrow to buyer (creator)
            IERC721(deal.nftContract).safeTransferFrom(
                address(this),
                deal.creator,
                deal.tokenId
            );
            
            // Transfer payment to seller (counterparty) minus platform fee
            uint256 fee = (deal.price * platformFee) / 10000;
            uint256 sellerAmount = deal.price - fee;
            
            (bool success1, ) = payable(deal.counterparty).call{value: sellerAmount}("");
            require(success1, "Payment to seller failed");
            
            if (fee > 0) {
                (bool success2, ) = payable(feeRecipient).call{value: fee}("");
                require(success2, "Fee payment failed");
            }
            
        } else if (deal.dealType == DealType.SELL) {
            require(deal.creatorDeposited, "NFT not deposited");
            
            // Transfer NFT from escrow to counterparty
            IERC721(deal.nftContract).safeTransferFrom(
                address(this),
                deal.counterparty,
                deal.tokenId
            );
            
            // Payment is sent directly to this function
            require(msg.value == deal.price, "Incorrect payment amount");
            
            // Transfer payment to creator (minus platform fee)
            uint256 fee = (deal.price * platformFee) / 10000;
            uint256 creatorAmount = deal.price - fee;
            
            (bool success1, ) = payable(deal.creator).call{value: creatorAmount}("");
            require(success1, "Payment to creator failed");
            
            if (fee > 0) {
                (bool success2, ) = payable(feeRecipient).call{value: fee}("");
                require(success2, "Fee payment failed");
            }
            
        } else if (deal.dealType == DealType.SWAP) {
            require(deal.creatorDeposited && deal.counterpartyDeposited, "Both NFTs not deposited");
            
            // Swap NFTs
            IERC721(deal.nftContract).safeTransferFrom(
                address(this),
                deal.counterparty,
                deal.tokenId
            );
            
            IERC721(deal.swapNftContract).safeTransferFrom(
                address(this),
                deal.creator,
                deal.swapTokenId
            );
        }
        
        deal.status = DealStatus.COMPLETED;
        
        emit DealCompleted(_dealId, deal.creator, deal.counterparty);
    }
    
    /**
     * @dev Update deal price (for counter offers)
     */
    function updateDealPrice(uint256 _dealId, uint256 _newPrice) 
        external 
        whenNotPaused 
        dealExists(_dealId) 
        onlyDealParticipant(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(
            deal.status == DealStatus.PENDING || deal.status == DealStatus.AWAITING_BUYER,
            "Can only update price for pending deals"
        );
        require(_newPrice > 0, "Price must be greater than zero");
        require(deal.dealType == DealType.BUY || deal.dealType == DealType.SELL, "Price updates only for BUY/SELL deals");
        
        uint256 oldPrice = deal.price;
        deal.price = _newPrice;
        
        emit DealPriceUpdated(_dealId, oldPrice, _newPrice, msg.sender);
    }

    /**
     * @dev Cancel a deal and return deposits
     */
    function cancelDeal(uint256 _dealId) 
        external 
        whenNotPaused 
        nonReentrant 
        dealExists(_dealId) 
        onlyDealParticipant(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(
            deal.status != DealStatus.COMPLETED && deal.status != DealStatus.CANCELLED,
            "Deal already finalized"
        );
        
        // Return deposits
        if (deal.dealType == DealType.SELL && deal.creatorDeposited) {
            IERC721(deal.nftContract).safeTransferFrom(
                address(this),
                deal.creator,
                deal.tokenId
            );
        } else if (deal.dealType == DealType.BUY) {
            // Return NFT to seller if deposited
            if (deal.counterpartyDeposited) {
                IERC721(deal.nftContract).safeTransferFrom(
                    address(this),
                    deal.counterparty,
                    deal.tokenId
                );
            }
            // Return payment to buyer if deposited
            if (deal.creatorDeposited) {
                (bool success, ) = payable(deal.creator).call{value: deal.price}("");
                require(success, "Payment refund failed");
            }
        } else if (deal.dealType == DealType.SWAP) {
            if (deal.creatorDeposited) {
                IERC721(deal.nftContract).safeTransferFrom(
                    address(this),
                    deal.creator,
                    deal.tokenId
                );
            }
            if (deal.counterpartyDeposited) {
                IERC721(deal.swapNftContract).safeTransferFrom(
                    address(this),
                    deal.counterparty,
                    deal.swapTokenId
                );
            }
        }
        
        deal.status = DealStatus.CANCELLED;
        
        emit DealCancelled(_dealId, msg.sender);
    }
    
    /**
     * @dev Get deal status
     */
    function getDealStatus(uint256 _dealId) 
        external 
        view 
        dealExists(_dealId) 
        returns (DealStatus) 
    {
        return deals[_dealId].status;
    }
    
    /**
     * @dev Get deal details
     */
    function getDeal(uint256 _dealId) 
        external 
        view 
        dealExists(_dealId) 
        returns (Deal memory) 
    {
        return deals[_dealId];
    }
    
    /**
     * @dev Get user's deals
     */
    function getUserDeals(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userDeals[_user];
    }
    
    /**
     * @dev Clean up expired deals
     */
    function cleanupExpiredDeal(uint256 _dealId) 
        external 
        dealExists(_dealId) 
    {
        Deal storage deal = deals[_dealId];
        require(block.timestamp > deal.expiresAt, "Deal not expired");
        require(
            deal.status != DealStatus.COMPLETED && deal.status != DealStatus.CANCELLED,
            "Deal already finalized"
        );
        
        // Return any deposits
        if (deal.dealType == DealType.SELL && deal.creatorDeposited) {
            IERC721(deal.nftContract).safeTransferFrom(
                address(this),
                deal.creator,
                deal.tokenId
            );
        } else if (deal.dealType == DealType.BUY) {
            // Return NFT to seller if deposited
            if (deal.counterpartyDeposited) {
                IERC721(deal.nftContract).safeTransferFrom(
                    address(this),
                    deal.counterparty,
                    deal.tokenId
                );
            }
            // Return payment to buyer if deposited
            if (deal.creatorDeposited) {
                (bool success, ) = payable(deal.creator).call{value: deal.price}("");
                require(success, "Payment refund failed");
            }
        } else if (deal.dealType == DealType.SWAP) {
            if (deal.creatorDeposited) {
                IERC721(deal.nftContract).safeTransferFrom(
                    address(this),
                    deal.creator,
                    deal.tokenId
                );
            }
            if (deal.counterpartyDeposited) {
                IERC721(deal.swapNftContract).safeTransferFrom(
                    address(this),
                    deal.counterparty,
                    deal.swapTokenId
                );
            }
        }
        
        deal.status = DealStatus.CANCELLED;
        
        emit DealCancelled(_dealId, msg.sender);
    }
    
    /**
     * @dev Update platform fee (only owner)
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        uint256 oldFee = platformFee;
        platformFee = _newFee;
        emit PlatformFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @dev Update fee recipient (only owner)
     */
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }
    
    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Handle NFT transfers to this contract
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /**
     * @dev Emergency withdrawal (only owner, when paused)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
} 