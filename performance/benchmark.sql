DROP TABLE IF EXISTS bench_comments, bench_reviews, bench_users, bench_movies;

CREATE TABLE bench_movies (
  movie_id INT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  INDEX idx_bench_movie_title (title)
) ENGINE=InnoDB;

CREATE TABLE bench_users (
  user_id INT PRIMARY KEY,
  username VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE bench_reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  content VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_bench_movie_id (movie_id),
  INDEX idx_bench_user_id (user_id),
  INDEX idx_bench_created_at (created_at),
  INDEX idx_bench_rating (rating)
) ENGINE=InnoDB;

CREATE TABLE bench_comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL,
  user_id INT NOT NULL,
  content VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_bench_comment_review_id (review_id),
  INDEX idx_bench_comment_user_id (user_id)
) ENGINE=InnoDB;

SET @movie_count := 1000;
SET @user_count := 10000;
SET @review_count := 100000;
SET @comment_count := 300000;
SET max_recursive_iterations := GREATEST(@movie_count, @user_count, @review_count, @comment_count);

INSERT INTO bench_movies
SELECT n, CONCAT('Movie ', n) FROM (
  WITH RECURSIVE seq AS (SELECT 1 n UNION ALL SELECT n + 1 FROM seq WHERE n < @movie_count)
  SELECT n FROM seq
) x;

INSERT INTO bench_users
SELECT n, CONCAT('user_', n) FROM (
  WITH RECURSIVE seq AS (SELECT 1 n UNION ALL SELECT n + 1 FROM seq WHERE n < @user_count)
  SELECT n FROM seq
) x;

INSERT INTO bench_reviews (movie_id, user_id, rating, content, created_at)
SELECT MOD(n - 1, @movie_count) + 1, MOD(n - 1, @user_count) + 1,
       MOD(n - 1, 5) + 1, CONCAT('review text ', n),
       TIMESTAMP('2020-01-01') + INTERVAL MOD(n, 2000) DAY
FROM (
  WITH RECURSIVE seq AS (SELECT 1 n UNION ALL SELECT n + 1 FROM seq WHERE n < @review_count)
  SELECT n FROM seq
) x;

INSERT INTO bench_comments (review_id, user_id, content, created_at)
SELECT MOD(n - 1, @review_count) + 1, MOD(n - 1, @user_count) + 1,
       CONCAT('comment text ', n), TIMESTAMP('2020-01-01') + INTERVAL MOD(n, 2000) DAY
FROM (
  WITH RECURSIVE seq AS (SELECT 1 n UNION ALL SELECT n + 1 FROM seq WHERE n < @comment_count)
  SELECT n FROM seq
) x;

ANALYZE TABLE bench_movies, bench_users, bench_reviews, bench_comments;

-- Capture plans with indexes.
EXPLAIN SELECT r.review_id, r.rating, r.created_at, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
ORDER BY r.created_at DESC LIMIT 20 OFFSET 50000;

EXPLAIN SELECT r.review_id, r.rating, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
WHERE r.movie_id = 42 ORDER BY r.created_at DESC LIMIT 20;

EXPLAIN SELECT r.review_id, r.rating, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
ORDER BY r.rating DESC LIMIT 20;

EXPLAIN SELECT m.title, r.content FROM bench_reviews r
JOIN bench_movies m ON m.movie_id = r.movie_id
WHERE m.title LIKE '%Movie 42%';

EXPLAIN SELECT r.review_id,
  (SELECT COUNT(*) FROM bench_comments c WHERE c.review_id = r.review_id) AS comment_count
FROM bench_reviews r ORDER BY r.created_at DESC LIMIT 20;

-- Indexed timing sample. Run each query 5 times and record the median client time.
SELECT BENCHMARK(5, (SELECT COUNT(*) FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id ORDER BY r.created_at DESC LIMIT 20 OFFSET 50000));
SELECT BENCHMARK(5, (SELECT COUNT(*) FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id WHERE r.movie_id=42 ORDER BY r.created_at DESC LIMIT 20));
SELECT BENCHMARK(5, (SELECT COUNT(*) FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id JOIN bench_users u ON u.user_id=r.user_id ORDER BY r.rating DESC LIMIT 20));
SELECT BENCHMARK(5, (SELECT COUNT(*) FROM bench_reviews r JOIN bench_movies m ON m.movie_id=r.movie_id WHERE m.title LIKE '%Movie 42%'));

-- Drop only secondary indexes to produce the baseline, then rerun EXPLAIN and timing.
ALTER TABLE bench_reviews
  DROP INDEX idx_bench_movie_id, DROP INDEX idx_bench_user_id,
  DROP INDEX idx_bench_created_at, DROP INDEX idx_bench_rating;
ALTER TABLE bench_comments
  DROP INDEX idx_bench_comment_review_id, DROP INDEX idx_bench_comment_user_id;

EXPLAIN SELECT r.review_id, r.rating, r.created_at, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
ORDER BY r.created_at DESC LIMIT 20 OFFSET 50000;

EXPLAIN SELECT r.review_id, r.rating, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
WHERE r.movie_id = 42 ORDER BY r.created_at DESC LIMIT 20;

EXPLAIN SELECT r.review_id, r.rating, m.title, u.username
FROM bench_reviews r JOIN bench_movies m ON m.movie_id = r.movie_id
JOIN bench_users u ON u.user_id = r.user_id
ORDER BY r.rating DESC LIMIT 20;

EXPLAIN SELECT m.title, r.content FROM bench_reviews r
JOIN bench_movies m ON m.movie_id = r.movie_id
WHERE m.title LIKE '%Movie 42%';

EXPLAIN SELECT r.review_id,
  (SELECT COUNT(*) FROM bench_comments c WHERE c.review_id = r.review_id) AS comment_count
FROM bench_reviews r ORDER BY r.created_at DESC LIMIT 20;
