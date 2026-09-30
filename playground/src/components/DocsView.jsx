import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Terminal,
  Layers,
  Code2,
  FileCode,
  Compass,
  Wand2,
  Mic,
  Radio,
  BarChart2,
  MessageSquare,
  Globe,
  Cpu,
  Database,
  CheckCircle,
  Server,
  Cloud,
  Box,
  Copy,
  Check,
  PlayCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { DOCS_NAV, DOCS_DATA } from '../docsData';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { CoreCapabilities, QuickNextSteps } from './OverviewSections';

const iconMap = {
  BookOpen,
  Terminal,
  Layers,
  Code2,
  FileCode,
  Compass,
  Wand2,
  Mic,
  Radio,
  BarChart2,
  MessageSquare,
  Globe,
  Cpu,
  Database,
  CheckCircle,
  Server,
  Cloud,
  Box,
};

export const DocsView = ({ onSelectStudio }) => {
  const [activeDocId, setActiveDocId] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentDoc = DOCS_DATA[activeDocId] || DOCS_DATA['overview'];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredNav = DOCS_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const doc = DOCS_DATA[item.id];
      return (
        item.title.toLowerCase().includes(q) ||
        (doc && (doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q)))
      );
    }),
  })).filter((section) => section.items.length > 0);

  const handleSelectDoc = (id) => {
    setActiveDocId(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)] animate-fadeIn relative">
      {/* ── Mobile Floating Hamburger Button (always accessible, does not push content or collide with header) ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-federal-700 text-white font-semibold text-xs shadow-lg hover:bg-federal-800 transition-all border border-federal-600 active:scale-95"
          aria-label="Open documentation topics"
        >
          <Menu className="w-4 h-4 text-emerald-300" />
          <span>Docs Menu</span>
        </button>
      </div>

      {/* Mobile Slide-over Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-over panel (Left-aligned drawer like a classic sidebar) */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-r border-stone-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-federal-600" />
                <span className="text-sm font-bold text-stone-900">Documentation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Search */}
            <div className="p-3 border-b border-stone-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-federal-600 focus:bg-white text-stone-800"
                />
              </div>
            </div>

            {/* Drawer Nav Tree */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {filteredNav.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2 font-mono">
                    {cat.category}
                  </h4>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const Icon = iconMap[item.icon] || BookOpen;
                      const isActive = activeDocId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectDoc(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                            isActive
                              ? 'bg-federal-50 text-federal-800 font-semibold'
                              : 'text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? 'text-federal-600' : 'text-stone-400'
                              }`}
                            />
                            <span className="truncate">{item.title}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-federal-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredNav.length === 0 && (
                <div className="text-center py-6 text-xs text-stone-400">
                  No matching topics found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Left Sidebar Navigation (Desktop) ── */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-white border border-stone-200 rounded-2xl p-4 shadow-card flex-col gap-4 sticky top-24 h-[calc(100vh-7.5rem)]">
        {/* Search */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-federal-600 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
          />
        </div>

        {/* Navigation Tree (scrolls independently within the fixed sidebar) */}
        <nav className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-5">
          {filteredNav.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-2 font-mono">
                {cat.category}
              </h3>
              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const Icon = iconMap[item.icon] || BookOpen;
                  const isActive = activeDocId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectDoc(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left group ${
                        isActive
                          ? 'bg-federal-50 text-federal-800 font-semibold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive
                              ? 'text-federal-600'
                              : 'text-stone-400 group-hover:text-stone-600'
                          }`}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-federal-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredNav.length === 0 && (
            <div className="text-center py-6 text-xs text-stone-400">
              No matching docs found.
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main Content View ── */}
      <article className="flex-1 min-w-0 bg-white border border-stone-200 rounded-2xl p-4 sm:p-8 lg:p-10 shadow-card overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-stone-100 pb-4 sm:pb-6 mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5 sm:mb-3">
            {currentDoc.badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-federal-100 text-federal-800 border border-federal-200">
                {currentDoc.badge}
              </span>
            )}
            {currentDoc.studioLink && onSelectStudio && (
              <button
                onClick={() => onSelectStudio(currentDoc.studioLink)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-federal-600 text-white hover:bg-federal-700 transition-colors shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Try in {currentDoc.studioLink.toUpperCase()} Studio
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight leading-tight">
            {currentDoc.title}
          </h1>
          {currentDoc.subtitle && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-stone-500 leading-relaxed">
              {currentDoc.subtitle}
            </p>
          )}
        </div>

        {/* Markdown Rendered Content */}
        <div className="prose prose-stone max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-federal-600 hover:prose-a:text-federal-700 prose-pre:bg-stone-900 prose-pre:border prose-pre:border-stone-800 prose-pre:rounded-xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: ({ children }) => (
                <div className="my-4 border-l-4 border-federal-500 bg-federal-50/50 p-4 rounded-r-xl text-xs sm:text-sm text-federal-950">
                  {children}
                </div>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 border border-stone-200 rounded-xl shadow-sm">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 font-semibold text-stone-800">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-stone-100 px-4 py-2.5 text-stone-600">
                  {children}
                </td>
              ),
              a: ({ href, children, ...props }) => {
                // If it's an internal doc link like href="install" or href="/models"
                const docId = href ? href.replace(/^\/?(docs\/)?/, '') : '';
                if (DOCS_DATA[docId]) {
                  return (
                    <button
                      onClick={() => handleSelectDoc(docId)}
                      className="text-federal-600 hover:text-federal-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer text-left inline"
                    >
                      {children}
                    </button>
                  );
                }
                const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
                return (
                  <a
                    href={href}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noreferrer' : undefined}
                    className="text-federal-600 hover:text-federal-800 font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-1"
                    {...props}
                  >
                    {children}
                    {isExternal && <ExternalLink className="w-3 h-3 inline-block shrink-0" />}
                  </a>
                );
              },
              pre: ({ children, ...props }) => {
                // If this pre contains the architecture diagram, unwrap it so prose pre styles don't apply
                return <>{children}</>;
              },
              code: ({ node, className, children, ...props }) => {
                const match = /language-([\w-]+)/.exec(className || '');
                const lang = match ? match[1] : '';

                if (lang === 'architecture') {
                  return (
                    <div className="not-prose font-sans whitespace-normal break-words my-6">
                      <ArchitectureDiagram />
                    </div>
                  );
                }

                if (lang === 'capabilities') {
                  return <CoreCapabilities />;
                }

                if (lang === 'next-steps') {
                  return <QuickNextSteps onSelectDoc={handleSelectDoc} />;
                }

                const isBlock = Boolean(match) || (typeof children === 'string' && children.includes('\n'));
                if (!isBlock) {
                  return (
                    <code className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11.5px] font-mono border border-stone-200 font-semibold" {...props}>
                      {children}
                    </code>
                  );
                }

                const codeString = String(children).replace(/\n$/, '');
                const codeId = Math.random().toString(36).substring(7);
                const languageLabel = lang || (className?.replace('language-', '') || 'code');

                return (
                  <div className="relative group my-4 rounded-xl overflow-hidden border border-stone-800 bg-stone-950 text-left not-prose">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-stone-900/90 border-b border-stone-800 text-[11px] font-mono text-stone-400">
                      <span>{languageLabel}</span>
                      <button
                        onClick={() => copyToClipboard(codeString, codeId)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copiedCode === codeId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs font-mono text-stone-200 m-0 leading-relaxed">
                      <code>{children}</code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {currentDoc.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};
