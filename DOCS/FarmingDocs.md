# Arrland: On-Chain Farming Mechanics White Paper

## Table of Contents

1. [Introduction](#introduction)
2. [Resource Types](#resource-types)
3. [Farming Rules and Required Skills](#farming-rules-and-required-skills)
   - [Coconut](#coconut)
   - [Citrus](#citrus)
   - [Fish](#fish)
   - [Tobacco](#tobacco)
   - [Cotton](#cotton)
   - [Pig](#pig)
   - [Wood](#wood)
   - [Sugarcane](#sugarcane)
   - [Grain](#grain)
   - [Planks](#planks)
   - [Meat](#meat)
   - [Barrel-Packed Fish and Meat](#barrel-packed-fish-and-meat)
   - [Crates and Barrels](#crates-and-barrels)
   - [Bags and Bag-Packed Resources](#bags-and-bag-packed-resources)
   - [Wild Game](#wild-game)
   - [Coconut Liquor](#coconut-liquor)
   - [Crate-Packed Citrus and Coconuts](#crate-packed-citrus-and-coconuts)
4. [Resource Production Costs](#resource-production-costs)
5. [Tools and Their Skill Bonuses](#tools-and-their-skill-bonuses)
6. [Conclusion](#conclusion)

---

## Introduction

Arrland is an immersive on-chain strategy game that combines resource management, character development, and strategic gameplay. Central to the Arrland experience is the farming mechanic, where players cultivate various resources using their pirates' skills and specialized tools. This white paper delves into the intricacies of Arrland's on-chain farming system, outlining the types of resources available, the rules governing their production, the skills required, and how tools enhance these skills.

---

## Resource Types

Arrland features a diverse array of resources that players can farm, craft, and trade. These resources are essential for progressing in the game, building structures, crafting items, and engaging in commerce. The primary resource types in Arrland include:

- **Coconut**
- **Citrus**
- **Fish**
- **Tobacco**
- **Cotton**
- **Pig**
- **Wood**
- **Sugarcane**
- **Grain**
- **Planks**
- **Meat**
- **Barrel-Packed Fish**
- **Barrel-Packed Meat**
- **Crates**
- **Barrels**
- **Bags**
- **Bag-Packed Tobacco**
- **Bag-Packed Grain**
- **Bag-Packed Cotton**
- **Bag-Packed Sugarcane**
- **Wild Game**
- **Coconut Liquor**
- **Crate-Packed Citrus**
- **Crate-Packed Coconuts**

---

## Farming Rules and Required Skills

Each resource in Arrland requires specific skills and, in some cases, tools to farm effectively. Below is an overview of the farming rules, required skills, and optional skills that enhance production for each resource.

### Coconut

- **Farming Formula**: `(Agility + Fruit Picking Skill) × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Fruit Picking** (Special Skill)

### Citrus

- **Farming Formula**: Same as Coconut.
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Fruit Picking** (Special Skill)

### Fish

- **Farming Formula**: `[(Swimming + Luck) ÷ 2 + Fishing Skill] × Duration`
- **Required Skills**:
  - **Swimming** (Character Skill)
  - **Luck** (Character Skill)
  - **Fishing** (Special Skill)

### Tobacco

- **Farming Formula**: `[(Stamina + Harvest Tool Skill + Cultivation Tool Skill + 7) ÷ 15] × Duration`
- **Required Skills**:
  - **Stamina** (Character Skill)
  - **Harvest** (Tool Skill)
  - **Cultivation** (Tool Skill)

### Cotton

- **Farming Formula**: `[(Stamina × 8 + Cultivation Tool Skill) ÷ 20] × Duration`
- **Required Skills**:
  - **Stamina** (Character Skill)
  - **Cultivation** (Tool Skill)

### Pig

- **Farming Formula**:
  - With Husbandry Tool Skill: `[(Stamina × 2 + Husbandry Tool Skill) ÷ 30] × Duration`
  - Without Husbandry Tool Skill: `[(Stamina × 2) ÷ 30] × Duration`
- **Required Skills**:
  - **Stamina** (Character Skill)
- **Optional Skill**:
  - **Husbandry** (Tool Skill) — Improves output

### Wood

- **Farming Formula**:
  - With Woodcutting Tool Skill: `[(Melee + Woodcutting Tool Skill) ÷ 10] × Duration`
  - Without Woodcutting Tool Skill: `[(Strength + Luck) ÷ 30] × Duration`
- **Required Skills**:
  - **Melee** (Character Skill) — With tool
  - **Strength** and **Luck** (Character Skills) — Without tool
- **Optional Skill**:
  - **Woodcutting** (Tool Skill) — Enhances output

### Sugarcane

- **Farming Formula**: `[((Stamina × Harvest Tool Skill) + Cultivation Tool Skill) ÷ 30] × Duration`
- **Required Skills**:
  - **Stamina** (Character Skill)
  - **Harvest** (Tool Skill) — Required
  - **Cultivation** (Tool Skill)

### Grain

- **Farming Formula**: Same as Sugarcane but divided by 20 instead of 30.
- **Required Skills**:
  - **Stamina** (Character Skill)
  - **Harvest** (Tool Skill) — Required
  - **Cultivation** (Tool Skill)

### Planks

- **Farming Formula**: `[(Agility + Strength) ÷ 10] × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Strength** (Character Skill)
  - **Woodcutting** (Tool Skill ≥ 4) — Required

### Meat

- **Farming Formula**: `[(Melee + Slaughter Tool Skill) ÷ 10] × Duration`
- **Required Skills**:
  - **Melee** (Character Skill)
  - **Slaughter** (Tool Skill) — Required

### Barrel-Packed Fish and Meat

- **Farming Formula**: `(Agility + Stamina) × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Stamina** (Character Skill)

### Crates and Barrels

- **Crates Farming Formula**: `Agility × Duration`
- **Barrels Farming Formula**: `[(Agility + Wisdom) ÷ 5] × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Wisdom** (Character Skill) — For Barrels
  - **Crafting** (Special Skill) — Required

### Bags and Bag-Packed Resources

- **Bags Farming Formula**: `Agility × Duration`
- **Bag-Packed Tobacco and Cotton Farming Formula**:
  - With Slaughter Tool Skill of 3: `[(Strength + Stamina) × 2] × Duration`
  - Without Slaughter Tool Skill: `(Strength + Stamina) × Duration`
- **Bag-Packed Grain and Sugarcane Farming Formula**:
  - With Husbandry and Excavation Tool Skills of 8: `[(Strength + Stamina) × 3] × Duration`
  - With one Tool Skill of 8: `[(Strength + Stamina) × 2] × Duration`
  - Without Tool Skills: `(Strength + Stamina) × Duration`
- **Required Skills**:
  - **Agility** (Character Skill) — For Bags
  - **Strength** and **Stamina** (Character Skills) — For Bag-Packed Resources
- **Optional Skills**:
  - **Slaughter** (Tool Skill) — For Tobacco and Cotton
  - **Husbandry** and **Excavation** (Tool Skills) — For Grain and Sugarcane

### Wild Game

- **Farming Formula**: `[(Hunting Tool Skill + Luck + Shooting) ÷ 10] × Duration`
- **Required Skills**:
  - **Hunting** (Tool Skill) — Required
  - **Luck** (Character Skill)
  - **Shooting** (Character Skill)

### Coconut Liquor

- **Farming Formula**: `[(Agility + Wisdom) ÷ 3] × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Wisdom** (Character Skill)

### Crate-Packed Citrus and Coconuts

- **Farming Formula**: `[(Agility + Stamina) × 2] × Duration`
- **Required Skills**:
  - **Agility** (Character Skill)
  - **Stamina** (Character Skill)

---

## Resource Production Costs

Producing resources in Arrland often requires spending other resources, either as mandatory or optional costs. Below is a breakdown of the resources and amounts required to produce each type of resource.

### Wood

- **Optional Resources** (Choose at least one to burn per day):
  - Fish: 1 unit/day
  - Coconut: 2 units/day
  - Meat: 0.5 units/day
  - Barrel-Packed Fish: 0.01 units/day
  - Barrel-Packed Meat: 0.005 units/day
- **Mandatory Resources**: None

### Planks

- **Mandatory Resources**:
  - Wood: 1 unit per 2 Planks produced
- **Optional Resources**: Same as Wood

### Crates

- **Mandatory Resources**:
  - Planks: 1 unit per 2 Crates produced
- **Optional Resources**:
  - Coconut: 1 unit/day
  - Fish: 0.5 units/day
  - Meat: 0.25 units/day
  - Barrel-Packed Fish: 0.005 units/day
  - Barrel-Packed Meat: 0.0001 units/day

### Barrels

- **Mandatory Resources**:
  - Planks: 1 unit per 0.25 Barrels produced
- **Optional Resources**: Same as Crates

### Bags

- **Mandatory Resources**:
  - Cotton: 1 unit per Bag produced
- **Optional Resources**: Same as Crates

### Bag-Packed Resources

- **Mandatory Resources**:
  - Respective Resource (e.g., Tobacco, Grain): 0.01 units per Bag
  - Bags: 1 unit per Bag
- **Optional Resources**: Same as Crates

### Pig

- **Mandatory Resources**:
  - Bag-Packed Grain: 0.001 units/day
- **Optional Resources**: None

### Wild Game

- **Mandatory Resources**:
  - Bag-Packed Tobacco: 0.01 units/day
- **Optional Resources**: Same as Crates

### Coconut Liquor

- **Mandatory Resources**:
  - Bag-Packed Sugarcane: 0.01 units per unit produced
  - Bag-Packed Coconut: 0.0025 units per unit produced
- **Optional Resources**: Same as Crates

### Meat

- **Mandatory Resources**:
  - Pig or Wild Game: 0.02 units per unit produced
- **Optional Resources**: None

### Barrel-Packed Fish and Meat

- **Mandatory Resources**:
  - Barrels: 1 unit per unit produced
  - Fish or Meat: 0.01 units per unit produced
  - Crate-Packed Citrus: 10 units per unit produced
- **Optional Resources**: None

### Crate-Packed Citrus and Coconuts

- **Mandatory Resources**:
  - Citrus or Coconut: 0.02 units per unit produced
  - Crates: 1 unit per unit produced
- **Optional Resources**: None

---

## Tools and Their Skill Bonuses

Tools play a vital role in enhancing a pirate's abilities. Below is an outline of tools and the bonuses they provide to the skills required for farming.

### Harvesting Tools

- **Sickle**: Harvest +8
- **Shovel**: Excavation +8, Harvest +2, Wisdom +5
- **Hoe**: Cultivation +8, Excavation +5

### Woodcutting Tools

- **Axe**: Woodcutting +8, Slaughter +8, Building +1.5
- **Boarding Axe**: Woodcutting +4, Slaughter +6, Building +1.2

### Slaughter Tools

- **Knife**: Slaughter +3, Strength +1
- **Dagger**: Slaughter +1, Excavation +1, Melee +1

### Hunting Tools

- **Rifle**: Hunting +8
- **Blunderbuss**: Hunting +5
- **Dragoon Pistol**: Hunting +6
- **Pistol**: Hunting +3
- **Gunbelt with 3 Dragoon Pistols**: Hunting +6

### Cultivation Tools

- **Pickaxe**: Cultivation +2
- **Shovel**: Cultivation +5
- **Hoe**: Cultivation +8

### Husbandry Tools

- **Fork**: Husbandry +8, Cultivation +2

### Fishing Tools

- **Rope**: Fishing +1, Fruit Picking +1
- **Strong Rope**: Fishing +2, Fruit Picking +2
- **Rainbow Rope**: Fishing +3, Fruit Picking +3
- **Arrlandum Rope**: Fishing +4, Fruit Picking +4

### Wisdom-Enhancing Tools

- **Apprentice Book**: Wisdom +2
- **Master Book**: Wisdom +3
- **Genie Lamp**: Wisdom +5

---

## Conclusion

Arrland's on-chain farming system offers a complex and engaging experience that requires strategic planning and resource management. By understanding the required skills, optimizing tool usage, and effectively managing resource costs, players can maximize their farming efficiency and progress in the game. This white paper serves as a comprehensive guide to help players navigate the intricacies of Arrland's farming mechanics.

---

**Note**: All numeric values are representative and serve to illustrate the game's mechanics. Actual values may vary based on in-game parameters and updates.