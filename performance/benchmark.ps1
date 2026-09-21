$ErrorActionPreference = 'Stop'
$mysql = 'C:\Program Files\MariaDB 11.4\bin\mysql.exe'
if (-not $env:BENCHMARK_DB_PASSWORD) { throw 'Set BENCHMARK_DB_PASSWORD before running.' }
$db = @('-h','127.0.0.1','-P','3307','-u','root',('-p' + $env:BENCHMARK_DB_PASSWORD),'projectdb','-N')
$queries = [ordered]@{
  pagination = "SELECT SQL_NO_CACHE r.review_id FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id ORDER BY r.created_at DESC LIMIT 20 OFFSET 50000"
  movie_id_join = "SELECT SQL_NO_CACHE r.review_id FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id WHERE r.movie_id=42 ORDER BY r.created_at DESC LIMIT 20"
  rating_sort = "SELECT SQL_NO_CACHE r.review_id FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id ORDER BY r.rating DESC LIMIT 20"
  leading_wildcard = "SELECT SQL_NO_CACHE m.title,r.content FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id WHERE m.title LIKE '%Movie 42%'"
  comment_count = "SELECT SQL_NO_CACHE r.review_id,(SELECT COUNT(*) FROM bench_comments c WHERE c.review_id=r.review_id) FROM bench_reviews r ORDER BY r.created_at DESC LIMIT 20"
}
function MeasureQuery($label, $query) {
  $times = 1..5 | ForEach-Object { [math]::Round((Measure-Command { & $script:mysql @script:db -e $query | Out-Null }).TotalMilliseconds, 1) }
  $median = ($times | Sort-Object)[2]
  "${label}: $($times -join ', ') ms; median=$median ms"
}
foreach ($name in $queries.Keys) { MeasureQuery $name $queries[$name] }
