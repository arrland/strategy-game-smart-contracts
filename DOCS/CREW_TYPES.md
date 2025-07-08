# Non-NFT Crew Types

This document lists all implemented non-NFT crew types and their base stats.

## Base Stats Range
- All stats are in range 0-3
- 0 = no skill
- 1 = basic skill
- 2 = advanced skill
- 3 = expert skill

## Essential Ship Crew vs General Crew
Ships require both essential crew members and can carry general crew:

### Essential Ship Crew
- Only certain crew types can serve as essential crew (Pirates, Sailors, Corsairs, Young Pirates)
- Essential crew is required to operate the ship
- Each ship has minimum and maximum essential crew requirements
- Ships cannot sail without meeting the minimum essential crew requirement

### General Crew
- Any crew type can be general crew
- Cannot contribute to ship operation
- Can participate in ship defense and other activities
- Count towards total crew capacity but not essential crew requirements

## Crew Types

### Peasant
Basic worker focused on resource gathering
- Farming: 1
- Fishing: 1
- Woodpicking: 1
- Building: 1
- Defense: 1
- Abordage: 0
- Bombarding: 0
- Shooting: 0
- Ship Crew: No
- Essential Crew: No

### Worker
Specialized in construction with some combat abilities
- Farming: 0
- Fishing: 0
- Woodpicking: 1
- Building: 2
- Defense: 2
- Abordage: 1
- Bombarding: 1
- Shooting: 0
- Ship Crew: No
- Essential Crew: No

### Craftsman
Expert builder with artillery skills
- Farming: 0
- Fishing: 0
- Woodpicking: 0
- Building: 2
- Defense: 1
- Abordage: 0
- Bombarding: 2
- Shooting: 0
- Ship Crew: No
- Essential Crew: No

### Sailor
Maritime specialist with basic combat skills
- Farming: 0
- Fishing: 0
- Woodpicking: 0
- Building: 0
- Defense: 2
- Abordage: 1
- Bombarding: 1
- Shooting: 0
- Ship Crew: Yes
- Essential Crew: Yes

### Soldier
Combat specialist with focus on defense
- Farming: 0
- Fishing: 0
- Woodpicking: 0
- Building: 0
- Defense: 3
- Abordage: 2
- Bombarding: 1
- Shooting: 2
- Ship Crew: No
- Essential Crew: No

### Corsair
Maritime combat specialist focused on boarding
- Farming: 0
- Fishing: 0
- Woodpicking: 0
- Building: 0
- Defense: 2
- Abordage: 3
- Bombarding: 2
- Shooting: 1
- Ship Crew: Yes
- Essential Crew: Yes

### Pirate
Elite maritime combat unit
- Farming: 0
- Fishing: 0
- Woodpicking: 0
- Building: 0
- Defense: 2
- Abordage: 3
- Bombarding: 2
- Shooting: 2
- Ship Crew: Yes
- Essential Crew: Yes

### Young Pirate
Versatile unit with basic skills in all areas
- Farming: 1
- Fishing: 1
- Woodpicking: 1
- Building: 1
- Defense: 2
- Abordage: 2
- Bombarding: 1
- Shooting: 1
- Ship Crew: Yes
- Essential Crew: Yes

## Ship Crew Eligibility
The following crew types can serve as essential ship crew:
- Sailor
- Corsair
- Pirate
- Young Pirate

All other crew types can be assigned as general crew but do not count towards essential crew requirements. 