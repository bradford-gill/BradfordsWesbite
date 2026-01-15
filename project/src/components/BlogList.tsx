import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

interface BlogPost {
  title: string;
  date: string;
  slug: string;
  excerpt: string;
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/blog/posts.json')
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading blog posts:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">Blog</h1>
          <p className="text-xl text-slate-600">
            Thoughts, tutorials, and insights on web development
          </p>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-8 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-2 text-slate-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{post.excerpt}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-slate-500">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
