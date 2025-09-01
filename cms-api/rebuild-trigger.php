<?php
// /public_html/cms-api/rebuild-trigger.php
header('Content-Type: application/json; charset=utf-8');

// Permite DOAR din admin.vetmobil.ro
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === 'https://admin.vetmobil.ro') {
  header("Access-Control-Allow-Origin: https://admin.vetmobil.ro");
} else {
  http_response_code(403);
  echo json_encode(['ok'=>false,'error'=>'forbidden']);
  exit;
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false,'error'=>'method not allowed']); exit; }

// Rulează scriptul existent
require __DIR__ . '/rebuild-articles-index.php';
