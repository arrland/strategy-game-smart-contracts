# ShipAndPirateStaking Contract Deployment Guide

This document outlines the necessary steps to deploy the `ShipAndPirateStaking` contract and its dependencies based on the testing environment in `ShipAndPirateStaking.test.js`.

## Deployment Overview

The ShipAndPirateStaking contract requires several dependencies and a specific deployment order:

1. Authorization system
2. NFT collections
3. Token infrastructure
4. Support contracts
5. Contract registrations
6. ShipAndPirateStaking deployment
7. TravelTimeCalculator deployment
8. Post-deployment setup

## Contract Deployment Requirements

Below are the specific requirements for each contract in the deployment process:

### CentralAuthorizationRegistry (CAR)
- **Constructor Parameters**: None
- **Post-Deployment**: 
  - Must be initialized with an admin address
  - Admin must be authorized to call contracts

### NFT Collections

#### Ship NFT (SimpleERC721)
- **Constructor Parameters**:
  - `name`: Token name (e.g., "Ship NFT")
  - `symbol`: Token symbol (e.g., "SHIP")
  - `baseURI`: Base URI for token metadata (e.g., "https://ship.com/")
  - `adminAddress`: Address with admin privileges

#### Genesis Pirates NFT (SimpleERC1155)
- **Constructor Parameters**:
  - `adminAddress`: Address with admin privileges
  - `baseURI`: Base URI for token metadata (e.g., "https://genesis.com/")
- **Post-Deployment**:
  - Must be registered in CAR using `registerPirateNftContract`

#### Inhabitants NFT (SimpleERC721)
- **Constructor Parameters**:
  - `name`: Token name (e.g., "Inhabitant")
  - `symbol`: Token symbol (e.g., "INH")
  - `baseURI`: Base URI for token metadata (e.g., "https://inhabitant.com/")
  - `adminAddress`: Address with admin privileges
- **Post-Deployment**:
  - Must be registered in CAR using `registerPirateNftContract`

### Token Infrastructure

#### ARRC Token (DummyERC20Burnable)
- **Constructor Parameters**:
  - `name`: Token name (e.g., "ARRC Token")
  - `symbol`: Token symbol (e.g., "ARRC")
- **Post-Deployment**:
  - Tokens need to be minted to users

#### RUM Token (DummyERC20Burnable)
- **Constructor Parameters**:
  - `name`: Token name (e.g., "RUM Token")
  - `symbol`: Token symbol (e.g., "RUM")
- **Post-Deployment**:
  - Tokens need to be minted to users

#### FeeManagement
- **Constructor Parameters**:
  - `car`: CAR contract address
  - `rumToken`: RUM token address
  - `arrcToken`: ARRC token address
  - `beneficiary`: Address to receive fees
- **Post-Deployment**:
  - Must be registered in CAR with the FeeManagement interface ID

### Support Contracts

#### IslandRegionManagement
- **Constructor Parameters**:
  - `car`: CAR contract address
- **Post-Deployment**:
  - Must be registered in CAR with the IIslandRegionManagement interface ID
  - Island regions must be configured with appropriate values

#### PirateSkills
- **Constructor Parameters**:
  - `car`: CAR contract address
- **Post-Deployment**:
  - Must be registered in CAR with the PirateSkills interface ID

#### PirateSkillsReader
- **Constructor Parameters**:
  - `car`: CAR contract address
  - `genesisPiratesAddress`: Genesis Pirates NFT address
- **Post-Deployment**:
  - Must be registered in CAR with the PirateSkillsReader interface ID

#### ShipMetadata
- **Constructor Parameters**:
  - `car`: CAR contract address
- **Post-Deployment**:
  - Must be registered in CAR with the ShipMetadata interface ID

#### ShipStorage
- **Constructor Parameters**:
  - `car`: CAR contract address
  - `shipNftAddress`: Ship NFT contract address
  - `isNft721`: Boolean flag indicating if the ship NFT is ERC721 (true) or ERC1155 (false)
- **Post-Deployment**:
  - Must be registered in CAR with the ShipStorage interface ID

#### CrewTypeManager
- **Constructor Parameters**:
  - `car`: CAR contract address
  - `genesisPiratesAddress`: Genesis Pirates NFT address
  - `inhabitantsAddress`: Inhabitants NFT address
- **Post-Deployment**:
  - Must be registered in CAR with the CrewTypeManager interface ID

