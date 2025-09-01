<?php
// /public_html/cms-api/rebuild-articles-index.php
// Scanează /data/articles/*.json și regenerează /data/articles/index.json și /data/articles.json corect (JSON valid).

header('Content-Type: application/json; charset=utf-8');

// CORS: permite doar din admin
header('Access-Control-Allow-Origin: https://admin.vetmobil.ro');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Căi
$root        = realpath(__DIR__ . '/..'); // => /public_html
$articlesDir = $root . '/data/articles';
$indexPath1  = $root . '/data/articles/index.json'; // ce citește pagina articole
$indexPath2  = $root . '/data/articles.json';       // fallback folosit în unele pagini

if (!is_dir($articlesDir)) {
  echo json_encode(['ok' => false, 'error' => 'Folderul /data/articles nu există.']);
  http_response_code(500);
  exit;
}

function safe_string($s) {
  // Normalizează newline-uri și spații “murdare”
  $s = str_replace(["\r\n", "\r"], "\n", (string)$s);
  // Taie caractere de control (în afară de \n și \t)
  return preg_replace('/[^\P{C}\n\t]+/u', '', $s);
}

$items = [];

// citește toate fișierele .json din /data/articles (doar fișiere obișnuite)
$files = glob($articlesDir . '/*.json');
sort($files);

foreach ($files as $file) {
  if (!is_file($file)) continue;

  $raw = file_get_contents($file);
  if ($raw === false || $raw === '') continue;

  // încearcă să parsezi; dacă nu e valid, sare peste (nu stricăm indexul)
  $data = json_decode($raw, true);
  if (!is_array($data)) {
    // Încercare de “curățare” minimă: scoate control chars și mai încearcă o dată
    $data = json_decode(safe_string($raw), true);
  }
  if (!is_array($data)) continue;

  // extrage câmpurile necesare pentru listă
  $title   = isset($data['title']) ? safe_string($data['title']) : '';
  $excerpt = isset($data['excerpt']) ? safe_string($data['excerpt']) : '';
  $image   = isset($data['image']) ? $data['image'] : '';
  $slug    = isset($data['slug']) ? $data['slug'] : '';
  $date    = isset($data['date']) ? $data['date'] : '';
  $link    = isset($data['link']) ? $data['link'] : ( $slug ? "/articol.html?slug={$slug}" : '' );

  if ($title === '' || $slug === '') continue;

  // normalizări de căi
  if ($image && $image[0] !== '/') $image = '/' . $image;
  if ($link  && $link[0]  !== '/') $link  = '/' . $link;

  $items[] = [
    'title'   => $title,
    'excerpt' => $excerpt,
    'image'   => $image,
    'link'    => $link,
    'slug'    => $slug,
    'date'    => $date,
  ];
}

// sortează desc după dată (dacă există), altfel lasă ordinea
usort($items, function($a, $b) {
  $da = strtotime($a['date'] ?? '') ?: 0;
  $db = strtotime($b['date'] ?? '') ?: 0;
  return $db <=> $da;
});

$payload = ['articles' => $items];

// scrie ambele index-uri
$json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
if ($json === false) {
  echo json_encode(['ok' => false, 'error' => 'json_encode a eșuat.']);
  http_response_code(500);
  exit;
}

@file_put_contents($indexPath1, $json);
@file_put_contents($indexPath2, $json);

echo json_encode(['ok' => true, 'count' => count($items), 'writes' => [$indexPath1, $indexPath2]]);
