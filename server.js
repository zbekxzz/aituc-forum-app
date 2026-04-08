console.log("🔥 SERVER FILE LOADED");

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure db folder exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Init SQLite
const dbPath = path.join(dbDir, 'forum.db');
console.log('DB PATH:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ DB connection error:', err);
  } else {
    console.log('✅ Connected to SQLite');
  }
});

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// POST /register
app.post('/register', (req, res) => {
  const { full_name, phone, college } = req.body;

  if (!full_name || !phone || !college) {
    return res.status(400).json({ error: 'Барлық өрістер міндетті' });
  }

  if (full_name.trim().length < 2 || phone.trim().length < 2 || college.trim().length < 2) {
    return res.status(400).json({ error: 'Барлық өрістерді дұрыс толтырыңыз' });
  }

  db.run(
    `INSERT INTO participants (full_name, phone, college) VALUES (?, ?, ?)`,
    [full_name.trim(), phone.trim(), college.trim()],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Сервер қатесі' });
      }

      res.json({
        success: true,
        id: this.lastID,
        message: 'Тіркелу сәтті'
      });
    }
  );
});

// GET /participants
app.get('/participants', (req, res) => {
  db.all(
    `SELECT * FROM participants ORDER BY registered_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      res.json(rows);
    }
  );
});

// GET /stats
app.get('/stats', (req, res) => {
  db.get(`SELECT COUNT(*) as count FROM participants`, [], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }

    db.all(
      `SELECT * FROM participants ORDER BY registered_at DESC LIMIT 5`,
      [],
      (err2, recent) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: 'Ошибка сервера' });
        }

        res.json({
          total: row.count,
          recent
        });
      }
    );
  });
});

// GET /export
app.get('/export', async (req, res) => {
  db.all(
    `SELECT * FROM participants ORDER BY registered_at DESC`,
    [],
    async (err, participants) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Ошибка экспорта' });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Участники');

      sheet.columns = [
        { header: '№', key: 'id', width: 6 },
        { header: 'ФИО', key: 'full_name', width: 35 },
        { header: 'Телефон', key: 'phone', width: 20 },
        { header: 'Колледж', key: 'college', width: 35 },
        { header: 'Дата регистрации', key: 'registered_at', width: 22 },
      ];

      participants.forEach((p, i) => {
        sheet.addRow({
          id: i + 1,
          full_name: p.full_name,
          phone: p.phone,
          college: p.college,
          registered_at: new Date(p.registered_at).toLocaleString('ru-RU'),
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="participants.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    }
  );
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});