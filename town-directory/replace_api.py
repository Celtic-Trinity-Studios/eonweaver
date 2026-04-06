import re

with open('c:/D&DSundays/town-directory/simulate.php', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'GEMINI_API_KEY', 'OPENROUTER_API_KEY', text)
text = re.sub(r'GEMINI_MODEL', 'OPENROUTER_MODEL', text)

openrouter_code = '''                $openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
                $payload = json_encode([
                    'model' => defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemini-2.5-flash',
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'temperature' => 0.8,
                    'max_tokens' => 2048
                ]);
                $ch = curl_init($openRouterUrl);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_HTTPHEADER => [
                        "Authorization: Bearer {$apiKey}",
                        "HTTP-Referer: https://worldscribe.online",
                        "X-Title: WorldScribe",
                        "Content-Type: application/json"
                    ],
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 90,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                $resp = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                resetDB();
                if ($code !== 200)
                    throw new Exception("OpenRouter error: " . substr($resp, 0, 100));
                $gr = json_decode($resp, true);
                $chunkText = $gr['choices'][0]['message']['content'] ?? '';'''

gemini_block_pattern = re.compile(r'\$geminiUrl\s*=\s*.*?\$chunkText\s*=\s*\$gr\[\'candidates\'\]\[0\]\[\'content\'\]\[\'parts\'\]\[0\]\[\'text\'\]\s*\?\?\s*\'\';', re.DOTALL)
text = gemini_block_pattern.sub(openrouter_code, text)

with open('c:/D&DSundays/town-directory/simulate.php', 'w', encoding='utf-8') as f:
    f.write(text)
print('simulate.php updated')
