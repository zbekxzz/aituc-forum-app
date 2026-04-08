console.log("🔥 SERVER FILE LOADED");

const express = require('express');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Init SQLite
const dbPath = path.join(__dirname, 'db', 'forum.db');

console.log('DB PATH:', dbPath);

const db = new Database(dbPath);

db.exec(`
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

  try {
    const stmt = db.prepare(
      'INSERT INTO participants (full_name, phone, college) VALUES (?, ?, ?)'
    );
    const result = stmt.run(full_name.trim(), phone.trim(), college.trim());

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Тіркелу сәтті'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
});

// GET /export — download Excel
app.get('/export', async (req, res) => {
  try {
    const participants = db.prepare('SELECT * FROM participants ORDER BY registered_at DESC').all();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Forum Registration';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Участники');

    // Column widths and headers
    sheet.columns = [
      { header: '№', key: 'id', width: 6 },
      { header: 'ФИО', key: 'full_name', width: 35 },
      { header: 'Телефон', key: 'phone', width: 20 },
      { header: 'Колледж', key: 'college', width: 35 },
      { header: 'Дата регистрации', key: 'registered_at', width: 22 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A2E' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Add data rows
    participants.forEach((p, i) => {
      const row = sheet.addRow({
        id: i + 1,
        full_name: p.full_name,
        phone: p.phone,
        college: p.college,
        registered_at: new Date(p.registered_at).toLocaleString('ru-RU'),
      });

      // Alternating row colors
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5FF' }
        };
      }

      row.alignment = { vertical: 'middle' };
      row.height = 20;
    });

    // Border for all cells
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0E8' } },
          left: { style: 'thin', color: { argb: 'FFD0D0E8' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0E8' } },
          right: { style: 'thin', color: { argb: 'FFD0D0E8' } },
        };
      });
    });

    // Summary row
    sheet.addRow([]);
    const summaryRow = sheet.addRow([`Всего участников: ${participants.length}`]);
    summaryRow.font = { bold: true, italic: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="forum_participants_${new Date().toISOString().slice(0, 10)}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
});

// GET /participants — all participants for admin
app.get('/participants', (req, res) => {
  const participants = db.prepare(
    'SELECT * FROM participants ORDER BY registered_at DESC'
  ).all();
  res.json(participants);
});

// GET /stats — for admin panel
app.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM participants').get();
  const recent = db.prepare(
    'SELECT * FROM participants ORDER BY registered_at DESC LIMIT 5'
  ).all();
  res.json({ total: total.count, recent });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});
