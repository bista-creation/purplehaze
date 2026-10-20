"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteDeliveryZoneAction,
  saveDeliveryZoneAction,
} from "@/actions/admin/settings";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { formatNPR, paisaToRupees } from "@/lib/money";

export type ZoneRow = {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  sortOrder: number;
  isActive: boolean;
};

export function DeliveryZoneAdmin({ zones }: { zones: ZoneRow[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; zone?: ZoneRow }>({
    open: false,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted-foreground">
          {zones.filter((zone) => zone.isActive).length} active zone
          {zones.filter((zone) => zone.isActive).length === 1 ? "" : "s"}. Fees
          and minimum orders are in NPR.
        </p>
        <Button type="button" size="sm" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add zone
        </Button>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <MapPin className="mx-auto size-7 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">No delivery zones</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add at least one zone before enabling delivery checkout.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Zone</th>
                  <th className="px-4 py-2.5 font-semibold">Delivery fee</th>
                  <th className="px-4 py-2.5 font-semibold">Minimum order</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="px-4 py-3 font-medium">{zone.name}</td>
                    <td className="px-4 py-3">{formatNPR(zone.fee)}</td>
                    <td className="px-4 py-3">
                      {zone.minOrder ? formatNPR(zone.minOrder) : "None"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={zone.isActive ? "green" : "muted"}>
                        {zone.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${zone.name}`}
                          onClick={() => setDialog({ open: true, zone })}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <ConfirmActionButton
                          action={deleteDeliveryZoneAction.bind(null, zone.id)}
                          label=""
                          title={`Delete ${zone.name}?`}
                          description="Orders that used this zone keep their recorded fee. Remove the zone only when you no longer deliver there."
                          confirmLabel="Delete zone"
                          variant="ghost"
                          size="icon-sm"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialog.open ? (
        <ZoneDialog
          key={dialog.zone?.id ?? "new-zone"}
          zone={dialog.zone}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function ZoneDialog({ zone, onClose }: { zone?: ZoneRow; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(zone?.name ?? "");
  const [fee, setFee] = useState(zone ? paisaToRupees(zone.fee) : 0);
  const [minOrder, setMinOrder] = useState(
    zone ? paisaToRupees(zone.minOrder) : 0,
  );
  const [sortOrder, setSortOrder] = useState(zone?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{zone ? `Edit ${zone.name}` : "Add a delivery zone"}</DialogTitle>
          <DialogDescription>
            Customers choose their zone at checkout. The fee is added once and the
            minimum order is checked against the food subtotal.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveDeliveryZoneAction(
                { name, fee, minOrder, sortOrder, isActive },
                zone?.id,
              );
              if (result.success) {
                toast.success(result.message);
                router.refresh();
                onClose();
              } else {
                toast.error(result.message);
              }
            });
          }}
        >
          <FormField label="Zone name" htmlFor="zone-name" required>
            <Input
              id="zone-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Biratnagar city centre"
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Delivery fee (NPR)" htmlFor="zone-fee" required>
              <Input
                id="zone-fee"
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(event) => setFee(Number(event.target.value))}
                required
              />
            </FormField>
            <FormField label="Minimum order (NPR)" htmlFor="zone-min">
              <Input
                id="zone-min"
                type="number"
                min="0"
                step="0.01"
                value={minOrder}
                onChange={(event) => setMinOrder(Number(event.target.value))}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sort order" htmlFor="zone-sort">
              <Input
                id="zone-sort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
            </FormField>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active zone
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save zone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
