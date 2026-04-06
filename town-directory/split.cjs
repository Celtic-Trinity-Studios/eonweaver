const fs = require('fs');

const lines = fs.readFileSync('simulate.php', 'utf-8').split(/(?<=\n)/);
const newLines = [];

let i = 0;
while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("case 'apply_simulation':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_apply.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'simulate_chunk':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_apply.php', block.join(''));
        continue;
    }
    else if (trimmed.startsWith("case 'simulate_single_town':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_single_town.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'simulate_world':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_single_town.php', block.join(''));
        continue;
    }
    else if (trimmed.startsWith("case 'simulate_world':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_world.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'generate_portrait_prompt':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_world.php', block.join(''));
        continue;
    }
    else if (trimmed.startsWith("case 'plan_simulation':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_plan.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'run_simulation':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_plan.php', block.join(''));
        continue;
    }
    else if (trimmed.startsWith("case 'run_simulation':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_run.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'apply_simulation':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_run.php', block.join(''));
        continue;
    }
    else if (trimmed.startsWith("case 'level_up':")) {
        newLines.push(line);
        newLines.push("            require __DIR__ . '/sim_level_up.php';\n");
        
        let block = ["<?php\n"];
        i++;
        while (i < lines.length) {
            const l = lines[i];
            if (l.trim().startsWith("case 'quick_level_up':")) break;
            block.push(l);
            i++;
        }
        fs.writeFileSync('sim_level_up.php', block.join(''));
        continue;
    }
    else {
        newLines.push(line);
        i++;
    }
}

fs.writeFileSync('simulate.php', newLines.join(''));
console.log("Split complete!");
