<?php
// /public_html/cms-api/articles.php
// Scrie articole și upload-uri pe LIVE: /public_html/data/articles/ și /public_html/assets/uploads/

// ---- CĂI ABSOLUTE LA RĂDĂCINĂ (LIVE) ----
$root        = realpath(__DIR__ . '/..'); // => /public_html
$articlesDir = $root . '/data/articles/';
$uploadsDir  = $root . '/assets/uploads/';

// Creează directoarele, dacă lipsesc
@is_dir($articlesDir) || @mkdir($articlesDir, 0755, true);
@is_dir($uploadsDir)  || @mkdir($uploadsDir, 0755, true);

// ---- HEADERS / CORS (permite doar din admin) ----
header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === 'https://admin.vetmobil.ro') {
  header('Access-Control-Allow-Origin: https://admin.vetmobil.ro');
} else {
  // dacă vrei să testezi local, poți relaxa asta temporar
  header('Access-Control-Allow-Origin: https://admin.vetmobil.ro');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? $_SERVER['REQUEST_METHOD'];

// ---- UTILS ----
function slugify($str) {
  $str = trim((string)$str);
  if ($str === '') return '';
  $map = ['ă'=>'a','â'=>'a','î'=>'i','ș'=>'s','ş'=>'s','ț'=>'t','ţ'=>'t','Ă'=>'A','Â'=>'A','Î'=>'I','Ș'=>'S','Ş'=>'S','Ț'=>'T','Ţ'=>'T'];
  $str = strtr($str, $map);
  $str = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str);
  $str = strtolower($str);
  $str = preg_replace('/[^a-z0-9]+/','-',$str);
  $str = trim($str,'-');
  return $str ?: '';
}
function ensureSlug(array &$input, string $articlesDir): void {
  if (empty($input['slug'])) {
    $base = slugify($input['title'] ?? 'articol');
    if ($base === '') $base = 'articol';
    $slug = $base; $i = 1;
    while (file_exists($articlesDir . $slug . '.json')) $slug = $base . '-' . $i++;
    $input['slug'] = $slug;
  }
}

// ---- ROUTARE ----
switch ($method) {
  // Listare simplă (debug)
  case 'GET': {
    $files = glob($articlesDir . '*.json') ?: [];
    sort($files);
    $out = [];
    foreach ($files as $f) {
      $j = json_decode(@file_get_contents($f), true);
      if (is_array($j)) $out[] = ['file'=>basename($f),'title'=>$j['title']??'', 'slug'=>$j['slug']??''];
    }
    echo json_encode(['count'=>count($out), 'items'=>$out], JSON_UNESCAPED_UNICODE);
    break;
  }

  // Create / Update / Upload / Delete
  case 'POST':
  case 'PUT': {
    // ---- UPLOAD imagine (multipart/form-data) ----
    if (!empty($_FILES)) {
      $file = $_FILES['file'] ?? null;
      if ($file && $file['error'] === UPLOAD_ERR_OK) {
        $orig  = basename($file['name']);
        $safe  = preg_replace('/[^\w\-.]+/u', '_', $orig);
        $name  = time() . '-' . $safe;
        $target = $uploadsDir . $name;
        if (move_uploaded_file($file['tmp_name'], $target)) {
          // răspuns = path public absolut
          echo json_encode('/assets/uploads/' . $name, JSON_UNESCAPED_SLASHES);
        } else {
          http_response_code(500);
          echo json_encode(['error'=>'Eroare la salvarea fișierului']);
        }
      } else {
        http_response_code(400);
        echo json_encode(['error'=>'Fișier lipsă sau invalid']);
      }
      exit;
    }

    // ---- Citește body (JSON sau form) ----
    $raw   = file_get_contents('php://input') ?: '';
    $input = json_decode($raw, true);
    if (!is_array($input)) $input = $_POST;

    // ---- Delete (fallback prin POST) ----
    if (($input['action'] ?? '') === 'delete') {
      $slug = $input['slug'] ?? '';
      if ($slug === '') { http_response_code(400); echo json_encode(['error'=>'Slug lipsă']); exit; }
      $file = $articlesDir . basename($slug) . '.json';
      if (file_exists($file)) { @unlink($file); echo json_encode(['status'=>'deleted','file'=>basename($file)]); }
      else { http_response_code(404); echo json_encode(['error'=>'Fișier inexistent']); }
      exit;
    }

    // ---- Create / Update articol ----
    if (!isset($input['title']) && !isset($input['slug'])) {
      http_response_code(400); echo json_encode(['error'=>'Titlu sau slug lipsă']); exit;
    }

    ensureSlug($input, $articlesDir);
    if (empty($input['date'])) $input['date'] = date('Y-m-d');

    // normalizează calea imaginii la /assets/uploads/...
    if (!empty($input['image']) && $input['image'][0] !== '/') {
      $input['image'] = '/' . ltrim($input['image'], '/');
    }

    $file = $articlesDir . basename($input['slug']) . '.json';
    $ok = @file_put_contents($file, json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false;

    if ($ok) {
      echo json_encode(['status'=>'ok', 'slug'=>$input['slug'], 'file'=>basename($file)]);
      // Nu rescriem indexul aici; ai cron + buton de rebuild.
    } else {
      http_response_code(500);
      echo json_encode(['error'=>'Nu am putut scrie fișierul articolului.']);
    }
    break;
  }

  case 'DELETE': {
    $raw = file_get_contents('php://input') ?: '';
    $in  = json_decode($raw, true) ?: [];
    $slug = $_GET['slug'] ?? ($in['slug'] ?? '');
    if ($slug === '') { http_response_code(400); echo json_encode(['error'=>'Slug lipsă']); break; }
    $file = $articlesDir . basename($slug) . '.json';
    if (file_exists($file)) { @unlink($file); echo json_encode(['status'=>'deleted','file'=>basename($file)]); }
    else { http_response_code(404); echo json_encode(['error'=>'Fișier inexistent']); }
    break;
  }

  default:
    http_response_code(405);
    echo json_encode(['error'=>'Metodă invalidă']);
}
