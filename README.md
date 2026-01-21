# Bradford Gill - Personal Website

A simple personal website with an integrated blog system built with React, TypeScript, and Vite.

## Getting Started

### Installation

```bash
npm install

npm run dev

npm run build
```

## Adding Blog Posts

The blog system uses markdown files stored in the `public/blog/` directory. The `posts.json` file is **automatically generated** from the markdown file headers.

### Step 1: Create Your Markdown File

Create a new `.md` file in the `public/blog/` directory with your blog post content.

**File naming convention:** Use lowercase letters and hyphens (e.g., `my-new-post.md`)

**Required format:**

```markdown
---
title: Your Post Title
date: 2024-01-15
slug: your-post-slug
excerpt: A brief description of your post
---

# Your Post Title

Your content goes here...

## Subheadings

- Bullet points
- More points

1. Numbered lists
2. Work too

You can use **bold**, _italic_, and `code` formatting.

\`\`\`javascript
// Code blocks are supported
const greeting = "Hello, World!";
\`\`\`
```

**Important:** The frontmatter (content between `---` markers) must include all four fields: `title`, `date`, `slug`, and `excerpt`.

### Step 2: Generate posts.json

Run the generation script to automatically create `posts.json` from all markdown files:

```bash
npm run generate:posts
```

This will scan all `.md` files in `public/blog/`, extract their frontmatter, and generate `posts.json` sorted by date (newest first).

**Note:** The build process (`npm run build`) automatically runs this script, so you don't need to run it manually before building.

### Step 3: Commit and Push

Once you've created your markdown file, commit your changes:

```bash
git add public/blog/
git commit -m "Add new blog post: Your Post Title"
git push
```

That's it! Your new blog post will be live once deployed.

## Example Blog Post

Here's a complete example:

**File:** `public/blog/getting-started-with-react.md`

```markdown
---
title: Getting Started with React
date: 2024-03-15
slug: getting-started-with-react
excerpt: Learn the basics of React and start building modern web applications
---

# Getting Started with React

React is a powerful JavaScript library for building user interfaces...

## Why React?

- Component-based architecture
- Virtual DOM for performance
- Large ecosystem

Happy coding!
```

After running `npm run generate:posts`, this post will automatically appear in `posts.json`.

## Project Structure

```
project/
├── public/
│   └── blog/
│       ├── posts.json          # Auto-generated blog post metadata
│       ├── noanet-iron-mill.md # Sample blog post
│       └── react-tips.md       # Sample blog post
├── scripts/
│   └── generate-posts.js       # Script to generate posts.json from markdown
├── src/
│   ├── components/
│   │   ├── Homepage.tsx        # Main landing page
│   │   ├── BlogList.tsx        # Blog listing page
│   │   ├── BlogPost.tsx        # Individual blog post viewer
│   │   └── Navigation.tsx      # Site navigation
│   ├── App.tsx                 # Main app with routing
│   └── main.tsx               # Entry point
└── README.md                   # This file
```

## Supported Markdown Features

- Headings (h1-h6)
- Bold and italic text
- Inline code and code blocks
- Lists (ordered and unordered)
- Blockquotes
- Links
