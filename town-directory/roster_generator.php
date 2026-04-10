<?php
/**
 * Procedural NPC Roster Generator
 * Server-side replacement for AI-based Phase 1 character roster generation.
 * Generates D&D 3.5e compatible NPC rosters with diverse names, appropriate
 * class/role distribution, and race-sensitive attributes.
 *
 * Usage: require_once 'roster_generator.php';
 *        $roster = generateRoster($count, $options);
 */

// ═══════════════════════════════════════════════════════════
// NAME POOLS — organized by race, gender, and culture
// ═══════════════════════════════════════════════════════════

function getFirstNames(string $race, string $gender): array
{
    $M = 'M';
    $F = 'F';

    $pools = [
        'Human' => [
            $M => [
                // Anglo
                'John', 'Thomas', 'William', 'Robert', 'Edward', 'Henry', 'Richard', 'James',
                'George', 'Arthur', 'Frederick', 'Albert', 'Harold', 'Walter', 'Edmund', 'Roger',
                'Hugh', 'Gilbert', 'Ralph', 'Godfrey',
                // Celtic
                'Bran', 'Cormac', 'Niall', 'Declan', 'Finn', 'Oisin', 'Ciaran', 'Lorcan',
                'Padraig', 'Eamon', 'Callum', 'Colm', 'Kieran', 'Donal', 'Cathal', 'Tadhg',
                // Norse
                'Bjorn', 'Erik', 'Ragnar', 'Sven', 'Leif', 'Harald', 'Sigurd', 'Ulf', 'Gunnar',
                'Olaf', 'Ivar', 'Magnus', 'Haldor', 'Torsten', 'Vidar', 'Dag', 'Knut', 'Brynjar',
                // Mediterranean
                'Marco', 'Lorenzo', 'Dante', 'Luciano', 'Silvio', 'Rafael', 'Miguel', 'Diego',
                'Esteban', 'Carlos', 'Antonio', 'Mateo', 'Cesare', 'Paolo', 'Alejandro',
                // Slavic
                'Dmitri', 'Boris', 'Gregor', 'Yuri', 'Ivan', 'Pavel', 'Mikhail', 'Vasily',
                'Alexei', 'Nikolai', 'Stanislav', 'Marek', 'Jaroslav', 'Bogdan', 'Kazimir',
                // Arabic
                'Rashid', 'Tariq', 'Jamal', 'Salim', 'Farid', 'Nasir', 'Idris', 'Khalid',
                'Karim', 'Amir', 'Hassan', 'Omar', 'Yusef', 'Samir', 'Hamza',
                // East Asian
                'Kenji', 'Takeshi', 'Hiro', 'Ryo', 'Jin', 'Wei', 'Liang', 'Shen',
                // Fantasy
                'Aldric', 'Gareth', 'Cedric', 'Percival', 'Wystan', 'Eadric', 'Godwin',
                'Alden', 'Marden', 'Voss', 'Tarl', 'Corwin', 'Dryden', 'Holt', 'Jasper',
                'Kellan', 'Osric', 'Thane', 'Wren', 'Caspian',
            ],
            $F => [
                // Anglo
                'Mary', 'Elizabeth', 'Alice', 'Catherine', 'Margaret', 'Eleanor', 'Rose',
                'Grace', 'Emily', 'Sarah', 'Anne', 'Jane', 'Charlotte', 'Harriet', 'Martha',
                'Beatrice', 'Winifred', 'Dorothy', 'Agnes', 'Matilda',
                // Celtic
                'Niamh', 'Saoirse', 'Aisling', 'Ciara', 'Maeve', 'Brigid', 'Deirdre',
                'Grainne', 'Fiona', 'Siobhan', 'Riona', 'Eilish', 'Aoife', 'Sinead', 'Cara',
                // Norse
                'Freya', 'Ingrid', 'Hilda', 'Sigrid', 'Gudrun', 'Helga', 'Thyra',
                'Ragna', 'Brynhild', 'Solveig', 'Dagny', 'Inga', 'Yrsa', 'Sif',
                // Mediterranean
                'Isabella', 'Sofia', 'Lucia', 'Valentina', 'Giuliana', 'Rosa', 'Camilla',
                'Francesca', 'Adriana', 'Paloma', 'Carmen', 'Pilar',
                // Slavic
                'Katya', 'Nadia', 'Tatiana', 'Svetlana', 'Olga', 'Marta', 'Lada',
                'Yelena', 'Milena', 'Zora', 'Darina', 'Galina',
                // Arabic
                'Fatima', 'Zahra', 'Amira', 'Layla', 'Salma', 'Noor', 'Jamila',
                'Halima', 'Rania', 'Safiya', 'Yasmin', 'Samira', 'Naira', 'Dalia',
                // East Asian
                'Mei', 'Yuki', 'Hana', 'Lin', 'Sakura', 'Aiko', 'Ren',
                // Fantasy
                'Elspeth', 'Morwen', 'Rhiannon', 'Gwyneth', 'Brielle', 'Daphne',
                'Marcella', 'Rowena', 'Talia', 'Wynne', 'Cressida', 'Jessamine',
                'Linnea', 'Petra', 'Ondine', 'Sabine',
            ],
        ],
        'Elf' => [
            $M => [
                'Arannis', 'Berrian', 'Caelin', 'Daeron', 'Erevan', 'Faelorn', 'Galinndan',
                'Hadarai', 'Ivellios', 'Kaelar', 'Laucian', 'Mindartis', 'Naivaxos',
                'Paelias', 'Quarion', 'Riardon', 'Soveliss', 'Thamior', 'Varis', 'Adran',
                'Aramil', 'Enialis', 'Himo', 'Immeral', 'Mialee', 'Peren', 'Tanis',
                'Therivel', 'Carric', 'Heian', 'Lucan', 'Aust', 'Beiro', 'Erdan',
                'Gennal', 'Theren', 'Althir', 'Celeborn', 'Elandil', 'Ilphas',
            ],
            $F => [
                'Adrie', 'Birel', 'Caelynn', 'Drusilia', 'Enna', 'Felosial', 'Galadwen',
                'Ielenia', 'Keyleth', 'Lia', 'Meriele', 'Naivara', 'Quelenna',
                'Sariel', 'Shanairra', 'Valanthe', 'Xanaphia', 'Bethrynna', 'Jelenneth',
                'Shava', 'Silaqui', 'Anwyn', 'Chaedi', 'Imra', 'Vadania',
                'Althaea', 'Caladwen', 'Elanor', 'Galadriel', 'Hirileth', 'Mirelda',
                'Nimue', 'Taelora', 'Resiri', 'Aravae', 'Ilanis', 'Tessara',
            ],
        ],
        'Dwarf' => [
            $M => [
                'Adrik', 'Barendd', 'Brottor', 'Eberk', 'Einkil', 'Gardain', 'Harbek',
                'Kildrak', 'Morgran', 'Orsik', 'Taklinn', 'Thoradin', 'Tordek', 'Traubon',
                'Vondal', 'Bruenor', 'Dain', 'Darrak', 'Diesa', 'Flint', 'Gimli',
                'Grumbar', 'Helgar', 'Korgan', 'Rurik', 'Ulfgar', 'Thorbek', 'Dolgrim',
                'Bhaldric', 'Faltor', 'Gorin', 'Hurgar', 'Jorn', 'Kragdin', 'Murak',
                'Naldur', 'Sturm', 'Balin', 'Durin', 'Gloin',
            ],
            $F => [
                'Amber', 'Artin', 'Audhild', 'Dagnal', 'Diesa', 'Eldeth', 'Gunnloda',
                'Helja', 'Kathra', 'Kristryd', 'Mardred', 'Riswynn', 'Torgga', 'Vistra',
                'Bardryn', 'Falkrunn', 'Hlakka', 'Ilde', 'Liftrasa', 'Sannl', 'Torbera',
                'Gurdis', 'Brynja', 'Helga', 'Ingra', 'Soldra', 'Torunn', 'Vonara',
                'Dagmar', 'Kethra',
            ],
        ],
        'Halfling' => [
            $M => [
                'Alton', 'Corrin', 'Eldon', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe',
                'Wellby', 'Cade', 'Finnan', 'Lindal', 'Merric', 'Nebin', 'Pimple', 'Reed',
                'Bramble', 'Caleb', 'Dewey', 'Erky', 'Faldo', 'Jasper', 'Lavender',
                'Nix', 'Pippen', 'Regis', 'Sam', 'Tolman', 'Wendel', 'Birch',
            ],
            $F => [
                'Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri',
                'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina',
                'Shaena', 'Trym', 'Vani', 'Verna', 'Wella', 'Amaryllis', 'Chenna',
                'Dahlia', 'Eglantine', 'Filomena', 'Gretchen', 'Hettie', 'Ivy', 'Josie',
                'Pearl', 'Tansy',
            ],
        ],
        'Gnome' => [
            $M => [
                'Alston', 'Boddynock', 'Brocc', 'Dimble', 'Eldon', 'Erky', 'Fonkin',
                'Gerbo', 'Gimble', 'Glim', 'Jebeddo', 'Namfoodle', 'Roondar', 'Seebo',
                'Warryn', 'Wrenn', 'Zook', 'Bimpnottin', 'Caramip', 'Pog', 'Queck',
                'Sindri', 'Torbo', 'Fibbit', 'Kelgore', 'Murnig', 'Oddly', 'Pilwick',
                'Rundle', 'Tipple',
            ],
            $F => [
                'Bimpnottin', 'Breena', 'Carlin', 'Donella', 'Duvamil', 'Ellyjobell',
                'Lini', 'Loopmottin', 'Nissa', 'Nyx', 'Oda', 'Orla', 'Roywyn',
                'Shamil', 'Tana', 'Waywocket', 'Zanna', 'Calliope', 'Dabble',
                'Fizzy', 'Gizmo', 'Jynx', 'Kelda', 'Minx', 'Pip', 'Quill',
                'Sprocket', 'Twiddle', 'Whisper', 'Zinnia',
            ],
        ],
        'Half-Elf' => [
            $M => [
                // Mix of human and elven
                'Aeron', 'Caelin', 'Darian', 'Elias', 'Galahad', 'Harlan',
                'Julian', 'Loren', 'Mikael', 'Phelan', 'Quentin', 'Sylvan',
                'Tristan', 'Variel', 'Arlen', 'Davin', 'Erevan', 'Galen',
                'Kelvin', 'Liam', 'Merrick', 'Rainer', 'Soren', 'Adrian',
                'Dorian', 'Emeric', 'Kael', 'Leander', 'Taren', 'Corin',
            ],
            $F => [
                'Arwen', 'Brenna', 'Cerys', 'Dahlia', 'Estelle', 'Fianna',
                'Gwendolyn', 'Helena', 'Iriel', 'Kaelin', 'Liriel', 'Miriel',
                'Nerys', 'Oriana', 'Rhosyn', 'Sylvie', 'Tessara', 'Vivienne',
                'Ariadne', 'Celeste', 'Eleanora', 'Ilyana', 'Lenore', 'Mirabelle',
                'Rosalind', 'Seline', 'Tamsin', 'Wisteria', 'Yvaine', 'Zillah',
            ],
        ],
        'Half-Orc' => [
            $M => [
                'Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Kelh', 'Krusk',
                'Mhurren', 'Ront', 'Shump', 'Thokk', 'Grukk', 'Thrak', 'Morg', 'Gash',
                'Urzog', 'Brug', 'Krag', 'Droog', 'Bolg', 'Goroth', 'Muzgash', 'Lagduf',
                'Ufthak', 'Snaga', 'Gorbag', 'Mauhur', 'Ugluk', 'Brukk',
            ],
            $F => [
                'Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak',
                'Ownka', 'Shautha', 'Vola', 'Yevelda', 'Grenda', 'Hruga', 'Luthash',
                'Murga', 'Nulga', 'Rogah', 'Shura', 'Togga', 'Volga',
            ],
        ],
    ];

    // Default fallback for unknown/custom races
    $raceKey = $race;
    if (!isset($pools[$raceKey])) {
        // Try to match partial names (e.g., "Wood Elf" → "Elf")
        foreach (array_keys($pools) as $knownRace) {
            if (stripos($race, $knownRace) !== false) {
                $raceKey = $knownRace;
                break;
            }
        }
    }

    $genderKey = (strtoupper(substr($gender, 0, 1)) === 'F') ? $F : $M;

    if (isset($pools[$raceKey][$genderKey])) {
        return $pools[$raceKey][$genderKey];
    }

    // Ultimate fallback: fantasy names
    if ($genderKey === $M) {
        return ['Aldric', 'Voss', 'Tarl', 'Corwin', 'Dryden', 'Holt', 'Kellan', 'Osric',
            'Thane', 'Gareth', 'Cedric', 'Wystan', 'Godwin', 'Alden', 'Marden',
            'Bron', 'Duval', 'Fenwick', 'Garin', 'Hask', 'Jorath', 'Keld',
            'Lunn', 'Morvek', 'Noldar', 'Pyrus', 'Quorn', 'Rael', 'Stenn', 'Thurl'];
    }
    return ['Elspeth', 'Morwen', 'Gwyneth', 'Brielle', 'Daphne', 'Marcella', 'Rowena',
        'Talia', 'Wynne', 'Cressida', 'Jessamine', 'Linnea', 'Petra', 'Ondine',
        'Sabine', 'Avalyn', 'Brenara', 'Corra', 'Dareth', 'Feyra', 'Gisla',
        'Hesta', 'Kerra', 'Loreth', 'Mirabel', 'Nell', 'Orana', 'Prea', 'Silda', 'Torra'];
}

