# ResourceTransferManager Frontend Integration Guide

This guide provides comprehensive documentation for frontend developers on how to integrate the ResourceTransferManager contract into a Next.js application.

## Overview

The ResourceTransferManager contract enables secure resource transfers between NFTs (islands, pirates, ships) in the Arrland game ecosystem. It enforces ship ownership requirements and charges fees in ARRC tokens.

## Contract Information

- **Contract Address (Amoy)**: `0x864d9D87Ae2d4B72AdFf11b1df0bfb814918771b`
- **Contract Address (Polygon)**: *To be deployed*
- **Network**: Amoy Testnet (chainId: 80002)
- **ABI**: Available in `artifacts/contracts/ResourceTransferManager.sol/ResourceTransferManager.json`

## Prerequisites

### Required Dependencies

```bash
npm install ethers wagmi viem @tanstack/react-query
```

### Environment Setup

```env
# .env.local
NEXT_PUBLIC_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-rpc.com
NEXT_PUBLIC_RESOURCE_TRANSFER_MANAGER_AMOY=0x864d9D87Ae2d4B72AdFf11b1df0bfb814918771b
NEXT_PUBLIC_RESOURCE_TRANSFER_MANAGER_POLYGON=0x... # To be added when deployed
```

## Contract ABI

Create `lib/abis/ResourceTransferManager.json`:

```json
[
  {
    "inputs": [
      {"internalType": "address", "name": "_centralAuthorizationRegistryContract", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "sourceCollectionContract", "type": "address"},
      {"internalType": "uint256", "name": "sourceTokenId", "type": "uint256"},
      {"internalType": "address", "name": "destinationCollectionContract", "type": "address"},
      {"internalType": "uint256", "name": "destinationTokenId", "type": "uint256"},
      {"internalType": "address", "name": "destinationOwner", "type": "address"},
      {"internalType": "string", "name": "resource", "type": "string"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transferResourcesToDestination",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resourceTransferFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "shipNftContract",
    "outputs": [{"internalType": "contract IERC721", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "isFeeExempt",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "sourceCollection", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "sourceTokenId", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "destinationCollection", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "destinationTokenId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "resource", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "feePaid", "type": "uint256"}
    ],
    "name": "ResourceTransferredBetweenNFTs",
    "type": "event"
  }
]
```

## Contract Constants

Create `lib/constants/contracts.ts`:

```typescript
export const RESOURCE_TRANSFER_MANAGER_ADDRESSES = {
  80002: '0x864d9D87Ae2d4B72AdFf11b1df0bfb814918771b', // Amoy
  137: '0x...', // Polygon Mainnet - To be added
} as const;

export const NETWORK_NAMES = {
  80002: 'amoy',
  137: 'polygon',
} as const;

// Collection addresses from deployments.md
export const COLLECTION_ADDRESSES = {
  amoy: {
    ISLANDS: '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59',
    PIRATES: '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942',
    INHABITANTS: '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654',
    SHIPS: '0xf7730613499c0d2756e555Cfeb88C6aD190c32AE',
  },
  polygon: {
    ISLANDS: '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1',
    PIRATES: '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c',
    INHABITANTS: '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c',
    SHIPS: '0x4DAeE3D7888B1CFC61432815FF209A554fbc1884',
  },
} as const;
```

## Wagmi Configuration

Create `lib/wagmi-config.ts`:

```typescript
import { createConfig, http } from 'wagmi';
import { polygonAmoy, polygon } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [polygonAmoy, polygon],
  transports: {
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_AMOY_RPC_URL),
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
  },
});
```

## React Hook for Resource Transfer

Create `hooks/useResourceTransfer.ts`:

```typescript
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { RESOURCE_TRANSFER_MANAGER_ADDRESSES } from '@/lib/constants/contracts';
import ResourceTransferManagerABI from '@/lib/abis/ResourceTransferManager.json';

export interface TransferResourcesParams {
  sourceCollectionContract: string;
  sourceTokenId: bigint;
  destinationCollectionContract: string;
  destinationTokenId: bigint;
  destinationOwner: string;
  resource: string;
  amount: bigint;
}

export function useResourceTransfer() {
  const chainId = useChainId();
  const contractAddress = RESOURCE_TRANSFER_MANAGER_ADDRESSES[chainId as keyof typeof RESOURCE_TRANSFER_MANAGER_ADDRESSES];

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const transferResources = async (params: TransferResourcesParams) => {
    if (!contractAddress) {
      throw new Error(`ResourceTransferManager not deployed on chain ${chainId}`);
    }

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: ResourceTransferManagerABI,
      functionName: 'transferResourcesToDestination',
      args: [
        params.sourceCollectionContract,
        params.sourceTokenId,
        params.destinationCollectionContract,
        params.destinationTokenId,
        params.destinationOwner,
        params.resource,
        params.amount,
      ],
    });
  };

  return {
    transferResources,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
```

## React Hook for Contract Information

Create `hooks/useResourceTransferManager.ts`:

