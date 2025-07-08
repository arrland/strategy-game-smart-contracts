const { ethers } = require("hardhat");

async function main() {
    // Connect to the deployed contract
    const contractAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942";
    const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
    const simpleERC1155 = SimpleERC1155.attach(contractAddress);


//     90,  97, 100, 106, 115, 125, 102, 110,
//   116, 117, 119, 120, 127, 131, 133, 118,
//   121, 122, 145, 148, 157, 136, 142, 146,
//   179, 191, 207, 160, 166, 200, 180, 184,
//   185, 134, 137, 138, 153, 159, 196, 124,
//   128, 139
    // Define the account and token ID to mint
    const account = "0x85831486902abc905e8a39dcf9cadf7286a84900";
    const tokenIds = [360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420]; // List of token IDs to mint

    // Call the mint function for each token ID
    for (const tokenId of tokenIds) {
        const tx = await simpleERC1155.mint(account, tokenId);
        await tx.wait();
        console.log(`Minted token ID ${tokenId} to account ${account}`);
    }

    
}
// To run on Polygon mainnet:
// npx hardhat run scripts/mintTestPirates.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/mintTestPirates.js --network amoy

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
