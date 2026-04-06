const fs = require('fs');
const path = require('path');

function parsePopulation(text) {
    const lines = text.split('\n');
    const characters = [];

    for (const rawLine of lines) {
        let line = rawLine.trim();
        if (!line.startsWith("## ")) continue;

        // Strip the starting ## 
        line = line.substring(3);

        const match = line.match(/^([^;]+);\s*([^:]+):\s*(.*)$/);
        if (!match) {
            console.log("Failed to match line:", line);
            continue;
        }

        const name = match[1].trim();
        let raceClassRaw = match[2].trim();
        const statsRaw = match[3].trim();

        let status = "Alive";
        if (raceClassRaw.includes("(DECEASED)")) {
            status = "Deceased";
            raceClassRaw = raceClassRaw.replace("(DECEASED)", "").trim();
        } else if (raceClassRaw.includes("(Mayor)")) {
            status = "Mayor";
            raceClassRaw = raceClassRaw.replace("(Mayor)", "").trim();
        }

        const parts = raceClassRaw.split(' ');
        const race = parts[0];
        const cls = parts.length > 1 ? parts[1] : "";

        const charData = {
            name,
            race,
            class: cls,
            status,
            stats: {}
        };

        const sections = statsRaw.split(". Languages:");
        const mainStatsStr = sections[0];

        if (sections.length > 1) {
            const langAndRest = sections[1];
            if (langAndRest.includes(". Skills/Feats:")) {
                const skParts = langAndRest.split(". Skills/Feats:");
                charData.languages = skParts[0].trim();

                const skRest = skParts[1];
                if (skRest.includes(". Gear:")) {
                    const gearParts = skRest.split(". Gear:");
                    charData.skills_feats = gearParts[0].trim();
                    charData.gear = gearParts[1].replace(/\.$/, "").trim();
                } else {
                    charData.skills_feats = skRest.replace(/\.$/, "").trim();
                }
            } else {
                charData.languages = langAndRest.replace(/\.$/, "").trim();
            }
        }

        const statPieces = mainStatsStr.split(';');
        for (const piece of statPieces) {
            const p = piece.trim();
            if (!p) continue;

            const firstSpace = p.indexOf(' ');
            if (firstSpace !== -1) {
                const key = p.substring(0, firstSpace).trim();
                const val = p.substring(firstSpace + 1).trim();
                charData.stats[key] = val;
            }
        }

        characters.push(charData);
    }
    return characters;
}

try {
    const populationText = fs.readFileSync(path.join('c:\\D&DSundays', 'Startint Population'), 'utf8');
    const simulationText = fs.readFileSync(path.join('c:\\D&DSundays', '5_Month_Simulation.md'), 'utf8');

    const data = {
        towns: [
            {
                id: "firsthold",
                name: "Firsthold",
                characters: parsePopulation(populationText),
                lore: [
                    {
                        timeframe: "Month 1-5",
                        title: "Firsthold (Planet Faldoran)",
                        content: simulationText
                    }
                ]
            }
        ]
    };

    const jsContent = "const gameData = " + JSON.stringify(data, null, 2) + ";\n";
    fs.writeFileSync(path.join('c:\\D&DSundays', 'town-directory', 'data.js'), jsContent, 'utf8');
    console.log("data.js generated successfully!");
} catch (e) {
    console.error("Error processing files:", e);
}
