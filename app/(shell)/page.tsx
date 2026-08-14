import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/identity";

export default async function OverviewPage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader
        title="Internal tools"
        description="Shared shell for WuPay internal tools."
      />
      <p className="text-sm text-zinc-600">
        Signed in as{" "}
        <span className="font-medium text-zinc-900">{user.name}</span> (
        {user.email}) with the role{" "}
        <span className="font-medium text-zinc-900">{user.role}</span>.
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        See <code className="rounded bg-zinc-100 px-1 py-0.5">CONVENTIONS.md</code>{" "}
        to add a tool.
      </p>
    </>
  );
}
