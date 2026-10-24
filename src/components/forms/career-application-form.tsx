"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileCheck2,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { submitCareerApplicationAction } from "@/actions/career";
import {
  careerApplicationSchema,
  type CareerApplicationInput,
} from "@/lib/validations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const DEFAULT_POSITIONS = [
  "Chef de Partie (Nepali / Indian / Continental)",
  "Tandoor Cook & Assistant",
  "Bartender & Mixologist",
  "Barista & Beverage Specialist",
  "F&B Service Captain / Senior Waiter",
  "Guest Service & Wait Staff",
  "Kitchen Steward & Hygiene Utility",
  "Restaurant Floor Supervisor",
  "Banquet & Event Operations Staff",
  "Other / General Application",
] as const;

export const EXPERIENCE_LEVELS = [
  "Fresher / Entry Level",
  "1 – 2 Years",
  "3 – 5 Years",
  "5+ Years Experience",
] as const;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CareerApplicationForm({
  selectedPosition = "",
  availablePositions,
}: {
  selectedPosition?: string;
  availablePositions?: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedResume, setUploadedResume] = useState<{
    url: string;
    fileName: string;
    size: number;
  } | null>(null);

  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const positions =
    availablePositions && availablePositions.length > 0
      ? [...availablePositions, "Other / General Application"]
      : DEFAULT_POSITIONS;

  const form = useForm<CareerApplicationInput>({
    resolver: zodResolver(careerApplicationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: selectedPosition || positions[0],
      experience: EXPERIENCE_LEVELS[1],
      shiftPreference: "Full-time",
      message: "",
      resumeUrl: "",
      resumeFileName: "",
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadError("");

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5 MB. Please select a smaller document.");
      return;
    }

    const validExtensions = [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError("Only PDF, Word (.docx/.doc), and image files are accepted.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/career/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document.");
      }

      setUploadedResume({
        url: data.url,
        fileName: data.fileName || file.name,
        size: data.size || file.size,
      });

      form.setValue("resumeUrl", data.url, { shouldValidate: true });
      form.setValue("resumeFileName", data.fileName || file.name);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveResume = () => {
    setUploadedResume(null);
    form.setValue("resumeUrl", "", { shouldValidate: true });
    form.setValue("resumeFileName", "");
    setUploadError("");
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-emerald-950 backdrop-blur-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100 sm:p-10">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold sm:text-3xl">
          Application Received!
        </h2>
        <p className="mt-3 max-w-xl text-base leading-7 opacity-90">
          {success}
        </p>
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-white/60 p-4 dark:border-emerald-900 dark:bg-black/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            What happens next?
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 opacity-80">
            <li>1. Our hiring manager reviews your CV and credentials.</li>
            <li>2. Shortlisted candidates are invited for an interview at Airport Road, Biratnagar.</li>
            <li>3. You will receive a call or WhatsApp message regarding next steps.</li>
          </ul>
        </div>
        <Button
          variant="outline"
          className="mt-8 border-emerald-300 dark:border-emerald-800"
          onClick={() => {
            setSuccess(null);
            handleRemoveResume();
            form.reset();
          }}
        >
          Submit another application
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        setServerError("");
        startTransition(async () => {
          const result = await submitCareerApplicationAction(values);
          if (!result.success) {
            setServerError(result.message);
            return;
          }
          setSuccess(result.message);
        });
      })}
      className="space-y-6"
      noValidate
    >
      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Full name"
          htmlFor="career-name"
          error={form.formState.errors.name?.message}
          required
        >
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="career-name"
              autoComplete="name"
              placeholder="e.g. Ramesh Sharma"
              className="pl-10"
              {...form.register("name")}
            />
          </div>
        </FormField>

        <FormField
          label="Phone number / WhatsApp"
          htmlFor="career-phone"
          error={form.formState.errors.phone?.message}
          required
        >
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="career-phone"
              type="tel"
              autoComplete="tel"
              placeholder="98XXXXXXXX"
              className="pl-10"
              {...form.register("phone")}
            />
          </div>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Email address"
          htmlFor="career-email"
          error={form.formState.errors.email?.message}
          required
        >
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="career-email"
              type="email"
              autoComplete="email"
              placeholder="ramesh@example.com"
              className="pl-10"
              {...form.register("email")}
            />
          </div>
        </FormField>

        <FormField
          label="Position applied for"
          htmlFor="career-position"
          error={form.formState.errors.position?.message}
          required
        >
          <div className="relative">
            <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="career-position"
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-4 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
              {...form.register("position")}
            >
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Hospitality experience"
          htmlFor="career-experience"
          error={form.formState.errors.experience?.message}
          required
        >
          <div className="relative">
            <Clock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              id="career-experience"
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card pl-10 pr-4 text-sm shadow-xs focus:border-ring focus:ring-[3px] focus:ring-ring/20 focus:outline-none"
              {...form.register("experience")}
            >
              {EXPERIENCE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <div className="flex flex-col justify-end">
          <div className="flex h-11 items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.04] px-4 text-xs font-medium text-foreground">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Employment: <strong className="text-primary font-semibold">Full-Time Only</strong> (Purple Haze hires dedicated full-time staff)
            </span>
          </div>
        </div>
      </div>

      {/* CV / Resume Upload Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Upload CV / Resume <span className="text-rose-500">*</span>
          </label>
          <span className="text-xs text-muted-foreground">PDF, DOCX, DOC, or Image (Max 5 MB)</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file);
          }}
        />

        {uploadedResume ? (
          <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileCheck2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {uploadedResume.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(uploadedResume.size)} • Ready for submission
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveResume}
              className="size-8 p-0 text-muted-foreground hover:text-destructive"
              title="Remove CV"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFileUpload(file);
            }}
            className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-7 text-center transition-all hover:border-primary/50 hover:bg-muted/40"
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Uploading document...
                </p>
                <p className="text-xs text-muted-foreground">
                  Please hold on while we verify your CV.
                </p>
              </div>
            ) : (
              <>
                <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary transition-transform group-hover:scale-105">
                  <UploadCloud className="size-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Click to select your CV, or drag and drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supported formats: PDF, DOCX, DOC, PNG, JPG (up to 5 MB)
                </p>
              </>
            )}
          </div>
        )}

        {form.formState.errors.resumeUrl && !uploadedResume ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.resumeUrl.message}
          </p>
        ) : null}

        {uploadError ? (
          <p className="text-xs font-medium text-destructive">{uploadError}</p>
        ) : null}
      </div>

      <FormField
        label="About yourself & why Purple Haze"
        htmlFor="career-message"
        error={form.formState.errors.message?.message}
        required
      >
        <Textarea
          id="career-message"
          rows={4}
          placeholder="Briefly tell us about your experience, past restaurants or hospitality background, skills, and why you would love to work at Purple Haze Restro & Garden in Biratnagar..."
          className="resize-none"
          {...form.register("message")}
        />
      </FormField>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full text-base sm:w-auto"
          disabled={pending || isUploading}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting Application...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Submit Job Application
            </>
          )}
        </Button>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          By submitting, you confirm you are available for full-time employment at Airport Road, Biratnagar. Your information is kept strictly confidential.
        </p>
      </div>
    </form>
  );
}
