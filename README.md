# Forum Registration Site

Сайт регистрации участников форума с экспортом в Excel.

## Структура проекта

```
forum-registration/
├── server.js          # Express сервер
├── package.json
├── db/
│   └── forum.db       # SQLite база (создаётся автоматически)
└── public/
    ├── index.html     # Страница регистрации
    ├── admin.html     # Панель администратора
    └── program.pdf    # 👈 ПОМЕСТИТЕ СЮДА ФАЙЛ ПРОГРАММЫ ФОРУМА
```

## Установка и запуск

```bash
# 1. Установить зависимости
npm install

# 2. Положить файл программы форума
cp ваш_файл.pdf public/program.pdf

# 3. Запустить сервер
npm start
# или
node server.js
```

Сервер запустится на http://localhost:3000

## Страницы

| URL | Описание |
|-----|----------|
| `http://localhost:3000` | Страница регистрации |
| `http://localhost:3000/admin.html` | Панель администратора |
| `http://localhost:3000/export` | Скачать Excel с участниками |

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/register` | Регистрация участника |
| GET | `/export` | Экспорт в Excel (.xlsx) |
| GET | `/participants` | Список всех участников (JSON) |
| GET | `/stats` | Статистика (кол-во + последние 5) |

## Формат регистрации (POST /register)

```json
{
  "full_name": "Иванов Иван Иванович",
  "city": "Астана",
  "college": "AITU"
}
```

## Excel экспорт

Файл скачивается как `forum_participants_ДАТА.xlsx` и содержит:
- № 
- ФИО
- Город
- Колледж
- Дата регистрации

## Deploy на сервер (опционально)

```bash
# С PM2 для постоянной работы
npm install -g pm2
pm2 start server.js --name forum
pm2 save
pm2 startup
```
