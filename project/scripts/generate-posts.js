import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, "../public/blog");
const POSTS_DIR = path.join(__dirname, "../src/components/posts");
const OUTPUT_FILE = path.join(BLOG_DIR, "posts.json");

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
  const lines = frontmatterText.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Extract metadata from React/TSX component
 * @param {string} content - The TSX file content
 * @returns {object|null} - Parsed metadata object or null if invalid
 */
function extractTsxMetadata(content) {
  // Look for metadata comment block at the top of the file
  // Format: /* metadata: { title: "...", date: "...", slug: "...", excerpt: "..." } */
  const metadataRegex = /\/\*\s*metadata:\s*({[\s\S]*?})\s*\*\//;
  const match = content.match(metadataRegex);

  if (!match) {
    return null;
  }

  try {
    // Parse the JSON object
    const metadata = JSON.parse(match[1]);
    return metadata;
  } catch (error) {
    console.error("Error parsing TSX metadata:", error);
    return null;
  }
}

/**
 * Generate posts.json from markdown and TSX files
 */
function generatePostsJson() {
  console.log("🔍 Scanning for markdown files in:", BLOG_DIR);
  console.log("🔍 Scanning for React posts in:", POSTS_DIR);

  // Read markdown files from blog directory
  const blogFiles = fs.readdirSync(BLOG_DIR);
  const markdownFiles = blogFiles.filter((file) => file.endsWith(".md"));

  // Read TSX files from posts directory (if it exists)
  let tsxFiles = [];
  if (fs.existsSync(POSTS_DIR)) {
    const postFiles = fs.readdirSync(POSTS_DIR);
    tsxFiles = postFiles.filter((file) => file.endsWith(".tsx"));
  }

  console.log(
    `📄 Found ${markdownFiles.length} markdown file(s) and ${tsxFiles.length} TSX file(s)`,
  );

  const posts = [];

  // Process each markdown file
  for (const file of markdownFiles) {
    const filePath = path.join(BLOG_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      console.warn(`⚠️  Skipping ${file}: No valid frontmatter found`);
      continue;
    }

    // Validate required fields
    const requiredFields = ["title", "date", "slug", "excerpt"];
    const missingFields = requiredFields.filter((field) => !frontmatter[field]);

    if (missingFields.length > 0) {
      console.warn(
        `⚠️  Skipping ${file}: Missing required fields: ${missingFields.join(", ")}`,
      );
      continue;
    }

    posts.push({
      title: frontmatter.title,
      date: frontmatter.date,
      slug: frontmatter.slug,
      excerpt: frontmatter.excerpt,
      type: "markdown",
    });

    console.log(`✅ Processed (markdown): ${file} -> ${frontmatter.title}`);
  }

  // Process each TSX file
  for (const file of tsxFiles) {
    const filePath = path.join(POSTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const metadata = extractTsxMetadata(content);

    if (!metadata) {
      console.warn(`⚠️  Skipping ${file}: No valid metadata found`);
      continue;
    }

    // Validate required fields
    const requiredFields = ["title", "date", "slug", "excerpt"];
    const missingFields = requiredFields.filter((field) => !metadata[field]);

    if (missingFields.length > 0) {
      console.warn(
        `⚠️  Skipping ${file}: Missing required fields: ${missingFields.join(", ")}`,
      );
      continue;
    }

    posts.push({
      title: metadata.title,
      date: metadata.date,
      slug: metadata.slug,
      excerpt: metadata.excerpt,
      type: "react",
    });

    console.log(`✅ Processed (react): ${file} -> ${metadata.title}`);
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write to posts.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2) + "\n");

  console.log(`\n✨ Successfully generated ${OUTPUT_FILE}`);
  console.log(`📊 Total posts: ${posts.length}`);
}

// Run the script
try {
  generatePostsJson();
} catch (error) {
  console.error("❌ Error generating posts.json:", error);
  process.exit(1);
}