function getSurnames(string $race): array
{
    $pools = [
        'Human' => [
            // Occupation
            'Baker', 'Smith', 'Cooper', 'Tanner', 'Fletcher', 'Mason', 'Thatcher',
            'Carpenter', 'Turner', 'Weaver', 'Fuller', 'Dyer', 'Potter', 'Chandler',
            'Porter', 'Archer', 'Shepherd', 'Fisher', 'Miller', 'Barker',
            // Nature
            'Oakwood', 'Greenfield', 'Thornton', 'Ashford', 'Brooking', 'Heathrow',
            'Fairweather', 'Brightwater', 'Coldwell', 'Deepvale', 'Elmsworth', 'Foxley',
            'Greystone', 'Hartwood', 'Irondale', 'Lakewood', 'Moorland', 'Northwood',
            'Redcliffe', 'Stormwind', 'Whitfield', 'Woodward', 'Yarborough',
            // Descriptor
            'Strong', 'Swift', 'Bold', 'Stern', 'Bravehart', 'Trueman', 'Goodfellow',
            'Clearwater', 'Longstrider', 'Warwick', 'Blackwood', 'Dunbar', 'Hargrave',
            'Montague', 'Prescott', 'Sinclair', 'Aldridge', 'Caulfield', 'Fairfax',
            'Grimshaw', 'Holloway', 'Kendrick', 'Lockhart', 'Pemberton', 'Whitmore',
        ],
        'Elf' => [
            'Silverleaf', 'Moonwhisper', 'Starweaver', 'Dawnrunner', 'Nightbreeze',
            'Sunpetal', 'Willowsong', 'Oakshade', 'Thornvale', 'Riverwild',
            'Starsigh', 'Mistwalker', 'Greenmantle', 'Windborn', 'Dewdancer',
            'Amakiir', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Nailo',
            'Siannodel', 'Ilphukiir', 'Xiloscient', 'Faeyond', 'Aelorothi',
            'Celthirion', 'Daelynn', 'Feywander', 'Glitterdew', 'Ivorymist',
        ],
        'Dwarf' => [
            'Ironforge', 'Stonehammer', 'Deepvein', 'Copperbeard', 'Goldenshield',
            'Anvil', 'Battlehammer', 'Boulderback', 'Cragdelve', 'Darkmine',
            'Fireforge', 'Granitehand', 'Helmcleaver', 'Strongpick', 'Tunnelshaper',
            'Balderk', 'Dankil', 'Gorunn', 'Holderhek', 'Loderr', 'Lutgehr',
            'Rumnaheim', 'Strakeln', 'Torunn', 'Ungart', 'Bronzebeard',
            'Frostaxe', 'Mithrilheart', 'Orebreaker', 'Steelvein',
        ],
        'Halfling' => [
            'Goodbarrel', 'Underhill', 'Bramblewood', 'Tealeaf', 'Thorngage',
            'Bigheart', 'Bushyfoot', 'Cloverfield', 'Dewdrop', 'Fairbottom',
            'Greenhill', 'Honeydew', 'Kettleblack', 'Longbottom', 'Meadowbrook',
            'Nettlewick', 'Oldburrow', 'Proudfoot', 'Quickstep', 'Riverbank',
            'Shortwick', 'Thistledown', 'Warmhearth', 'Underbough', 'Appleblossom',
            'Butterfield', 'Copperkettle', 'Dimshaw', 'Fernsby', 'Hilltopple',
        ],
        'Gnome' => [
            'Sparkgear', 'Tinkerfuse', 'Cogswell', 'Fizzlebang', 'Wizzlepop',
            'Beren', 'Daergel', 'Folkor', 'Garrick', 'Murnig', 'Ningel',
            'Raulnor', 'Scheppen', 'Turen', 'Wobblecrank', 'Gearsprocket',
            'Buttonbright', 'Clockwhir', 'Dimplebottom', 'Fiddlesting',
            'Glittergadget', 'Ironspring', 'Jinglebell', 'Knobtwist',
            'Leverworth', 'Nackle', 'Pocketnose', 'Quickfinger', 'Seherenin',
        ],
        'Half-Elf' => [
            // Mix of human and elven surnames
            'Silverwood', 'Greenleaf', 'Dawnstrider', 'Moonvale', 'Starling',
            'Ashworth', 'Brightleaf', 'Clearbrook', 'Duskwalker', 'Evenfall',
            'Fernwind', 'Hawkwood', 'Mistborne', 'Nightvale', 'Oakenhart',
            'Ravenswood', 'Shadowmere', 'Thornbloom', 'Willowmere', 'Wyndhaven',
        ],
        'Half-Orc' => [
            'Gashfang', 'Skullsplitter', 'Ironjaw', 'Bloodtusk', 'Bonecrusher',
            'Brokenfist', 'Darkhide', 'Flamescale', 'Goretooth', 'Heavyhand',
            'Ironhide', 'Jawbreaker', 'Mudtooth', 'Scarhand', 'Stormgut',
            'Thunderfist', 'Gnasher', 'Ripfang', 'Wartooth', 'Doomhowl',
        ],
    ];

    // Handle unknown races: try partial match or fallback to human/fantasy
    $raceKey = $race;
    if (!isset($pools[$raceKey])) {
        foreach (array_keys($pools) as $knownRace) {
            if (stripos($race, $knownRace) !== false) {
                $raceKey = $knownRace;
                break;
            }
        }
    }

    return $pools[$raceKey] ?? $pools['Human'];
}


