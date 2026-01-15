import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/blog' && location.pathname.startsWith('/blog')) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors">
            BG
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/"
              className={`flex items-center gap-2 font-medium transition-colors ${
                isActive('/')
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              to="/blog"
              className={`flex items-center gap-2 font-medium transition-colors ${
                isActive('/blog')
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Blog
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
