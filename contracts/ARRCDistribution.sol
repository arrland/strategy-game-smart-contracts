// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.25;

// import "./AuthorizationModifiers.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "./interfaces/IPirateNFT.sol";
// import "./PirateAccrualStorage.sol";

// interface IActivityStats {
//     function getActivityCountForUser(address user, uint256 period) external view returns (uint256);
//     function getUsersFromPrevPeriod() external view returns (address[] memory);
//     function currentActivityPeriod() external view returns (uint256);
// }

// contract ARRCDistribution is AuthorizationModifiers, ReentrancyGuard {
//     IERC20 public arrcToken;
//     IActivityStats public activityStats;
//     address public piratesCollection1;
//     address public piratesCollection2;
//     PirateAccrualStorage public accrualStorage;
    
//     // Constants
//     uint256 public constant MIN_ACTIVITY_FOR_REWARDS = 5;
//     uint256 public constant MIN_ACTIVITY_FOR_DOUBLE = 20;
    
//     // NFT tracking for each period
//     mapping(uint256 => mapping(address => uint256[])) public userNFTsClaimed1;
//     mapping(uint256 => mapping(address => uint256[])) public userNFTsClaimed2;
    
//     // Period tracking
//     mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasClaimedRewardForNFT;
    
//     event RewardsDistributed(uint256 period, address user, uint256 tokenId, uint256 amount, uint256 collectionId);
    
//     constructor(
//         address _centralAuthorizationRegistry,
//         address _arrcToken,
//         address _activityStats,
//         address _piratesCollection1,
//         address _piratesCollection2,
//         address _accrualStorage
//     ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IARRCDistribution")) {
//         arrcToken = IERC20(_arrcToken);
//         activityStats = IActivityStats(_activityStats);
//         accrualStorage = PirateAccrualStorage(_accrualStorage);
//     }

//     // Calculate accrual share for a specific NFT
//     function calculateAccrualShare(
//         uint256 tokenId, 
//         uint256 period,
//         uint256 collectionId
//     ) public view returns (uint256) {
//         IPirateNFT collection = IPirateNFT(collectionId == 1 ? piratesCollection1 : piratesCollection2);
//         address owner = collection.ownerOf(tokenId);
        
//         uint256 activityCount = activityStats.getActivityCountForUser(owner, period);
//         if (activityCount < MIN_ACTIVITY_FOR_REWARDS) {
//             return 0;
//         }
        
//         uint256 shareValue = accrualStorage.getAccrualValue(collectionId, tokenId);
//         uint256 multiplier = activityCount >= MIN_ACTIVITY_FOR_DOUBLE ? 2 : 1;
        
//         return shareValue * multiplier;
//     }

//     // Calculate total accruals for a period across both collections
//     function calculateTotalAccruals(uint256 period) public view returns (uint256) {
//         address[] memory users = activityStats.getUsersFromPrevPeriod();
//         uint256 totalAccruals = 0;
        
//         for (uint256 i = 0; i < users.length; i++) {
//             // Add logic to get user's NFTs from both collections
//             // This is a placeholder - you'll need to implement NFT enumeration
//             uint256[] memory nfts1 = getUserNFTs(users[i], 1);
//             uint256[] memory nfts2 = getUserNFTs(users[i], 2);
            
//             // Calculate accruals for collection 1
//             for (uint256 j = 0; j < nfts1.length; j++) {
//                 totalAccruals += calculateAccrualShare(nfts1[j], period, 1);
//             }
            
//             // Calculate accruals for collection 2
//             for (uint256 j = 0; j < nfts2.length; j++) {
//                 totalAccruals += calculateAccrualShare(nfts2[j], period, 2);
//             }
//         }
        
//         return totalAccruals;
//     }

//     // Claim rewards for a specific NFT
//     function claimRewards(
//         uint256 tokenId, 
//         uint256 period,
//         uint256 collectionId
//     ) external nonReentrant {
//         require(collectionId == 1 || collectionId == 2, "Invalid collection");
//         require(!hasClaimedRewardForNFT[period][msg.sender][tokenId], "Already claimed for this NFT");
//         require(period < activityStats.currentActivityPeriod(), "Period not finished");
        
//         IPirateNFT collection = collectionId == 1 ? piratesCollection1 : piratesCollection2;
//         require(collection.ownerOf(tokenId) == msg.sender, "Not token owner");
        
//         uint256 nftAccruals = calculateAccrualShare(tokenId, period, collectionId);
//         require(nftAccruals > 0, "No rewards eligible");
        
//         uint256 totalAccruals = calculateTotalAccruals(period);
//         uint256 periodRewards = arrcToken.balanceOf(address(this));
        
//         uint256 rewardAmount = (periodRewards * nftAccruals) / totalAccruals;
        
//         // Mark as claimed and store NFT
//         hasClaimedRewardForNFT[period][msg.sender][tokenId] = true;
//         if (collectionId == 1) {
//             userNFTsClaimed1[period][msg.sender].push(tokenId);
//         } else {
//             userNFTsClaimed2[period][msg.sender].push(tokenId);
//         }
        
//         require(arrcToken.transfer(msg.sender, rewardAmount), "Transfer failed");
        
//         emit RewardsDistributed(period, msg.sender, tokenId, rewardAmount, collectionId);
//     }

//     // View function to check claimable rewards for a specific NFT
//     function getClaimableRewards(
//         uint256 tokenId, 
//         uint256 period,
//         uint256 collectionId
//     ) external view returns (uint256) {
//         if (hasClaimedRewardForNFT[period][msg.sender][tokenId] || 
//             period >= activityStats.currentActivityPeriod()) {
//             return 0;
//         }
        
//         uint256 nftAccruals = calculateAccrualShare(tokenId, period, collectionId);
//         if (nftAccruals == 0) {
//             return 0;
//         }
        
//         uint256 totalAccruals = calculateTotalAccruals(period);
//         uint256 periodRewards = arrcToken.balanceOf(address(this));
        
//         return (periodRewards * nftAccruals) / totalAccruals;
//     }

//     // Helper function to get user's NFTs (implement based on your NFT contract)
//     function getUserNFTs(address user, uint256 collectionId) internal view returns (uint256[] memory) {
//         // This needs to be implemented based on your NFT contract's capabilities
//         // You might need to track owned tokens in your NFT contract or use events
//         // Return array of token IDs owned by the user
//     }

//     // Admin function to fund the contract with ARRC tokens
//     function fundRewards(uint256 amount) external onlyAdmin {
//         require(arrcToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
//     }
// }