<?php
$lines = file('simulate.php');
$newLines = [];

$i = 0;
while ($i < count($lines)) {
    $line = $lines[$i];
    $trimmed = trim($line);

    if (strpos($trimmed, "case 'apply_simulation':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_apply.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'simulate_chunk':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_apply.php', implode("", $block));
        continue;
    }
    else if (strpos($trimmed, "case 'simulate_single_town':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_single_town.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'simulate_world':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_single_town.php', implode("", $block));
        continue;
    }
    else if (strpos($trimmed, "case 'simulate_world':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_world.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'generate_portrait_prompt':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_world.php', implode("", $block));
        continue;
    }
    else if (strpos($trimmed, "case 'plan_simulation':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_plan.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'run_simulation':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_plan.php', implode("", $block));
        continue;
    }
    else if (strpos($trimmed, "case 'run_simulation':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_run.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'apply_simulation':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_run.php', implode("", $block));
        continue;
    }
    else if (strpos($trimmed, "case 'level_up':") === 0) {
        $newLines[] = $line;
        $newLines[] = "            require __DIR__ . '/sim_level_up.php';\n";
        
        $block = ["<?php\n"];
        $i++;
        while ($i < count($lines)) {
            $l = $lines[$i];
            if (strpos(trim($l), "case 'quick_level_up':") === 0) break;
            $block[] = $l;
            $i++;
        }
        file_put_contents('sim_level_up.php', implode("", $block));
        continue;
    }
    else {
        $newLines[] = $line;
        $i++;
    }
}

file_put_contents('simulate.php', implode("", $newLines));
echo "Split complete!\n";