// ═══════════════════════════════════════════════════════════
// GENERATION TABLES
// ═══════════════════════════════════════════════════════════

/** Select randomly from a weighted distribution array. Handles float weights. */
function weightedRandom(array $weights)
{
    // Convert floats to int by multiplying (e.g. 0.5 → 5 out of 1000)
    $intWeights = [];
    foreach ($weights as $key => $w) {
        $intWeights[$key] = (int) round($w * 10);
    }
    $total = array_sum($intWeights);
    if ($total <= 0) {
        $keys = array_keys($intWeights);
        return $keys[0] ?? null;
    }
    $roll = mt_rand(1, $total);
    $cumulative = 0;
    foreach ($intWeights as $key => $weight) {
        $cumulative += $weight;
        if ($roll <= $cumulative) return $key;
    }
    $keys = array_keys($intWeights);
    return end($keys);
}

/** D&D 3.5e standard race age ranges [young_adult_min, adult_max, middle_max, old_max] */
function generateAge(string $race): int
{
    $ranges = [
        'Human'    => [16, 35, 53, 70],
        'Elf'      => [110, 175, 350, 750],
        'Dwarf'    => [40, 125, 188, 250],
        'Halfling' => [20, 50, 75, 100],
        'Gnome'    => [40, 100, 150, 200],
        'Half-Elf' => [20, 62, 93, 125],
        'Half-Orc' => [14, 30, 45, 60],
    ];

    $key = $race;
    if (!isset($ranges[$key])) {
        foreach (array_keys($ranges) as $r) {
            if (stripos($race, $r) !== false) { $key = $r; break; }
        }
    }
    $r = $ranges[$key] ?? $ranges['Human'];

    // Age distribution: 5% children (0-15), 50% young adult, 30% adult, 12% middle, 3% old
    $roll = mt_rand(1, 100);
    if ($roll <= 5) {
        return mt_rand(1, max(1, $r[0] - 1)); // child
    } elseif ($roll <= 55) {
        return mt_rand($r[0], $r[1]); // young adult
    } elseif ($roll <= 85) {
        return mt_rand($r[1], $r[2]); // adult → middle
    } elseif ($roll <= 97) {
        return mt_rand($r[2], $r[3]); // old
    } else {
        return mt_rand($r[3], (int) ($r[3] * 1.2)); // very old (rare)
    }
}

