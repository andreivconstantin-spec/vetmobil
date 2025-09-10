<?php
// /cms-api/util.php
function json_response($arr, $code=200){
  header('Content-Type: application/json; charset=utf-8');
  http_response_code($code);
  echo json_encode($arr);
  exit;
}
function data_path($sub){
  $base = dirname(__DIR__) . '/data';
  return $base . $sub;
}
function ensure_dir($path){
  if(!is_dir($path)) mkdir($path, 0775, true);
}
function read_json($file){
  if(!file_exists($file)) return [];
  $raw = file_get_contents($file);
  $j = json_decode($raw, true);
  return is_array($j)? $j : [];
}
