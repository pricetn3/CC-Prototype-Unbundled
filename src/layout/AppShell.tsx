import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--gray-900)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <TopBar />
        <Outlet />
      </main>
    </div>
  );
}