/** Select alignment — weighted toward neutral/good for NPCs. */
function selectAlignment(string $className): string
{
    // Alignment weights vary by class type
    $npcClasses = ['Commoner', 'Expert', 'Warrior', 'Adept', 'Aristocrat'];
    $isNPC = in_array($className, $npcClasses);

    if ($isNPC) {
        return weightedRandom([
            'LG' => 5,  'NG' => 15, 'CG' => 5,
            'LN' => 15, 'TN' => 30, 'CN' => 10,
            'LE' => 3,  'NE' => 5,  'CE' => 2,
        ]);
    }

    // PC classes: slightly more varied
    return weightedRandom([
        'LG' => 10, 'NG' => 15, 'CG' => 10,
        'LN' => 10, 'TN' => 15, 'CN' => 10,
        'LE' => 8,  'NE' => 10, 'CE' => 7,
    ]);
}

/** Select a class and level for a new NPC. */
function selectClassAndLevel(?string $forceClass = null, ?int $forceLevel = null, array $customClasses = []): array
{
    if ($forceClass) {
        $className = $forceClass;
    } else {
        $classWeights = [
            // NPC classes (~90%)
            'Commoner'   => 30,
            'Expert'     => 28,
            'Warrior'    => 18,
            'Adept'      => 6,
            'Aristocrat' => 4,
            // PC classes (~10%)
            'Fighter' => 4,
            'Rogue'   => 3,
            'Cleric'  => 2,
            'Ranger'  => 2,
            'Bard'    => 1,
            'Wizard'  => 1,
            'Sorcerer' => 0.5,
            'Barbarian' => 0.5,
        ];

        // Add custom classes with low weight
        foreach ($customClasses as $cc) {
            $ccName = $cc['name'] ?? '';
            if ($ccName && !isset($classWeights[$ccName])) {
                $classWeights[$ccName] = 1;
            }
        }

        $className = weightedRandom($classWeights);
    }

    if ($forceLevel) {
        $level = $forceLevel;
    } else {
        $level = weightedRandom([
            1 => 55, 2 => 20, 3 => 12, 4 => 6, 5 => 4, 6 => 3,
        ]);
    }

    return [$className, max(1, min(20, $level))];
}