#### CrewManagement
- **Constructor Parameters**:
  - `car`: CAR contract address
- **Post-Deployment**:
  - Must be registered in CAR with the CrewManagement interface ID

#### MockMissionsStorage
- **Constructor Parameters**: None
- **Post-Deployment**:
  - Must be authorized in CAR
  - Must be registered in CAR with the IMissionsStorage interface ID

### Main Contract

#### ShipAndPirateStaking
- **Constructor Parameters**:
  - `car`: CAR contract address
  - `shipNftAddress`: Ship NFT contract address
  - `genesisPiratesAddress`: Genesis Pirates NFT address
  - `inhabitantsAddress`: Inhabitants NFT address
- **Post-Deployment**:
  - Must be registered in CAR with the IShipAndPirateStaking interface ID
  - NFTs must be approved for the contract before staking

#### TravelTimeCalculator
- **Constructor Parameters**:
  - `car`: CAR contract address
- **Post-Deployment**:
  - Must be registered in CAR with the ITravelTimeCalculator interface ID
  - Minimum travel duration must be set
  - Base speed should be configured appropriately

## 1. Authorization System

First, deploy the Central Authorization Registry (CAR) which manages contract access:

```javascript
const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
await centralAuthorizationRegistry.initialize(adminAddress);

// Authorize admin to call contracts
await centralAuthorizationRegistry.addAuthorizedContract(adminAddress);
```

## 2. NFT Collections

Deploy the required NFT collections using the utility functions for cleaner code:

```javascript
// Ship NFT (ERC721)
const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
const shipNFT = await SimpleERC721.deploy("Ship NFT", "SHIP", "https://ship.com/", adminAddress);
await shipNFT.waitForDeployment();

// Set up Pirate NFTs using utility functions
// Important: Only pass one user at a time to avoid ERC721 token conflicts
const { genesisPiratesNFT, genesisPiratesAddress } = 
    await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [user]);

const { inhabitantsNFT, inhabitantsAddress } = 
    await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [user]);

// Note: The utility functions above also handle minting NFTs and
// registering the NFT contracts in the central registry
```

## 3. Token Infrastructure

Set up token infrastructure for fees and rewards:

```javascript
// Use the utility function for token infrastructure
const tokenInfrastructure = await setupTokenInfrastructure(
    centralAuthorizationRegistry, 
    admin, 
    [user1, user2], 
    "1000" // Amount to distribute
);
const arrcToken = tokenInfrastructure.arrcToken;
const rumToken = tokenInfrastructure.rumToken;
const feeManagement = tokenInfrastructure.feeManagement;

// If deploying manually:
// 1. Deploy ARRC and RUM tokens
// 2. Deploy FeeManagement
// 3. Mint tokens to users
// 4. Set up token approvals
```

## 4. Support Contracts

Deploy required support contracts using the utility function that handles both deployment and authorization:

```javascript
// IslandRegionManagement
const islandRegionManagement = await deployAndAuthorizeContract(
    "IslandRegionManagement", 
    centralAuthorizationRegistry
);

// PirateSkills
const pirateSkills = await deployAndAuthorizeContract("PirateSkills", centralAuthorizationRegistry);

// PirateSkillsReader
const pirateSkillsReader = await deployAndAuthorizeContract(
    "PirateSkillsReader", 
    centralAuthorizationRegistry,
    genesisPiratesAddress
);

// ShipMetadata
const shipMetadata = await deployAndAuthorizeContract("ShipMetadata", centralAuthorizationRegistry);

// ShipStorage
const shipStorage = await deployAndAuthorizeContract(
    "ShipStorage",
    centralAuthorizationRegistry,
    await shipNFT.getAddress(),
    true // isNft721
);

// CrewTypeManager
const crewTypeManager = await deployAndAuthorizeContract(
    "CrewTypeManager", 
    centralAuthorizationRegistry,
    genesisPiratesAddress,
    inhabitantsAddress
);

// CrewManagement
const crewManagement = await deployAndAuthorizeContract(
    "CrewManagement", 
    centralAuthorizationRegistry
);

// MissionsStorage using utility function
const missionsStorage = await deployMockMissionsStorage(centralAuthorizationRegistry);
// Note: This utility handles both deployment and registration in CAR
```

## 5. Contract Registrations

Register all contracts in the central registry using the utility function:

