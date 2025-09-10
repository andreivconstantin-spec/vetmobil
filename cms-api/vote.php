<?php
require __DIR__.'/util.php';

function slug_ok($s){ return preg_match('~^[a-z0-9-_./]+$~i', $s); }
function hash_client($clientId, $ip){ return hash('sha256', $clientId.'|'.substr($ip,0,7)); }
function write_json($file,$arr){ $tmp=$file.'.tmp'; file_put_contents($tmp, json_encode($arr, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)); rename($tmp,$file); }

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$slug = $input['slug'] ?? '';
$vote = $input['vote'] ?? '';
$clientId = $input['clientId'] ?? '';

if(!$slug || !slug_ok($slug)) json_response(['error'=>'slug invalid'],400);
if(!in_array($vote, ['up','down'], true)) json_response(['error'=>'vote invalid'],400);
if(!$clientId) json_response(['error'=>'clientId lipsă'],400);

$metaDir = data_path('/meta');
if(!is_dir($metaDir)) mkdir($metaDir, 0775, true);
$file = $metaDir.'/'.str_replace(['/','\\'], '_', $slug).'.json';

$meta = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
if(!is_array($meta)) $meta = [];
$meta += ['views'=>0,'up'=>0,'down'=>0,'voters'=>[]];

$h = hash_client($clientId, $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$prev = $meta['voters'][$h] ?? null;

if($prev === $vote){
  if($vote==='up')   $meta['up']   = max(0, intval($meta['up'])-1);
  if($vote==='down') $meta['down'] = max(0, intval($meta['down'])-1);
  unset($meta['voters'][$h]);
}else{
  if($prev==='up')   $meta['up']   = max(0, intval($meta['up'])-1);
  if($prev==='down') $meta['down'] = max(0, intval($meta['down'])-1);
  if($vote==='up')   $meta['up']   = intval($meta['up'])+1;
  if($vote==='down') $meta['down'] = intval($meta['down'])+1;
  $meta['voters'][$h] = $vote;
}

write_json($file,$meta);
json_response(['up'=>$meta['up'],'down'=>$meta['down']]);
