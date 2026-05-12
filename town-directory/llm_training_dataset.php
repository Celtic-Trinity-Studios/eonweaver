<?php
/**
 * Append-only JSONL log for site-specific LLM fine-tuning / distillation.
 * Writes to private_data/llm_training.jsonl (gitignored). Safe no-op on failure.
 *
 * Each line is one JSON object, UTF-8, suitable for chat-model training pipelines.
 */

/**
 * @param array<int, array{role: string, content: string}> $messages Conversation including final assistant message
 * @param array<string, mixed> $meta Optional: feature, model, town_id, etc.
 */
function ew_llm_training_append(array $messages, array $meta = []): void
{
    if (defined('EW_LLM_TRAINING_LOG') && EW_LLM_TRAINING_LOG === false) {
        return;
    }
    if (empty($messages)) {
        return;
    }

    $dir = __DIR__ . '/private_data';
    $path = $dir . '/llm_training.jsonl';

    $record = [
        'schema' => 'eon-weaver-llm-v1',
        'ts' => gmdate('c'),
        'messages' => $messages,
    ];
    if (!empty($meta)) {
        $record['meta'] = $meta;
    }
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return;
    }
    $line .= "\n";

    try {
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        $fp = @fopen($path, 'ab');
        if (!$fp) {
            return;
        }
        if (flock($fp, LOCK_EX)) {
            fwrite($fp, $line);
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    } catch (Throwable $e) {
        error_log('ew_llm_training_append: ' . $e->getMessage());
    }
}

/**
 * Log an OpenRouter chat/completions exchange (decoded request + response bodies).
 *
 * @param array<string, mixed> $requestPayload  Decoded JSON body sent to OpenRouter (must include messages[])
 * @param array<string, mixed> $responseData    Decoded JSON response
 * @param array<string, mixed> $meta            e.g. feature, town_id, user_id (optional; do not put secrets here)
 */
function ew_openrouter_log_chat_completion(string $feature, array $requestPayload, array $responseData, array $meta = []): void
{
    $messages = $requestPayload['messages'] ?? null;
    if (!is_array($messages) || $messages === []) {
        return;
    }
    $choice0 = $responseData['choices'][0] ?? null;
    $msg = is_array($choice0) ? ($choice0['message'] ?? null) : null;
    if (!is_array($msg)) {
        return;
    }
    $content = trim((string) ($msg['content'] ?? ''));
    if ($content === '' && !empty($msg['tool_calls']) && is_array($msg['tool_calls'])) {
        $enc = json_encode(['tool_calls' => $msg['tool_calls']], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        $content = $enc !== false ? $enc : '';
    }
    if ($content === '') {
        return;
    }
    $model = (string) ($requestPayload['model'] ?? ($meta['model'] ?? ''));
    $full = array_merge($messages, [['role' => 'assistant', 'content' => $content]]);
    $metaOut = array_merge(['feature' => $feature], $meta);
    if ($model !== '') {
        $metaOut['model'] = $model;
    }
    ew_llm_training_append($full, $metaOut);
}
