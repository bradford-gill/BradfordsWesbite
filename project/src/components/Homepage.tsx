import { Link } from 'react-router-dom';
import { Code } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Homepage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <div
        className="absolute top-0 left-0 w-full h-full min-h-screen"
        style={{
          backgroundImage: 'url(/home-page-images/with_chili.jpeg)',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          transform: `translateY(${scrollY * -0.3}px)`,
          willChange: 'transform',
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <img
              src="/home-page-images/profile.png"
              alt="Bradford Gill"
              className="w-32 h-32 rounded-full mx-auto shadow-xl object-cover border-4 border-white"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Bradford Gill
          </h1>
          <p className="text-xl text-white drop-shadow-md">
            I love computers, businesses, and spending time in nature.
          </p>
        </div>

        {/* About Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <Code className="w-8 h-8 text-blue-500" />
            About Me
          </h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              At 19, while writing code for fun, I stumbled across neural networks—and something clicked. The math behind deep learning had the same gorgeous symmetry as Maxwell's equations I was studying as an electrical engineering major at UMass Amherst. That connection between invisible electromagnetic fields and artificial intelligence captivated me. I saw the immense potential of machine learning and dove in headfirst.
            </p>
            <p>
              The projects I worked on gained attention from many, including a recruiter at Tesla. A few days after graduating, I drove across the country to Palo Alto to join their team. I loved the scale of the data and the opportunity to solve real engineering problems; everything from reliability forecasting to robotics. The work spanned sensor fusion, edge-deployed vision models, and production ML infrastructure.
            </p>
            <p>
              Now at Blackmore, I help businesses implement AI solutions that drive real business outcomes, in a similar way to how I helped Tesla. I love understanding how businesses operate and building technology that solves their problems. The two go well together.
            </p>
            <p>
              When I'm not working, you'll find me trail running, riding bikes, or backcountry skiing. Nothing gives me better ideas than a bit of time in nature.
            </p>
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Technical Competencies</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              'Computer Vision',
              'Deep Learning',
              'Sensor Fusion',
              'Edge Inference',
              'ML Infrastructure',
              'Reliability Engineering',
              'PyTorch',
              'CUDA Optimization',
              'AWS',
              'FastAPI',
              'Spark & Airflow',
              'AI Governance'
            ].map((skill) => (
              <div
                key={skill}
                className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 text-center font-medium text-slate-700 border border-blue-100"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-500/80 to-cyan-500/80 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center text-white mb-12">
          <h2 className="text-3xl font-bold mb-4">Technical Writing & Projects</h2>
          <p className="text-lg mb-6 opacity-90">
            A mix of technical writing, projects I've worked on, and other things I am interested in.
          </p>
          <Link
            to="/blog"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-slate-50 transition-colors shadow-md"
          >
            Read My Posts
          </Link>
        </div>

        {/* Photo Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
          <img
            src="/home-page-images/top_of_blackmore.JPG"
            alt="Top of Mount Blackmore"
            className="w-full h-auto object-cover"
          />
          <div className="p-6 text-center">
            <p className="text-slate-600 italic">
              Top of Mount Blackmore outside of Bozeman, MT
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