// ═══════════════════════════════════════════════════════════
// ROLE ASSIGNMENT
// ═══════════════════════════════════════════════════════════

function selectRole(string $className, bool $isNewSettlement, string $settlementType, string $biome, array $existingRoleCounts): string
{
    // Frontier/new settlement roles
    $frontierRoles = [
        'Settler', 'Laborer', 'Traveler', 'Wanderer', 'Homesteader', 'Pioneer',
        'Refugee', 'Pilgrim', 'Prospector', 'Scout', 'Forager', 'Herder',
        'Trapper', 'Drifter', 'Woodcutter',
    ];

    // Settlement-specific role pools
    $settlementRoles = [
        'fortress'  => ['Guard', 'Soldier', 'Quartermaster', 'Armorer', 'Lookout', 'Recruit', 'Patrol Leader'],
        'port'      => ['Sailor', 'Fisherman', 'Dockworker', 'Merchant', 'Shipwright', 'Net Mender', 'Harbor Master'],
        'mine'      => ['Miner', 'Surveyor', 'Cart Driver', 'Smelter', 'Ore Sorter', 'Tunnel Shorer', 'Foreman'],
        'temple'    => ['Acolyte', 'Priest', 'Pilgrim', 'Groundskeeper', 'Scribe', 'Candle Maker', 'Shrine Keeper'],
        'camp'      => ['Hunter', 'Scout', 'Gatherer', 'Cook', 'Guard', 'Forager', 'Tent Maker'],
        'dungeon'   => ['Jailer', 'Warden', 'Guard', 'Torturer', 'Cook', 'Scribe', 'Supply Runner'],
        'cave_system' => ['Mushroom Farmer', 'Tunneler', 'Miner', 'Guide', 'Fungus Tender', 'Underground Scout'],
    ];

    // Class-specific role pools
    $classRoles = [
        'Commoner'   => ['Farmer', 'Laborer', 'Herder', 'Woodcutter', 'Fisherman', 'Servant',
                         'Stable Hand', 'Water Carrier', 'Street Sweeper', 'Hauler', 'Milkmaid',
                         'Washerwoman', 'Ditch Digger', 'Goatherd'],
        'Expert'     => ['Blacksmith', 'Baker', 'Carpenter', 'Weaver', 'Tanner', 'Merchant',
                         'Innkeeper', 'Brewer', 'Scribe', 'Healer', 'Herbalist', 'Cobbler',
                         'Chandler', 'Potter', 'Tailor', 'Leatherworker', 'Mason',
                         'Jeweler', 'Cook', 'Barber', 'Apothecary'],
        'Warrior'    => ['Guard', 'Militia', 'Watchman', 'Hunter', 'Bouncer', 'Caravan Guard',
                         'Gatekeep', 'Patrol', 'Constable', 'Sergeant'],
        'Adept'      => ['Hedge Wizard', 'Village Priest', 'Herbalist', 'Fortune Teller',
                         'Midwife', 'Bone Setter', 'Diviner', 'Wise Woman', 'Cunning Man'],
        'Aristocrat' => ['Mayor', 'Noble', 'Magistrate', 'Tax Collector', 'Reeve', 'Councillor',
                         'Envoy', 'Landowner'],
        'Fighter'    => ['Veteran', 'Mercenary', 'Champion', 'Arms Trainer', 'Bodyguard'],
        'Rogue'      => ['Scout', 'Locksmith', 'Fence', 'Informant', 'Gambler', 'Smuggler'],
        'Cleric'     => ['Priest', 'Temple Keeper', 'Chaplain', 'Healer', 'Missionary'],
        'Ranger'     => ['Scout', 'Woodsman', 'Tracker', 'Guide', 'Warden', 'Pathfinder'],
        'Wizard'     => ['Scholar', 'Sage', 'Alchemist', 'Tutor', 'Librarian'],
        'Sorcerer'   => ['Fortune Teller', 'Entertainer', 'Mystic', 'Wanderer'],
        'Bard'       => ['Entertainer', 'Minstrel', 'Storyteller', 'Herald', 'Mediator'],
        'Barbarian'  => ['Tribal Warrior', 'Hunter', 'Berserker', 'Outrider'],
        'Druid'      => ['Herbalist', 'Nature Guardian', 'Wise One', 'Beastkeeper'],
        'Paladin'    => ['Temple Knight', 'Protector', 'Lawkeeper', 'Crusader'],
        'Monk'       => ['Monk', 'Ascetic', 'Meditation Guide', 'Martial Instructor'],
    ];

    // New settlement: use frontier roles
    if ($isNewSettlement) {
        return $frontierRoles[array_rand($frontierRoles)];
    }

    // Settlement-specific override
    if ($settlementType && isset($settlementRoles[$settlementType])) {
        // 40% chance of settlement-specific role, 60% class role
        if (mt_rand(1, 100) <= 40) {
            $pool = $settlementRoles[$settlementType];
            return $pool[array_rand($pool)];
        }
    }

    // Gap analysis: prefer underrepresented roles
    $needs = [];
    if (($existingRoleCounts['healer'] ?? 0) === 0) $needs[] = 'Healer';
    if (($existingRoleCounts['guard'] ?? 0) === 0) $needs[] = 'Guard';
    if (($existingRoleCounts['blacksmith'] ?? 0) === 0) $needs[] = 'Blacksmith';
    if (($existingRoleCounts['farmer'] ?? 0) < 2) $needs[] = 'Farmer';
    if (($existingRoleCounts['merchant'] ?? 0) === 0) $needs[] = 'Merchant';
    if (!empty($needs) && mt_rand(1, 100) <= 30) {
        return $needs[array_rand($needs)];
    }

    // Class-based role
    $pool = $classRoles[$className] ?? $classRoles['Commoner'];
    return $pool[array_rand($pool)];
}


