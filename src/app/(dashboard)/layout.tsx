'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import ModeBanner from '@/components/ModeBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
      router.push('/login');
    } catch (err) {
      console.error("Logout failed");
      router.push('/login');
    }
  };

  const navItems = [
    { name: 'Terminal', path: '/trading', icon: 'M13 10V3L4 14h7v7l9-11h-7z', roles: ['TRADER', 'ADMIN'] },
    { name: 'Governance', path: '/admin', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', roles: ['ADMIN'] },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-200">
      <ModeBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm">QT</div>
            QuantTrade
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(item.path) 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      </div>
    </div>
  );
}