```javascript
// Register contract addresses with their respective keys using utility function
await registerContractAddresses(centralAuthorizationRegistry, {            
    "FeeManagement": await feeManagement.getAddress(),
    "IIslandRegionManagement": await islandRegionManagement.getAddress()
});

// Note: The missionsStorage is already registered by the deployMockMissionsStorage utility
```

## 6. ShipAndPirateStaking Deployment

Deploy the main contract:

```javascript
// Deploy ShipAndPirateStaking
const shipAndPirateStaking = await deployAndAuthorizeContract(
    "ShipAndPirateStaking",
    centralAuthorizationRegistry,
    await shipNFT.getAddress(),
    genesisPiratesAddress,
    inhabitantsAddress
);

// Note: deployAndAuthorizeContract handles authorization automatically
// No need for additional authorization calls
```

## 7. TravelTimeCalculator Deployment

Deploy the TravelTimeCalculator contract:

```javascript
// Deploy TravelTimeCalculator
const travelTimeCalculator = await deployAndAuthorizeContract(
    "TravelTimeCalculator", 
    centralAuthorizationRegistry
);

// Set minimum travel duration
await travelTimeCalculator.setMinTravelDuration(300); // 5 minutes in seconds

// Register in CAR
await registerContractAddresses(centralAuthorizationRegistry, {
    "ITravelTimeCalculator": await travelTimeCalculator.getAddress()
});
```

## 8. Post-Deployment Setup

Set up ship metadata, pirate skills, crew requirements, and island regions:

```javascript
// Configure island regions
await islandRegionManagement.connect(admin).setIslandRegion(1, 0); // Island 1 = NorthWest (0)
await islandRegionManagement.connect(admin).setIslandRegion(2, 3); // Island 2 = SouthEast (3)
await islandRegionManagement.connect(admin).setIslandRegion(3, 1); // Island 3 = NorthEast (1)
await islandRegionManagement.connect(admin).setIslandRegion(4, 2); // Island 4 = SouthWest (2)

// Mint ships
await shipNFT.mintSpecific(user.address, 1);
await shipNFT.mintSpecific(user.address, 2);

// Approve NFTs for staking
await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 1);
await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 2);
await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 1);
await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 2);
await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 3);
await genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);

// Configure ship metadata
await setupShipMetadata(shipMetadata, admin, [1, 2, 3], {
    class: "SMALL_SHIP",
    durability: 100,
    speed: 20, // Important for travel time calculations
    agility: 15,
    viewingRange: 10,
    cannonsCapacity: 10,
    armor: 50,
    ramming: 30,
    crewMin: 2,
    crewMax: 10,
    cargoBay: 1000,
    oars: false,
    shallowWaters: true,
    deepWaters: true,
    shipType: "Combat"
});

// Initialize ship storage
await initializeShipStorage(shipStorage, [1, 2, 3]);

// Set up pirate skills
await setupPirateSkills(
    pirateSkills, 
    admin, 
    genesisPiratesAddress, 
    inhabitantsAddress, 
    {
        genesis: [1, 2, 3],
        inhabitants: [1, 2, 3]
    }
);

// Set up crew for pirates
await setupCrewForPirates(
    crewManagement, 
    admin, 
    genesisPiratesAddress, 
    inhabitantsAddress, 
    userAddress, 
    {genesis: [1, 2, 3], inhabitants: [1, 2, 3]}, 
    "sailor", 
    {captain: 3, crew: 2}
);
```

## Verification

Verify the deployment:

```javascript
// Verify contract owner and configuration
expect(await shipAndPirateStaking.genesisPiratesAddress()).to.equal(genesisPiratesAddress);
expect(await shipAndPirateStaking.inhabitantsAddress()).to.equal(inhabitantsAddress);
expect(await shipAndPirateStaking.shipNft()).to.equal(await shipNFT.getAddress());

// Test a basic staking operation
await stakeShipWithPirates(
    shipAndPirateStaking,
    user,
    1, // shipId
    1, // captainId
    genesisPiratesAddress, // captainCollection
    [], // genesisPirateIds
    [] // inhabitantIds
);

// Verify ship is staked
expect(await shipAndPirateStaking.isShipStaked(1)).to.be.true;

// Verify TravelTimeCalculator
const minDuration = await travelTimeCalculator.MIN_TRAVEL_DURATION();
expect(minDuration).to.equal(300); // 5 minutes in seconds

// Test travel time calculation
const travelTime = await travelTimeCalculator.calculateBaseTravelTime(1, 2);
expect(travelTime).to.be.gt(0); // Travel time should be greater than 0
```

