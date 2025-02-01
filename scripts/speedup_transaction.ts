import { ethers } from "hardhat";

async function speedUpTransaction() {
    // Get environment variables
    const txHash = process.env.TX_HASH;
    const gasPrice = process.env.GAS_PRICE;
    
    if (!txHash || !gasPrice) {
        console.log("Error: Missing required environment variables");
        process.exit(1);
    }

    const provider = ethers.provider;
    const signer = await provider.getSigner();
    
    // Get the original transaction
    const tx = await provider.getTransaction(txHash);
    if (!tx) throw new Error("Transaction not found");
    
    // Create replacement transaction with higher gas price
    const replacementTx = {
        to: tx.to,
        from: tx.from,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        type: tx.type,
        maxPriorityFeePerGas: ethers.parseUnits(gasPrice, "gwei"),
        maxFeePerGas: ethers.parseUnits(gasPrice, "gwei")
    };
    
    const sentTx = await signer.sendTransaction(replacementTx);
    console.log(`Replacement transaction sent: ${sentTx.hash}`);
    console.log(`Waiting for confirmation...`);
    await sentTx.wait();
    console.log(`Transaction confirmed!`);
}

// Print usage instructions if no environment variables provided
if (!process.env.TX_HASH || !process.env.GAS_PRICE) {
    console.log("\nUsage: TX_HASH=<hash> GAS_PRICE=<price> npx hardhat run scripts/speedup_transaction.ts --network [network]");
    console.log("\nEnvironment Variables:");
    console.log("  TX_HASH: Transaction hash to speed up (required)");
    console.log("  GAS_PRICE: New gas price in Gwei (required)");
    console.log("\nExample:");
    console.log("  # Speed up transaction on Polygon:");
    console.log("  TX_HASH=0x96f06e899949ddad6533b23afef019a4cce0c6dd48558d2b1629a2817ab9d70d GAS_PRICE=50 npx hardhat run scripts/speedup_transaction.ts --network polygon");
    process.exit(1);
}

speedUpTransaction().catch(console.error); 