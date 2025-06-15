const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../database');

async function findOrCreateOrUpdateMovie({ title, director, genres, release_date, plot }) {
  const [movieRows] = await db.query('SELECT * FROM Movies WHERE title = ?', [title]);
  const cleanDate = release_date || null;

  if (movieRows.length === 0) {
    const [result] = await db.query(
      'INSERT INTO Movies (title, director, genres, release_date, plot) VALUES (?, ?, ?, ?, ?)',
      [title, director, genres, cleanDate, plot]
    );
    return result.insertId;
  } else {
    const movie = movieRows[0];
    await db.query(
      'UPDATE Movies SET director = ?, genres = ?, release_date = ?, plot = ? WHERE movie_id = ?',
      [director, genres, cleanDate, plot, movie.movie_id]
    );
    return movie.movie_id;
  }
}

async function findOrCreateUser(username) {
  const [userRows] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
  if (userRows.length === 0) {
    const [result] = await db.query('INSERT INTO Users (username) VALUES (?)', [username]);
    return result.insertId;
  }
  return userRows[0].user_id;
}

// 리뷰 목록 (댓글 개수 포함)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const sort = req.query.sort || 'newest';
  const limit = 5;
  const offset = (page - 1) * limit;

  let orderBy = 'r.created_at DESC';
  if (sort === 'oldest') orderBy = 'r.created_at ASC';

  const [countRows] = await db.query('SELECT COUNT(*) AS cnt FROM Reviews');
  const totalPages = Math.ceil(countRows[0].cnt / limit);

  const [reviews] = await db.query(`
    SELECT r.review_id, r.rating, r.content, r.created_at, m.title, u.username,
      (SELECT COUNT(*) FROM Comments c WHERE c.review_id = r.review_id) AS comment_count
    FROM Reviews r
    JOIN Movies m ON r.movie_id = m.movie_id
    JOIN Users u ON r.user_id = u.user_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  res.render('review', { reviews, currentPage: page, totalPages, sort });
});

// 리뷰 작성
router.get('/write', (req, res) => {
  res.render('review_form');
});

router.post('/write', async (req, res) => {
  const { title, director, genres, release_date, plot, username, rating, content, password } = req.body;

  try {
    const movie_id = await findOrCreateOrUpdateMovie({ title, director, genres, release_date, plot });
    const user_id = await findOrCreateUser(username);
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO Reviews (movie_id, user_id, rating, content, password) VALUES (?, ?, ?, ?, ?)',
      [movie_id, user_id, rating, content, hashedPassword]
    );

    res.redirect('/board');
  } catch (err) {
    console.error('리뷰 작성 실패:', err);
    res.render('error', { message: '리뷰 작성 실패', error: err });
  }
});

// 리뷰 상세
router.get('/:id', async (req, res) => {
  const reviewId = req.params.id;

  const [reviewRows] = await db.query(`
    SELECT r.*, m.title, m.director, m.genres, m.release_date, m.plot, u.username
    FROM Reviews r
    JOIN Movies m ON r.movie_id = m.movie_id
    JOIN Users u ON r.user_id = u.user_id
    WHERE r.review_id = ?
  `, [reviewId]);

  if (!reviewRows.length) return res.status(404).send('리뷰 없음');

  const review = reviewRows[0];

  const [comments] = await db.query(`
    SELECT c.*, u.username
    FROM Comments c
    JOIN Users u ON c.user_id = u.user_id
    WHERE c.review_id = ?
    ORDER BY c.created_at ASC
  `, [reviewId]);

  res.render('review_detail', { review, comments });
});

// 리뷰 수정
router.get('/:id/edit', async (req, res) => {
  const reviewId = req.params.id;

  const [rows] = await db.query(`
    SELECT r.*, m.title, m.director, m.genres, m.release_date, m.plot, u.username
    FROM Reviews r
    JOIN Movies m ON r.movie_id = m.movie_id
    JOIN Users u ON r.user_id = u.user_id
    WHERE r.review_id = ?
  `, [reviewId]);

  if (!rows.length) return res.status(404).send('리뷰 없음');

  res.render('edit_review', { review: rows[0], error: null });
});

router.post('/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { title, director, genres, release_date, plot, username, rating, content, password } = req.body;

  const [rows] = await db.query('SELECT password FROM Reviews WHERE review_id = ?', [reviewId]);
  if (!rows.length) return res.status(404).send('리뷰 없음');

  const passwordMatch = await bcrypt.compare(password, rows[0].password);
  if (!passwordMatch) {
    return res.render('edit_review', {
      review: { review_id: reviewId, title, director, genres, release_date, plot, username, rating, content },
      error: '비밀번호 불일치'
    });
  }

  const movie_id = await findOrCreateOrUpdateMovie({ title, director, genres, release_date, plot });
  const user_id = await findOrCreateUser(username);

  await db.query(
    'UPDATE Reviews SET movie_id = ?, user_id = ?, rating = ?, content = ? WHERE review_id = ?',
    [movie_id, user_id, rating, content, reviewId]
  );

  res.redirect(`/board/${reviewId}`);
});

// 리뷰 삭제
router.get('/:id/delete', async (req, res) => {
  const reviewId = req.params.id;

  const [rows] = await db.query(`
    SELECT r.review_id, m.title
    FROM Reviews r
    JOIN Movies m ON r.movie_id = m.movie_id
    WHERE r.review_id = ?
  `, [reviewId]);

  if (!rows.length) return res.status(404).send('리뷰 없음');

  res.render('delete_review', { review: rows[0], error: null });
});

router.post('/:id/delete', async (req, res) => {
  const reviewId = req.params.id;
  const { password } = req.body;

  const [rows] = await db.query('SELECT password FROM Reviews WHERE review_id = ?', [reviewId]);
  if (!rows.length) return res.status(404).send('리뷰 없음');

  const passwordMatch = await bcrypt.compare(password, rows[0].password);
  if (!passwordMatch) {
    const [reviewRows] = await db.query('SELECT review_id, movie_id FROM Reviews WHERE review_id = ?', [reviewId]);
    return res.render('delete_review', { review: reviewRows[0], error: '비밀번호 불일치' });
  }

  await db.query('DELETE FROM Reviews WHERE review_id = ?', [reviewId]);

  res.redirect('/board');
});

module.exports = router;