## Helper Functions

This deployment guide utilizes several helper functions that are defined in the `utils.js` file. These include:

- `deployAndAuthorizeContract` - Deploys and authorizes a contract in a single call
- `setupPirateSkills` - Sets up pirate skills for testing
- `setupCrewForPirates` - Sets up crew for pirates 
- `setupShipMetadata` - Sets up ship metadata
- `initializeShipStorage` - Initializes ship storage
- `stakeShipWithPirates` - Helper for staking a ship with pirates
- `setupTokenInfrastructure` - Sets up token infrastructure (ARRC, RUM, FeeManagement)
- `setupGenesisPiratesNFT` - Sets up Genesis Pirates NFT (ERC1155)
- `setupInhabitantsNFT` - Sets up Inhabitants NFT (ERC721)
- `registerContractAddresses` - Registers multiple contract addresses at once
- `deployMockMissionsStorage` - Deploys and sets up mock missions storage

The complete implementations of these helpers can be found in the project's `test/utils.js` file.

## Common Issues and Best Practices

1. **Token Approval**: Ensure users have approved token transfers to the staking contract before attempting to stake.
2. **Contract Registration**: All contracts must be properly registered in the CAR.
3. **Crew Requirements**: Ships must meet minimum crew requirements before staking is allowed.
4. **Pirate Skills**: Pirates should have appropriate skills set up before they're used as captains.
5. **Ship Metadata**: Ship metadata must be set up before initializing storage.
6. **ERC721 Token Minting**: When using `setupInhabitantsNFT` or any ERC721 minting helper, avoid passing multiple users if they would receive the same token IDs, as this will cause `ERC721InvalidSender` errors.
7. **Redundant Authorization**: Avoid making redundant authorization calls, as the `deployAndAuthorizeContract` function already handles this.
8. **Island Regions**: Ensure all islands have the correct region set in IslandRegionManagement before using TravelTimeCalculator.
9. **Travel Time Configuration**: Set appropriate minimum travel durations and base speeds in the TravelTimeCalculator.

---

This deployment guide is based on the testing environment in `ShipAndPirateStaking.test.js` and may need to be adapted for production use. 

## Deployment Dependencies Graph

The following graph shows the dependencies between contracts in the deployment process:

```
CentralAuthorizationRegistry (CAR)
├── NFT Collections
│   ├── Ship NFT (SimpleERC721)
│   ├── Genesis Pirates NFT (SimpleERC1155)
│   └── Inhabitants NFT (SimpleERC721)
├── Token Infrastructure
│   ├── ARRC Token (DummyERC20Burnable)
│   ├── RUM Token (DummyERC20Burnable)
│   └── FeeManagement (depends on: CAR, ARRC, RUM)
├── Support Contracts
│   ├── IslandRegionManagement (depends on: CAR)
│   ├── PirateSkills (depends on: CAR)
│   ├── PirateSkillsReader (depends on: CAR, Genesis Pirates)
│   ├── ShipMetadata (depends on: CAR)
│   ├── ShipStorage (depends on: CAR, Ship NFT)
│   ├── CrewTypeManager (depends on: CAR, Genesis Pirates, Inhabitants)
│   ├── CrewManagement (depends on: CAR)
│   └── MockMissionsStorage (depends on: CAR)
└── Main Contracts
    ├── ShipAndPirateStaking (depends on: CAR, Ship NFT, Genesis Pirates, Inhabitants, FeeManagement)
    └── TravelTimeCalculator (depends on: CAR, IslandRegionManagement, ShipMetadata, ShipAndPirateStaking, PirateSkillsReader)
```

## Interface Registration Requirements

All contracts in the system need to be registered in the Central Authorization Registry (CAR) with their respective interface IDs. This enables other contracts to find and interact with them through the CAR without direct coupling.

### Interface ID Generation

Interface IDs are generated in one of two ways:
1. Using the contract's `INTERFACE_ID` constant if available
2. Using the keccak256 hash of the contract name if no INTERFACE_ID is available

