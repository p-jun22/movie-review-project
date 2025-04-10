const express = require('express');
const router = express.Router();
const db = require('../database');

// 검색 결과 렌더링 (GET /search?query=...)
router.get('/', async (req, res) => {
  const keyword = req.query.query;

  try {
    const [movieResults] = await db.query(`
      SELECT * FROM Movies
      WHERE title LIKE ?
      ORDER BY release_date DESC
    `, [`%${keyword}%`]);

    const [reviewResults] = await db.query(`
      SELECT r.review_id, r.content, r.rating, m.title, u.username, r.created_at
      FROM Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      JOIN Users u ON r.user_id = u.user_id
      WHERE m.title LIKE ? OR r.content LIKE ?
      ORDER BY r.created_at DESC
    `, [`%${keyword}%`, `%${keyword}%`]);

    res.render('search', {
      keyword,
      movies: movieResults,
      reviews: reviewResults
    });
  } catch (err) {
    console.error('검색 실패:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

module.exports = router;
