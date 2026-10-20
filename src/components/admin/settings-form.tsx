"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type SettingsField = {
  key: string;
  label: string;
  value: string;
  type?: "text" | "email" | "url" | "number" | "textarea" | "toggle";
  hint?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  fullWidth?: boolean;
};

export function SettingsForm({
  group,
  fields,
  saveLabel = "Save changes",
  children,
}: {
  group: "general" | "ordering" | "payments" | "content";
  fields: SettingsField[];
  saveLabel?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateSettingsAction(group, values);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => {
          if (field.type === "toggle") {
            return (
              <label
                key={field.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={values[field.key] === "true"}
                  onChange={(event) =>
                    update(field.key, event.target.checked ? "true" : "false")
                  }
                />
                <span>
                  <span className="block text-sm font-semibold">{field.label}</span>
                  {field.hint ? (
                    <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
                      {field.hint}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          }

          return (
            <div
              key={field.key}
              className={cn(
                "space-y-2",
                (field.fullWidth || field.type === "textarea") && "sm:col-span-2",
              )}
            >
              <Label htmlFor={`setting-${field.key}`}>
                {field.label}
                {field.required ? (
                  <span className="ml-0.5 text-destructive">*</span>
                ) : null}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`setting-${field.key}`}
                  value={values[field.key] ?? ""}
                  onChange={(event) => update(field.key, event.target.value)}
                  rows={field.key === "content.aboutBody" ? 7 : 3}
                  placeholder={field.placeholder}
                  maxLength={5000}
                  required={field.required}
                />
              ) : (
                <Input
                  id={`setting-${field.key}`}
                  type={field.type ?? "text"}
                  value={values[field.key] ?? ""}
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  required={field.required}
                />
              )}
              {field.hint ? (
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {field.hint}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {children}

      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-[11px] text-muted-foreground">
          Changes publish to the public website immediately. All times are Nepal time.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
