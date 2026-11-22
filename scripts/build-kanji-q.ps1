# 한자 문제 생성: scripts/kanji_src/qNN.txt -> data/kanji_q/dayNN.json, data/kanji_q/index.json
# 실행: powershell -File scripts/build-kanji-q.ps1 1   (Day 번호 여러 개 가능)
# 원본 줄 형식: vid|seg|보충 설명|오답1~이유|오답2~이유|오답3~이유   (# 으로 시작하면 주석)
param([int[]]$days)
$root = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object System.Text.UTF8Encoding($false)
$vocab = [IO.File]::ReadAllText("$root/data/kanji_vocab.json", $utf8) | ConvertFrom-Json
$VM = @{}; foreach ($v in $vocab) { $VM[$v.id] = $v }
function J($s) { '"' + ($s -replace '\\', '\\' -replace '"', '\"') + '"' }
function JA($a) { '[' + (($a | ForEach-Object { J $_ }) -join ',') + ']' }
New-Item -ItemType Directory -Force "$root/data/kanji_q" | Out-Null
foreach ($d in $days) {
  $src = "$root/scripts/kanji_src/q{0:D2}.txt" -f $d
  $lines = [IO.File]::ReadAllLines($src, $utf8) | Where-Object { $_.Trim() -and -not $_.StartsWith('#') }
  # 정답 위치: 0~3을 고르게 채운 뒤 Day 번호로 시드를 준 셔플
  $n = $lines.Count; $pos = @(); for ($i = 0; $i -lt $n; $i++) { $pos += $i % 4 }
  $seed = 7919 * $d + 17
  for ($i = $n - 1; $i -gt 0; $i--) { $seed = ($seed * 1103515245 + 12345) % 2147483648; $j = $seed % ($i + 1); $t = $pos[$i]; $pos[$i] = $pos[$j]; $pos[$j] = $t }
  $out = @(); $k = 0
  foreach ($line in $lines) {
    $p = $line.Split('|'); $v = $VM[$p[0]]
    if (-not $v) { throw "모르는 vid: $($p[0])" }
    $segs = $p[1].Split(',') | ForEach-Object { $a = $_.Split('='); "$($a[0]) $($a[1])" }
    $why = ($segs -join ' + ') + $(if ($p[2]) { ' · ' + $p[2] } else { '' })
    $wr = @(); $wc = @()
    foreach ($x in $p[3..5]) { $a = $x.Split('~', 2); $wc += $a[0]; $wr += "$($a[0]): $($a[1])" }
    $choices = New-Object System.Collections.ArrayList; [void]$choices.AddRange($wc); $ans = $pos[$k]; $choices.Insert($ans, $v.reading)
    $q = '{"id":' + (J $v.id) + ',"vid":' + (J $v.id) + ',"kid":' + (J $v.kid) + ',"q":' + (J $v.word)
    if ($v.focus) { $q += ',"focus":' + (J $v.focus) }
    $q += ',"choices":' + (JA $choices) + ',"answer":' + $ans + ',"seg":' + (J $p[1]) + ',"why":' + (J $why) + ',"wrong":' + (JA $wr) + '}'
    $out += $q; $k++
  }
  [IO.File]::WriteAllText(("$root/data/kanji_q/day{0:D2}.json" -f $d), "[`n" + ($out -join ",`n") + "`n]`n", $utf8)
  "Day ${d}: $($n)문제"
}
# index.json: { "Day": 문제 수 }
$idx = @(); foreach ($f in Get-ChildItem "$root/data/kanji_q" -Filter 'day*.json' | Sort-Object Name) {
  $dn = [int]($f.BaseName.Substring(3)); $cnt = ([IO.File]::ReadAllText($f.FullName, $utf8) | ConvertFrom-Json).Count; $idx += "`"$dn`":$cnt" }
[IO.File]::WriteAllText("$root/data/kanji_q/index.json", '{' + ($idx -join ',') + "}`n", $utf8)
