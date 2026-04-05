#!/usr/bin/env node
/**
 * post-scrape.js
 *
 * Run after node scraper.js to optimize the output:
 *  1. Extract shared sidebar.html
 *  2. Replace inline sidebars with lightweight placeholders
 *  3. Strip leftover UI chrome (logo, wrappers, Bootstrap)
 *  4. Remove KaTeX MathML duplicates
 *
 * Usage: node post-scrape.js
 */

'use strict';

const fse     = require('fs-extra');
const cheerio = require('cheerio');
const path    = require('path');

const OUT_DIR = path.resolve(__dirname, 'course-replica');

function findHtml(dir) {
  const results = [];
  for (const entry of fse.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findHtml(full).forEach(f => results.push(f));
    else if (entry.name === 'index.html') results.push(full);
  }
  return results;
}

async function run() {
  const contentDir = path.join(OUT_DIR, 'content');
  const files = findHtml(contentDir);
  console.log(`Found ${files.length} content pages\n`);

  // ── 1. Extract clean sidebar from any page that has one ───────────────────
  const sidebarPath = path.join(OUT_DIR, 'assets', 'sidebar.html');
  let sidebarExtracted = await fse.pathExists(sidebarPath);

  if (!sidebarExtracted) {
    for (const f of files) {
      const $ = cheerio.load(await fse.readFile(f, 'utf8'));
      const sb = $('#sidebar');
      if (sb.find('.topic-list').length) {
        sb.find('.open').removeClass('open');
        sb.find('.active').removeClass('active');
        sb.find('.topic-list')
          .removeAttr('data-active-topic')
          .removeAttr('data-active-chapter')
          .removeAttr('data-active-page');
        await fse.writeFile(sidebarPath, sb.html(), 'utf8');
        console.log(`Sidebar extracted: ${(sb.html().length / 1024).toFixed(1)} KB`);
        sidebarExtracted = true;
        break;
      }
    }
  } else {
    console.log('Sidebar already extracted — skipping');
  }

  // ── 2. Process all pages ──────────────────────────────────────────────────
  let totalBefore = 0, totalAfter = 0;

  for (const f of files) {
    const raw = await fse.readFile(f, 'utf8');
    totalBefore += raw.length;
    const $ = cheerio.load(raw);
    let changed = false;

    // Replace inline sidebar with placeholder
    const sidebar = $('#sidebar');
    if (sidebar.find('.topic-list').length) {
      const tl = sidebar.find('.topic-list');
      sidebar.attr('data-active-topic', tl.attr('data-active-topic') || '');
      sidebar.attr('data-active-chapter', tl.attr('data-active-chapter') || '');
      sidebar.attr('data-active-page', tl.attr('data-active-page') || '');
      sidebar.html('');
      changed = true;
    }

    // Remove Bootstrap
    if ($('link[href*="bootstrap"]').length) {
      $('link[href*="bootstrap"]').remove();
      changed = true;
    }

    // Remove ByteByteGo logo header
    $('#content-inner header').each(function () {
      if ($(this).find('img[alt*="logo"], img[alt*="ByteByteGo"]').length) {
        $(this).remove();
        changed = true;
      }
    });

    // Unwrap article from nested wrappers
    const article = $('#content-inner article');
    if (article.length) {
      $('#content-inner').html(article.html());
      changed = true;
    }

    // Remove KaTeX MathML duplicates
    if ($('.katex-mathml').length) {
      $('.katex-mathml').remove();
      changed = true;
    }

    // Strip Ant Design / CSS module classes from content
    $('#content-inner [class]').each(function () {
      const cls = $(this).attr('class') || '';
      const kept = cls.split(/\s+/).filter(c =>
        !c.startsWith('style_') && !c.startsWith('ant-') && !c.startsWith('css-')
      ).join(' ').trim();
      if (kept) $(this).attr('class', kept);
      else $(this).removeAttr('class');
    });

    // Remove leftover UI elements
    $('#content-inner [class*="chatButton"], #content-inner [class*="chatIcon"]').remove();
    $('#content-inner [class*="headerRight"], #content-inner [class*="profileIconWrap"]').remove();
    $('#content-inner [class*="ant-dropdown"]').remove();
    $('#content-inner a[href*="/exercises/"]').each(function () {
      const p = $(this).parent();
      if (p.text().includes('Try it yourself')) p.remove();
    });

    const out = $.html();
    totalAfter += out.length;
    if (changed) await fse.writeFile(f, out, 'utf8');
  }

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2);
  const pct = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log(`\nProcessed ${files.length} pages`);
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Saved:  ${savedMB} MB (${pct}%)\n`);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
