"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction, updateProfileAction } from "@/actions/account";
import { useUploadThing } from "@/lib/uploadthing";
import { clearPageCache } from "@/lib/clear-page-cache";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "@/lib/validations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/utils";

export function SettingsForm({
  user,
  uploadEnabled,
}: {
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    emailVerified: Date | null;
  };
  uploadEnabled: boolean;
}) {
  return (
    <div className="space-y-6">
      <ProfileForm user={user} uploadEnabled={uploadEnabled} />
      <PasswordForm />
    </div>
  );
}

function ProfileForm({
  user,
  uploadEnabled,
}: {
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    emailVerified: Date | null;
  };
  uploadEnabled: boolean;
}) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? "",
      phone: user.phone ?? "",
      image: user.image ?? "",
    },
  });
  const image = useWatch({ control: form.control, name: "image" });
  const { startUpload } = useUploadThing("profileImage", {
    onClientUploadComplete: (files) => {
      const url = files[0]?.ufsUrl;
      setUploading(false);
      if (url) {
        form.setValue("image", url, {
          shouldValidate: true,
          shouldDirty: true,
        });
        toast.success("Photo uploaded. Save your profile to keep it.");
      }
    },
    onUploadError: (error) => {
      setUploading(false);
      toast.error(error.message || "The photo could not be uploaded.");
    },
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Please choose an image under 4 MB.");
      return;
    }
    setUploading(true);
    await startUpload([file]);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            Your profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is the name and number our team sees with your orders and
            bookings.
          </p>
        </div>
        <Badge
          variant={user.emailVerified ? "green" : "gold"}
          className="self-start"
        >
          <ShieldCheck className="size-3" />
          {user.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      </div>

      <form
        className="mt-6 space-y-5"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await updateProfileAction(values);
            if (result.success) {
              toast.success(result.message);
              await updateSession({
                name: values.name,
                image: values.image ?? "",
              });
              router.refresh();
            } else {
              toast.error(result.message);
            }
          });
        })}
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 rounded-full bg-[conic-gradient(from_140deg,#f5b942,#7c3aed,#5b21b6,#f5b942)] p-[2px]">
            <Avatar className="size-16 border-2 border-card sm:size-20">
              {image ? (
                <AvatarImage
                  src={image}
                  alt={user.name ?? "Profile"}
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-xl font-semibold text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {uploadEnabled ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => void onFile(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1 sm:flex-none"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  {uploading ? "Uploading…" : "Change photo"}
                </Button>
              </>
            ) : null}
            {image ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 flex-1 sm:flex-none"
                onClick={() =>
                  form.setValue("image", "", { shouldDirty: true })
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full name"
            htmlFor="profile-name"
            error={form.formState.errors.name?.message}
            required
          >
            <div className="relative">
              <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-name"
                autoComplete="name"
                className="pl-10"
                {...form.register("name")}
              />
            </div>
          </FormField>
          <FormField
            label="Phone"
            htmlFor="profile-phone"
            error={form.formState.errors.phone?.message}
            required
          >
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              placeholder="98XXXXXXXX"
              {...form.register("phone")}
            />
          </FormField>
        </div>

        <FormField
          label="Email address"
          htmlFor="profile-email"
          hint="Email changes are not available yet. Contact the restaurant if you need help."
        >
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="profile-email"
              value={user.email}
              disabled
              className="pl-10"
            />
          </div>
        </FormField>

        {!uploadEnabled ? (
          <FormField
            label="Profile photo URL"
            htmlFor="profile-image"
            error={form.formState.errors.image?.message}
            hint="Photo uploads are unavailable in this environment. Paste a direct image URL instead."
          >
            <div className="relative">
              <ImagePlus className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-image"
                type="url"
                placeholder="https://…"
                className="pl-10"
                {...form.register("image")}
              />
            </div>
          </FormField>
        ) : (
          <input type="hidden" {...form.register("image")} />
        )}

        <Button
          type="submit"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={pending || uploading}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save profile
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold sm:text-2xl">
        <LockKeyhole className="size-5 text-primary" /> Password
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use at least 8 characters with a letter and a number. Changing your
        password signs you out everywhere.
      </p>

      {result ? (
        <Alert
          variant={result.success ? "default" : "destructive"}
          className={result.success ? "mt-5 border-emerald-300" : "mt-5"}
        >
          {result.success ? <CheckCircle2 className="size-4" /> : null}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          setResult(null);
          startTransition(async () => {
            const actionResult = await changePasswordAction(values);
            setResult(actionResult);
            if (!actionResult.success) return;
            form.reset();
            toast.success("Password changed. Signing you out…");
            await clearPageCache();
            await signOut({ callbackUrl: "/login?passwordChanged=1" });
          });
        })}
      >
        <FormField
          label="Current password"
          htmlFor="current-password"
          error={form.formState.errors.currentPassword?.message}
          required
        >
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="New password"
            htmlFor="new-password"
            error={form.formState.errors.newPassword?.message}
            required
          >
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
          </FormField>
          <FormField
            label="Confirm new password"
            htmlFor="confirm-password"
            error={form.formState.errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
            />
          </FormField>
        </div>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full sm:h-10 sm:w-auto"
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </section>
  );
}
