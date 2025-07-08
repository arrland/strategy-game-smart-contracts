const { ethers } = require("hardhat");
const fs = require("fs");
const csv = require("csv-parser");

async function main() {
    const vestingContractAddress = "YOUR_VESTING_CONTRACT_ADDRESS";
    const vestingABI = [
        {
            "inputs": [
                {
                    "components": [
                        { "internalType": "address", "name": "beneficiary", "type": "address" },
                        { "internalType": "uint256", "name": "totalAmount", "type": "uint256" },
                        { "internalType": "uint256", "name": "delayInSeconds", "type": "uint256" },
                        { "internalType": "uint256", "name": "tgePercent", "type": "uint256" },
                        { "internalType": "uint256", "name": "vestingPeriodDays", "type": "uint256" },
                        { "internalType": "uint256", "name": "vestingPeriodDurationInSeconds", "type": "uint256" }
                    ],
                    "internalType": "struct VestingMechanism.ReleaseParams",
                    "name": "params",
                    "type": "tuple"
                }
            ],
            "name": "getVestingDetails",
            "outputs": [
                {
                    "components": [
                        { "internalType": "uint256", "name": "vestingStart", "type": "uint256" },
                        { "internalType": "uint256", "name": "vestingEnd", "type": "uint256" },
                        { "internalType": "uint256", "name": "amountClaimable", "type": "uint256" },
                        { "internalType": "uint256", "name": "amountReleased", "type": "uint256" },
                        { "internalType": "uint256", "name": "amountLeft", "type": "uint256" },
                        { "internalType": "bool", "name": "hasVestingSchedule", "type": "bool" },
                        { "internalType": "uint256", "name": "nextReleaseTime", "type": "uint256" },
                        { "internalType": "bool", "name": "isClaimable", "type": "bool" }
                    ],
                    "internalType": "struct VestingMechanism.VestingDetails",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    const vestingContract = new ethers.Contract(vestingContractAddress, vestingABI, ethers.provider);

    const addresses = [];
    fs.createReadStream("addresses.csv")
        .pipe(csv())
        .on("data", (row) => {
            addresses.push(row.address);
        })
        .on("end", async () => {
            const results = [];

            for (const address of addresses) {
                try {
                    const vestingDetails = await vestingContract.getVestingDetails({ beneficiary: address });
                    results.push({
                        address,
                        amountLeft: vestingDetails.amountLeft.toString(),
                        vestingEnd: vestingDetails.vestingEnd.toString()
                    });
                } catch (error) {
                    console.error(`Error fetching vesting details for ${address}:`, error);
                }
            }

            const csvData = results.map(result => `${result.address},${result.amountLeft},${result.vestingEnd}`).join("\n");
            fs.writeFileSync("vesting_results.csv", `address,amountLeft,vestingEnd\n${csvData}`);
            console.log("Vesting details saved to vesting_results.csv");
        });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});