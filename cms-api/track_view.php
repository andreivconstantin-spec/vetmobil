<?php
require __DIR__.'/util.php';

function slug_ok($s){ return preg_match('~^[a-z0-9-_./]+$~i', $s); }
function write_json($file,$arr){ $tmp=$file.'.tmp'; file_put_contents($tmp, json_encode($arr, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)); rename($tmp,$file); }
function hash_client($clientId, $ip){ return hash('sha256', $clientId.'|'.substr($ip,0,7)); }

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$slug = $input['slug'] ?? '';
$clientId = $input['clientId'] ?? '';

if(!$slug || !slug_ok($slug)) json_response(['error'=>'slug invalid'],400);
if(!$clientId) json_response(['error'=>'clientId lipsă'],400);

$metaDir = data_path('/meta');
if(!is_dir($metaDir)) mkdir($metaDir, 0775, true);
$file = $metaDir.'/'.str_replace(['/','\\'], '_', $slug).'.json';

$meta = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
if(!is_array($meta)) $meta = [];
$meta += ['views'=>0,'up'=>0,'down'=>0,'viewed'=>[]];

$h = hash_client($clientId, $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$now = time();
$last = isset($meta['viewed'][$h]) ? intval($meta['viewed'][$h]) : 0;

// o vizită / 12h / client
if($now - $last > 12*3600){
  $meta['views'] = intval($meta['views']) + 1;
  $meta['viewed'][$h] = $now;
}

write_json($file,$meta);
json_response(['views'=>$meta['views']]);
