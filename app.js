require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const app = express();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL');
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

function validateStudent({ student_id, first_name, last_name, course, year_level, email }) {
  if (!student_id || !first_name || !last_name || !course || !year_level || !email) {
    return 'All fields are required.';
  }
  const year = Number(year_level);
  if (!Number.isInteger(year) || year < 1 || year > 5) {
    return 'Year level must be a number from 1 to 5.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

// List students
app.get('/', (req, res) => {
  db.query('SELECT * FROM students ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.render('index', { students: results });
  });
});

// Show Add form
app.get('/students/add', (req, res) => {
  res.render('add');
});

// Save new student
app.post('/students/add', (req, res) => {
  const { student_id, first_name, last_name, course, year_level, email } = req.body;

  const error = validateStudent(req.body);
  if (error) {
    return res.status(400).send(error);
  }

  const sql = `
    INSERT INTO students
    (student_id, first_name, last_name, course, year_level, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [student_id, first_name, last_name, course, year_level, email];

  db.query(sql, values, (err) => {
    if (err) {
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send('Student ID already exists');
      }
      return res.status(500).send('Unable to save student');
    }
    res.redirect('/');
  });
});

// Search students
app.get('/students/search', (req, res) => {
  const keyword = req.query.keyword || '';

  const sql = `
    SELECT * FROM students
    WHERE student_id LIKE ?
    OR first_name LIKE ?
    OR last_name LIKE ?
    OR course LIKE ?
  `;
  const searchValue = `%${keyword}%`;

  db.query(sql, [searchValue, searchValue, searchValue, searchValue], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Search error');
    }
    res.render('index', { students: results });
  });
});

// Show Edit form
app.get('/students/edit/:id', (req, res) => {
  db.query('SELECT * FROM students WHERE id = ?', [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.status(404).send('Student not found');
    }
    res.render('edit', { student: results[0] });
  });
});

// Save edited student
app.post('/students/edit/:id', (req, res) => {
  const { student_id, first_name, last_name, course, year_level, email } = req.body;

  const error = validateStudent(req.body);
  if (error) {
    return res.status(400).send(error);
  }

  const sql = `
    UPDATE students
    SET student_id = ?, first_name = ?, last_name = ?,
        course = ?, year_level = ?, email = ?
    WHERE id = ?
  `;
  const values = [student_id, first_name, last_name, course, year_level, email, req.params.id];

  db.query(sql, values, (err) => {
    if (err) {
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).send('Student ID already exists');
      }
      return res.status(500).send('Unable to update student');
    }
    res.redirect('/');
  });
});

// Delete student
app.post('/students/delete/:id', (req, res) => {
  db.query('DELETE FROM students WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Unable to delete student');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Student not found');
    }
    res.redirect('/');
  });
});

// Start server (always last)
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});