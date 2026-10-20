"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
} from "@/actions/account";
import { addressSchema, type AddressInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EmptyState } from "@/components/ui/empty-state";

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export function AddressManager({
  addresses,
  defaultName,
  defaultPhone,
}: {
  addresses: SavedAddress[];
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyValues(defaultName, defaultPhone),
  });
  const isDefault = useWatch({ control: form.control, name: "isDefault" });

  function emptyValues(name: string, phone: string): AddressInput {
    return {
      label: "Home",
      fullName: name,
      phone,
      line1: "",
      line2: "",
      city: "Biratnagar",
      state: "Koshi",
      postalCode: "",
      country: "Nepal",
      isDefault: false,
    };
  }

  const openNew = () => {
    setEditing(null);
    form.reset(emptyValues(defaultName, defaultPhone));
    setOpen(true);
  };

  const openEdit = (address: SavedAddress) => {
    setEditing(address);
    form.reset({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode ?? "",
      country: address.country,
      isDefault: address.isDefault,
    });
    setOpen(true);
  };

  const remove = (address: SavedAddress) => {
    if (!window.confirm(`Remove the “${address.label}” address?`)) return;
    setPendingId(address.id);
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      setPendingId(null);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const makeDefault = (address: SavedAddress) => {
    setPendingId(address.id);
    startTransition(async () => {
      const result = await setDefaultAddressAction(address.id);
      setPendingId(null);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Checkout made easier</p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Saved addresses
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep your home, office and favourite delivery spots ready.
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="size-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={MapPin}
            title="No saved addresses yet"
            description="Add the places you order to most often. You can still enter an address at checkout without saving it."
          >
            <Button onClick={openNew} className="mt-6">
              <Plus className="size-4" /> Add an address
            </Button>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
                    <MapPin className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{address.label}</p>
                    {address.isDefault ? (
                      <Badge variant="gold" className="mt-0.5">
                        <Star className="size-3 fill-current" /> Default
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">
                  {address.fullName}
                </p>
                <p>{address.phone}</p>
                <p>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                  <br />
                  {address.country}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(address)}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                {!address.isDefault ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => makeDefault(address)}
                    disabled={pending && pendingId === address.id}
                  >
                    {pending && pendingId === address.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Set default
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => remove(address)}
                  disabled={pending && pendingId === address.id}
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit address" : "Add a delivery address"}
            </DialogTitle>
            <DialogDescription>
              This address can be reused at checkout. You can keep more than
              one.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => {
              startTransition(async () => {
                const result = await saveAddressAction({
                  ...values,
                  id: editing?.id,
                });
                if (result.success) {
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              });
            })}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Label"
                htmlFor="address-label"
                error={form.formState.errors.label?.message}
                required
              >
                <Input
                  id="address-label"
                  placeholder="Home, Office…"
                  {...form.register("label")}
                />
              </FormField>
              <FormField
                label="Full name"
                htmlFor="address-name"
                error={form.formState.errors.fullName?.message}
                required
              >
                <Input
                  id="address-name"
                  autoComplete="name"
                  {...form.register("fullName")}
                />
              </FormField>
            </div>
            <FormField
              label="Phone"
              htmlFor="address-phone"
              error={form.formState.errors.phone?.message}
              required
            >
              <Input
                id="address-phone"
                type="tel"
                autoComplete="tel"
                {...form.register("phone")}
              />
            </FormField>
            <FormField
              label="Street / landmark"
              htmlFor="address-line1"
              error={form.formState.errors.line1?.message}
              required
            >
              <Input
                id="address-line1"
                autoComplete="address-line1"
                {...form.register("line1")}
              />
            </FormField>
            <FormField
              label="Apartment, floor or extra directions"
              htmlFor="address-line2"
              error={form.formState.errors.line2?.message}
            >
              <Input
                id="address-line2"
                autoComplete="address-line2"
                {...form.register("line2")}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                label="City"
                htmlFor="address-city"
                error={form.formState.errors.city?.message}
                required
              >
                <Input
                  id="address-city"
                  autoComplete="address-level2"
                  {...form.register("city")}
                />
              </FormField>
              <FormField
                label="Province"
                htmlFor="address-state"
                error={form.formState.errors.state?.message}
                required
              >
                <Input
                  id="address-state"
                  autoComplete="address-level1"
                  {...form.register("state")}
                />
              </FormField>
              <FormField
                label="Postal code"
                htmlFor="address-postal"
                error={form.formState.errors.postalCode?.message}
              >
                <Input
                  id="address-postal"
                  autoComplete="postal-code"
                  {...form.register("postalCode")}
                />
              </FormField>
            </div>
            <FormField error={form.formState.errors.country?.message}>
              <input type="hidden" {...form.register("country")} />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) =>
                  form.setValue("isDefault", checked === true)
                }
              />
              Use this as my default delivery address
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? "Save changes" : "Add address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
