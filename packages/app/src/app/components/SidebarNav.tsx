'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',         icon: '▤', label: 'Overview'    },
  { href: '/tickets',  icon: '≡', label: 'All Tickets' },
  { href: '/settings', icon: '⚙', label: 'Settings'    },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <div style={{ padding: '4px 12px 14px' }}>
      {links.map(({ href, icon, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 4,
              textDecoration: 'none', marginBottom: 2,
              fontSize: 15, fontWeight: active ? 600 : 400,
              color: active ? '#e5e5e5' : '#6b7280',
              background: active ? '#1e2433' : 'transparent',
            }}
          >
            <span style={{ fontSize: 14, width: 16, textAlign: 'center', color: active ? '#2563eb' : '#4b5563' }}>
              {icon}
            </span>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
