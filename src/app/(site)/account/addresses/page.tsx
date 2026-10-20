import type { Metadata } from "next";
import { AddressManager } from "@/components/account/address-manager";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";

export const metadata: Metadata = { title: "Addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AddressManager
      addresses={addresses.map((address) => ({
        id: address.id,
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault,
      }))}
      defaultName={user.name ?? ""}
      defaultPhone={user.phone ?? ""}
    />
  );
}
