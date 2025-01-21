# Storage Migration Process

This document outlines the procedure for migrating pirate and inhabitant storage contracts.

## Prerequisites

Ensure you have:
- Node.js and npm installed
- Hardhat environment configured
- Access to network endpoints
- Required API keys (for contract verification)

## Migration Steps

### 1. Data Collection
First, collect all necessary data by running:

Fetch island IDs with assignments

npx hardhat run scripts/migration/fetch_island_ids.js --network <network>

Fetch resource farming users

npx hardhat run scripts/migration/fetch_resource_farming_users.js --network <network>


This will generate CSV files in:
- `scripts/migration/island-ids/<network>/<islandsAddress>-islandids.csv`
- `scripts/migration/resource-farming/<network>/resource-farming-users-<collectionAddress>.csv`

### 2. Deploy Migration Contracts
Deploy all necessary contracts:

npx hardhat run scripts/deploys/9_deploy_pirate_storage_migration.js --network polygon


This will deploy and verify:
- New PirateStorage
- New InhabitantStorage
- PirateStorageMigration
- InhabitantStorageMigration
- New StorageManagement
- ResourceFarmingRules

### 3. Migrate Pirate Storage
Execute pirate storage migration:


bash
npx hardhat run scripts/migration/migrate-pirate-storagev2.js --network polygon


This process will:
1. Migrate storage data in batches
2. Migrate resource farming data
3. Update storage management

### 4. Migrate Inhabitant Storage
Execute inhabitant storage migration:

bash
npx hardhat run scripts/migration/migrate-inhabitant-storagev2.js --network <network>


## Network Addresses

### Amoy Testnet
- CentralAuthRegistry: `0x99a764fd156083aA343e2577C348c8cF110C7141`
- InhabitantStorageMigration: `0x2dBfF9f9bDfaF50e77a7Af9ef6c0c21Bbd44b9Df`
- PirateStorageMigration: `0xce115966bE38528589118D285c076297718323cd`
- Genesis Pirates: `0xbCab2d7264B555227e3B6C1eF686C5FCA3863942`
- Genesis Islands: `0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59`
- Inhabitants: `0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654`

### Polygon Mainnet
- CentralAuthRegistry: `0xdAf8728C9eD7CBCCf8E24226B0794943E394f778`
- Genesis Pirates: `0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c`
- Genesis Islands: `0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1`
- Inhabitants: `0xa1b3afc3e025c617bac5bf89ed259fdb789d506c`
- (Other addresses to be filled after deployment)

## Important Notes

1. Always test on Amoy testnet before running on mainnet
2. Monitor each step of the migration process
3. Verify successful migration using provided verification functions
4. Keep track of all deployed contract addresses
5. Add delays between operations to avoid rate limiting
6. Back up all data before starting migration

## Troubleshooting

If you encounter errors:
1. Check network connectivity
2. Verify contract addresses are correct
3. Ensure sufficient gas for transactions
4. Check CSV files are properly generated
5. Verify contract authorizations are set correctly

## Support

For additional support or questions, please refer to:
- Contract documentation
- Development team
- Technical support channels