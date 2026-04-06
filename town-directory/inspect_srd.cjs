const initSqlJs = require('sql.js');
const fs = require('fs');

async function inspect() {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync('C:/Temphold/dnd35.db');
    const db = new SQL.Database(buf);

    // Get all tables
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    if (!tables.length) { console.log('No tables found'); return; }

    console.log('=== D&D 3.5 SRD Database ===\n');
    for (const row of tables[0].values) {
        const name = row[0];
        const count = db.exec(`SELECT COUNT(*) FROM [${name}]`)[0].values[0][0];
        const info = db.exec(`PRAGMA table_info([${name}])`);
        const cols = info[0] ? info[0].values.map(c => c[1]) : [];
        console.log(`${name}: ${count} rows`);
        console.log(`  columns: ${cols.join(', ')}`);

        // Show first row as sample
        if (count > 0) {
            const sample = db.exec(`SELECT * FROM [${name}] LIMIT 1`);
            if (sample[0]) {
                const vals = sample[0].values[0].map((v, i) => {
                    const val = String(v).substring(0, 60);
                    return `${cols[i]}=${val}`;
                });
                console.log(`  sample: ${vals.join(' | ')}`);
            }
        }
        console.log();
    }
    db.close();
}
inspect().catch(console.error);
