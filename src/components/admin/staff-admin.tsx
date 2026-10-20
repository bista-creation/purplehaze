"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, KeyRound, Loader2, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { saveStaffAction } from "@/actions/admin/staff";
import { UserBlockButton } from "@/components/admin/customer-block-button";
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
import { formatDateTime } from "@/lib/utils";

export type StaffRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  isBlocked: boolean;
  emailVerified: string | null;
  createdAt: string;
};

export function StaffAdmin({
  staff,
  currentUserId,
}: {
  staff: StaffRow[];
  currentUserId: string;
}) {
  const [dialog, setDialog] = useState<{ open: boolean; member?: StaffRow }>({
    open: false,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Staff can manage orders, reservations, event enquiries, reviews and
          messages. Only admins can change the menu, settings, customers or staff.
        </p>
        <Button type="button" size="sm" onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" /> Add staff
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Team member</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary">
                        <UserRound className="size-4" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {member.name ?? "Unnamed"}
                          {member.id === currentUserId ? (
                            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                              You
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{member.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.role === "ADMIN" ? "gold" : "violet"}>
                      {member.role === "ADMIN" ? (
                        <ShieldCheck className="size-3" />
                      ) : null}
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {formatDateTime(member.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.isBlocked ? "red" : "green"}>
                      {member.isBlocked ? "Blocked" : "Active"}
                    </Badge>
                    {!member.emailVerified ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">Unverified</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${member.name ?? member.email}`}
                        onClick={() => setDialog({ open: true, member })}
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                      {member.id !== currentUserId ? (
                        <UserBlockButton
                          userId={member.id}
                          isBlocked={member.isBlocked}
                          noun="staff member"
                          compact
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialog.open ? (
        <StaffDialog
          key={dialog.member?.id ?? "new-staff"}
          member={dialog.member}
          onClose={() => setDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function StaffDialog({
  member,
  onClose,
}: {
  member?: StaffRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [role, setRole] = useState<"STAFF" | "ADMIN">(
    member?.role === "ADMIN" ? "ADMIN" : "STAFF",
  );
  const [password, setPassword] = useState("");

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    setPassword(
      Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""),
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? `Edit ${member.name ?? "staff"}` : "Add a team member"}</DialogTitle>
          <DialogDescription>
            Staff accounts are verified manually by an admin. Share the temporary
            password over a secure channel and ask the team member to change it.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveStaffAction(
                { name, email, phone, role, password },
                member?.id,
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="staff-name" required>
              <Input
                id="staff-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
              />
            </FormField>
            <FormField label="Role" htmlFor="staff-role" required>
              <select
                id="staff-role"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value as "STAFF" | "ADMIN")}
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </FormField>
          </div>
          <FormField label="Email address" htmlFor="staff-email" required>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Phone" htmlFor="staff-phone" required>
            <Input
              id="staff-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </FormField>
          <FormField
            label={member ? "New password (optional)" : "Temporary password"}
            htmlFor="staff-password"
            required={!member}
            hint={
              member
                ? "Leave blank to keep the current password. Setting one signs the member out everywhere."
                : "At least 8 characters. Generate a random one and share it securely."
            }
          >
            <div className="flex gap-2">
              <Input
                id="staff-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={member && !password ? undefined : 8}
                maxLength={72}
                required={!member}
                autoComplete="new-password"
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={generatePassword}>
                <KeyRound className="size-4" /> Generate
              </Button>
            </div>
          </FormField>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-5 text-muted-foreground">
            <strong className="text-foreground">Role permissions:</strong> staff handle
            live service; admins additionally manage catalogue, coupons, content,
            customers, settings, staff and reports. At least one active admin must
            remain.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
