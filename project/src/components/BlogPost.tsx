import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Calendar, ArrowLeft } from 'lucide-react';

interface PostMetadata {
  title: string;
  date: string;
  slug: string;
  excerpt: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState<PostMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/blog/posts.json').then((res) => res.json()),
      fetch(`/blog/${slug}.md`).then((res) => res.text()),
    ])
      .then(([posts, markdown]) => {
        const post = posts.find((p: PostMetadata) => p.slug === slug);
        if (!post) {
          setError(true);
          setLoading(false);
          return;
        }

        const contentWithoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n/, '');
        setMetadata(post);
        setContent(contentWithoutFrontmatter);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading blog post:', err);
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading post...</div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Post Not Found</h1>
          <Link to="/blog" className="text-blue-600 hover:text-blue-700">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Blog
        </Link>

        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <header className="mb-8 pb-8 border-b border-slate-200">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
              {metadata.title}
            </h1>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-4 h-4" />
              <time className="text-sm">
                {new Date(metadata.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </header>

          <div className="prose prose-slate prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-slate-800 mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-slate-800 mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-600 leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4 text-slate-600">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-600">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="ml-4">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-600 my-4">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a href={href} className="text-blue-600 hover:text-blue-700 underline">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
