# Vault — Personal Knowledge Vault

A full-stack "second brain" app: save articles, PDFs, YouTube links, and notes;
organize with tags and folders ("drawers"); full-text search; favourites;
reading progress; and a daily review page for spaced re-reading.

## Stack

- **Backend:** Node.js + Express, SQLite (via `better-sqlite3`) with an FTS5
  full-text search index, JWT auth, `multer` for PDF uploads, `cheerio` +
  `node-fetch` for auto-fetching article titles/thumbnails, `pdf-parse` for
  extracting PDF text.
- **Frontend:** React 18 + Vite + React Router + Tailwind CSS. No external UI
  kit — a small custom "card catalog" design system (see `frontend/src/index.css`).

## Project layout

```
knowledge-vault/
├── docker-compose.yml   One-command deploy: Postgres + backend + frontend
├── .env.example         Root env vars for docker-compose
├── backend/            Express API (port 4000)
│   ├── db/               sqlite.js + postgres.js adapters, index.js picks one
│   ├── routes/           auth, folders, tags, items, review
│   ├── middleware/       JWT auth
│   ├── utils/            URL metadata scraping, S3/local file storage
│   ├── uploads/          local-disk PDF storage (when STORAGE_DRIVER=local)
│   └── Dockerfile
└── frontend/           React app (port 5173 dev / 80 in Docker)
    ├── nginx.conf        Serves the build + proxies /api, /uploads
    ├── Dockerfile
    └── src/
        ├── pages/         Login, Library, Favorites, DailyReview, ItemDetail
        ├── components/    Sidebar, ItemCard, AddItemModal, Shell
        └── context/       Auth + shared folders/tags state
```

## Getting started

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET for anything beyond local dev
npm install
npm run dev                # http://localhost:4000
```

The SQLite database file is created automatically at `backend/db/vault.db`
on first run — no separate database server needed.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173, create an account, and start saving things.
Vite proxies `/api` and `/uploads` requests to the backend automatically in dev.

### 3. Production build

```bash
cd frontend && npm run build     # outputs static files to frontend/dist
cd ../backend && npm start        # serve the API (add a reverse proxy /
                                    # static file server such as Nginx to
                                    # serve frontend/dist alongside it)
```

## Features

- **Save anything** — paste a link and the backend fetches the page's
  OpenGraph title, description, and thumbnail automatically. YouTube links
  are detected and enriched via YouTube's oEmbed endpoint. PDFs are uploaded
  and have their text extracted for search and reading.
- **Drawers (folders) & tags** — organize items into folders, tag freely;
  both are filterable from the sidebar.
- **Full-text search** — powered by SQLite FTS5 across title, excerpt, and
  extracted content.
- **Favourites** — star anything, see them all on the Favourites page.
- **Reading progress** — scroll-based progress tracking on article/note
  content, with a manual "mark as finished" option; visible as a progress
  bar on every card.
- **Daily review** — a lightweight spaced-repetition queue (1/3/7/14/30/60/90
  day intervals) mixing overdue items, unfinished favourites, and recent
  saves, capped at 12 items/day so it never feels overwhelming.
