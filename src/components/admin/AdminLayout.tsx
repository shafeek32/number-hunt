import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="flex flex-1 min-h-screen overflow-hidden">
        {/* Desktop Sidebar (Fixed 64) */}
        <div className="hidden md:block shrink-0">
          <div className="fixed top-0 bottom-0 left-0 w-64 z-40">
            <AdminSidebar />
          </div>
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-64 max-w-xs h-full bg-slate-950 shadow-2xl">
              <AdminSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          <AdminHeader onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