// ═══════════════════════════════════════════════════════════
// INSTRUCTION PARSING
// ═══════════════════════════════════════════════════════════

/**
 * Parse user instructions for explicit overrides.
 * Handles: "10 dwarven warriors", "all female", "level 5", etc.
 */
function parseInstructions(string $instructions): array
{
    $overrides = [];
    if (!$instructions) return $overrides;
    $lower = strtolower($instructions);

    // Race detection
    $races = [
        'human' => 'Human', 'elf' => 'Elf', 'elven' => 'Elf', 'elves' => 'Elf',
        'dwarf' => 'Dwarf', 'dwarven' => 'Dwarf', 'dwarves' => 'Dwarf',
        'halfling' => 'Halfling', 'gnome' => 'Gnome',
        'half-elf' => 'Half-Elf', 'half elf' => 'Half-Elf',
        'half-orc' => 'Half-Orc', 'half orc' => 'Half-Orc',
    ];
    foreach ($races as $pattern => $raceName) {
        if (strpos($lower, $pattern) !== false) {
            $overrides['race'] = $raceName;
            break;
        }
    }

    // Class detection
    $classes = [
        'fighter' => 'Fighter', 'warrior' => 'Warrior', 'soldier' => 'Warrior',
        'wizard' => 'Wizard', 'mage' => 'Wizard', 'cleric' => 'Cleric',
        'priest' => 'Cleric', 'rogue' => 'Rogue', 'thief' => 'Rogue',
        'ranger' => 'Ranger', 'paladin' => 'Paladin', 'barbarian' => 'Barbarian',
        'bard' => 'Bard', 'druid' => 'Druid', 'monk' => 'Monk',
        'sorcerer' => 'Sorcerer', 'commoner' => 'Commoner', 'expert' => 'Expert',
        'adept' => 'Adept', 'aristocrat' => 'Aristocrat',
        'merchant' => 'Expert', 'craftsman' => 'Expert', 'guard' => 'Warrior',
        'farmer' => 'Commoner', 'miner' => 'Commoner',
    ];
    foreach ($classes as $pattern => $className) {
        if (preg_match('/\b' . preg_quote($pattern, '/') . 's?\b/', $lower)) {
            $overrides['class'] = $className;
            break;
        }
    }

    // Level detection
    if (preg_match('/level\s*(\d+)/i', $instructions, $m)) {
        $overrides['level'] = max(1, min(20, (int) $m[1]));
    }

    // Gender detection
    if (preg_match('/\b(all\s+)?female\b/i', $instructions)) {
        $overrides['gender'] = 'F';
    } elseif (preg_match('/\b(all\s+)?male\b/i', $instructions)) {
        $overrides['gender'] = 'M';
    }

    return $overrides;
}