```javascript
// Example of interface ID retrieval in deployAndAuthorizeContract
try {
    interfaceId = await contractInstance.INTERFACE_ID();
} catch (error) {
    // Fallback to keccak hash of contract name
    interfaceId = ethers.keccak256(ethers.toUtf8Bytes(contractName));
}
```

### Required Interface Registrations

The following interfaces must be registered in the CAR:

| Contract | Interface ID | Generation Method |
|----------|--------------|-------------------|
| PirateSkills | INTERFACE_ID | From contract constant |
| PirateSkillsReader | INTERFACE_ID | From contract constant |
| ShipMetadata | INTERFACE_ID | From contract constant |
| ShipStorage | INTERFACE_ID | From contract constant |
| CrewTypeManager | INTERFACE_ID | From contract constant |
| CrewManagement | INTERFACE_ID | From contract constant |
| MockMissionsStorage | "IMissionsStorage" | Keccak256 hash |
| FeeManagement | "FeeManagement" | Keccak256 hash |
| ShipAndPirateStaking | INTERFACE_ID | From contract constant |
| IslandRegionManagement | "IIslandRegionManagement" | Keccak256 hash |
| TravelTimeCalculator | "ITravelTimeCalculator" | Keccak256 hash |

### Registration Process

Registration occurs after contract deployment using the `setContractAddress` method:

```javascript
await centralAuthorizationRegistry.setContractAddress(
    interfaceId,
    contractAddress
);
```

The `deployAndAuthorizeContract` utility function handles both deployment and registration in a single call, which is the recommended approach.

### Pirate NFT Registration

Pirate NFT contracts (Genesis Pirates and Inhabitants) must be registered using a special method:

```javascript
await centralAuthorizationRegistry.registerPirateNftContract(nftAddress);
```

This special registration ensures the NFTs can be properly identified by the system during staking operations.

## Post-Deployment Configuration Requirements

After deploying all contracts, several configuration steps are necessary before the system is fully operational. These steps ensure that ships, pirates, and their relationships are properly set up.

### Ship Configuration

#### Ship Metadata
Ships require metadata to define their attributes:

```javascript
await setupShipMetadata(shipMetadata, admin, shipIds, {
    class: "SMALL_SHIP",       // Ship class (affects gameplay)
    durability: 100,           // Durability stat
    speed: 20,                 // Speed stat (important for travel time calculations)
    agility: 15,               // Agility stat
    viewingRange: 10,          // Viewing range stat
    cannonsCapacity: 10,       // Cannons capacity stat
    armor: 50,                 // Armor stat
    ramming: 30,               // Ramming stat
    crewMin: 2,                // Minimum crew required (critical for staking)
    crewMax: 10,               // Maximum crew allowed
    cargoBay: 1000,            // Cargo capacity
    oars: false,               // Whether ship has oars
    shallowWaters: true,       // Can navigate shallow waters
    deepWaters: true,          // Can navigate deep waters
    shipType: "Combat"         // Ship type classification
});
```

#### Ship Storage Initialization
Ship storage must be initialized for each ship:

```javascript
await initializeShipStorage(shipStorage, shipIds);
```

This step is essential as it prepares the ship for tracking its state within the game economy.

### Pirate Configuration

#### Pirate Skills
Pirates (both Genesis Pirates and Inhabitants) require skills to be useful in the game:

```javascript
await setupPirateSkills(
    pirateSkills, 
    admin, 
    genesisPiratesAddress, 
    inhabitantsAddress, 
    {
        genesis: [1, 2, 3],       // Genesis Pirate IDs
        inhabitants: [1, 2, 3]    // Inhabitant IDs
    }
);
```

The skills system includes multiple skill categories:
- Character skills: Personal attributes (e.g., strength, intelligence)
- Tools skills: Proficiency with tools and weapons
- Special skills: Unique abilities
- Ship skills: Navigation and ship handling (affects travel time calculations)
- Magic skills: Magical abilities

Captains typically need higher skills compared to regular crew members.

#### Crew Assignment
Pirates need crew assignments that define their roles:

```javascript
await setupCrewForPirates(
    crewManagement, 
    admin, 
    genesisPiratesAddress, 
    inhabitantsAddress, 
    userAddress, 
    {genesis: [1, 2, 3], inhabitants: [1, 2, 3]}, 
    "sailor",                 // Crew type
    {captain: 3, crew: 2}     // Crew counts for captain and regular pirates
);
```

