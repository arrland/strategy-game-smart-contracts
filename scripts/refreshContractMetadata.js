// Imports the Alchemy SDK
const { Alchemy, Network } = require("alchemy-sdk");
const dotenv = require("dotenv");
dotenv.config();


//const collectionAddress = process.env.GENESIS_PIRATES_ADDRESS;
const collectionAddress = process.env.INHABITANT_NFT_ADDRESS;


const config = {
    apiKey: process.env.ALCHEMY_API_KEY, // Replace with your API key
    network: Network.MATIC_MAINNET, // Replace with your network
};

const alchemy = new Alchemy(config);


async function getNftsForAllOwners() {
    const response = await alchemy.nft.getOwnersForContract(collectionAddress);
    let owners = response.owners;
    //owners = owners.slice(0, 2);

    console.log(`Total owners: ${owners.length}`);
    const nfts = [];
    
    for (const [index, owner] of owners.entries()) {
        console.log(`Processing owner ${index + 1} of ${owners.length}: ${owner}`);
        let retry = 0;
        await new Promise(resolve => setTimeout(resolve, 1000));
        let response = await alchemy.nft.getNftsForOwner(owner, {
            contractAddresses: [collectionAddress]
        });
   
        let ownerNfts = response.ownedNfts;
        while (!ownerNfts && retry < 10) {
            console.log(`Attempt ${retry + 1} for owner ${owner} failed. Retrying in ${2 ** retry * 30} seconds.`);
            await new Promise(resolve => setTimeout(resolve, 2 ** retry * 30000));
            try {
                response = await alchemy.nft.getNftsForOwner(owner, {
                    contractAddresses: [collectionAddress]
                });
            } catch (error) {
                if (error.status === 500) {
                    console.log(`Caught 500 status code error. Continuing.`);
                    continue;
                } else {
                    throw error;
                }
            }
            ownerNfts = response.ownedNfts;
            console.log(`Attempt ${retry + 1} for owner ${owner} successful.`);
            retry++;
        }
        for (const nft of ownerNfts) {
            nfts.push(nft);
        }
        
    }
    return nfts;
}

async function checkNftMetadata() {
    const nfts = await getNftsForAllOwners();
    const tokenIDsToRefresh = [];
    for (const nft of nfts) {
        if (!nft.raw.metadata || Object.keys(nft.raw.metadata).length === 0) {            
            tokenIDsToRefresh.push(parseInt(nft.tokenId));
        }
    }
    console.log(`Total tokens to refresh: ${tokenIDsToRefresh.length}`);
    console.log(tokenIDsToRefresh);
    return tokenIDsToRefresh;
}


async function refreshNftMetadata(startTokenId, endTokenId) {
    console.log(`Collection address: ${collectionAddress}`);
    const tokenIDs = Array.from({length: endTokenId - startTokenId}, (_, i) => i + startTokenId);
    //Call the method
    for (const tokenId of tokenIDs) {   
        console.log(`Refreshing token ${tokenId}`)
        let response = await alchemy.nft.refreshNftMetadata(collectionAddress, tokenId)
        console.log(response)
        let retry = 0;
        while (!response && retry < 10) {
            console.log(`Attempt ${retry + 1} failed. Retrying in ${2 ** retry * 30} seconds.`);
            await new Promise(resolve => setTimeout(resolve, 2 ** retry * 30000));
            response = await alchemy.nft.refreshNftMetadata(collectionAddress, tokenId);
            console.log(response)
            retry++;
        }                
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
}



const main = async () => {
    const tokenIDs = await checkNftMetadata();
    //const tokenIDs = [2444];
    console.log(`Total tokens to refresh: ${tokenIDs.length}`);
    if (tokenIDs.length > 0) {
        for (const tokenId of tokenIDs) {
            await refreshNftMetadata(tokenId, tokenId+1);
        }
    } else {
        console.log("No tokens to refresh");
    }


}

main();