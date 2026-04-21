/* metadata: { "title": "Interactive React Demo", "date": "2026-03-18", "slug": "interactive-demo", "excerpt": "An example of an interactive React blog post with dashboard components" } */

import { useState } from "react";
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export default function InteractiveDemo() {
  const [count, setCount] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const stats = [
    {
      label: "Total Users",
      value: "12,345",
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Revenue",
      value: "$54,321",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Growth",
      value: "+23%",
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      label: "Active Now",
      value: "1,234",
      icon: Activity,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Welcome to Interactive React Posts!
        </h2>
        <p className="text-slate-600 leading-relaxed mb-4">
          This is an example of a React-based blog post. Unlike markdown posts,
          you can use full React components, state management, and interactive
          elements. This makes it perfect for creating dashboard-style content,
          interactive tutorials, or data visualizations.
        </p>
      </section>

      <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          Interactive Counter Example
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCount(count - 1)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Decrease
          </button>
          <div className="text-4xl font-bold text-slate-800 min-w-[100px] text-center">
            {count}
          </div>
          <button
            onClick={() => setCount(count + 1)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Increase
          </button>
          <button
            onClick={() => setCount(0)}
            className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Reset
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          Dashboard Stats Grid
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">{stat.label}</span>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          Tabbed Content
        </h3>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-200">
            {["overview", "analytics", "settings"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6 bg-white">
            {activeTab === "overview" && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Overview</h4>
                <p className="text-slate-600">
                  This is the overview tab. You can display any React content
                  here, including charts, tables, or custom components.
                </p>
              </div>
            )}
            {activeTab === "analytics" && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Analytics</h4>
                <p className="text-slate-600">
                  Analytics data would go here. You could integrate with
                  charting libraries like Recharts or Chart.js.
                </p>
              </div>
            )}
            {activeTab === "settings" && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Settings</h4>
                <p className="text-slate-600">
                  Configuration options and settings would be displayed in this
                  tab.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          💡 How to Create React Posts
        </h3>
        <div className="text-slate-600 space-y-2">
          <p>
            1. Create a{" "}
            <code className="bg-white px-2 py-1 rounded text-sm">.tsx</code>{" "}
            file in{" "}
            <code className="bg-white px-2 py-1 rounded text-sm">
              src/components/posts/
            </code>
          </p>
          <p>2. Add metadata at the top in a comment block:</p>
          <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto my-2 text-sm">
            {`/* metadata: {
  "title": "Your Title",
  "date": "2026-03-18",
  "slug": "your-slug",
  "excerpt": "Brief description"
} */`}
          </pre>
          <p>3. Export a default React component</p>
          <p>
            4. Run{" "}
            <code className="bg-white px-2 py-1 rounded text-sm">
              npm run generate:posts
            </code>
          </p>
          <p>5. Your interactive post is ready! 🎉</p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          Benefits of React Posts
        </h3>
        <ul className="space-y-3 text-slate-600">
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span>Full access to React hooks and state management</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span>Use any React component library or custom components</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              Create interactive dashboards, calculators, and visualizations
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span>Integrate with APIs and external data sources</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span>Markdown posts still fully supported for simple content</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