This setup ensures that:
1. Pirates have the right crew type (e.g., "sailor")
2. Pirates have sufficient crew counts to meet ship requirements
3. Captains have higher crew counts than regular crew members

### Island Region Configuration

Island regions must be configured for the travel time calculations to work correctly:

```javascript
// Configure island regions (0=NorthWest, 1=NorthEast, 2=SouthWest, 3=SouthEast)
await islandRegionManagement.connect(admin).setIslandRegion(1, 0); // Island 1 = NorthWest
await islandRegionManagement.connect(admin).setIslandRegion(2, 3); // Island 2 = SouthEast
await islandRegionManagement.connect(admin).setIslandRegion(3, 1); // Island 3 = NorthEast
await islandRegionManagement.connect(admin).setIslandRegion(4, 2); // Island 4 = SouthWest

// For batch configuration
await islandRegionManagement.connect(admin).batchSetIslandRegions(
    [5, 6, 7, 8],       // Island IDs
    [4, 5, 6, 7]        // Regions (4=North, 5=South, 6=East, 7=West)
);
```

The calculated travel time is based on the geographical relationship between islands:
- Same region: Short distance
- Diagonal regions (NW-SE, NE-SW): Medium distance
- All other combinations: Long distance

### TravelTimeCalculator Configuration

Configure the TravelTimeCalculator settings:

```javascript
// Set minimum travel duration
await travelTimeCalculator.connect(admin).setMinTravelDuration(300); // 5 minutes in seconds

// Set base speed (if needed)
await travelTimeCalculator.connect(admin).setBaseSpeed(10); // Default is 10
```

### Token Configuration

#### Token Approvals
Before staking can work, users must approve tokens for spending:

```javascript
// Approve tokens for fee management
await arrcToken.connect(user).approve(feeManagement.getAddress(), ethers.parseEther("1000"));
await rumToken.connect(user).approve(feeManagement.getAddress(), ethers.parseEther("1000"));

// Approve tokens for staking
await arrcToken.connect(user).approve(shipAndPirateStaking.getAddress(), ethers.parseEther("1000"));
```

#### NFT Approvals
Users must approve NFTs for staking:

```javascript
// Approve ship NFTs
await shipNFT.connect(user).approve(shipAndPirateStaking.getAddress(), shipId);

// Approve individual Inhabitant NFTs
await inhabitantsNFT.connect(user).approve(shipAndPirateStaking.getAddress(), pirateId);

// Approve all Genesis Pirates NFTs (since it's ERC1155)
await genesisPiratesNFT.connect(user).setApprovalForAll(shipAndPirateStaking.getAddress(), true);
```

### Fee Configuration

The FeeManagement contract needs configuration for proper fee collection:

```javascript
// Set staking fee (if required)
await feeManagement.connect(admin).setStakingFee(ethers.parseEther("10"));

// Set fee distribution (if required)
await feeManagement.connect(admin).setFeeDistribution(
    treasuryAddress,     // Treasury address
    50,                  // Treasury percentage (50%)
    rewardsPoolAddress,  // Rewards pool address
    50                   // Rewards pool percentage (50%)
);
```

### Mission System Configuration

If the mission system is used:

```javascript
// Set up mission types and rewards
await missionsStorage.connect(admin).addMissionType(
    1,                           // Mission type ID
    "Trading",                   // Mission name
    86400,                       // Duration (1 day in seconds)
    ethers.parseEther("100")     // Reward amount
);
```

### System Verification

After completing all configuration steps, verify that the system works correctly:

```javascript
// Verify ship can be staked
await stakeShipWithPirates(
    shipAndPirateStaking,
    user,
    shipId,               // Ship ID
    captainId,            // Captain ID
    genesisPiratesAddress, // Captain collection
    [crewId1, crewId2],   // Genesis crew IDs
    [crewId3]             // Inhabitant crew IDs
);

// Verify ship is staked correctly
const shipInfo = await shipAndPirateStaking.getShipInfo(shipId);
expect(shipInfo.isStaked).to.be.true;
expect(shipInfo.owner).to.equal(user.address);
expect(shipInfo.captainId).to.equal(captainId);

// Verify travel time calculation works
const travelTime = await travelTimeCalculator.calculateTravelTime(
    1,                    // From island
    2,                    // To island
    shipId,               // Ship ID
    false                 // Don't use cache
);
expect(travelTime).to.be.gt(0);
``` 