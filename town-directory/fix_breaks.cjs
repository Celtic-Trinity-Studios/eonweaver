const fs = require('fs');

// Fix simulate.php - add break; after each require
let sim = fs.readFileSync('simulate.php', 'utf-8');

// Add break; after each sim_*.php require (they're missing it)
const requires = [
    "require __DIR__ . '/sim_plan.php';",
    "require __DIR__ . '/sim_run.php';",
    "require __DIR__ . '/sim_apply.php';",
    "require __DIR__ . '/sim_single_town.php';",
    "require __DIR__ . '/sim_world.php';",
    "require __DIR__ . '/sim_level_up.php';",
];

for (const req of requires) {
    // Only add break if not already followed by break
    if (sim.includes(req) && !sim.includes(req + '\r\n            break;') && !sim.includes(req + '\n            break;')) {
        sim = sim.replace(req, req + '\r\n            break;');
    }
}

fs.writeFileSync('simulate.php', sim);
console.log('simulate.php fixed - added break; after requires');

// Fix each sim_*.php - remove trailing break; that's inside the file
const files = ['sim_plan.php', 'sim_run.php', 'sim_apply.php', 'sim_single_town.php', 'sim_world.php', 'sim_level_up.php'];
for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    // Remove the last break; in the file (it's the case-ending break)
    const lastBreak = content.lastIndexOf('            break;');
    if (lastBreak !== -1) {
        // Find the end of this break line
        let endPos = content.indexOf('\n', lastBreak);
        if (endPos === -1) endPos = content.length;
        else endPos += 1; // include the newline
        // Check if there's a \r before \n
        if (content[endPos - 2] === '\r') {
            // include the \r\n
        }
        content = content.substring(0, lastBreak) + content.substring(endPos);
        fs.writeFileSync(f, content);
        console.log(`${f} fixed - removed trailing break;`);
    } else {
        console.log(`${f} - no trailing break; found`);
    }
}

console.log('All done!');