```typescript
import { useReadContract, useChainId } from 'wagmi';
import { RESOURCE_TRANSFER_MANAGER_ADDRESSES } from '@/lib/constants/contracts';
import ResourceTransferManagerABI from '@/lib/abis/ResourceTransferManager.json';

export function useResourceTransferManager() {
  const chainId = useChainId();
  const contractAddress = RESOURCE_TRANSFER_MANAGER_ADDRESSES[chainId as keyof typeof RESOURCE_TRANSFER_MANAGER_ADDRESSES];

  const { data: transferFee, isLoading: isFeeLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: ResourceTransferManagerABI,
    functionName: 'resourceTransferFee',
  });

  const { data: shipNftContract, isLoading: isShipContractLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: ResourceTransferManagerABI,
    functionName: 'shipNftContract',
  });

  const checkFeeExemption = (userAddress: string) => {
    const { data: isFeeExempt, isLoading } = useReadContract({
      address: contractAddress as `0x${string}`,
      abi: ResourceTransferManagerABI,
      functionName: 'isFeeExempt',
      args: [userAddress],
    });

    return { isFeeExempt, isLoading };
  };

  return {
    transferFee,
    shipNftContract,
    isFeeLoading,
    isShipContractLoading,
    checkFeeExemption,
    contractAddress,
  };
}
```

## React Component Example

Create `components/ResourceTransferForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useResourceTransfer } from '@/hooks/useResourceTransfer';
import { useResourceTransferManager } from '@/hooks/useResourceTransferManager';
import { COLLECTION_ADDRESSES } from '@/lib/constants/contracts';

export default function ResourceTransferForm() {
  const { address } = useAccount();
  const { transferResources, isPending, isConfirming, isConfirmed, error } = useResourceTransfer();
  const { transferFee, checkFeeExemption } = useResourceTransferManager();
  
  const [formData, setFormData] = useState({
    sourceCollection: '',
    sourceTokenId: '',
    destinationCollection: '',
    destinationTokenId: '',
    destinationOwner: '',
    resource: '',
    amount: '',
  });

  const { isFeeExempt } = checkFeeExemption(address || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await transferResources({
        sourceCollectionContract: formData.sourceCollection as `0x${string}`,
        sourceTokenId: BigInt(formData.sourceTokenId),
        destinationCollectionContract: formData.destinationCollection as `0x${string}`,
        destinationTokenId: BigInt(formData.destinationTokenId),
        destinationOwner: formData.destinationOwner as `0x${string}`,
        resource: formData.resource,
        amount: parseEther(formData.amount),
      });
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Transfer Resources</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Source Collection</label>
          <select
            name="sourceCollection"
            value={formData.sourceCollection}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">Select Collection</option>
            <option value={COLLECTION_ADDRESSES.amoy.ISLANDS}>Islands</option>
            <option value={COLLECTION_ADDRESSES.amoy.PIRATES}>Pirates</option>
            <option value={COLLECTION_ADDRESSES.amoy.INHABITANTS}>Inhabitants</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Source Token ID</label>
          <input
            type="number"
            name="sourceTokenId"
            value={formData.sourceTokenId}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Destination Collection</label>
          <select
            name="destinationCollection"
            value={formData.destinationCollection}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">Select Collection</option>
            <option value={COLLECTION_ADDRESSES.amoy.ISLANDS}>Islands</option>
            <option value={COLLECTION_ADDRESSES.amoy.PIRATES}>Pirates</option>
            <option value={COLLECTION_ADDRESSES.amoy.INHABITANTS}>Inhabitants</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Destination Token ID</label>
          <input
            type="number"
            name="destinationTokenId"
            value={formData.destinationTokenId}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Destination Owner</label>
          <input
            type="text"
            name="destinationOwner"
            value={formData.destinationOwner}
            onChange={handleInputChange}
            placeholder="0x..."
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Resource</label>
          <select
            name="resource"
            value={formData.resource}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">Select Resource</option>
            <option value="wood">Wood</option>
            <option value="stone">Stone</option>
            <option value="food">Food</option>
            <option value="cotton">Cotton</option>
            <option value="fish">Fish</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            step="0.001"
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        {transferFee && (
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm">
              Transfer Fee: {formatEther(transferFee)} ARRC
              {isFeeExempt && <span className="text-green-600 ml-2">(Exempt)</span>}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending ? 'Preparing...' : isConfirming ? 'Confirming...' : 'Transfer Resources'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 rounded-md">
            <p className="text-red-700">Error: {error.message}</p>
          </div>
        )}

        {isConfirmed && (
          <div className="p-3 bg-green-100 border border-green-400 rounded-md">
            <p className="text-green-700">Transfer successful!</p>
          </div>
        )}
      </form>
    </div>
  );
}
```

## Event Listening

Create `hooks/useResourceTransferEvents.ts`:

