# Storage Upgrade Contract Integration Guide

This document provides comprehensive guidance for frontend developers on integrating with the StorageUpgrade smart contract.

## Overview

The StorageUpgrade contract manages the storage capacity upgrade system for NFTs (Islands, Pirates, and Inhabitants) in the game. It handles the upgrade process, resource management, and NFT staking for upgrades.

## Contract Features

- Storage capacity upgrades for NFTs
- Resource management for upgrades
- NFT staking system
- Upgrade level progression
- Construction time management

## Prerequisites

1. Web3 library (ethers.js recommended)
2. Contract ABI
3. Contract address
4. Connected wallet

## Setup with Next.js

```typescript
// utils/contracts.ts
import { ethers } from 'ethers';
import StorageUpgradeABI from '../abi/StorageUpgrade.json';

export const getStorageUpgradeContract = (provider: ethers.providers.Provider | ethers.Signer) => {
  const contractAddress = "YOUR_CONTRACT_ADDRESS";
  return new ethers.Contract(contractAddress, StorageUpgradeABI, provider);
};
```

## Key Functions and Integration Examples

### 1. Get Upgrade Requirements

Retrieves requirements for the next storage upgrade.

```typescript
// hooks/useStorageUpgrade.ts
export const useUpgradeRequirements = (pirateId: number, pirateCollection: string) => {
  const [requirements, setRequirements] = useState<UpgradeRequirements>();

  const fetchRequirements = async () => {
    const contract = getStorageUpgradeContract(provider);
    const req = await contract.getNewUpgradeReq(pirateId, pirateCollection);
    setRequirements(req);
  };

  return { requirements, fetchRequirements };
};

// Usage in component:
const { requirements, fetchRequirements } = useUpgradeRequirements(pirateId, pirateCollection);
```

### 2. Start Storage Upgrade

Initiates the upgrade process for a storage facility.

```typescript
interface StartUpgradeParams {
  pirateId: number;
  pirateCollection: string;
  useRum: boolean;
  foodChoice: string;
}

const startUpgrade = async ({ pirateId, pirateCollection, useRum, foodChoice }: StartUpgradeParams) => {
  try {
    const contract = getStorageUpgradeContract(signer);
    const tx = await contract.startStorageUpgrade(
      pirateCollection,
      pirateId,
      useRum,
      foodChoice
    );
    await tx.wait();
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### 3. Check Upgrade Status

Monitor the status of ongoing upgrades.

```typescript
const useUpgradeStatus = (nftCollection: string, nftId: number) => {
  const [status, setStatus] = useState<UpgradeInfoDetails>();

  const fetchStatus = async () => {
    const contract = getStorageUpgradeContract(provider);
    const info = await contract.getUpgradeInfo(nftCollection, nftId);
    setStatus(info);
  };

  return { status, fetchStatus };
};
```

### 4. Finish Storage Upgrade

Complete the upgrade process and claim the upgraded NFT.

```typescript
const finishUpgrade = async (nftCollection: string, nftId: number) => {
  try {
    const contract = getStorageUpgradeContract(signer);
    const tx = await contract.finishStorageUpgrade(nftCollection, nftId);
    await tx.wait();
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### 5. Get Staked Tokens

Retrieve all staked tokens for a user.

```typescript
const useStakedTokens = (owner: string, collectionAddress: string) => {
  const [tokens, setTokens] = useState<{
    all: number[];
    working: number[];
    finished: number[];
  }>();

  const fetchTokens = async () => {
    const contract = getStorageUpgradeContract(provider);
    const [all, working, finished] = await contract.getTokens(owner, collectionAddress);
    setTokens({ all, working, finished });
  };

  return { tokens, fetchTokens };
};
```

## Event Handling

The contract emits important events that should be monitored:

### StorageUpgradeStarted Event

```typescript
const listenToUpgradeStarted = (contract: ethers.Contract) => {
  contract.on("StorageUpgradeStarted", (
    user,
    collectionAddress,
    tokenId,
    storageCollectionAddress,
    storageTokenId,
    currentLevel,
    nextLevel,
    startTime,
    endTime,
    useRum,
    foodChoice
  ) => {
    // Handle upgrade started event
  });
};
```

### StorageUpgraded Event

```typescript
const listenToUpgradeCompleted = (contract: ethers.Contract) => {
  contract.on("StorageUpgraded", (
    user,
    collectionAddress,
    tokenId,
    newLevel,
    newCapacity
  ) => {
    // Handle upgrade completed event
  });
};
```

## Error Handling

Common error scenarios to handle:

1. Insufficient resources
2. Invalid NFT ownership
3. Upgrade in progress
4. Upgrade not finished
5. Already claimed
6. Invalid collection address

```typescript
const handleContractError = (error: any) => {
  const errorMessage = error.reason || error.message;
  
  if (errorMessage.includes("Not the owner")) {
    return "You don't own this NFT";
  }
  if (errorMessage.includes("Upgrade not finished")) {
    return "Upgrade is still in progress";
  }
  // Add more error cases
  
  return "An error occurred";
};
```

## Best Practices

1. Always check ownership before starting upgrades
2. Implement proper loading states during transactions
3. Cache upgrade requirements to minimize RPC calls
4. Use event listeners for real-time updates
5. Implement proper error handling and user feedback
6. Validate all inputs before sending transactions
7. Use TypeScript interfaces for type safety

## Type Definitions

```typescript
interface UpgradeRequirements {
  storageCollectionAddress: string;
  storageTokenId: number;
  currentLevel: number;
  nextLevel: number;
  upgradeTime: number;
  rumFee: number;
  maticFee: number;
  foodFish: number;
  foodCoconut: number;
  foodMeat: number;
  foodBarrelPackedFish: number;
  foodBarrelPackedMeat: number;
  resourceTypes: string[];
  resourceAmounts: number[];
}

interface StakingInfo {
  owner: string;
  nftId: number;
  nftCollection: string;
  startTime: number;
  endTime: number;
  claimed: boolean;
}

interface UpgradeInfoDetails {
  currentLevel: number;
  nextLevel: number;
  startTime: number;
  endTime: number;
  claimed: boolean;
}
```

## Example UI Component

```tsx
// components/StorageUpgrade.tsx
import { useState } from 'react';
import { useStorageUpgrade } from '../hooks/useStorageUpgrade';

export const StorageUpgradeComponent = ({ pirateId, pirateCollection }) => {
  const { requirements, fetchRequirements } = useUpgradeRequirements(
    pirateId,
    pirateCollection
  );
  const [useRum, setUseRum] = useState(false);
  const [foodChoice, setFoodChoice] = useState('fish');

  const handleUpgrade = async () => {
    try {
      await startUpgrade({
        pirateId,
        pirateCollection,
        useRum,
        foodChoice
      });
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      <h2>Storage Upgrade</h2>
      {requirements && (
        <div>
          <p>Current Level: {requirements.currentLevel}</p>
          <p>Next Level: {requirements.nextLevel}</p>
          <p>Upgrade Time: {requirements.upgradeTime} seconds</p>
          
          <div>
            <label>
              <input
                type="checkbox"
                checked={useRum}
                onChange={(e) => setUseRum(e.target.checked)}
              />
              Use Rum to speed up
            </label>
          </div>
          
          <select
            value={foodChoice}
            onChange={(e) => setFoodChoice(e.target.value)}
          >
            <option value="fish">Fish</option>
            <option value="meat">Meat</option>
            <option value="coconut">Coconut</option>
          </select>
          
          <button onClick={handleUpgrade}>
            Start Upgrade
          </button>
        </div>
      )}
    </div>
  );
};
```


