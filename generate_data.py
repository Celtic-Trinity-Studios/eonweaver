import json
import re

def parse_population(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    characters = []
    # e.g.: ## Aldric Vane; Human Ftr1: CR 1; ECL 1; Age 31; XP 325; Partner None; Size M; HD 1d10+2; hp 9; Init +1; Spd 30 ft; AC 15, touch 11, FF 14; Grapple +4; Atk +4 melee (1d8+3/19-20, Longsword); AL LN; SV Fort +4, Ref +1, Will +0; Str 16, Dex 12, Con 14, Int 10, Wis 10, Cha 11. Languages: Common. Skills/Feats: Climb +5, Jump +5; Power Attack, Weapon Focus (Longsword). Gear: Longsword, heavy wooden shield, chain shirt.
    
    # Or with (DECEASED) or (Mayor)
    # ## Sera Holt; Human Com1 (DECEASED): CR 1...
    
    for line in lines:
        line = line.strip()
        if not line.startswith("## "): continue
        
        # Split into name/class and stats
        match = re.match(r"^## ([^;]+); ([^:]+):\s*(.*)$", line)
        if not match:
            print("Failed to match line:", line)
            continue
            
        name = match.group(1).strip()
        race_class_raw = match.group(2).strip()
        stats_raw = match.group(3).strip()
        
        # Extract status if present (e.g. (DECEASED) or (Mayor))
        status = "Alive"
        if "(DECEASED)" in race_class_raw:
            status = "Deceased"
            race_class_raw = race_class_raw.replace("(DECEASED)", "").strip()
        elif "(Mayor)" in race_class_raw:
            status = "Mayor"
            race_class_raw = race_class_raw.replace("(Mayor)", "").strip()
            
        # Race and Class
        parts = race_class_raw.split(' ', 1)
        race = parts[0]
        cls = parts[1] if len(parts) > 1 else ""
        
        # Parse attributes split by ';' or '.'
        # We'll extract some key ones for the directory
        char_data = {
            "name": name,
            "race": race,
            "class": cls,
            "status": status,
            "stats": {}
        }
        
        # Split stats into major sections
        # Main stats are separated by ';', but then there are sentences for Languages, Skills/Feats, Gear.
        main_stats_str = stats_raw.split(". Languages:")[0]
        
        if ". Languages:" in stats_raw:
            lang_and_rest = stats_raw.split(". Languages:", 1)[1]
            if ". Skills/Feats:" in lang_and_rest:
                langs, sk_rest = lang_and_rest.split(". Skills/Feats:", 1)
                char_data["languages"] = langs.strip()
                if ". Gear:" in sk_rest:
                    sk, gear = sk_rest.split(". Gear:", 1)
                    char_data["skills_feats"] = sk.strip()
                    char_data["gear"] = gear.strip().strip('.')
                else:
                    char_data["skills_feats"] = sk_rest.strip().strip('.')
            else:
                char_data["languages"] = lang_and_rest.strip().strip('.')
        
        # Parse main stats
        for stat_piece in main_stats_str.split(';'):
            stat_piece = stat_piece.strip()
            if not stat_piece: continue
            
            if ' ' in stat_piece:
                key, val = stat_piece.split(' ', 1)
                char_data["stats"][key] = val
        
        characters.append(char_data)
        
    return characters
    
def get_simulation_data():
    with open("c:\\D&DSundays\\5_Month_Simulation.md", "r", encoding="utf-8") as f:
        text = f.read()
    
    return [
        {
            "timeframe": "Month 1-5",
            "title": "Firsthold (Planet Faldoran)",
            "content": text
        }
    ]

data = {
    "towns": [
        {
            "id": "firsthold",
            "name": "Firsthold",
            "characters": parse_population("c:\\D&DSundays\\Startint Population"),
            "lore": get_simulation_data()
        }
    ]
}

js_content = "const gameData = " + json.dumps(data, indent=2) + ";\n"

with open("c:\\D&DSundays\\town-directory\\data.js", "w", encoding="utf-8") as f:
    f.write(js_content)
