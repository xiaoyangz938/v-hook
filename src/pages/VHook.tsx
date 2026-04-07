import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { ChevronsLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const extractHeadings = (md: string) => {
  const regex = /^(#{1,4})\s+(.*)/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(md)) !== null) {
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    headings.push({
      level: match[1].length,
      text,
      id,
    });
  }

  return headings;
};

const ResizableImage = ({ src, alt, fullWidth = false }: { src: string; alt: string; fullWidth?: boolean }) => {
  const [width, setWidth] = useState(450);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (startX - moveEvent.clientX);
      setWidth(Math.max(200, Math.min(newWidth, 1000)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (fullWidth) {
    return (
      <figure className="not-prose my-8 w-full">
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 relative">
          <img src={src} alt={alt} className="w-full h-auto object-cover" />
        </div>
        {alt && <figcaption className="text-center text-sm text-gray-500 mt-3 font-medium">{alt}</figcaption>}
      </figure>
    );
  }

  return (
    <figure
      style={{ width: `${width}px` }}
      className="float-right ml-10 mb-8 relative group not-prose clear-right mt-2"
    >
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 relative">
        <img src={src} alt={alt} className="w-full h-auto object-cover pointer-events-none select-none" />
      </div>
      {alt && <figcaption className="text-center text-sm text-gray-500 mt-3 font-medium">{alt}</figcaption>}

      <div
        onMouseDown={handleDragStart}
        className="absolute -bottom-3 -left-3 w-8 h-8 bg-white border border-gray-300 rounded-full shadow-lg cursor-sw-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-blue-50 hover:border-blue-400 hover:scale-110"
        title="Drag to resize"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
      </div>
    </figure>
  );
};

export default function VHook() {
  const [markdownContent, setMarkdownContent] = useState('# V-Hook\n\nLoading documentation...');
  const [activeId, setActiveId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mainWidth, setMainWidth] = useState(1024);
  const isClickScrolling = useRef(false);
  const headings = extractHeadings(markdownContent);

  useEffect(() => {
    fetch('/api/docs/v-hook')
      .then((response) => response.json())
      .then((data: { markdown?: string }) => {
        if (data.markdown) {
          setMarkdownContent(data.markdown);
        }
      })
      .catch(() => {
        setMarkdownContent('# V-Hook\n\nFailed to load documentation from the backend.');
      });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        const intersecting = entries.filter((entry) => entry.isIntersecting);
        if (intersecting.length > 0) {
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(intersecting[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900 pt-14">
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-20 left-6 z-50 p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-colors"
          title="Open Sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      <aside
        className={cn(
          'bg-[#f8f9fa] border-r border-gray-200 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto shrink-0 transition-all duration-300 z-40 group/sidebar',
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-r-0'
        )}
      >
        <div className="p-6 pb-4 flex items-center justify-between w-64">
          <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors inline-block" title="Back to Home">
            <ChevronsLeft className="w-6 h-6" />
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200/50 opacity-0 group-hover/sidebar:opacity-100 focus:opacity-100"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-4 pb-6 flex-1 w-64">
          <ul className="space-y-1.5">
            {headings.map((heading, idx) => {
              const isActive = activeId === heading.id;
              const isRoot = heading.level === 1;

              return (
                <li key={idx} style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}>
                  <a
                    href={`#${heading.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      isClickScrolling.current = true;
                      setActiveId(heading.id);

                      const element = document.getElementById(heading.id);
                      if (element) {
                        const y = element.getBoundingClientRect().top + window.scrollY - 40;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }

                      setTimeout(() => {
                        isClickScrolling.current = false;
                      }, 800);
                    }}
                    className={cn(
                      'flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[13px] transition-colors',
                      isRoot ? 'font-bold text-gray-800 text-sm mb-2' : 'font-normal',
                      isActive ? 'text-blue-600 bg-blue-50/60' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    )}
                  >
                    {!isRoot && (
                      <div
                        className={cn(
                          'w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] transition-colors',
                          isActive ? 'border-l-blue-600' : 'border-l-gray-300'
                        )}
                      />
                    )}
                    <span className={cn(isActive && !isRoot && 'font-medium')}>{heading.text}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main
        style={{ maxWidth: `${mainWidth}px` }}
        className="flex-1 mx-auto w-full p-8 md:p-16 lg:p-24 relative transition-[max-width] duration-300"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = mainWidth;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = startX - moveEvent.clientX;
              setMainWidth(Math.max(600, Math.min(startWidth + deltaX * 2, 2400)));
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          className="absolute top-0 left-0 w-4 h-full cursor-col-resize hover:bg-blue-500/10 transition-colors z-10 flex items-center justify-center group"
          title="Drag to resize text area"
        >
          <div className="w-1 h-12 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors" />
        </div>

        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = mainWidth;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              setMainWidth(Math.max(600, Math.min(startWidth + deltaX * 2, 2400)));
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          className="absolute top-0 right-0 w-4 h-full cursor-col-resize hover:bg-blue-500/10 transition-colors z-10 flex items-center justify-center group"
          title="Drag to resize text area"
        >
          <div className="w-1 h-12 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-h1:text-5xl prose-h1:mb-12 prose-h2:text-4xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b prose-h2:border-gray-100 prose-h3:text-3xl prose-h3:mt-12 prose-h3:mb-6 prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-4 prose-p:text-gray-600 prose-p:font-light prose-p:leading-relaxed prose-p:text-lg"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSlug, rehypeRaw]}
            components={{
              p({ node, children, ...props }: any) {
                const hasImage = node?.children?.some((child: any) => child.tagName === 'img');
                if (hasImage) {
                  return <div className="clear-none" {...props}>{children}</div>;
                }
                return <p {...props}>{children}</p>;
              },
              img({ alt, src }: any) {
                const imageSrc = src || '';
                const isDesignSpaceFigure = imageSrc.includes('figure-05-design-space');
                return <ResizableImage src={imageSrc} alt={alt || ''} fullWidth={isDesignSpaceFigure} />;
              },
            }}
          >
            {markdownContent}
          </ReactMarkdown>
        </motion.div>
      </main>
    </div>
  );
}
