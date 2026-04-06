const fs = require('fs');
let content = fs.readFileSync('sim_run.php', 'utf-8');

// Add a demographics reminder right before "Your Task" to reinforce the instruction
const oldTask = '## Your Task:\nSimulate {$months} month(s) of time passing.';
const newTask = '{$demoBlock}\n## Your Task:\nSimulate {$months} month(s) of time passing.';

if (content.includes(oldTask)) {
    content = content.replace(oldTask, newTask);
    console.log('Added demographics reminder before task section');
} else {
    // Try with \r\n
    const oldTask2 = '## Your Task:\r\nSimulate {$months} month(s) of time passing.';
    const newTask2 = '{$demoBlock}\r\n## Your Task:\r\nSimulate {$months} month(s) of time passing.';
    if (content.includes(oldTask2)) {
        content = content.replace(oldTask2, newTask2);
        console.log('Added demographics reminder (CRLF) before task section');
    } else {
        console.log('ERROR: Could not find task section');
    }
}

fs.writeFileSync('sim_run.php', content);
console.log('Done');
