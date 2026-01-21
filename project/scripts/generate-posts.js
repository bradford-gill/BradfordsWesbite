import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, '../public/blog');
const OUTPUT_FILE = path.join(BLOG_DIR, 'posts.json');

/**
 * Extract frontmatter from markdown content
 * @param {string} content - The markdown file content
 * @returns {object|null} - Parsed frontmatter object or null if invalid
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return null;
  }

  const frontmatterText = match[1];
  const frontmatter = {};

  // Parse YAML-like frontmatter
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Generate posts.json from markdown files
 */
function generatePostsJson() {
  console.log('🔍 Scanning for markdown files in:', BLOG_DIR);

  // Read all files in the blog directory
  const files = fs.readdirSync(BLOG_DIR);
  const markdownFiles = files.filter(file => file.endsWith('.md'));

  console.log(`📄 Found ${markdownFiles.length} markdown file(s)`);

  const posts = [];

  // Process each markdown file
  for (const file of markdownFiles) {
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      console.warn(`⚠️  Skipping ${file}: No valid frontmatter found`);
      continue;
    }

    // Validate required fields
    const requiredFields = ['title', 'date', 'slug', 'excerpt'];
    const missingFields = requiredFields.filter(field => !frontmatter[field]);

    if (missingFields.length > 0) {
      console.warn(`⚠️  Skipping ${file}: Missing required fields: ${missingFields.join(', ')}`);
      continue;
    }

    posts.push({
      title: frontmatter.title,
      date: frontmatter.date,
      slug: frontmatter.slug,
      excerpt: frontmatter.excerpt
    });

    console.log(`✅ Processed: ${file} -> ${frontmatter.title}`);
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write to posts.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2) + '\n');

  console.log(`\n✨ Successfully generated ${OUTPUT_FILE}`);
  console.log(`📊 Total posts: ${posts.length}`);
}

// Run the script
try {
  generatePostsJson();
} catch (error) {
  console.error('❌ Error generating posts.json:', error);
  process.exit(1);
}