// ═══════════════════════════════════════════════════════════
// NAME GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate a unique full name for a character.
 * Checks against existing and batch names to prevent duplicates.
 */
function generateUniqueName(string $race, string $gender, array &$usedNames, array &$usedFirstNames): string
{
    $firstPool = getFirstNames($race, $gender);
    $surnamePool = getSurnames($race);
    $maxAttempts = 50;

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $first = $firstPool[array_rand($firstPool)];

        // Skip if first name already used (prevents "John Baker" and "John Smith")
        if (in_array(strtolower($first), $usedFirstNames)) continue;

        $surname = $surnamePool[array_rand($surnamePool)];
        $fullName = "$first $surname";

        if (!in_array(strtolower($fullName), $usedNames)) {
            $usedNames[] = strtolower($fullName);
            $usedFirstNames[] = strtolower($first);
            return $fullName;
        }
    }

    // Exhaustion fallback: add a descriptor prefix to the surname
    $descriptors = ['Old', 'Young', 'Big', 'Little', 'Red', 'Black', 'Grey', 'Scarred', 'Tall', 'Short'];
    $first = $firstPool[array_rand($firstPool)];
    $desc = $descriptors[array_rand($descriptors)];
    $surname = $surnamePool[array_rand($surnamePool)];
    $fullName = "$first \"$desc\" $surname";
    $usedNames[] = strtolower($fullName);
    $usedFirstNames[] = strtolower($first);
    return $fullName;
}


// ═══════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════

