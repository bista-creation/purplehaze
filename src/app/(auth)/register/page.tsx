import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create your Purple Haze account.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/account");
  return <RegisterForm next={next} />;
}
