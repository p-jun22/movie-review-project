# Movie review query benchmark

MariaDB 11.4 기준으로 100k~500k 리뷰를 생성하고, 애플리케이션의 대표 조회를 인덱스 전후로 비교한다.

```powershell
mysql -h 127.0.0.1 -P 3307 -u root -p projectdb < performance/benchmark.sql
```

기본값은 100,000 리뷰와 300,000 댓글이다. `SET @review_count := 500000;`로 늘릴 수 있다.
실험 테이블은 `bench_` 접두사를 사용하며 원본 테이블을 변경하지 않는다.
