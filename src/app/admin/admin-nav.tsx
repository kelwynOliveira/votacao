'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const isVotings = pathname === '/admin';
  const isCandidates = pathname.startsWith('/admin/candidates');

  return (
    <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <Link
        href="/admin"
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isVotings
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Votações
      </Link>
      <Link
        href="/admin/candidates"
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isCandidates
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Candidatos
      </Link>
    </nav>
  );
}
