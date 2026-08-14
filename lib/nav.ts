export type NavLink = {
  href: string;
  label: string;
};

/** Sidebar navigation. Add a tool by adding one entry here. */
export const navLinks: NavLink[] = [
  { href: "/", label: "Overview" },
  { href: "/audit", label: "Audit log" },
];
