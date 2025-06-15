const express = require('express');
const router = express.Router();
const db = require('../database');

// 검색 결과 렌더링 (GET /search?query=...)
router.get('/', async (req, res) => {
  const keyword = req.query.query;
  const sort = req.query.sort || ''; // 'high' or 'low'

  try {
    const [movieResults] = await db.query(
      `SELECT * FROM Movies
       WHERE title LIKE ?
       ORDER BY release_date DESC`,
      [`%${keyword}%`]
    );
    


    //정렬
    let orderByClause = 'r.created_at DESC';
    if (sort === 'high') orderByClause = 'r.rating DESC';
    else if (sort === 'low') orderByClause = 'r.rating ASC';

    // 평균 평점 뷰에서 평점 정보 가져오기
    const [movieRatings] = await db.query('SELECT movie_id, average_rating FROM Movie_Ratings');

    // 영화 객체에 평균 평점 정보 추가
    movieResults.forEach(movie => {
      const rating = movieRatings.find(r => r.movie_id === movie.movie_id);
      if (rating && rating.average_rating != null) { // NULL 값 확인
        movie.average_rating = Number(rating.average_rating);
      } else {
        movie.average_rating = 0;
      }
    });

    const [reviewResults] = await db.query(
      `SELECT r.review_id, r.content, r.rating, m.title, u.username, r.created_at
       FROM Reviews r
       JOIN Movies m ON r.movie_id = m.movie_id
       JOIN Users u ON r.user_id = u.user_id
       WHERE m.title LIKE ? OR r.content LIKE ?
       ORDER BY ${orderByClause}`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    

    res.render('search', {
      keyword,
      sort,
      movies: movieResults,
      reviews: reviewResults
    });
  } catch (err) {
    console.error('검색 실패:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

module.exports = router;