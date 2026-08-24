<?php

function jsonResponse($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function errorResponse(string $message, int $status = 400): void
{
    jsonResponse(['error' => $message], $status);
}
