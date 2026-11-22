param($src, $out)
# u01..u13.txt -> kanji.json / kanji_vocab.json
# 한자 줄:  #K 한자|훈음|음,음|훈,훈|page
# 어휘 줄:  word|reading|meaning[|n][|c][|alt,alt][|focus]
$dayOf = @{1=1;2=1;3=1;4=2;5=2;6=2;7=3;8=4;9=4;10=5;11=5;12=6;13=6}
$K = New-Object System.Collections.ArrayList; $V = New-Object System.Collections.ArrayList
$ki = 0; $vi = 0
function J($s) { '"' + ($s -replace '\\','\\' -replace '"','\"') + '"' }
function JA($a) { '[' + (($a | Where-Object { $_ } | ForEach-Object { J $_ }) -join ',') + ']' }
for ($u = 1; $u -le 13; $u++) {
  $f = Join-Path $src ('u{0:D2}.txt' -f $u)
  $kid = $null
  foreach ($line in [IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)) {
    if (-not $line.Trim()) { continue }
    if ($line.StartsWith('#K ')) {
      $p = $line.Substring(3).Split('|'); $ki++; $kid = 'k{0:D3}' -f $ki
      [void]$K.Add('{"id":' + (J $kid) + ',"unit":' + $u + ',"day":' + $dayOf[$u] + ',"kanji":' + (J $p[0]) + ',"hun":' + (J $p[1]) + ',"on":' + (JA ($p[2].Split(','))) + ',"kun":' + (JA ($p[3].Split(','))) + ',"src":"pdf","page":' + $p[4] + '}')
    } else {
      $p = $line.Split('|'); $vi++
      if ($p.Count -eq 5 -and $p[4] -ne 'c') { $p = @($p[0], $p[1], $p[2], $p[3], '', $p[4]) }  # word|r|m||alt 형식
      $note = ($p.Count -gt 3 -and $p[3] -eq 'n'); $chk = ($p.Count -gt 4 -and $p[4] -eq 'c')
      $s = '{"id":' + (J ('v{0:D4}' -f $vi)) + ',"kid":' + (J $kid) + ',"word":' + (J $p[0]) + ',"reading":' + (J $p[1]) + ',"meaning":' + (J $p[2]) + ',"note":' + $note.ToString().ToLower() + ',"check":' + $chk.ToString().ToLower()
      if ($p.Count -gt 5 -and $p[5]) { $s += ',"alt":' + (JA ($p[5].Split(','))) }
      if ($p.Count -gt 6 -and $p[6]) { $s += ',"focus":' + (J $p[6]) }
      [void]$V.Add($s + '}')
    }
  }
}
$enc = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $out 'kanji.json'), "[`n" + ($K -join ",`n") + "`n]`n", $enc)
[IO.File]::WriteAllText((Join-Path $out 'kanji_vocab.json'), "[`n" + ($V -join ",`n") + "`n]`n", $enc)
"kanji $($K.Count) vocab $($V.Count)"
