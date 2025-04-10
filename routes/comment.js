const express = require('express');
const router = express.Router();
const db = require('../database');

// 댓글 작성
router.post('/write', async (req, res) => {
  const { review_id, username, content } = req.body;

  try {
    const [userRows] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    let user_id = userRows.length ? userRows[0].user_id : (await db.query('INSERT INTO Users (username) VALUES (?)', [username]))[0].insertId;

    await db.query('INSERT INTO Comments (review_id, user_id, content) VALUES (?, ?, ?)', [review_id, user_id, content]);
    res.redirect(`/board/${review_id}`);
  } catch (err) {
    console.error('❌ 댓글 등록 실패:', err);
    res.status(500).send('댓글 등록 실패!');
  }
});

// 댓글 삭제
router.post('/delete', async (req, res) => {
  const { comment_id, review_id } = req.body;

  try {
    await db.query('DELETE FROM Comments WHERE comment_id = ?', [comment_id]);
    res.redirect(`/board/${review_id}`);
  } catch (err) {
    console.error('❌ 댓글 삭제 실패:', err);
    res.status(500).send('댓글 삭제 실패!');
  }
});

// 댓글 수정 폼
router.get('/edit/:id', async (req, res) => {
  const commentId = req.params.id;

  try {
    const [rows] = await db.query('SELECT c.*, u.username FROM Comments c JOIN Users u ON c.user_id = u.user_id WHERE c.comment_id = ?', [commentId]);

    if (!rows.length) return res.status(404).send('댓글을 찾을 수 없습니다.');
    res.render('edit_comment', { comment: rows[0] });
  } catch (err) {
    console.error('❌ 댓글 수정 페이지 로딩 실패:', err);
    res.status(500).send('댓글 수정 페이지 로딩 실패!');
  }
});

// 댓글 수정 처리
router.post('/edit/:id', async (req, res) => {
  const commentId = req.params.id;
  const { review_id, username, content } = req.body;

  try {
    const [userRows] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    let user_id = userRows.length ? userRows[0].user_id : (await db.query('INSERT INTO Users (username) VALUES (?)', [username]))[0].insertId;

    await db.query('UPDATE Comments SET content = ?, user_id = ? WHERE comment_id = ?', [content, user_id, commentId]);
    res.redirect(`/board/${review_id}`);
  } catch (err) {
    console.error('❌ 댓글 수정 실패:', err);
    res.status(500).send('댓글 수정 실패!');
  }
});

module.exports = router;
