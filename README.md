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

The blog system uses markdown files stored in the `public/blog/` directory. Here's how to add a new blog post:

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

### Step 2: Update posts.json

Add your post metadata to `public/blog/posts.json`. Posts are displayed in the order they appear in this file (newest first is recommended).

```json
[
  {
    "title": "Your Post Title",
    "date": "2024-01-15",
    "slug": "your-post-slug",
    "excerpt": "A brief description of your post"
  },
  {
    "title": "Previous Post",
    "date": "2024-01-10",
    "slug": "previous-post",
    "excerpt": "Another post description"
  }
]
```

**Important:** The `slug` in `posts.json` must match your markdown filename (without the `.md` extension).

### Step 3: Commit and Push

Once you've created your markdown file and updated `posts.json`, commit your changes:

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

**Entry in posts.json:**

```json
{
  "title": "Getting Started with React",
  "date": "2024-03-15",
  "slug": "getting-started-with-react",
  "excerpt": "Learn the basics of React and start building modern web applications"
}
```

## Project Structure

```
project/
├── public/
│   └── blog/
│       ├── posts.json          # Blog post metadata
│       ├── getting-started.md  # Sample blog post
│       ├── react-tips.md       # Sample blog post
│       └── my-journey.md       # Sample blog post
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
