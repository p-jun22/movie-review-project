const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../database');

// 사용자 등록 또는 조회
async function findOrCreateUser(username) {
  const [userRows] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
  if (userRows.length === 0) {
    const [result] = await db.query('INSERT INTO Users (username) VALUES (?)', [username]);
    return result.insertId;
  }
  return userRows[0].user_id;
}

// 댓글 작성
router.post('/write', async (req, res) => {
  const { review_id, username, content, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = await findOrCreateUser(username);

    await db.query(
      'INSERT INTO Comments (review_id, user_id, content, password) VALUES (?, ?, ?, ?)',
      [review_id, user_id, content, hashedPassword]
    );

    res.redirect(`/board/${review_id}`);
  } catch (err) {
    console.error('❌ 댓글 등록 실패:', err);
    res.render('error', { message: '댓글 등록 실패', error: err });
  }
});

// 비밀번호 체크 + 폼 렌더링 공용
async function checkPasswordAndRenderForm(req, res, itemId, itemType, renderView) {
  const { password } = req.body;

  try {
    let query = '';
    if (itemType === 'review') {
      query = 'SELECT password, review_id FROM Reviews WHERE review_id = ?';
    } else if (itemType === 'comment') {
      query = 'SELECT password, review_id FROM Comments WHERE comment_id = ?';
    } else {
      return res.status(400).send('잘못된 itemType입니다.');
    }

    const [rows] = await db.query(query, [itemId]);

    if (!rows.length) {
      return res.render('error', { message: `${itemType}를 찾을 수 없습니다.`, error: { status: 404 } });
    }

    const passwordMatch = await bcrypt.compare(password, rows[0].password);

    if (!passwordMatch) {
      let item;
      if (itemType === 'comment') {
        const [commentRows] = await db.query(`
          SELECT c.*, u.username, r.review_id
          FROM Comments c
          JOIN Users u ON c.user_id = u.user_id
          JOIN Reviews r ON c.review_id = r.review_id
          WHERE c.comment_id = ?
        `, [itemId]);
        item = commentRows[0];
      } else {
        const [reviewRows] = await db.query(`
          SELECT r.*, m.title, m.director, m.genres, m.release_date, m.plot, u.username
          FROM Reviews r
          JOIN Movies m ON r.movie_id = m.movie_id
          JOIN Users u ON r.user_id = u.user_id
          WHERE r.review_id = ?
        `, [itemId]);
        item = reviewRows[0];
      }

      return res.render(renderView, { comment: item, review: item, error: '비밀번호가 일치하지 않습니다.' });
    }

    return true;
  } catch (err) {
    console.error('❌ 비밀번호 확인 오류:', err);
    return res.render('error', { message: '비밀번호 확인 오류', error: err });
  }
}

// 댓글 삭제 폼 (GET)
router.get('/delete/:comment_id', async (req, res) => {
  const { comment_id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT c.*, u.username, r.review_id
      FROM Comments c
      JOIN Users u ON c.user_id = u.user_id
      JOIN Reviews r ON c.review_id = r.review_id
      WHERE c.comment_id = ?
    `, [comment_id]);

    if (!rows.length) {
      return res.render('error', { message: '댓글을 찾을 수 없습니다.', error: { status: 404 } });
    }

    const comment = rows[0];
    res.render('delete_comment', { comment, error: null });
  } catch (err) {
    console.error('❌ 댓글 삭제 페이지 로딩 실패:', err);
    res.render('error', { message: '댓글 삭제 페이지 로딩 실패', error: err });
  }
});

// 댓글 삭제 처리 (POST)
router.post('/delete/:comment_id', async (req, res) => {
  const { comment_id } = req.params;

  const passwordCheckResult = await checkPasswordAndRenderForm(req, res, comment_id, 'comment', 'delete_comment');

  if (passwordCheckResult === true) {
    try {
      const [rows] = await db.query('SELECT review_id FROM Comments WHERE comment_id = ?', [comment_id]);
      const review_id = rows[0].review_id;

      await db.query('DELETE FROM Comments WHERE comment_id = ?', [comment_id]);
      res.redirect(`/board/${review_id}`);
    } catch (err) {
      console.error('❌ 댓글 삭제 실패:', err);
      res.render('error', { message: '댓글 삭제 실패', error: err });
    }
  }
});

// 댓글 수정 폼 (GET)
router.get('/edit/:id', async (req, res) => {
  const commentId = req.params.id;

  try {
    const [rows] = await db.query(`
      SELECT c.*, u.username, r.review_id
      FROM Comments c
      JOIN Users u ON c.user_id = u.user_id
      JOIN Reviews r ON c.review_id = r.review_id
      WHERE c.comment_id = ?
    `, [commentId]);

    if (!rows.length) {
      return res.render('error', { message: '댓글을 찾을 수 없습니다.', error: { status: 404 } });
    }

    res.render('edit_comment', { comment: rows[0], error: null });
  } catch (err) {
    console.error('❌ 댓글 수정 페이지 로딩 실패:', err);
    res.render('error', { message: '댓글 수정 페이지 로딩 실패', error: err });
  }
});

// 댓글 수정 처리 (POST)
router.post('/edit/:id', async (req, res) => {
  const commentId = req.params.id;
  const { review_id, username, content, password } = req.body;

  try {
    const [rows] = await db.query('SELECT password FROM Comments WHERE comment_id = ?', [commentId]);

    if (!rows.length) {
      return res.render('error', { message: '댓글을 찾을 수 없습니다.', error: { status: 404 } });
    }

    const passwordMatch = await bcrypt.compare(password, rows[0].password);
    if (!passwordMatch) {
      return res.render('edit_comment', {
        comment: { comment_id: commentId, review_id, username, content },
        error: '비밀번호가 일치하지 않습니다.'
      });
    }

    const user_id = await findOrCreateUser(username);

    await db.query(
      'UPDATE Comments SET content = ?, user_id = ? WHERE comment_id = ?',
      [content, user_id, commentId]
    );

    res.redirect(`/board/${review_id}`);
  } catch (err) {
    console.error('❌ 댓글 수정 실패:', err);
    res.render('error', { message: '댓글 수정 실패', error: err });
  }
});

module.exports = router;
