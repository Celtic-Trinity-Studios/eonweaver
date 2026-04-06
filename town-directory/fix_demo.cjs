const fs = require('fs');

// Fix sim_single_town.php - add demographics loading
let st = fs.readFileSync('sim_single_town.php', 'utf-8');

// Insert demographics loading after the difficulty block
const insertAfter = "$diffMultSt = $diffMultsSt[$diffLevelSt] ?? 1.5;";
const insertCode = `$diffMultSt = $diffMultsSt[$diffLevelSt] ?? 1.5;

            // Load demographics for race distribution
            $allMetaSt = query('SELECT \\\`key\\\`, value FROM town_meta WHERE town_id = ?', [$tId], $uid);
            $townMetaSt = [];
            foreach ($allMetaSt as $m) $townMetaSt[$m['key']] = $m['value'];
            $demographicsSt = trim($townMetaSt['demographics'] ?? '');
            $demoTextSt = $demographicsSt ? "\\nMANDATORY RACE DISTRIBUTION (set by DM — follow EXACTLY): {$demographicsSt}. Any new arrivals or births MUST match these race percentages. Do NOT generate races not listed here." : "";`;

st = st.replace(insertAfter, insertCode);

// Now inject demographics into both prompts (months=0 and months>0)
// For months=0 prompt
st = st.replace(
    'Add new characters or relationships to \\\\"{$tName}\\\\".',
    'Add new characters or relationships to \\\\"{$tName}\\\\".\\n{$demoTextSt}'
);

// For months>0 prompt  
st = st.replace(
    'conflict={$conflictFreq}\\n',
    'conflict={$conflictFreq}\\n{$demoTextSt}\\n'
);

fs.writeFileSync('sim_single_town.php', st);
console.log('sim_single_town.php fixed');
