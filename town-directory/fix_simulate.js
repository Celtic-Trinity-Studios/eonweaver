const fs = require('fs');
const filepath = String.raw`c:\D&DSundays\town-directory\simulate.php`;
const lines = fs.readFileSync(filepath, 'utf8').split('\n');
// Remove lines 677-694 (0-indexed: 676-693)
const newLines = [...lines.slice(0, 676), ...lines.slice(694)];
fs.writeFileSync(filepath, newLines.join('\n'), 'utf8');
console.log(`Removed 18 lines. File now has ${newLines.length} lines (was ${lines.length})`);