/**
 * Generate a roster of NPC characters procedurally.
 *
 * @param int   $count    Number of characters to generate
 * @param array $options  Configuration:
 *   - existingNames     (array)  Names already in town
 *   - enforcedRaceList  (array)  Pre-computed race assignments from demographics
 *   - settlementType    (string) e.g. 'village', 'fortress', 'cave_system'
 *   - biome             (string) e.g. 'Desert', 'Arctic'
 *   - isNewSettlement   (bool)   No existing chars or history
 *   - instructions      (string) User instructions for overrides
 *   - existingRoles     (array)  ['guard' => 2, 'farmer' => 5, ...]
 *   - genderCounts      (array)  ['M' => 12, 'F' => 10]
 *   - customRaces       (array)  Custom homebrew race names
 *   - customClasses     (array)  Custom homebrew class data
 *
 * @return array Array of character stub arrays
 */
function generateRoster(int $count, array $options = []): array
{
    $existingNames    = $options['existingNames'] ?? [];
    $enforcedRaceList = $options['enforcedRaceList'] ?? [];
    $settlementType   = $options['settlementType'] ?? '';
    $biome            = $options['biome'] ?? '';
    $isNewSettlement  = $options['isNewSettlement'] ?? false;
    $instructions     = $options['instructions'] ?? '';
    $existingRoles    = $options['existingRoles'] ?? [];
    $genderCounts     = $options['genderCounts'] ?? ['M' => 0, 'F' => 0];
    $customClasses    = $options['customClasses'] ?? [];

    // Parse instructions for explicit overrides
    $overrides = parseInstructions($instructions);

    // Normalize existing names to lowercase for comparison
    $usedNames = array_map('strtolower', $existingNames);
    $usedFirstNames = [];
    foreach ($existingNames as $name) {
        $parts = explode(' ', $name);
        if (!empty($parts[0])) {
            $usedFirstNames[] = strtolower($parts[0]);
        }
    }

    // Default race weights (D&D 3.5e standard settlement)
    $defaultRaceWeights = [
        'Human'    => 50,
        'Halfling' => 12,
        'Dwarf'    => 10,
        'Elf'      => 10,
        'Gnome'    => 6,
        'Half-Elf' => 7,
        'Half-Orc' => 5,
    ];

    // Build existing role counts (normalized to lowercase keys)
    $roleCounts = [];
    foreach ($existingRoles as $role => $cnt) {
        $roleCounts[strtolower($role)] = (int) $cnt;
    }

    $roster = [];

    for ($i = 0; $i < $count; $i++) {
        // === RACE ===
        if (isset($overrides['race'])) {
            $race = $overrides['race'];
        } elseif (!empty($enforcedRaceList) && isset($enforcedRaceList[$i])) {
            $race = $enforcedRaceList[$i];
        } else {
            $race = weightedRandom($defaultRaceWeights);
        }

        // === GENDER ===
        if (isset($overrides['gender'])) {
            $gender = $overrides['gender'];
        } else {
            // Balance toward the underrepresented gender
            $mCount = ($genderCounts['M'] ?? 0) + count(array_filter($roster, fn($c) => $c['gender'] === 'M'));
            $fCount = ($genderCounts['F'] ?? 0) + count(array_filter($roster, fn($c) => $c['gender'] === 'F'));
            if ($mCount > $fCount + 2) {
                $gender = 'F';
            } elseif ($fCount > $mCount + 2) {
                $gender = 'M';
            } else {
                $gender = mt_rand(0, 1) ? 'M' : 'F';
            }
        }

        // === CLASS & LEVEL ===
        [$className, $level] = selectClassAndLevel(
            $overrides['class'] ?? null,
            $overrides['level'] ?? null,
            $customClasses
        );
        $classStr = "$className $level";

        // === NAME ===
        $name = generateUniqueName($race, $gender, $usedNames, $usedFirstNames);

        // === AGE ===
        $age = generateAge($race);
        // If child age came up, make them a Commoner 1
        $raceAgeMin = match (true) {
            stripos($race, 'Elf') !== false => 100,
            stripos($race, 'Dwarf') !== false => 35,
            stripos($race, 'Gnome') !== false => 35,
            stripos($race, 'Halfling') !== false => 18,
            stripos($race, 'Half-Orc') !== false => 12,
            default => 15,
        };
        if ($age < $raceAgeMin) {
            $className = 'Commoner';
            $level = 1;
            $classStr = 'Commoner 1';
        }

        // === ROLE ===
        $role = selectRole($className, $isNewSettlement, $settlementType, $biome, $roleCounts);
        // Track the role we assigned
        $roleCounts[strtolower($role)] = ($roleCounts[strtolower($role)] ?? 0) + 1;

        // === ALIGNMENT ===
        $alignment = selectAlignment($className);

        $roster[] = [
            'name'      => $name,
            'race'      => $race,
            'class'     => $classStr,
            'gender'    => $gender,
            'age'       => $age,
            'role'      => $role,
            'alignment' => $alignment,
        ];
    }

    return $roster;
}
