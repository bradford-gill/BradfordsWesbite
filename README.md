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

The blog system supports **two types of posts**:

1. **Markdown posts** - Simple, static content (stored in `public/blog/`)
2. **React posts** - Interactive, dynamic content with full React capabilities (stored in `src/components/posts/`)

The `posts.json` file is **automatically generated** from both markdown and React post files.

---

## Option 1: Markdown Posts (Simple Content)

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

---

## Option 2: React Posts (Interactive Content)

### Step 1: Create Your React Component

Create a new `.tsx` file in the `src/components/posts/` directory.

**File naming convention:** Use lowercase letters and hyphens matching your slug (e.g., `interactive-demo.tsx`)

**Required format:**

```tsx
/* metadata: { "title": "Your Post Title", "date": "2026-03-18", "slug": "your-slug", "excerpt": "Brief description" } */

import { useState } from "react";

export default function YourPostName() {
  const [count, setCount] = useState(0);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">
        Your Interactive Post
      </h2>

      <p className="text-slate-600">
        You can use any React features, hooks, and components here!
      </p>

      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Clicked {count} times
      </button>
    </div>
  );
}
```

**Important:**

- The metadata comment must be at the very top of the file
- The metadata must be valid JSON with all four fields: `title`, `date`, `slug`, and `excerpt`
- Export a default React component
- You have access to all React hooks, Tailwind CSS classes, and lucide-react icons

---

## Generating posts.json

After creating either type of post, run:

```bash
npm run generate:posts
```

This will scan:

- All `.md` files in `public/blog/`
- All `.tsx` files in `src/components/posts/`

And generate `posts.json` sorted by date (newest first).

**Note:** The build process (`npm run build`) automatically runs this script, so you don't need to run it manually before building.

## Examples

### Markdown Post Example

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

### React Post Example

**File:** `src/components/posts/interactive-demo.tsx`

See the included `interactive-demo.tsx` file for a complete example with:

- Interactive counters and buttons
- Dashboard-style stat cards
- Tabbed content
- Full React state management

After running `npm run generate:posts`, both types of posts will automatically appear in `posts.json`.

## Project Structure

```
project/
├── public/
│   └── blog/
│       ├── posts.json          # Auto-generated blog post metadata
│       ├── noanet-iron-mill.md # Sample markdown post
│       └── react-tips.md       # Sample markdown post
├── scripts/
│   └── generate-posts.js       # Script to generate posts.json
├── src/
│   ├── components/
│   │   ├── posts/
│   │   │   └── interactive-demo.tsx  # Sample React post
│   │   ├── Homepage.tsx        # Main landing page
│   │   ├── BlogList.tsx        # Blog listing page
│   │   ├── BlogPost.tsx        # Individual blog post viewer
│   │   └── Navigation.tsx      # Site navigation
│   ├── App.tsx                 # Main app with routing
│   └── main.tsx               # Entry point
└── README.md                   # This file
```

## Supported Features

### Markdown Posts

- Headings (h1-h6)
- Bold and italic text
- Inline code and code blocks
- Lists (ordered and unordered)
- Blockquotes
- Links

### React Posts

- Full React hooks (useState, useEffect, etc.)
- All Tailwind CSS utility classes
- Lucide React icons
- Interactive components
- API integrations
- Custom styling and animations
