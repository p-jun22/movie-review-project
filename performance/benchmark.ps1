$ErrorActionPreference$mysql$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
if (-not $env:BENCHMARK_DB_PASSWORD) { throw 'Set BENCHMARK_DB_PASSWORD before running.' }
$passwordArg$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
$mysql$mysql$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
if (-not $env:BENCHMARK_DB_PASSWORD) { throw 'Set BENCHMARK_DB_PASSWORD before running.' }
$passwordArg$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
$db$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
$queries$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  pagination$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  movie_id_join$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  rating_sort$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  leading_wildcard$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  comment_count$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
}
function MeasureQuery($label, $query) {
  $times$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  $median$db = @('-h','127.0.0.1','-P','3307','-u','root',$passwordArg,'projectdb','-N')
  "${label}: $($times -join ', ') ms; median=$median ms"
}

foreach ($name in $queries.Keys) { MeasureQuery $name $queries[$name] }
