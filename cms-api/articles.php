<?php
// ====== HEADERS / CORS ======
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-HTTP-Method-Override");

// Preflight pentru CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// Metodă cu override (dacă DELETE/PUT sunt blocate)
$method = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? $_SERVER['REQUEST_METHOD'];

// ====== CONFIG ======
$articlesDir = __DIR__ . '/../data/articles/';
$uploadDir   = __DIR__ . '/../assets/uploads/';
if (!is_dir($articlesDir)) mkdir($articlesDir, 0755, true);
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// ====== HELPERS ======
function slugify($str) {
  $str = trim($str ?? '');
  if ($str === '') return '';
  // diacritice RO
  $map = ['ă'=>'a','â'=>'a','î'=>'i','ș'=>'s','ş'=>'s','ț'=>'t','ţ'=>'t','Ă'=>'A','Â'=>'A','Î'=>'I','Ș'=>'S','Ş'=>'S','Ț'=>'T','Ţ'=>'T'];
  $str = strtr($str, $map);
  $str = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str);
  $str = strtolower($str);
  $str = preg_replace('/[^a-z0-9]+/','-',$str);
  $str = trim($str,'-');
  return $str ?: '';
}
function ensureSlug(&$input, $articlesDir) {
  if (empty($input['slug'])) {
    $base = slugify($input['title'] ?? 'articol');
    if ($base === '') $base = 'articol';
    $slug = $base;
    $i = 1;
    while (file_exists($articlesDir . $slug . '.json')) {
      $slug = $base . '-' . $i++;
    }
    $input['slug'] = $slug;
  }
}

// ====== ROUTES ======
switch ($method) {
  // ---------- LIST ----------
  case 'GET': {
    $files = array_values(array_filter(scandir($articlesDir), fn($f) => substr($f, -5) === ".json"));
    $articles = [];
    foreach ($files as $f) {
      $content = json_decode(file_get_contents($articlesDir . $f), true);
      if ($content) $articles[] = $content;
    }
    echo json_encode($articles, JSON_UNESCAPED_UNICODE);
    break;
  }

  // ---------- CREATE / UPDATE / UPLOAD / DELETE via POST ----------
  case 'POST':
  case 'PUT': {
    // === UPLOAD FILE (multipart) ===
    if (!empty($_FILES)) {
      $file = $_FILES['file'] ?? null;
      if ($file && $file['error'] === UPLOAD_ERR_OK) {
        $orig = basename($file['name']);
        $safe = preg_replace('/[^\w\-.]+/u', '_', $orig);
        $name = time() . '-' . $safe;
        $target = $uploadDir . $name;
        if (move_uploaded_file($file['tmp_name'], $target)) {
          // răspundem cu STRING absolut, nu obiect
          echo json_encode("/assets/uploads/" . $name, JSON_UNESCAPED_SLASHES);
        } else {
          http_response_code(500);
          echo json_encode(["error" => "Eroare la salvarea fișierului"]);
        }
      } else {
        http_response_code(400);
        echo json_encode(["error" => "Fișier lipsă sau invalid"]);
      }
      exit;
    }

    // Body (acceptă JSON sau form-urlencoded)
    $raw = file_get_contents("php://input");
    $input = json_decode($raw, true);
    if (!is_array($input)) $input = $_POST;

    // === DELETE via POST fallback ===
    if (($input['action'] ?? '') === 'delete') {
      $slug = $input['slug'] ?? null;
      if (!$slug) { http_response_code(400); echo json_encode(["error"=>"Slug lipsă"]); exit; }
      $file = $articlesDir . basename($slug) . ".json";
      if (file_exists($file)) { unlink($file); echo json_encode(["status"=>"deleted","file"=>basename($file)]); }
      else { http_response_code(404); echo json_encode(["error"=>"Fișier inexistent"]); }
      exit;
    }

    // === CREATE / UPDATE ===
    if (!isset($input['title']) && !isset($input['slug'])) {
      http_response_code(400);
      echo json_encode(["error" => "Titlu sau slug lipsă"]);
      exit;
    }

    ensureSlug($input, $articlesDir);
    if (empty($input['date'])) $input['date'] = date('Y-m-d');

    $file = $articlesDir . basename($input['slug']) . ".json";
    file_put_contents($file, json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(["status" => "ok", "file" => basename($file), "slug" => $input['slug']]);
    break;
  }

  // ---------- DELETE clasic ----------
  case 'DELETE': {
    $raw = file_get_contents("php://input");
    $input = json_decode($raw, true);
    $slug = $_GET['slug'] ?? ($input['slug'] ?? null);
    if (!$slug) { http_response_code(400); echo json_encode(["error"=>"Slug lipsă"]); break; }
    $file = $articlesDir . basename($slug) . ".json";
    if (file_exists($file)) { unlink($file); echo json_encode(["status"=>"deleted","file"=>basename($file)]); }
    else { http_response_code(404); echo json_encode(["error"=>"Fișier inexistent"]); }
    break;
  }

  default:
    http_response_code(405);
    echo json_encode(["error" => "Metodă invalidă"]);
}
