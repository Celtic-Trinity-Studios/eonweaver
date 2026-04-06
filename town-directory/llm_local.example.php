<?php
/**
 * Eon Weaver — Local LLM Client (Ollama)
 * Install Ollama: https://ollama.com/download/windows
 * Then run:  ollama pull openhermes
 *
 * ⚠️  Copy this file to llm_local.php.
 *     Never commit llm_local.php to git.
 */

// Model name as known to Ollama
define('OLLAMA_MODEL', 'openhermes-safe');

function callLocalLLM(string $prompt, int $maxTokens = 0): string
{
    $maxTokens = $maxTokens > 0 ? $maxTokens : (int) (LLAMA_MAX_TOKENS ?? 2048);
    $host = rtrim(LLAMA_HOST ?? '', '/');
    $url = $host . '/api/generate';

    $payload = json_encode([
        'model' => OLLAMA_MODEL,
        'prompt' => $prompt,
        'stream' => false,
        'options' => [
            'num_predict' => $maxTokens,
            'temperature' => (float) (LLAMA_TEMPERATURE ?? 0.8),
            'stop' => ['</s>', '[INST]', '[/INST]', '<|eot_id|>'],
        ],
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => (int) (LLAMA_TIMEOUT ?? 180),
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlErr)
        throw new RuntimeException('Local LLM unreachable: ' . $curlErr);
    if ($httpCode !== 200)
        throw new RuntimeException('Local LLM HTTP ' . $httpCode);

    $data = json_decode($response, true);
    $text = trim($data['response'] ?? '');
    if ($text === '')
        throw new RuntimeException('Local LLM returned empty response');

    return $text;
}

function isLocalLLMAvailable(): bool
{
    $host = rtrim(LLAMA_HOST ?? '', '/');
    if (!$host)
        return false;

    $ch = curl_init($host . '/api/tags');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 3,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200)
        return false;
    $data = json_decode($resp, true);
    $models = array_column($data['models'] ?? [], 'name');
    foreach ($models as $m) {
        if (strpos($m, OLLAMA_MODEL) === 0)
            return true;
    }
    return false;
}
