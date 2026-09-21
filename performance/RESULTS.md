# Benchmark result

- Environment: MariaDB 11.4.5, 100,000 `bench_reviews`, 300,000 `bench_comments`, 1,000 movies, 10,000 users.
- Method: each query was run five times from PowerShell; median wall-clock time includes mysql client startup, so use the numbers as local directional evidence, not a lab-grade latency claim.

| Query | No secondary indexes | Indexed | Change |
|---|---:|---:|---:|
| created_at pagination, OFFSET 50000 | 237.4 ms | 224.0 ms | 5.6% faster |
| movie_id JOIN + created_at sort | 180.6 ms | 164.3 ms | 9.0% faster |
| rating sort | 179.2 ms | 162.1 ms | 9.5% faster |
| comment count correlated subquery | 714.7 ms | 160.7 ms | 77.5% faster |
| `title LIKE '%Movie 42%'` | 260.0 ms | 162.6 ms | not comparable |

`EXPLAIN` showed `idx_bench_created_at`, `idx_bench_rating`, `idx_bench_movie_id`, and `idx_bench_comment_review_id` being selected in the indexed case. After dropping them, the review access changed to `ALL` and `Using filesort`; the comment subquery scanned all 299,202 comment rows. MariaDB `ANALYZE FORMAT=JSON` recorded 20 indexed comment lookups for the limited comment-count query.

The leading-wildcard result must not be claimed as an index improvement: the movie table has only 1,000 rows and the run is cache/client-startup sensitive. `EXPLAIN` showed an index scan on the small `title` index, not a selective seek. A larger movie corpus or `FULLTEXT` comparison is needed to make a search-specific claim.

Safe résumé wording:

> MariaDB 11.4에서 리뷰 10만 건·댓글 30만 건을 생성해 애플리케이션 쿼리를 재현하고, FK/정렬/댓글 집계 인덱스 전후 실행 계획을 비교했다. 댓글 수 집계 쿼리는 로컬 측정 중앙값 기준 714.7ms에서 160.7ms로 약 77.5% 단축됐다.

Do not claim the pagination, rating, or wildcard percentages as production latency improvements; this run measured a local client round trip and the data distribution is synthetic.
