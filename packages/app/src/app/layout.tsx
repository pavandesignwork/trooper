import type { Metadata } from 'next'
import Link from 'next/link'
import SidebarNav from './components/SidebarNav'

export const metadata: Metadata = {
  title: 'Trooper',
  description: 'Autonomous engineering agent',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#0d0d0d', color: '#d4d4d4',
        display: 'flex', height: '100vh', overflow: 'hidden',
        fontSize: 16,
      }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </body>
    </html>
  )
}

function Sidebar() {
  return (
    <aside style={{
      width: 260, background: '#111',
      borderRight: '1px solid #1f1f1f',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 18px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ width: 32, height: 32, background: '#2563eb', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>T</div>
        <span style={{ fontWeight: 600, fontSize: 18, color: '#e5e5e5' }}>Trooper</span>
      </div>

      {/* New Ticket */}
      <div style={{ padding: '16px 16px 12px' }}>
        <Link href="/tickets/new" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: '#2563eb', color: '#fff',
          padding: '11px 0', borderRadius: 4,
          textDecoration: 'none', fontSize: 15, fontWeight: 600,
        }}>
          + New Ticket
        </Link>
      </div>

      {/* Main nav */}
      <SidebarNav />
    </aside>
  )
}
