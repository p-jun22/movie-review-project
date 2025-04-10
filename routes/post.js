const express = require('express');
const router = express.Router();
const db = require('../database');

// 리뷰 목록 출력 + 페이징
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5; // 한 페이지당 리뷰 수
  const offset = (page - 1) * limit;

  try {
    // 총 리뷰 개수
    const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM Reviews');
    const totalReviews = countRows[0].cnt;
    const totalPages = Math.ceil(totalReviews / limit);

    // 리뷰 조회
    const [reviews] = await db.query(`
      SELECT r.review_id, r.rating, r.content, m.title, u.username
      FROM Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      JOIN Users u ON r.user_id = u.user_id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.render('review', { reviews, page, totalPages });
  } catch (err) {
    console.error(err);
    res.status(500).send('리뷰 목록 불러오기 실패!');
  }
});

// 리뷰 등록 처리
router.post('/write', async (req, res) => {
  const { title, username, rating, content, director, genres, release_date, plot } = req.body;

  try {
    // 영화 찾기 or 등록
    const [movieRows] = await db.query('SELECT * FROM Movies WHERE title = ?', [title]);
    let movie_id;
    if (movieRows.length === 0) {
      const [result] = await db.query(
        'INSERT INTO Movies (title, director, genres, release_date, plot) VALUES (?, ?, ?, ?, ?)',
        [title, director, genres, release_date, plot]
      );
      movie_id = result.insertId;
    } else {
      movie_id = movieRows[0].movie_id;
    }

    // 사용자 찾기 or 등록
    const [userRows] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);
    let user_id;
    if (userRows.length === 0) {
      const [result] = await db.query(
        'INSERT INTO Users (username) VALUES (?)',
        [username]
      );
      user_id = result.insertId;
    } else {
      user_id = userRows[0].user_id;
    }

    // 리뷰 등록
    await db.query(
      'INSERT INTO Reviews (movie_id, user_id, rating, content) VALUES (?, ?, ?, ?)',
      [movie_id, user_id, rating, content]
    );

    res.redirect('/board');
  } catch (err) {
    console.error('❌ 리뷰 등록 실패:', err);
    res.status(500).send('리뷰 등록 실패!');
  }
});

// 리뷰 상세보기
router.get('/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    const [reviewRows] = await db.query(`
      SELECT r.*, m.title, m.director, m.genres, m.release_date, m.plot, u.username
      FROM Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.review_id = ?
    `, [reviewId]);

    if (reviewRows.length === 0) {
      return res.status(404).send('해당 리뷰를 찾을 수 없습니다.');
    }

    const review = reviewRows[0];

    const [commentRows] = await db.query(`
      SELECT c.*, u.username
      FROM Comments c
      JOIN Users u ON c.user_id = u.user_id
      WHERE c.review_id = ?
      ORDER BY c.created_at ASC
    `, [reviewId]);

    res.render('review_detail', { review, comments: commentRows });
  } catch (err) {
    console.error('❌ 리뷰 상세 페이지 로딩 실패:', err);
    res.status(500).send('리뷰 상세 페이지 로딩 실패!');
  }
});

// 리뷰 수정 폼
router.get('/:id/edit', async (req, res) => {
  const reviewId = req.params.id;

  try {
    const [reviewRows] = await db.query(`
      SELECT r.*, m.title, m.director, m.genres, m.release_date, m.plot, u.username
      FROM Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.review_id = ?
    `, [reviewId]);

    if (reviewRows.length === 0) {
      return res.status(404).send('리뷰를 찾을 수 없습니다.');
    }

    const review = reviewRows[0];
    res.render('edit_review', { review });
  } catch (err) {
    console.error('❌ 리뷰 수정 페이지 로딩 실패:', err);
    res.status(500).send('리뷰 수정 페이지 로딩 실패!');
  }
});

// 리뷰 수정 처리
router.post('/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { title, username, rating, content, director, genres, release_date, plot } = req.body;

  try {
    // 영화 찾기 or 등록 or 수정
    const [movieRows] = await db.query('SELECT * FROM Movies WHERE title = ?', [title]);
    let movie_id;
    if (movieRows.length === 0) {
      const [result] = await db.query(
        'INSERT INTO Movies (title, director, genres, release_date, plot) VALUES (?, ?, ?, ?, ?)',
        [title, director, genres, release_date, plot]
      );
      movie_id = result.insertId;
    } else {
      movie_id = movieRows[0].movie_id;
      await db.query(
        'UPDATE Movies SET director = ?, genres = ?, release_date = ?, plot = ? WHERE movie_id = ?',
        [director, genres, release_date, plot, movie_id]
      );
    }

    // 사용자 찾기 or 등록
    const [userRows] = await db.query('SELECT * FROM Users WHERE username = ?', [username]);
    let user_id;
    if (userRows.length === 0) {
      const [result] = await db.query(
        'INSERT INTO Users (username) VALUES (?)',
        [username]
      );
      user_id = result.insertId;
    } else {
      user_id = userRows[0].user_id;
    }

    // 리뷰 수정
    await db.query(`
      UPDATE Reviews
      SET movie_id = ?, user_id = ?, rating = ?, content = ?
      WHERE review_id = ?
    `, [movie_id, user_id, rating, content, reviewId]);

    res.redirect(`/board/${reviewId}`);
  } catch (err) {
    console.error('❌ 리뷰 수정 실패:', err);
    res.status(500).send('리뷰 수정 실패!');
  }
});

// 리뷰 삭제
router.post('/:id/delete', async (req, res) => {
  const reviewId = req.params.id;

  try {
    await db.query('DELETE FROM Reviews WHERE review_id = ?', [reviewId]);
    res.redirect('/board');
  } catch (err) {
    console.error('❌ 리뷰 삭제 실패:', err);
    res.status(500).send('리뷰 삭제 실패!');
  }
});

module.exports = router;
