<?php
// /cms-api/meta_list.php
require __DIR__.'/util.php';

$metaDir = data_path('/meta');
ensure_dir($metaDir);

$out = [];
foreach (glob($metaDir.'/*.json') as $f) {
  $fileSlug = basename($f, '.json'); // acesta va fi "slug"-ul pe care îl folosim în listă
  $m = read_json($f);
  $out[] = [
    'slug'  => $fileSlug,
    'views' => intval($m['views'] ?? 0),
    'up'    => intval($m['up'] ?? 0),
    'down'  => intval($m['down'] ?? 0),
  ];
}
usort($out, fn($a,$b) => $b['views'] <=> $a['views']);

json_response($out);
