export type NavLink = {
  href: string;
  label: string;
};

/** Sidebar navigation. Add a tool by adding one entry here. */
export const navLinks: NavLink[] = [
  { href: "/", label: "Overview" },
  { href: "/refunds", label: "Refunds" },
  { href: "/flags", label: "Feature flags" },
  { href: "/audit", label: "Audit log" },
];
