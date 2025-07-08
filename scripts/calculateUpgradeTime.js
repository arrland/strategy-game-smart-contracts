const ONE_DAY = 86400; // seconds in a day
const DECIMALS = BigInt('1000000000000000000'); // 1e18

// Define pirate classes and their skills
const pirateClasses = {
    Fat: { strength: 3, agility: 0, wisdom: 2, building: 3 },
    Wicked: { strength: 3, agility: 2, wisdom: 1, building: 1 },
    Decent: { strength: 1, agility: 2, wisdom: 2, building: 2 },
    Slyboots: { strength: 2, agility: 2, wisdom: 1, building: 2 },
    Bonehead: { strength: 1, agility: 3, wisdom: 0, building: 0 },
    Kind: { strength: 2, agility: 3, wisdom: 3, building: 0 },
    Brave: { strength: 2, agility: 3, wisdom: 2, building: 0 },
    Balanced: { strength: 1, agility: 2, wisdom: 2, building: 2 },
    Bourgeoisie: { strength: 2, agility: 2, wisdom: 2, building: 2 },
    Lady: { strength: 1, agility: 2, wisdom: 3, building: 3 },
    Harpy: { strength: 1, agility: 2, wisdom: 1, building: 1 },
    Rogue: { strength: 0, agility: 3, wisdom: 1, building: 3 },
    Metalurgist: { strength: 2, agility: 0, wisdom: 2, building: 2 },
    Soldier: { strength: 2, agility: 1, wisdom: 1, building: 0 },
    Warlock: { strength: 1, agility: 2, wisdom: 2, building: 2 },
    Woodcutter: { strength: 2, agility: 1, wisdom: 0, building: 2 },
    Farmer: { strength: 1, agility: 2, wisdom: 1, building: 0 },
    Sailor: { strength: 1, agility: 2, wisdom: 2, building: 0 },
    Craftswoman: { strength: 1, agility: 2, wisdom: 2, building: 1 },
    Witch: { strength: 1, agility: 2, wisdom: 2, building: 1 },
    Townswoman: { strength: 2, agility: 2, wisdom: 2, building: 2 },
    Intellectual: { strength: 1, agility: 2, wisdom: 3, building: 2 },
    Huntress: { strength: 1, agility: 2, wisdom: 1, building: 0 },
    Fisherwoman: { strength: 0, agility: 2, wisdom: 1, building: 2 }
};

function calculateUpgradeTime(classSkills, difficulty) {
    // Convert skills to BigInt with decimals (multiply by 1e18)
    const strength = BigInt(classSkills.strength) * DECIMALS;
    const agility = BigInt(classSkills.agility) * DECIMALS;
    const wisdom = BigInt(classSkills.wisdom) * DECIMALS + DECIMALS; // Adding 1e18 as per contract
    const building = BigInt(classSkills.building) * DECIMALS;

    // Calculate base time including building skill
    const skills_sum = strength + agility + building;
    
    if (skills_sum === BigInt(0)) {
        return Number.MAX_SAFE_INTEGER;
    }

    // Base time of 7 days (in seconds) * difficulty
    const baseTime = BigInt(7 * ONE_DAY * difficulty);
    
    // Calculate skill multiplier
    const skillsValue = skills_sum / DECIMALS;
    const wisdomValue = wisdom / DECIMALS;
    
    const skillMultiplier = skillsValue * wisdomValue;
    
    if (skillMultiplier === BigInt(0)) {
        return Number(baseTime) / ONE_DAY;
    }
    
    const totalTime = baseTime / skillMultiplier;
    return Number(totalTime) / ONE_DAY;
}

function simulateAllClasses(difficulty) {
    console.log(`\nSimulating upgrade times for difficulty: ${difficulty}`);
    console.log('='.repeat(80));
    console.log('Class'.padEnd(15), 'Strength'.padEnd(10), 'Agility'.padEnd(10), 
                'Wisdom'.padEnd(10), 'Building'.padEnd(10), 'Time (days)');
    console.log('-'.repeat(80));

    // Sort classes by upgrade time
    const results = Object.entries(pirateClasses)
        .map(([className, skills]) => {
            const days = calculateUpgradeTime(skills, difficulty);
            return { className, skills, days };
        })
        .sort((a, b) => a.days - b.days);

    // Print results
    results.forEach(({ className, skills, days }) => {
        console.log(
            className.padEnd(15),
            skills.strength.toString().padEnd(10),
            skills.agility.toString().padEnd(10),
            skills.wisdom.toString().padEnd(10),
            skills.building.toString().padEnd(10),
            days.toFixed(2)
        );
    });
    console.log('='.repeat(80));
}

// Run simulations for different difficulties
console.log('\nUpgrade Time Simulation for All Pirate Classes');
simulateAllClasses(1);  // Easy
simulateAllClasses(2);  // Medium
simulateAllClasses(3);  // Hard

// npx hardhat run scripts/calculateUpgradeTime.js