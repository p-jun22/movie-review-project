const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

const db = require('./database');

// 라우터
const postRouter = require('./routes/post');
const commentRouter = require('./routes/comment');
const searchRouter = require('./routes/search');

// 미들웨어 등록
app.use(express.urlencoded({ extended: true })); // POST body 파싱
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 라우터 연결
app.use('/board', postRouter);  // 중복된 라우터 연결 제거
app.use('/comment', commentRouter);
app.use('/search', searchRouter);

// 리뷰 작성 폼 라우트 수정 (라우터를 postRouter에 포함시키는 방식으로)
app.get('/review_form', (req, res) => {
  res.render('review_form');
});

app.get('/board/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    // 리뷰 정보 가져오기
    const [reviewRows] = await db.query(`
      SELECT r.*, m.title, u.username
      FROM Reviews r
      JOIN Movies m ON r.movie_id = m.movie_id
      JOIN Users u ON r.user_id = u.user_id
      WHERE r.review_id = ?
    `, [reviewId]);

    if (reviewRows.length === 0) {
      return res.status(404).send('리뷰를 찾을 수 없습니다.');
    }

    const review = reviewRows[0];

    // 임시 사용자 정보 ('guest'로 설정)
    const user = { username: 'guest' };  // 로그인 기능 추가 후 이 부분을 변경해야 함

    // review와 user 객체 전달
    res.render('review_detail', { review, user });
  } catch (err) {
    console.error('리뷰 상세 페이지 로딩 실패:', err);
    res.status(500).send('리뷰 상세 페이지 로딩 실패');
  }
});


// 테스트 라우트
app.get('/dbtest', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW()');
    res.send(`DB 연결 성공! 현재 시간: ${rows[0]['NOW()']}`);
  } catch (err) {
    console.error('DB 연결 에러:', err);
    res.status(500).send('DB 연결 실패!');
  }
});

// 루트 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/board');
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
