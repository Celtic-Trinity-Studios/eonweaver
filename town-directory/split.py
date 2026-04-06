import os
import re

fname = 'simulate.php'
with open(fname, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []

out_files = {}

i = 0
while i < len(lines):
    line = lines[i]
    if line.strip().startswith("case 'apply_simulation':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_apply.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'simulate_chunk':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_apply.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
            
        # continue loop WITHOUT incrementing i (since we broke on the next case)
        continue
        
    elif line.strip().startswith("case 'simulate_single_town':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_single_town.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'simulate_world':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_single_town.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
        continue

    elif line.strip().startswith("case 'simulate_world':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_world.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'generate_portrait_prompt':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_world.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
        continue
        
    elif line.strip().startswith("case 'plan_simulation':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_plan.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'run_simulation':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_plan.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
        continue
        
    elif line.strip().startswith("case 'run_simulation':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_run.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'apply_simulation':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_run.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
        continue

    elif line.strip().startswith("case 'level_up':"):
        new_lines.append(line)
        new_lines.append("            require __DIR__ . '/sim_level_up.php';\n")
        
        block = ["<?php\n"]
        i += 1
        while i < len(lines):
            l = lines[i]
            if l.strip().startswith("case 'quick_level_up':"):
                break
            block.append(l)
            i += 1
            
        with open('sim_level_up.php', 'w', encoding='utf-8') as b:
            b.writelines(block)
        continue
        
    else:
        new_lines.append(line)
        i += 1

with open('simulate_refactor.php', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Split complete!")
