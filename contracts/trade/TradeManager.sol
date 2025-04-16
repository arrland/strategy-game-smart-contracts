// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITradeManager.sol";
import "../interfaces/ICentralAuthorizationRegistry.sol";
import "../interfaces/IResourceManagement.sol";
import "../storageContracts/ShipStorage.sol";
import "../storageContracts/MarketPlaceStorage.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMissionRequirements.sol";
import "../interfaces/IResourceTransferMission.sol";
import "../interfaces/IArrcLocking.sol";
import "../interfaces/IStorageManagement.sol";
import "../interfaces/ITravelTimeCalculator.sol";
import "../interfaces/IMissionsManager.sol";
import "../interfaces/IShipManager.sol";
import "../interfaces/storage/IIslandStorage.sol";
import "../interfaces/mission-storage/ITransferMissionStorage.sol";
import "../AuthorizationModifiers.sol";

/**
 * @title TradeManager
 * @dev Manages trade orders and executions between islands using ships and storage contracts
 */
contract TradeManager is ITradeManager, AuthorizationModifiers, ReentrancyGuard {
    // Structs
    struct TradeOrder {
        address seller;
        uint256 islandId;
        string resourceType;
        uint256 resourceAmount;
        uint256 arrcPrice;
        bool isActive;
        uint256 createdAt;
        bool isSellOrder; // True if island wants to buy resources (sell order for player)
    }

    struct ActiveTrade {
        address player;
        uint256 shipId;
        uint256 tradeOrderId;
        uint256 startTime;
        bool isCompleted;
        uint256 resourceAmount; // Amount being traded in this transaction
        uint256 price; // Price for this specific trade amount
        bool needsReturn; // Indicates if ship is on return journey
        uint256 originIslandId; // Home port to return to
    }
    
    mapping(uint256 => TradeOrder) public tradeOrders;
    mapping(uint256 => ActiveTrade) public activeTrades;
    mapping(uint256 => uint256[]) public islandTradeOrders;
    
    uint256 private nextTradeOrderId;
    uint256 private nextActiveTradeId;

    // Constants
    uint256 private constant SECONDS_IN_DAY = 24 * 60 * 60;
    uint8 private constant LOCKING_TYPE_BUY_ORDER = 1;
    uint8 private constant LOCKING_TYPE_SELL_ORDER = 2;

    // Events
    event TradeOrderCreated(address indexed seller, uint256 indexed islandId, uint256 indexed tradeOrderId, string resourceType, uint256 resourceAmount, uint256 arrcPrice, bool isSellOrder);
    event TradeOrderCancelled(uint256 indexed tradeOrderId);
    event TradeOrderUpdated(uint256 indexed tradeOrderId, uint256 newResourceAmount, uint256 newArrcPrice);
    event TradeInitiated(address indexed trader, uint256 indexed shipId, uint256 indexed tradeOrderId);
    event TradeCompleted(address indexed trader, uint256 indexed shipId, uint256 indexed tradeOrderId);
    event ReturnJourneyStarted(address indexed player, uint256 shipId, uint256 originIslandId);
    event ReturnJourneyCompleted(address indexed player, uint256 shipId);
    event ResourceTypeTracked(uint256 indexed islandId, string resourceType);
    // Updated events
    event ResourcesHeldForDelivery(uint256 indexed islandId, uint256 orderStorageId, string resourceType, uint256 amount);
    event PendingDeliveryClaimed(uint256 indexed islandId, string resourceType, uint256 amount);

    // Constructor
    constructor(address _centralAuthorizationRegistry)
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ITradeManager"))
    {        
        nextTradeOrderId = 1;
        nextActiveTradeId = 1;
    }

    // Add this modifier before the functions
    modifier onlyIslandOwner(uint256 islandId) {
        require(msg.sender == getIslandOwner(islandId), "Not island owner");
        _;
    }

    // Add this with your other modifiers
    modifier validTradeOrder(uint256 tradeOrderId) {
        require(tradeOrderId > 0 && tradeOrderId < nextTradeOrderId, "Invalid trade order ID");
        require(tradeOrders[tradeOrderId].isActive, "Trade order not active");
        _;
    }

    /**
     * @notice Get the mission requirements contract
     * @return Interface to the mission requirements contract
     */
    function getMissionRequirements() internal view returns (IMissionRequirements) {
        return IMissionRequirements(
            centralAuthorizationRegistry.getContractAddress(keccak256("MISSION_REQUIREMENTS"))
        );
    }

    /**
     * @notice Get the ResourceTransferMission contract
     * @return The resource transfer mission contract
     */
    function getResourceTransferMission() internal view returns (IResourceTransferMission) {
        return IResourceTransferMission(
            centralAuthorizationRegistry.getContractAddress(keccak256("RESOURCE_TRANSFER_MISSION"))
        );
    }

    /**
     * @notice Get the resource management
     * @return The current resource management
     */
    function getResourceManagement() public view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("RESOURCE_MANAGEMENT")));
    }

    function getShipStorage() public view returns (ShipStorage) {
        return ShipStorage(centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage")));
    }

    function getMarketPlaceStorage() public view returns (MarketPlaceStorage) {
        return MarketPlaceStorage(centralAuthorizationRegistry.getContractAddress(keccak256("MARKETPLACE_STORAGE")));
    }
        
    /**
     * @notice Get the base storage contract for islands
     * @return The base storage contract for islands
     */
    function getIslandStorage() public view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("BASE_STORAGE"));
    }

    /**
     * @notice Get the trade mission contract address
     * @return The current trade mission contract address
     */
    function getTradeMissionAddress() public view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("TRADE_MISSION"));
    }

    /**
     * @notice Get the ArrcLocking contract
     * @return The ArrcLocking contract
     */
    function getArrcLocking() public view returns (IArrcLocking) {
        return IArrcLocking(centralAuthorizationRegistry.getContractAddress(keccak256("IArrcLocking")));
    }

    /**
     * @notice Get the travel time calculator utility
     * @return ITravelTimeCalculator instance
     */
    function getTravelTimeCalculator() public view returns (ITravelTimeCalculator) {
        return ITravelTimeCalculator(
            centralAuthorizationRegistry.getContractAddress(keccak256("ITravelTimeCalculator"))
        );
    }

    // External functions
    /**
     * @notice Create a sell order (island selling resources to ships)
     * @param islandId Island identifier
     * @param resourceType Type of resource to sell
     * @param resourceAmount Amount of resource to sell
     * @param arrcPrice Price in ARRC tokens
     * @return tradeOrderId The created trade order ID
     */
    function createTradeOrder(
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice
    ) external onlyIslandOwner(islandId) nonReentrant returns (uint256) {
        require(resourceAmount > 0, "Amount too low");
        require(arrcPrice > 0, "Invalid price");
        require(bytes(resourceType).length > 0 && bytes(resourceType).length <= 32, "Invalid resource type length");
        
        // Check if the island has reached its maximum trade order limit
        uint256 activeOrderCount = getActiveTradeOrderCount(islandId);
        uint256 maxTradeOffers = getMissionRequirements().getMaxTradeOffers(islandId);
        require(activeOrderCount < maxTradeOffers, "Trade order limit reached");

        // Check resource availability
        require(
            getResourceManagement().getResourceBalance(msg.sender, islandId, resourceType) >= resourceAmount,
            "Insufficient resources"
        );

        uint256 tradeOrderId = nextTradeOrderId++;
        
        // Create storage for the trade order
        getMarketPlaceStorage().createOrderStorage(tradeOrderId, resourceAmount);
        
        // Transfer resources to marketplace storage
        getResourceManagement().transferResource(
            msg.sender,
            islandId,
            msg.sender,
            address(getMarketPlaceStorage()),
            tradeOrderId,
            address(this),
            resourceType,
            resourceAmount
        );

        // Create trade order - this is a buy order for ships (island is selling)
        tradeOrders[tradeOrderId] = TradeOrder({
            seller: msg.sender,
            islandId: islandId,
            resourceType: resourceType,
            resourceAmount: resourceAmount,
            arrcPrice: arrcPrice,
            isActive: true,
            createdAt: block.timestamp,
            isSellOrder: false // This is a buy order for ships (island is selling)
        });

        islandTradeOrders[islandId].push(tradeOrderId);

        // Track the resource type
        _trackPendingResourceType(islandId, resourceType);

        emit TradeOrderCreated(msg.sender, islandId, tradeOrderId, resourceType, resourceAmount, arrcPrice, false);
        return tradeOrderId;
    }

    /**
     * @notice Create a buy order (island buying resources from ships)
     * @param islandId Island identifier
     * @param resourceType Type of resource to buy
     * @param resourceAmount Amount of resource to buy
     * @param arrcPrice Price in ARRC tokens per unit of resource
     * @return tradeOrderId The created trade order ID
     */
    function createIslandBuyOrder(
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice
    ) external onlyIslandOwner(islandId) nonReentrant returns (uint256) {
        require(resourceAmount > 0, "Amount too low");
        require(arrcPrice > 0, "Invalid price");
        require(bytes(resourceType).length > 0 && bytes(resourceType).length <= 32, "Invalid resource type length");
        
        // Check if the island has reached its maximum trade order limit
        uint256 activeOrderCount = getActiveTradeOrderCount(islandId);
        uint256 maxTradeOffers = getMissionRequirements().getMaxTradeOffers(islandId);
        require(activeOrderCount < maxTradeOffers, "Trade order limit reached");
        
        // Calculate total price for the entire order
        uint256 totalPrice = resourceAmount * arrcPrice;

        // Check ARRC balance and allowance
        IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(keccak256("ARRC_TOKEN")));
        require(arrcToken.balanceOf(msg.sender) >= totalPrice, "Insufficient ARRC balance");
        require(arrcToken.allowance(msg.sender, address(this)) >= totalPrice, "Insufficient ARRC allowance");
        
        uint256 tradeOrderId = nextTradeOrderId++;
        
        // Create storage for the trade order (to store resources later)
        getMarketPlaceStorage().createOrderStorage(tradeOrderId, resourceAmount);
        
        // Lock the total ARRC tokens for the buy order
        // Note: We temporarily collect ARRC in this contract, but it will be moved to ArrcLocking
        // when a trade is initiated
        require(arrcToken.transferFrom(msg.sender, address(this), totalPrice), "ARRC transfer failed");

        // Create trade order - this is a sell order for ships (island is buying)
        tradeOrders[tradeOrderId] = TradeOrder({
            seller: msg.sender,
            islandId: islandId,
            resourceType: resourceType,
            resourceAmount: resourceAmount,
            arrcPrice: arrcPrice, // Price per unit remains as arrcPrice
            isActive: true,
            createdAt: block.timestamp,
            isSellOrder: true // This is a sell order for ships (island is buying)
        });

        islandTradeOrders[islandId].push(tradeOrderId);

        // Track the resource type
        _trackPendingResourceType(islandId, resourceType);

        emit TradeOrderCreated(msg.sender, islandId, tradeOrderId, resourceType, resourceAmount, arrcPrice, true);
        return tradeOrderId;
    }

    function cancelTradeOrder(uint256 tradeOrderId) 
        external 
        validTradeOrder(tradeOrderId) 
        nonReentrant 
    {
        TradeOrder storage order = tradeOrders[tradeOrderId];
        require(msg.sender == order.seller, "Not seller");
        require(!isTradeInProgress(tradeOrderId), "Trade in progress");

        if (!order.isSellOrder) {
            // For buy orders (island selling resources): return resources to seller
            getResourceManagement().transferResource(
                address(getMarketPlaceStorage()),
                tradeOrderId,
                address(this),
                address(getIslandStorage()),
                order.islandId,
                order.seller,
                order.resourceType,
                order.resourceAmount
            );
        } else {
            // For sell orders (island buying resources): return total ARRC to seller
            uint256 totalPrice = order.resourceAmount * order.arrcPrice;
            IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(keccak256("ARRC_TOKEN")));
            require(arrcToken.transfer(order.seller, totalPrice), "ARRC return failed");
        }

        // Remove marketplace storage
        getMarketPlaceStorage().removeOrderStorage(tradeOrderId);

        order.isActive = false;
        emit TradeOrderCancelled(tradeOrderId);
    }

    function initiateTrade(
        address player,
        uint256 shipId,
        uint256 tradeOrderId,
        uint256 arrcAmount,
        string memory resourceType,
        uint256 resourceAmount
    ) external override nonReentrant returns (bool) {
        IMissionsStorage missionsStorage = IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage"))
        );
        require(!missionsStorage.isOnMission(shipId), "Ship on mission");
        require(msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256("TRADE_MISSION")), "Unauthorized");
        require(isTradeOrderValid(tradeOrderId), "Invalid order");
        
        TradeOrder storage order = tradeOrders[tradeOrderId];
        bool isSellOrder = order.isSellOrder;
        
        // Prevent self-trading
        require(player != order.seller, "Cannot trade with yourself");
        
        // Allow partial orders
        require(resourceAmount > 0 && resourceAmount <= order.resourceAmount, "Invalid amount");
        
        // Calculate proportional price for partial orders
        uint256 expectedPrice = order.arrcPrice * resourceAmount;
        require(arrcAmount == expectedPrice, "Invalid ARRC amount");
        
        require(keccak256(bytes(resourceType)) == keccak256(bytes(order.resourceType)), "Resource mismatch");

        // Check ship storage capacity
        require(
            getShipStorage().getStorageCapacity(shipId) >= resourceAmount,
            "Insufficient ship capacity"
        );

        // Get origin island (source) from the ship's current mission
        uint256 originIslandId = getOriginIslandId(shipId);

        // Create active trade
        uint256 activeTradeId = nextActiveTradeId++;
        activeTrades[activeTradeId] = ActiveTrade({
            player: player,
            shipId: shipId,
            tradeOrderId: tradeOrderId,
            startTime: block.timestamp,
            isCompleted: false,
            resourceAmount: resourceAmount,
            price: arrcAmount,
            needsReturn: false, // Will be set to true after trade completion
            originIslandId: originIslandId
        });

        // Calculate journey duration for locking
        uint256 journeyDuration = getTravelTimeCalculator().calculateTravelTime(order.islandId, originIslandId, shipId, true);
        
        // Handle actions based on order type
        if (!isSellOrder) {
            // Buy order (ship buying resources from island)
            // Lock ARRC from player in the ArrcLocking contract
            IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(keccak256("ARRC_TOKEN")));
            require(arrcToken.balanceOf(player) >= arrcAmount, "Insufficient ARRC balance");
            require(arrcToken.allowance(player, address(getArrcLocking())) >= arrcAmount, "Insufficient ARRC allowance for locking");
            
            // Lock ARRC in ArrcLocking contract
            getArrcLocking().lockForTrade(
                shipId,
                arrcAmount,
                journeyDuration,
                LOCKING_TYPE_BUY_ORDER,
                player
            );
        } else {
            // Sell order (island buying resources)
            // Transfer resources from origin island to ship at mission start
            IResourceManagement resourceManagement = getResourceManagement();
            
            // Verify origin island has enough resources
            uint256 originIslandResourceBalance = resourceManagement.getResourceBalance(
                player, // Player is the owner of the origin island resources
                originIslandId,
                resourceType
            );
            require(originIslandResourceBalance >= resourceAmount, "Insufficient resources on origin island");
            
            // Transfer resources from origin island to ship
            resourceManagement.transferResource(
                address(getIslandStorage()),
                originIslandId, // From origin island
                player, // Still player's authorization
                address(getShipStorage()), // To ship storage contract
                shipId, // To ship ID
                player, // Authorized by player
                resourceType, // Resource type
                resourceAmount // Amount to transfer
            );
        }
        // For sell orders, ARRC will be moved from this contract to ArrcLocking during completeTrade

        emit TradeInitiated(player, shipId, tradeOrderId);
        return true;
    }

    function completeTrade(
        address player,
        uint256 shipId
    ) external override nonReentrant returns (bool) {
        require(msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256("TRADE_MISSION")), "Unauthorized");
        
        uint256 activeTradeId = getActiveTradeIdByShip(shipId);
        require(activeTradeId > 0, "No active trade");
        
        ActiveTrade storage trade = activeTrades[activeTradeId];
        require(!trade.isCompleted, "Already completed");
        require(trade.player == player, "Wrong player");

        TradeOrder storage order = tradeOrders[trade.tradeOrderId];
        bool isSellOrder = order.isSellOrder;
        
        if (!isSellOrder) {
            // Buy order (ship buying resources from island)
            // Transfer ARRC payment from ArrcLocking to island owner
            getArrcLocking().transferArrcToRecipient(shipId, order.seller);
            
            // Transfer resources from marketplace to ship
            IResourceManagement resourceManagement = getResourceManagement();
            resourceManagement.transferResource(
                address(getShipStorage()),
                shipId,
                player,
                address(getMarketPlaceStorage()),
                trade.tradeOrderId,
                address(this),
                order.resourceType,
                trade.resourceAmount
            );
            
            // Check if the island has enough storage capacity to receive the resources
            IStorageManagement storageManagement = IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
            address islandContract = centralAuthorizationRegistry.getContractAddress(keccak256("ISLAND_MANAGER"));
            bool hasEnoughStorage = storageManagement.checkStorageLimit(islandContract, order.islandId, trade.resourceAmount);
            
            if (hasEnoughStorage) {
                // If island has enough storage, transfer resources directly
                resourceManagement.transferResource(
                    address(getMarketPlaceStorage()),
                    trade.tradeOrderId,
                    address(this),
                    address(getIslandStorage()),
                    order.islandId,
                    order.seller,
                    order.resourceType,
                    trade.resourceAmount
                );
            } else {
                // If island doesn't have enough storage, add to pending deliveries in consolidated storage
                // Add to consolidated pending resources in MarketPlaceStorage
                getMarketPlaceStorage().addPendingResource(
                    order.islandId,
                    order.resourceType,
                    trade.resourceAmount
                );
                
                emit ResourcesHeldForDelivery(order.islandId, 0, order.resourceType, trade.resourceAmount);
            }
        } else {
            // Sell order (ship selling resources to island)
            // Calculate return journey duration for locking
            uint256 returnDuration = getTravelTimeCalculator().calculateTravelTime(order.islandId, trade.originIslandId, shipId, true);
            
            // Lock ARRC for the return journey in ArrcLocking
            // We need to transfer ARRC from this contract to ArrcLocking first
            IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(keccak256("ARRC_TOKEN")));
            require(arrcToken.approve(address(getArrcLocking()), trade.price), "ARRC approval failed");
            
            // Lock ARRC in ArrcLocking contract for return journey
            getArrcLocking().lockForTrade(
                shipId,
                trade.price,
                returnDuration,
                LOCKING_TYPE_SELL_ORDER,
                address(this)
            );
            
            // Transfer resources from ship to marketplace
            IResourceManagement resourceManagement = getResourceManagement();
            resourceManagement.transferResource(
                address(getShipStorage()),
                shipId,
                player,
                address(getMarketPlaceStorage()),
                trade.tradeOrderId,
                address(this),
                order.resourceType,
                trade.resourceAmount
            );
            
            // Check if the island has enough storage capacity to receive the resources
            IStorageManagement storageManagement = IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
            address islandContract = centralAuthorizationRegistry.getContractAddress(keccak256("ISLAND_MANAGER"));
            bool hasEnoughStorage = storageManagement.checkStorageLimit(islandContract, order.islandId, trade.resourceAmount);
            
            if (hasEnoughStorage) {
                // If island has enough storage, transfer resources directly
                resourceManagement.transferResource(
                    address(getMarketPlaceStorage()),
                    trade.tradeOrderId,
                    address(this),
                    order.seller,
                    order.islandId,
                    order.seller,
                    order.resourceType,
                    trade.resourceAmount
                );
            } else {
                // If island doesn't have enough storage, add to pending deliveries in consolidated storage
                // Add to consolidated pending resources in MarketPlaceStorage
                getMarketPlaceStorage().addPendingResource(
                    order.islandId,
                    order.resourceType,
                    trade.resourceAmount
                );
                
                emit ResourcesHeldForDelivery(order.islandId, 0, order.resourceType, trade.resourceAmount);
            }
        }

        // Update order amounts for partial orders
        order.resourceAmount -= trade.resourceAmount;
        
        // If all resources are traded, deactivate the order and clean up storage
        if (order.resourceAmount == 0) {
            order.isActive = false;
            // Remove marketplace storage when completely fulfilled
            getMarketPlaceStorage().removeOrderStorage(trade.tradeOrderId);
        }

        // Mark trade as completed and needing return journey
        trade.isCompleted = true;
        trade.needsReturn = true;

        emit TradeCompleted(player, shipId, trade.tradeOrderId);
        return true;
    }

    /**
     * @notice Start the return journey after trade completion
     * @param player Address of the player
     * @param shipId Ship identifier
     * @return success Boolean indicating if return journey was started successfully
     */
    function startReturnJourney(
        address player,
        uint256 shipId
    ) external nonReentrant returns (bool) {
        require(msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256("TRADE_MISSION")), "Unauthorized");
        
        uint256 activeTradeId = getActiveTradeIdByShip(shipId);
        require(activeTradeId > 0, "No active trade");
        
        ActiveTrade storage trade = activeTrades[activeTradeId];
        require(trade.isCompleted, "Trade not completed");
        require(trade.needsReturn, "Return journey already started");
        require(trade.player == player, "Wrong player");

        // Mark return journey as started
        trade.needsReturn = false;
        
        // Return journey will be handled by a ResourceTransferMission
        // The TradeMission contract should call this when ready to return

        emit ReturnJourneyStarted(player, shipId, trade.originIslandId);
        return true;
    }

    /**
     * @notice Complete the entire trade mission (called after return journey completes)
     * @param player Address of the player
     * @param shipId Ship identifier
     * @return success Boolean indicating if mission was completed successfully
     */
    function completeEntireTradeMission(
        address player,
        uint256 shipId
    ) external nonReentrant returns (bool) {
        require(msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256("RESOURCE_TRANSFER_MISSION")), "Unauthorized");
        
        uint256 activeTradeId = getActiveTradeIdByShip(shipId);
        require(activeTradeId > 0, "No active trade");
        
        ActiveTrade storage trade = activeTrades[activeTradeId];
        require(trade.isCompleted, "Trade not completed");
        require(trade.player == player, "Wrong player");
        require(!trade.needsReturn, "Return journey not started");

        TradeOrder storage order = tradeOrders[trade.tradeOrderId];
        
        // If this was a sell order (ship selling to island), unlock ARRC to player
        if (order.isSellOrder) {
            getArrcLocking().unlockArrc(shipId, player);
        }

        // Clean up by removing the active trade
        delete activeTrades[activeTradeId];

        emit ReturnJourneyCompleted(player, shipId);
        return true;
    }
    
    /**
     * @notice Get pending resource amount for an island by resource type
     * @param islandId The island ID to check
     * @param resourceType The type of resource
     * @return Amount of pending resources for the specified resource type
     */
    function getPendingResourceAmount(uint256 islandId, string calldata resourceType) external view returns (uint256) {
        return getMarketPlaceStorage().getPendingResourceAmount(islandId, resourceType);
    }
    
    /**
     * @notice Get all resource types with pending deliveries for an island
     * @param islandId The island ID to check
     * @return Array of resource types that have pending deliveries
     */
    function getPendingResourceTypes(uint256 islandId) external view returns (string[] memory) {
        return getMarketPlaceStorage().getPendingResourceTypes(islandId);
    }
    
    /**
     * @notice Claim pending deliveries of a specific resource type for an island
     * @param islandId The island ID
     * @param resourceType The type of resource to claim
     * @param amount The amount of resource to claim (use type(uint256).max to claim all)
     */
    function claimPendingDeliveries(uint256 islandId, string calldata resourceType, uint256 amount) 
        external 
        onlyIslandOwner(islandId) 
        nonReentrant 
    {
        MarketPlaceStorage marketPlaceStorage = getMarketPlaceStorage();
        uint256 pendingAmount = marketPlaceStorage.getPendingResourceAmount(islandId, resourceType);
        require(pendingAmount > 0, "No pending deliveries for this resource type");
        
        // If amount is set to max uint256, claim all available
        if (amount == type(uint256).max) {
            amount = pendingAmount;
        }
        
        require(amount <= pendingAmount, "Requested amount exceeds available resources");
        
        // Check if the island has enough storage capacity
        IResourceManagement resourceManagement = getResourceManagement();
        IStorageManagement storageManagement = IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
        address islandContract = centralAuthorizationRegistry.getContractAddress(keccak256("ISLAND_MANAGER"));
        
        require(storageManagement.checkStorageLimit(islandContract, islandId, amount), "Insufficient island storage");
        
        // Transfer resources from marketplace to island using consolidated storage
        resourceManagement.transferResource(
            address(marketPlaceStorage),
            islandId, // Using islandId as consolidated storage ID
            address(this),
            msg.sender,
            islandId,
            msg.sender,
            resourceType,
            amount
        );
        
        // Update the pending deliveries in MarketPlaceStorage
        marketPlaceStorage.removePendingResource(islandId, resourceType, amount);
        
        emit PendingDeliveryClaimed(islandId, resourceType, amount);
    }

    // View functions
    function getTradeOrder(uint256 tradeOrderId) external view override returns (
        address seller,
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice,
        bool isActive
    ) {
        TradeOrder storage order = tradeOrders[tradeOrderId];
        return (
            order.seller,
            order.islandId,
            order.resourceType,
            order.resourceAmount,
            order.arrcPrice,
            order.isActive
        );
    }

    function isTradeOrderValid(uint256 tradeOrderId) public view override returns (bool) {
        TradeOrder storage order = tradeOrders[tradeOrderId];
        return order.isActive && !isTradeInProgress(tradeOrderId);
    }

    function getActiveTradeOrders(uint256 islandId) external view override returns (uint256[] memory) {
        uint256[] memory allOrders = islandTradeOrders[islandId];
        uint256 activeCount = 0;

        // Count active orders
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (isTradeOrderValid(allOrders[i])) {
                activeCount++;
            }
        }

        // Create array of active orders
        uint256[] memory activeOrders = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allOrders.length; i++) {
            if (isTradeOrderValid(allOrders[i])) {
                activeOrders[index++] = allOrders[i];
            }
        }

        return activeOrders;
    }

    /**
     * @notice Get the active trade count for an island
     * @param islandId The island ID to check
     * @return count The number of active trade orders for the island
     */
    function getActiveTradeOrderCount(uint256 islandId) internal view returns (uint256) {
        uint256[] memory orders = islandTradeOrders[islandId];
        uint256 count = 0;
        
        for (uint256 i = 0; i < orders.length; i++) {
            if (tradeOrders[orders[i]].isActive) {
                count++;
            }
        }
        
        return count;
    }

    // Internal functions
    function isTradeInProgress(uint256 tradeOrderId) internal view returns (bool) {
        for (uint256 i = 1; i < nextActiveTradeId; i++) {
            if (activeTrades[i].tradeOrderId == tradeOrderId && !activeTrades[i].isCompleted) {
                return true;
            }
        }
        return false;
    }

    function getActiveTradeIdByShip(uint256 shipId) internal view returns (uint256) {
        for (uint256 i = 1; i < nextActiveTradeId; i++) {
            // We consider a trade as active even if it's completed but needs return journey
            if (activeTrades[i].shipId == shipId && (!activeTrades[i].isCompleted || activeTrades[i].needsReturn)) {
                return i;
            }
        }
        return 0;
    }

    function getIslandOwner(uint256 islandId) internal view returns (address) {
        address islandContract = centralAuthorizationRegistry.getContractAddress(keccak256("ISLAND_MANAGER"));
        (bool success, bytes memory data) = islandContract.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", islandId)
        );
        require(success, "Island owner check failed");
        return abi.decode(data, (address));
    }

    /**
     * @notice Calculate the total mission duration including return journey
     * @param shipId Ship identifier
     * @param destinationIslandId Destination island ID
     * @return duration Total mission duration in seconds
     */
    function calculateTotalMissionDuration(uint256 shipId, uint256 destinationIslandId) internal view returns (uint256) {
        // Get origin island from current mission data
        uint256 originIslandId = getOriginIslandId(shipId);
        
        // Calculate both outbound and return journey times in a single call
        (uint256 outboundTime, uint256 returnTime) = getTravelTimeCalculator().calculateRoundTripTravelTime(
            originIslandId, 
            destinationIslandId, 
            shipId,
            true
        );
        
        // Total duration is outbound + return
        return outboundTime + returnTime;
    }

    /**
     * @notice Get the origin island ID for a ship
     * @param shipId Ship identifier
     * @return islandId Origin island ID
     */
    function getOriginIslandId(uint256 shipId) internal view returns (uint256) {
        IMissionsStorage missionsStorage = IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage"))
        );
        
        uint256 missionType = missionsStorage.getMissionType(shipId);
        address storageAddress = missionsStorage.getSpecializedStorage(missionType);
        
        // If a specialized storage is registered, directly call getSourceIslandId.
        // If the storage doesn't implement the required interface or reverts, 
        // the transaction will fail, which is the desired behavior.
        if (storageAddress != address(0)) {
            // Assuming the specialized storage for missions needing origin ID
            // implements a function to retrieve it (e.g., via ITransferMissionStorage).
            // We directly cast and call, letting it revert on failure.
            return ITransferMissionStorage(storageAddress).getSourceIslandId(shipId);
        }
        
        // If no specialized storage or mission type doesn't need origin ID, return 0.
        return 0;
    }

    /**
     * @notice Check if a ship is on a return journey from a trade
     * @param shipId Ship identifier
     * @return isReturning Whether the ship is on a return journey from a trade
     */
    function hasActiveTradeReturnForShip(uint256 shipId) external view returns (bool) {
        for (uint256 i = 1; i < nextActiveTradeId; i++) {
            if (activeTrades[i].shipId == shipId && 
                activeTrades[i].isCompleted && 
                !activeTrades[i].needsReturn) {
                // If trade is completed and needsReturn is false, it means the return journey has been started
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Check if a resource type has pending deliveries for an island
     * @param islandId The island ID
     * @param resourceType The resource type to check
     * @return Whether the resource type has pending deliveries
     */
    function hasResourceTypePending(uint256 islandId, string calldata resourceType) external view returns (bool) {
        return getMarketPlaceStorage().hasResourceTypePending(islandId, resourceType);
    }

    /**
     * @notice Track a pending resource type for an island
     * @param islandId Island identifier
     * @param resourceType Type of resource to track
     */
    function _trackPendingResourceType(uint256 islandId, string memory resourceType) internal {
        // Implementation can be customized as needed
        // This function tracks which resource types are currently pending in trade orders for an island
        
        // For now, we'll just emit an event for tracking purposes
        emit ResourceTypeTracked(islandId, resourceType);
    }
}
