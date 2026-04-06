const fs = require('fs');

let content = fs.readFileSync('sim_run.php', 'utf-8');

// Find by the comment line and replace everything from that line to the closing }
const startMarker = '// Build demographics block for simulation prompt';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.log('ERROR: start marker not found');
    process.exit(1);
}

// Find the closing brace of the if block (look for the line with just "}")
// The block is: comment, $demoBlock='', if (...) { ... }, closing }
// Find the next empty line after our marker
let searchFrom = startIdx;
// Find "if ($demographics2) {" 
const ifIdx = content.indexOf('if ($demographics2)', searchFrom);
if (ifIdx === -1) {
    console.log('ERROR: if block not found');
    process.exit(1);
}
// Find the closing } of this if block
let braceCount = 0;
let endIdx = -1;
for (let i = content.indexOf('{', ifIdx); i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            endIdx = i + 1;
            break;
        }
    }
}

if (endIdx === -1) {
    console.log('ERROR: closing brace not found');
    process.exit(1);
}

const replacement = `// Build demographics block for simulation prompt
                $demoBlock = '';
                if ($demographics2) {
                    $demoBlock = "\\n## \\u26a0\\ufe0f\\u26a0\\ufe0f\\u26a0\\ufe0f MANDATORY RACE DISTRIBUTION \\u26a0\\ufe0f\\u26a0\\ufe0f\\u26a0\\ufe0f"
                        . "\\nThe DM has set STRICT race targets for this settlement. You MUST follow them for ALL new characters:"
                        . "\\n{$demographics2}"
                        . "\\n"
                        . "\\nRULES:"
                        . "\\n1. EVERY new arrival MUST be one of the races listed above."
                        . "\\n2. Match the PERCENTAGES. If 'Goblin Kin 75%' then AT LEAST 3 out of 4 new characters MUST be Goblin Kin."
                        . "\\n3. Do NOT generate Human, Elf, Dwarf, Halfling, Gnome, Half-Elf, Half-Orc unless explicitly in the list."
                        . "\\n4. 'Other' means uncommon D&D monster races (Kobold, Bugbear, Lizardfolk, Kenku, Tiefling, etc)."
                        . "\\n5. Violating these race rules makes your entire response INVALID."
                        . "\\n";
                }`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);

fs.writeFileSync('sim_run.php', content);
console.log('Demographics block replaced successfully!');
