const fs = require('fs');
const path = require('path');
const db = require('./database');
<<<<<<< HEAD
const bcrypt = require('bcrypt');
=======
>>>>>>> 86e7cc393d1416aaf28b66fb1e3dae7c6038e186

async function seed() {
  try {
    const movies = JSON.parse(fs.readFileSync(path.join(__dirname, 'movies.json'), 'utf-8'));
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8'));
    const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, 'reviews.json'), 'utf-8'));
    const comments = JSON.parse(fs.readFileSync(path.join(__dirname, 'comments.json'), 'utf-8'));

<<<<<<< HEAD
    const defaultPassword = await bcrypt.hash('1234', 10);  // 모든 seed 데이터용 기본 비번 1234

=======
>>>>>>> 86e7cc393d1416aaf28b66fb1e3dae7c6038e186
    // Movies
    for (const movie of movies) {
      await db.query(
        'INSERT INTO Movies (title, director, release_date, plot, genres) VALUES (?, ?, ?, ?, ?)',
        [movie.title, movie.director, movie.release_date, movie.plot, movie.genres]
      );
    }

    // Users
    for (const user of users) {
      await db.query('INSERT INTO Users (username) VALUES (?)', [user.username]);
    }

<<<<<<< HEAD
    // Reviews (password 추가)
    for (const review of reviews) {
      await db.query(
        'INSERT INTO Reviews (movie_id, user_id, rating, content, password) VALUES (?, ?, ?, ?, ?)',
        [review.movie_id, review.user_id, review.rating, review.content, defaultPassword]
      );
    }

    // Comments (password 추가)
    for (const comment of comments) {
      await db.query(
        'INSERT INTO Comments (review_id, user_id, content, password) VALUES (?, ?, ?, ?)',
        [comment.review_id, comment.user_id, comment.content, defaultPassword]
      );
    }

    console.log('✅ 모든 데이터가 DB에 삽입되었습니다!');
    process.exit();
  } catch (err) {
    console.error('❌ 데이터 삽입 중 오류 발생:', err);
=======
    // Reviews
    for (const review of reviews) {
      await db.query(
        'INSERT INTO Reviews (movie_id, user_id, rating, content) VALUES (?, ?, ?, ?)',
        [review.movie_id, review.user_id, review.rating, review.content]
      );
    }

    // Comments
    for (const comment of comments) {
      await db.query(
        'INSERT INTO Comments (review_id, user_id, content) VALUES (?, ?, ?)',
        [comment.review_id, comment.user_id, comment.content]
      );
    }

    console.log('모든 데이터가 DB에 삽입되었습니다!');
    process.exit();
  } catch (err) {
    console.error('데이터 삽입 중 오류 발생:', err);
>>>>>>> 86e7cc393d1416aaf28b66fb1e3dae7c6038e186
    process.exit(1);
  }
}

seed();