```typescript
import { useWatchContractEvent, useChainId } from 'wagmi';
import { RESOURCE_TRANSFER_MANAGER_ADDRESSES } from '@/lib/constants/contracts';
import ResourceTransferManagerABI from '@/lib/abis/ResourceTransferManager.json';

export function useResourceTransferEvents() {
  const chainId = useChainId();
  const contractAddress = RESOURCE_TRANSFER_MANAGER_ADDRESSES[chainId as keyof typeof RESOURCE_TRANSFER_MANAGER_ADDRESSES];

  const { data: events } = useWatchContractEvent({
    address: contractAddress as `0x${string}`,
    abi: ResourceTransferManagerABI,
    eventName: 'ResourceTransferredBetweenNFTs',
    onLogs: (logs) => {
      logs.forEach((log) => {
        console.log('Resource Transfer Event:', {
          user: log.args.user,
          sourceCollection: log.args.sourceCollection,
          sourceTokenId: log.args.sourceTokenId,
          destinationCollection: log.args.destinationCollection,
          destinationTokenId: log.args.destinationTokenId,
          resource: log.args.resource,
          amount: log.args.amount,
          feePaid: log.args.feePaid,
        });
      });
    },
  });

  return { events };
}
```

## Error Handling

Create `lib/errors/resourceTransferErrors.ts`:

```typescript
export const RESOURCE_TRANSFER_ERRORS = {
  'User must own a ship NFT to use this function': {
    message: 'You need to own a ship NFT to transfer resources',
    action: 'Please acquire a ship NFT first',
  },
  'User does not own the pirate token': {
    message: 'You do not own the source NFT',
    action: 'Please verify you own the NFT you\'re trying to transfer from',
  },
  'Destination owner does not own the pirate token': {
    message: 'The destination owner does not own the destination NFT',
    action: 'Please verify the destination owner and NFT',
  },
  'Not enough resources in source storage': {
    message: 'Insufficient resources in source NFT',
    action: 'Please check the available resources',
  },
  'Insufficient storage capacity in destination': {
    message: 'Destination NFT storage is full',
    action: 'Please upgrade storage or choose a different destination',
  },
} as const;

export function getReadableError(error: string): { message: string; action: string } {
  const errorKey = Object.keys(RESOURCE_TRANSFER_ERRORS).find(key => 
    error.includes(key)
  );
  
  return errorKey 
    ? RESOURCE_TRANSFER_ERRORS[errorKey as keyof typeof RESOURCE_TRANSFER_ERRORS]
    : { message: 'Unknown error occurred', action: 'Please try again' };
}
```

## Testing

Create `__tests__/ResourceTransferManager.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAccount } from 'wagmi';
import ResourceTransferForm from '@/components/ResourceTransferForm';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(() => 80002),
}));

jest.mock('@/hooks/useResourceTransfer', () => ({
  useResourceTransfer: jest.fn(() => ({
    transferResources: jest.fn(),
    isPending: false,
    isConfirming: false,
    isConfirmed: false,
    error: null,
  })),
}));

describe('ResourceTransferForm', () => {
  beforeEach(() => {
    (useAccount as jest.Mock).mockReturnValue({
      address: '0x123...',
    });
  });

  it('renders form fields correctly', () => {
    render(<ResourceTransferForm />);
    
    expect(screen.getByLabelText(/source collection/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source token id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination collection/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination token id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination owner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resource/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const mockTransferResources = jest.fn();
    
    render(<ResourceTransferForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/source token id/i), {
      target: { value: '1' },
    });
    
    fireEvent.change(screen.getByLabelText(/destination token id/i), {
      target: { value: '2' },
    });
    
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '10' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /transfer resources/i }));
    
    await waitFor(() => {
      expect(mockTransferResources).toHaveBeenCalled();
    });
  });
});
```

## Best Practices

### 1. User Experience
- Always show loading states during transactions
- Provide clear error messages with actionable steps
- Show transaction fees before confirmation
- Display transaction hash for tracking

### 2. Security
- Validate all user inputs
- Check contract addresses before interactions
- Implement proper error handling
- Use read-only calls for validation before writes

### 3. Performance
- Cache contract reads with proper invalidation
- Use React Query for data fetching
- Implement proper loading states
- Minimize unnecessary re-renders

### 4. Testing
- Test all user flows
- Mock external dependencies
- Test error scenarios
- Validate form inputs

## Troubleshooting

### Common Issues

1. **"User must own a ship NFT"**
   - Verify user owns a ship NFT
   - Check ship contract address is set correctly

2. **"Insufficient resources"**
   - Check resource balance in source NFT
   - Verify resource name matches exactly

3. **"Storage capacity exceeded"**
   - Check destination NFT storage limits
   - Consider storage upgrades

4. **Transaction fails**
   - Check network connection
   - Verify contract addresses
   - Ensure sufficient gas and ARRC for fees

### Debugging

Add this debug component to help troubleshoot:

```typescript
export function ResourceTransferDebug() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { transferFee, shipNftContract, contractAddress } = useResourceTransferManager();

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <p>User: {address}</p>
      <p>Chain ID: {chainId}</p>
      <p>Contract: {contractAddress}</p>
      <p>Transfer Fee: {transferFee ? formatEther(transferFee) : 'Loading...'}</p>
      <p>Ship Contract: {shipNftContract || 'Not set'}</p>
    </div>
  );
}
```

This comprehensive guide provides everything a frontend developer needs to integrate the ResourceTransferManager contract into their Next.js application.