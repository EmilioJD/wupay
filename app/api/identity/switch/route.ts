import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { IDENTITY_COOKIE, listSwitchableUsers } from "@/lib/identity";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");

  if (typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const known = (await listSwitchableUsers()).some(
    (user) => user.email === email,
  );
  if (!known) {
    return NextResponse.json({ error: "unknown user" }, { status: 400 });
  }

  (await cookies()).set(IDENTITY_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  const referer = request.headers.get("referer");
  return NextResponse.redirect(new URL(referer ?? "/", request.url), {
    status: 303,
  });
}
