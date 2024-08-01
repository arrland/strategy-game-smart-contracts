const { ethers } = require("hardhat");

async function main() {
    // Connect to the deployed contract
    const contractAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942";
    const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
    const simpleERC1155 = SimpleERC1155.attach(contractAddress);

    // Define the account and token ID to mint
    const account = "";
    const tokenIds = [239, 240, 241, 242, 243]; // List of token IDs to mint

    // Call the mint function for each token ID
    for (const tokenId of tokenIds) {
        const tx = await simpleERC1155.mint(account, tokenId);
        await tx.wait();
        console.log(`Minted token ID ${tokenId} to account ${account}`);
    }

    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
