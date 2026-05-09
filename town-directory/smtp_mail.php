<?php
/**
 * Minimal SMTP mailer for verification emails (STARTTLS :587).
 * If SMTP_HOST is empty, callers should skip verification mail (dev) or use mail().
 */

function ew_mail_configured(): bool
{
    // SMTP transport: requires host + from.
    if (defined('SMTP_HOST') && trim((string) SMTP_HOST) !== '' && defined('SMTP_FROM') && trim((string) SMTP_FROM) !== '') {
        return true;
    }
    // mail() fallback: still requires an explicit sender.
    return function_exists('mail') && defined('SMTP_FROM') && trim((string) SMTP_FROM) !== '';
}

/**
 * Send HTML email. Returns true on success.
 */
function ew_send_html_mail(string $to, string $subject, string $htmlBody, string $textBody = ''): bool
{
    if (!ew_mail_configured()) {
        return false;
    }

    $from = SMTP_FROM;
    $fromName = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : (defined('APP_NAME') ? APP_NAME : 'Eon Weaver');

    if (defined('SMTP_HOST') && trim((string) SMTP_HOST) !== '' && (!defined('SMTP_USE_TLS') || SMTP_USE_TLS)) {
        return ew_smtp_send_tls($to, $from, $fromName, $subject, $htmlBody, $textBody);
    }

    return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $htmlBody, implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . sprintf('"%s" <%s>', addslashes($fromName), $from),
    ]));
}

function ew_smtp_send_tls(string $to, string $from, string $fromName, string $subject, string $html, string $text): bool
{
    $host = SMTP_HOST;
    $port = defined('SMTP_PORT') ? (int) SMTP_PORT : 587;
    $user = defined('SMTP_USER') ? SMTP_USER : '';
    $pass = defined('SMTP_PASS') ? SMTP_PASS : '';

    $socket = @stream_socket_client(
        "tcp://{$host}:{$port}",
        $errno,
        $errstr,
        10,
        STREAM_CLIENT_CONNECT
    );
    if (!$socket) {
        error_log("SMTP connect failed: {$errstr}");
        return false;
    }
    stream_set_timeout($socket, 15);

    $read = function () use ($socket) {
        $data = '';
        while ($line = fgets($socket, 515)) {
            $data .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };

    $write = function ($cmd) use ($socket) {
        fwrite($socket, $cmd . "\r\n");
    };

    $expect = function ($resp, $code) {
        return strpos($resp, (string) $code) === 0;
    };

    $banner = $read();
    if (!$expect($banner, 220)) {
        fclose($socket);
        return false;
    }

    $write('EHLO ' . ($host));
    $ehlo = $read();
    if (!$expect($ehlo, 250)) {
        fclose($socket);
        return false;
    }

    $write('STARTTLS');
    $st = $read();
    if (!$expect($st, 220)) {
        fclose($socket);
        return false;
    }

    $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    if (!$cryptoOk) {
        fclose($socket);
        return false;
    }

    $write('EHLO ' . $host);
    $ehlo2 = $read();

    if ($user !== '') {
        $write('AUTH LOGIN');
        $read();
        $write(base64_encode($user));
        $read();
        $write(base64_encode($pass));
        $auth = $read();
        if (!$expect($auth, 235)) {
            fclose($socket);
            return false;
        }
    }

    $write('MAIL FROM:<' . $from . '>');
    $mf = $read();
    if (!$expect($mf, 250)) {
        fclose($socket);
        return false;
    }

    $write('RCPT TO:<' . $to . '>');
    $rc = $read();
    if (!$expect($rc, 250) && strpos($rc, '251') !== 0) {
        fclose($socket);
        return false;
    }

    $boundary = 'ew_' . bin2hex(random_bytes(8));
    $mime = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"
        . ($text ?: strip_tags($html))
        . "\r\n--{$boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n"
        . $html . "\r\n--{$boundary}--\r\n";

    $write('DATA');
    $d1 = $read();
    if (!$expect($d1, 354)) {
        fclose($socket);
        return false;
    }

    $headers = "Subject: {$subject}\r\nFrom: \"{$fromName}\" <{$from}>\r\nTo: <{$to}>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
    fwrite($socket, $headers . "\r\n" . $mime . "\r\n.\r\n");
    $done = $read();
    $write('QUIT');
    fclose($socket);

    return $expect($done, 250);
}
