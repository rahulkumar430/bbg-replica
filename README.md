# ByteByteGo Course Replica – Offline Scraper

Personal offline reference tool. Scrapes ByteByteGo course pages and builds a self-contained static site.

---

## Setup

```bash
npm install
npx playwright install chromium
```

---

## Step 1 – Save your login session (one-time)

ByteByteGo requires OTP login. Run this once in a visible browser:

```bash
npm run save-session
```

A browser window opens. Log in fully (enter your email + OTP). Once you can see your courses, press **Enter** in the terminal. Your session is saved to `session.json`.

> `session.json` is gitignored – never commit it.

---

## Step 2 – Run the scraper

```bash
npm run scrape
```

This will:
1. Read all URLs from `links.txt`
2. Use Playwright (headless) with your saved session
3. Scrape each page – extract text, headings, images, code blocks
4. Download all images to `course-replica/images/`
5. Generate HTML files to `course-replica/content/`
6. Write the main `course-replica/index.html`

Progress is printed to stdout. Errors are written as placeholder pages (re-run to retry).

---

## Step 3 – Serve locally

```bash
npm run serve
# or
npx serve course-replica
```

Open http://localhost:3000 in your browser.

---

## File Structure

```
scapper/
├── scraper.js          ← main scraper
├── save-session.js     ← one-time login helper
├── links.txt           ← all course URLs to scrape
├── config.json         ← settings (delay, paths, topic metadata)
├── package.json
├── .gitignore
├── session.json        ← (gitignored) your auth cookies
└── course-replica/     ← (gitignored) generated static site
    ├── index.html
    ├── assets/
    │   ├── css/style.css
    │   └── js/sidebar.js
    ├── images/         ← downloaded images (mirrored paths)
    └── content/
        └── <topic>/
            ├── index.html
            └── <chapter>/[<subchapter>/]
                └── index.html
```

---

## Re-running / Incremental Updates

The scraper skips image downloads if the file already exists. To re-scrape a specific page, delete its `index.html` and re-run. To re-scrape everything, delete `course-replica/content/` and re-run.

---

## Notes

- Respect `delayBetweenRequests` in `config.json` (default 1500ms) to avoid hammering the server.
- For personal offline reference only. Do not redistribute.
- If session expires, run `npm run save-session` again.
