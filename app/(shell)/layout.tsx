import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { UserSwitcher } from "@/components/user-switcher";
import { getCurrentUser, listSwitchableUsers } from "@/lib/identity";
import { navLinks } from "@/lib/nav";

export default async function ShellLayout({
  children,
}: LayoutProps<"/">) {
  const [user, users] = await Promise.all([
    getCurrentUser(),
    listSwitchableUsers(),
  ]);

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50 font-sans text-zinc-900">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex">
        <div className="px-4 py-4 text-sm font-semibold tracking-tight">
          WuPay Internal
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="sm:hidden font-semibold text-zinc-900">
              WuPay Internal
            </span>
            <Badge tone="info">{user.role}</Badge>
          </div>
          <UserSwitcher users={users} currentEmail={user.email} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
