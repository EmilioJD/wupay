import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canCreate, canToggle } from "@/lib/flags/rules";
import { listFlags } from "@/lib/flags/queries";
import { getCurrentUser } from "@/lib/identity";

import { CreateFlagForm } from "./create-flag-form";
import { FlagToggle } from "./flag-toggle";

export default async function FlagsPage() {
  const [user, flags] = await Promise.all([getCurrentUser(), listFlags()]);

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Turn features on and off and control how widely they roll out."
      />

      {canCreate(user.role) ? (
        <CreateFlagForm />
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Your role ({user.role}) can view flags but not create them.
        </p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Rollout</TableHead>
              <TableHead>Last changed by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No feature flags yet.
                </TableCell>
              </TableRow>
            ) : (
              flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <Link
                      href={`/flags/${flag.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {flag.key}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {flag.description}
                  </TableCell>
                  <TableCell>
                    {canToggle(user.role) ? (
                      <FlagToggle flagId={flag.id} enabled={flag.enabled} />
                    ) : (
                      <Badge variant={flag.enabled ? "default" : "outline"}>
                        {flag.enabled ? "On" : "Off"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{flag.rolloutPercentage}%</TableCell>
                  <TableCell>{flag.updatedBy}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
