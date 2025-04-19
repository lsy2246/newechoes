import React from 'react';

interface FooterProps {
  icp?: string;
  psbIcp?: string;
  psbIcpUrl?: string;
}

export function Footer({ 
  icp = "", 
  psbIcp = "", 
  psbIcpUrl = "http://www.beian.gov.cn/portal/registerSystemInfo",
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 px-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          
          {icp && (
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary-600 dark:hover:text-primary-400"
              aria-label="工信部备案信息"
            >
              {icp}
            </a>
          )}
          
          {psbIcp && (
            <a 
              href={psbIcpUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center hover:text-primary-600 dark:hover:text-primary-400"
              aria-label="公安部备案信息"
            >
              <img src="/images/national.png" alt="公安备案" className="h-4 mr-1" width="14" height="16" loading="lazy" />
              {psbIcp}
            </a>
          )}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-500 font-light flex flex-wrap items-center justify-center gap-2">
          <a href="https://blog.lsy22.com" className="hover:text-primary-600 dark:hover:text-primary-400">
            © {currentYear} New Echoes. All rights reserved.
          </a>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <a 
            href="/sitemap-index.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-600 dark:hover:text-primary-400"
            aria-label="网站地图"
          >
            Sitemap
          </a>
        </div>
      </div>
    </footer>
  );
} 