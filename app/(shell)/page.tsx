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
      <p className="text-sm text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{user.name}</span> (
        {user.email}) with the role{" "}
        <span className="font-medium text-foreground">{user.role}</span>.
      </p>
    </>
  );
}
