"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
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

export type RiderRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  phone: string | null;
  isBlocked: boolean;
  vehicleType: string;
  licenseStatus: string;
  licenseVerifiedAt: string | null;
  licenseExpiresAt: string | null;
  shiftStatus: string;
  mustChangePassword: boolean;
  lastActiveAt: string | null;
  activeDeliveriesCount: number;
  createdAt: string;
};

export function RiderAdmin({
  riders: initialRiders,
}: {
  riders: RiderRow[];
}) {
  const router = useRouter();
  const [riders, setRiders] = useState<RiderRow[]>(initialRiders);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderRow | null>(null);
  const [decryptedPii, setDecryptedPii] = useState<{
    plateNumber?: string | null;
    licenseNumber?: string | null;
  } | null>(null);
  const [expiryInput, setExpiryInput] = useState("");
  const [loadingPii, setLoadingPii] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for creating a rider
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "MOTORCYCLE",
    plateNumber: "",
    licenseNumber: "",
    licenseExpiresAt: "",
    temporaryPassword: "",
  });

  // Reset password modal state
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetRider, setResetRider] = useState<RiderRow | null>(null);
  const [customResetPassword, setCustomResetPassword] = useState("");
  const [resetResult, setResetResult] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenResetPassword = (rider: RiderRow) => {
    setResetRider(rider);
    setCustomResetPassword("");
    setResetResult(null);
    setCopied(false);
    setResetPwOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetRider) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/riders/${resetRider.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temporaryPassword: customResetPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Rider password has been reset!");
        setResetResult({
          email: data.data.email,
          temporaryPassword: data.data.temporaryPassword,
        });
        router.refresh();
      } else {
        toast.error(data.error?.message || "Failed to reset password");
      }
    } catch {
      toast.error("Network error resetting password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVerify = async (rider: RiderRow) => {
    setSelectedRider(rider);
    setExpiryInput(
      rider.licenseExpiresAt
        ? new Date(rider.licenseExpiresAt).toISOString().split("T")[0]
        : ""
    );
    setVerifyOpen(true);
    setLoadingPii(true);
    try {
      const res = await fetch(`/api/v1/admin/riders/${rider.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDecryptedPii({
          plateNumber: data.data.plateNumber,
          licenseNumber: data.data.licenseNumber,
        });
      } else {
        toast.error("Failed to load rider details: " + (data.error?.message || "Unknown error"));
      }
    } catch {
      toast.error("Network error loading rider details");
    } finally {
      setLoadingPii(false);
    }
  };

  const handleVerifySubmit = async (status: "VERIFIED" | "REJECTED") => {
    if (!selectedRider) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/riders/${selectedRider.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          expiresAt: expiryInput ? new Date(expiryInput).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`License marked as ${status.toLowerCase()}`);
        setVerifyOpen(false);
        router.refresh();
        setRiders((prev) =>
          prev.map((r) =>
            r.id === selectedRider.id
              ? {
                  ...r,
                  licenseStatus: status,
                  licenseExpiresAt: expiryInput ? new Date(expiryInput).toISOString() : r.licenseExpiresAt,
                }
              : r
          )
        );
      } else {
        toast.error(data.error?.message || "Action failed");
      }
    } catch {
      toast.error("Network error processing verification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlock = async (rider: RiderRow) => {
    const action = rider.isBlocked ? "unblock" : "block";
    if (
      !confirm(
        `Are you sure you want to ${action} ${rider.name || rider.email}? Blocking will instantly terminate active sessions.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/riders/${rider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !rider.isBlocked }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Rider ${action}ed successfully`);
        setRiders((prev) =>
          prev.map((r) =>
            r.id === rider.id ? { ...r, isBlocked: !rider.isBlocked } : r
          )
        );
        router.refresh();
      } else {
        toast.error(data.error?.message || "Failed to update rider status");
      }
    } catch {
      toast.error("Network error updating rider status");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        vehicleType: createForm.vehicleType,
        plateNumber: createForm.plateNumber || undefined,
        licenseNumber: createForm.licenseNumber || undefined,
        licenseExpiresAt: createForm.licenseExpiresAt
          ? new Date(createForm.licenseExpiresAt).toISOString()
          : undefined,
        temporaryPassword: createForm.temporaryPassword || undefined,
      };

      const res = await fetch("/api/v1/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedCredentials({
          email: data.data.email,
          temporaryPassword: data.data.temporaryPassword,
        });
        toast.success("Rider account created!");
        router.refresh();
        // Refresh local list
        const refreshed = await fetch("/api/v1/admin/riders");
        const refData = await refreshed.json();
        if (refData.success) {
          setRiders(refData.data);
        }
      } else {
        toast.error(data.error?.message || "Failed to create rider");
      }
    } catch {
      toast.error("Network error creating rider");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Manage Purple Haze delivery fleet. Add rider profiles, verify driver licenses, and monitor on-duty availability.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setCreatedCredentials(null);
            setCreateForm({
              name: "",
              email: "",
              phone: "",
              vehicleType: "MOTORCYCLE",
              plateNumber: "",
              licenseNumber: "",
              licenseExpiresAt: "",
              temporaryPassword: "",
            });
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" /> Add rider
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Duty Status</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Active Deliveries</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {riders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No riders enrolled yet. Click &ldquo;Add rider&rdquo; to provision an account.
                  </td>
                </tr>
              ) : (
                riders.map((r) => {
                  const isLicenseVerified = r.licenseStatus === "VERIFIED";
                  const isLicenseExpired =
                    r.licenseExpiresAt && new Date(r.licenseExpiresAt) < new Date();

                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.name || "Unnamed"}</div>
                        <div className="text-[11px] text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{r.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Bike className="size-3.5" />
                          {r.vehicleType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.shiftStatus === "ON_DUTY" ? (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                            On duty
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Off duty
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isLicenseVerified && !isLicenseExpired && (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                              Verified
                            </Badge>
                          )}
                          {isLicenseExpired && (
                            <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                              Expired
                            </Badge>
                          )}
                          {!isLicenseVerified && !isLicenseExpired && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                              {r.licenseStatus}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenVerify(r)}
                            title="Review license & plate details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold">{r.activeDeliveriesCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.isBlocked ? (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-400">
                            Blocked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => handleOpenResetPassword(r)}
                            title="Reset rider temporary password"
                          >
                            <KeyRound className="mr-1 size-3.5" /> Reset PW
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 px-2 text-xs ${
                              r.isBlocked
                                ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                            }`}
                            onClick={() => handleToggleBlock(r)}
                          >
                            {r.isBlocked ? (
                              <>
                                <UserCheck className="mr-1 size-3.5" /> Unblock
                              </>
                            ) : (
                              <>
                                <UserX className="mr-1 size-3.5" /> Block
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rider Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Delivery Rider</DialogTitle>
            <DialogDescription>
              Create an administrative rider account. A temporary password will be generated for their first login.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                <p className="mb-2 font-medium">Rider Account Provisioned!</p>
                <p className="text-xs text-muted-foreground">
                  Provide these credentials to the rider. They will be prompted to set a permanent password upon first login.
                </p>
                <div className="mt-3 space-y-1.5 font-mono text-xs text-foreground">
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {createdCredentials.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temporary Password: </span>
                    <span className="font-bold text-emerald-400">
                      {createdCredentials.temporaryPassword}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() =>
                    copyToClipboard(
                      `Purple Haze Rider Account Credentials:\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.temporaryPassword}`
                    )
                  }
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" /> Copy Credentials
                    </>
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreatedCredentials(null);
                    setCreateOpen(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2">
              <FormField label="Full Name" required>
                <Input
                  required
                  placeholder="e.g. Ramesh Thapa"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Email" required>
                  <Input
                    type="email"
                    required
                    placeholder="rider@purplehaze.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="Phone" required>
                  <Input
                    required
                    placeholder="98XXXXXXXX"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Vehicle Type">
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    value={createForm.vehicleType}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, vehicleType: e.target.value }))
                    }
                  >
                    <option value="MOTORCYCLE">Motorcycle</option>
                    <option value="SCOOTER">Scooter</option>
                    <option value="BICYCLE">Bicycle</option>
                  </select>
                </FormField>
                <FormField label="Plate Number">
                  <Input
                    placeholder="Ko 1 Pa 1234"
                    value={createForm.plateNumber}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, plateNumber: e.target.value }))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Driver License No.">
                  <Input
                    placeholder="01-06-XXXXXXXX"
                    value={createForm.licenseNumber}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, licenseNumber: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="License Expiry">
                  <Input
                    type="date"
                    value={createForm.licenseExpiresAt}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, licenseExpiresAt: e.target.value }))
                    }
                  />
                </FormField>
              </div>

              <FormField
                label="Initial Temporary Password"
                hint="Optional: leave blank to auto-generate (e.g. Rider@123456)"
              >
                <Input
                  type="text"
                  placeholder="e.g. Rider@2026! or leave blank"
                  value={createForm.temporaryPassword}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, temporaryPassword: e.target.value }))
                  }
                />
              </FormField>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    "Create Rider"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify License Dialog */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Driver Document Verification</DialogTitle>
            <DialogDescription>
              Review decrypted vehicle and license documents. Decryption events are recorded in the append-only audit log.
            </DialogDescription>
          </DialogHeader>

          {loadingPii ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> Decrypting records...
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Rider Name: </span>
                  <span className="font-semibold">{selectedRider?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plate Number: </span>
                  <span className="font-mono font-medium">
                    {decryptedPii?.plateNumber || "Not recorded"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">License Number: </span>
                  <span className="font-mono font-medium">
                    {decryptedPii?.licenseNumber || "Not recorded"}
                  </span>
                </div>
              </div>

              <FormField label="License Expiration Date">
                <Input
                  type="date"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                />
              </FormField>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={submitting}
                  onClick={() => handleVerifySubmit("REJECTED")}
                >
                  <XCircle className="mr-1.5 size-4" /> Reject License
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={submitting}
                  onClick={() => handleVerifySubmit("VERIFIED")}
                >
                  <CheckCircle2 className="mr-1.5 size-4" /> Approve & Verify
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Rider Password</DialogTitle>
            <DialogDescription>
              Generate or assign a new temporary password for this rider. Active mobile sessions will be revoked instantly, and the rider must set a new password on their next login.
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                <p className="mb-2 font-medium">Password Reset Successfully! 🔒</p>
                <p className="text-xs text-muted-foreground">
                  Provide this new temporary password to the rider. Their previous sessions have been revoked.
                </p>
                <div className="mt-3 space-y-1.5 font-mono text-xs text-foreground">
                  <div>
                    <span className="text-muted-foreground">Rider: </span>
                    {resetRider?.name || "Rider"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {resetResult.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">New Temporary Password: </span>
                    <span className="font-bold text-emerald-400">
                      {resetResult.temporaryPassword}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() =>
                    copyToClipboard(
                      `Purple Haze Rider Account Reset:\nEmail: ${resetResult.email}\nTemporary Password: ${resetResult.temporaryPassword}`
                    )
                  }
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" /> Copy Credentials
                    </>
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setResetResult(null);
                    setResetPwOpen(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Rider: </span>
                  <span className="font-semibold">{resetRider?.name || "Rider"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-mono">{resetRider?.email}</span>
                </div>
              </div>

              <FormField
                label="New Temporary Password"
                hint="Leave blank to auto-generate a secure random temporary password (e.g. Rider@123456)"
              >
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. Rider@2026! or leave blank"
                    value={customResetPassword}
                    onChange={(e) => setCustomResetPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() =>
                      setCustomResetPassword(
                        `Rider@${Math.floor(100000 + Math.random() * 900000)}`
                      )
                    }
                  >
                    Generate
                  </Button>
                </div>
              </FormField>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPwOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" /> Resetting...
                    </>
                  ) : (
                    "Confirm Reset"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
