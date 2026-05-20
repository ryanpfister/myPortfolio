#!/usr/bin/env node
// Seed the database with sample posts.
// Run once after first deploy:   node seed.js

require('dotenv').config();
const db = require('./db');

const samples = [
  {
    slug: 'welcome',
    title: 'Welcome to the new blog',
    date: new Date().toISOString().slice(0, 10),
    category: 'tech',
    excerpt: 'The blog is now backed by a real database and admin UI. Posts published in seconds.',
    intro: 'This is a placeholder welcome post created by the seed script. Delete it from the admin once you publish your first real one.',
    body_md: `## What changed

The blog page used to be a handful of static HTML files. It now reads from a small SQLite database, with new posts written through an authenticated admin at \`/admin.html\`.

## How publishing works

- Write a post in the composer.
- Click **Publish**.
- The server saves to the database and the post becomes live immediately.

No more downloading files, no more git pulls just to update a typo.

> If you can read this, the seed ran successfully. Welcome.`,
    tags: 'meta',
    published: 1,
  },
];

for (const s of samples) {
  const existing = db.getPost(s.slug);
  if (existing) {
    console.log(`skip   ${s.slug}  (already exists)`);
    continue;
  }
  db.createPost(s);
  console.log(`added  ${s.slug}`);
}

console.log('\nDone.');
