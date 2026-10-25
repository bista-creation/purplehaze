"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  adminDeleteCVAction,
  adminDeleteVacancyAction,
  adminSaveVacancyAction,
  adminToggleVacancyAction,
  adminUpdateCVStatusAction,
} from "@/actions/career";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import type { CareerVacancy, ReceivedCV } from "@/lib/careers-store";

const DEPARTMENTS = [
  "Kitchen & Culinary",
  "Beverage & Bar",
  "Front of House",
  "Kitchen Operations",
  "Operations & Management",
  "Banquet & Events",
] as const;

export function CareerAdmin({
  vacancies,
  initialCVs,
  defaultTab = "vacancies",
}: {
  vacancies: CareerVacancy[];
  initialCVs: ReceivedCV[];
  defaultTab?: "vacancies" | "cvs";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vacancies" | "cvs">(defaultTab);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [deletedVacancyIds, setDeletedVacancyIds] = useState<string[]>([]);
  const [deletedCVIds, setDeletedCVIds] = useState<string[]>([]);
  const [vacancyStatusOverrides, setVacancyStatusOverrides] = useState<Record<string, "ACTIVE" | "CLOSED">>({});
  const [cvStatusOverrides, setCvStatusOverrides] = useState<Record<string, ReceivedCV["status"]>>({});

  const vacancyList = vacancies
    .filter((v) => !deletedVacancyIds.includes(v.id))
    .map((v) => (vacancyStatusOverrides[v.id] ? { ...v, status: vacancyStatusOverrides[v.id] } : v));

  const cvList = initialCVs
    .filter((c) => !deletedCVIds.includes(c.id))
    .map((c) => (cvStatusOverrides[c.id] ? { ...c, status: cvStatusOverrides[c.id] } : c));

  // Vacancy Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [experience, setExperience] = useState("1 – 2 Years Experience");
  const [salary, setSalary] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "CLOSED">("ACTIVE");

  // Picture upload state
  const [uploadingPic, setUploadingPic] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // CV Search & Filter
  const [cvQuery, setCvQuery] = useState("");
  const [cvStatusFilter, setCvStatusFilter] = useState<string>("ALL");

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDepartment(DEPARTMENTS[0]);
    setExperience("1 – 2 Years Experience");
    setSalary("");
    setDescription("");
    setSkills("");
    setImageUrl("");
    setStatus("ACTIVE");
    setIsFormOpen(false);
  };

  const startEditVacancy = (v: CareerVacancy) => {
    setEditingId(v.id);
    setTitle(v.title);
    setDepartment(v.department);
    setExperience(v.experience);
    setSalary(v.salary || "");
    setDescription(v.description);
    setSkills(v.skills.join(", "));
    setImageUrl(v.image || "");
    setStatus(v.status === "ACTIVE" ? "ACTIVE" : "CLOSED");
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePictureUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image size must be smaller than 5 MB." });
      return;
    }
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/career/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
      setFeedback({ type: "success", message: "Vacancy picture uploaded successfully." });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to upload picture.",
      });
    } finally {
      setUploadingPic(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSaveVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await adminSaveVacancyAction({
        id: editingId || undefined,
        title,
        department,
        type: "Full-time",
        experience,
        salary,
        description,
        skills,
        image: imageUrl,
        status,
        location: "Airport Road, Biratnagar",
      });

      if (!res.success) {
        setFeedback({ type: "error", message: res.message });
        return;
      }

      setFeedback({ type: "success", message: res.message });
      resetForm();
    });
  };

  const handleToggleStatus = (id: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await adminToggleVacancyAction(id);
      if (res.success) {
        setVacancyStatusOverrides((prev) => {
          const current = prev[id] ?? vacancies.find((v) => v.id === id)?.status ?? "ACTIVE";
          return { ...prev, [id]: current === "ACTIVE" ? "CLOSED" : "ACTIVE" };
        });
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  };

  const handleDeleteVacancy = (id: string, vacancyTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete the vacancy "${vacancyTitle}"?`)) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await adminDeleteVacancyAction(id);
      if (res.success) {
        setDeletedVacancyIds((prev) => [...prev, id]);
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  };

  const handleUpdateCVStatus = (id: string, nextStatus: ReceivedCV["status"]) => {
    startTransition(async () => {
      const res = await adminUpdateCVStatusAction(id, nextStatus);
      if (res.success) {
        setCvStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      }
    });
  };

  const handleDeleteCV = (id: string, name: string) => {
    if (!window.confirm(`Remove application from ${name}?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await adminDeleteCVAction(id);
      if (res.success) {
        setDeletedCVIds((prev) => [...prev, id]);
        setFeedback({ type: "success", message: res.message });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    });
  };

  // Filtered CVs
  const filteredCVs = cvList.filter((cv) => {
    const matchesStatus = cvStatusFilter === "ALL" || cv.status === cvStatusFilter;
    const q = cvQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      cv.name.toLowerCase().includes(q) ||
      cv.position.toLowerCase().includes(q) ||
      cv.email.toLowerCase().includes(q) ||
      cv.phone.includes(q);
    return matchesStatus && matchesQuery;
  });

  const activeVacancyCount = vacancyList.filter((v) => v.status === "ACTIVE").length;
  const newCVCount = cvList.filter((c) => c.status === "NEW").length;

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback ? (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex rounded-xl bg-secondary/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("vacancies")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "vacancies"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="size-4" />
            <span>Announce Vacancy</span>
            <Badge variant="outline" className="ml-1 text-[11px] px-1.5 py-0">
              {activeVacancyCount} Active
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cvs")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "cvs"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-4" />
            <span>Received CVs</span>
            {newCVCount > 0 ? (
              <Badge variant="red" className="ml-1 text-[11px] px-1.5 py-0">
                {newCVCount} New
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0">
                {initialCVs.length}
              </Badge>
            )}
          </button>
        </div>

        {activeTab === "vacancies" ? (
          <Button
            onClick={() => {
              if (isFormOpen && !editingId) {
                resetForm();
              } else {
                resetForm();
                setIsFormOpen(true);
              }
            }}
            className="gap-2 rounded-xl"
          >
            {isFormOpen && !editingId ? (
              <>
                <X className="size-4" /> Close Form
              </>
            ) : (
              <>
                <Plus className="size-4" /> Announce New Vacancy
              </>
            )}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/career" target="_blank">
              <Eye className="size-4" /> View Public Career Page
            </Link>
          </Button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: ANNOUNCE VACANCIES
          ========================================================================= */}
      {activeTab === "vacancies" && (
        <div className="space-y-6">
          {/* Create / Edit Vacancy Card */}
          {isFormOpen && (
            <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {editingId ? "Edit Job Vacancy" : "Announce New Job Vacancy"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    This will immediately publish or update the vacancy on the public website.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="size-4" />
                </Button>
              </div>

              <form onSubmit={handleSaveVacancy} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Job Title <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Sous Chef (Continental & Tandoor)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Experience Requirement
                    </label>
                    <Input
                      placeholder="e.g. 2+ Years Experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Salary / Compensation Note
                    </label>
                    <Input
                      placeholder="e.g. Rs 25,000 – 35,000 + Tips"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold">
                      Vacancy Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "ACTIVE" | "CLOSED")}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="ACTIVE">ACTIVE (Accepting Applications)</option>
                      <option value="CLOSED">CLOSED (Archived / Filled)</option>
                    </select>
                  </div>
                </div>

                {/* Picture Upload Field */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">
                    Vacancy Banner / Role Picture
                  </label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePictureUpload(file);
                    }}
                  />

                  {imageUrl ? (
                    <div className="flex items-center gap-4 rounded-xl border border-border p-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={imageUrl}
                          alt="Vacancy Preview"
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {imageUrl}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Banner image ready for display
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border p-5 text-center transition hover:border-primary/50 hover:bg-muted/30"
                    >
                      {uploadingPic ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span className="text-xs font-medium">Uploading photo...</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground">
                            Upload a photo for this role (PNG, JPG, WebP)
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold">
                    Detailed Job Description <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    required
                    rows={3}
                    placeholder="Describe daily responsibilities, station duties, and expectations..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold">
                    Key Skills / Requirements (Comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. Continental Cuisine, Food Hygiene, Team Leadership, Recipe Consistency"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Separate skills or qualifications with commas.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={pending || uploadingPic} className="gap-2">
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" /> {editingId ? "Update Vacancy" : "Announce Vacancy"}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Vacancy Listings Table / Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                All Posted Vacancies ({vacancyList.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                All roles strictly full-time • Managed in Biratnagar
              </span>
            </div>

            {vacancyList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <Briefcase className="mx-auto size-10 text-muted-foreground/60" />
                <h4 className="font-display mt-3 text-base font-semibold">No vacancies posted yet</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click &quot;Announce New Vacancy&quot; above to post the first job opening.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {vacancyList.map((vacancy) => (
                  <div
                    key={vacancy.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-4">
                      {vacancy.image ? (
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={vacancy.image}
                            alt={vacancy.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                          <Briefcase className="size-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base font-semibold text-foreground">
                            {vacancy.title}
                          </h4>
                          <Badge
                            variant={vacancy.status === "ACTIVE" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {vacancy.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            • {vacancy.department}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          <span>{vacancy.experience}</span>
                          {vacancy.salary ? <span>• {vacancy.salary}</span> : null}
                          <span>• Full-time</span>
                          <span>• {vacancy.location}</span>
                        </div>

                        <p className="mt-1.5 line-clamp-1 max-w-xl text-xs text-muted-foreground">
                          {vacancy.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(vacancy.id)}
                        disabled={pending}
                        className="text-xs"
                      >
                        {vacancy.status === "ACTIVE" ? "Mark Closed" : "Reopen"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditVacancy(vacancy)}
                        className="text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVacancy(vacancy.id, vacancy.title)}
                        disabled={pending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: RECEIVED CVS
          ========================================================================= */}
      {activeTab === "cvs" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name, position, email or phone..."
                value={cvQuery}
                onChange={(e) => setCvQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold shrink-0">Status:</label>
              <select
                value={cvStatusFilter}
                onChange={(e) => setCvStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none"
              >
                <option value="ALL">All ({cvList.length})</option>
                <option value="NEW">New ({newCVCount})</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* CVs List */}
          {filteredCVs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <FileText className="mx-auto size-10 text-muted-foreground/60" />
              <h4 className="font-display mt-3 text-base font-semibold">No applications found</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {cvQuery || cvStatusFilter !== "ALL"
                  ? "Try adjusting your search query or status filter."
                  : "Candidates who apply on the public Career page will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCVs.map((cv) => (
                <div
                  key={cv.id}
                  className={`rounded-2xl border bg-card p-5 shadow-xs transition ${
                    cv.status === "NEW"
                      ? "border-primary/40 bg-primary/[0.02]"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h4 className="font-display text-lg font-semibold text-foreground">
                          {cv.name}
                        </h4>
                        <Badge
                          variant={
                            cv.status === "NEW"
                              ? "default"
                              : cv.status === "SHORTLISTED"
                              ? "gold"
                              : cv.status === "REVIEWED"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {cv.status}
                        </Badge>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {cv.position}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Phone className="size-3.5 text-primary" /> {cv.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="size-3.5" /> {cv.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" /> Experience: {cv.experience}
                        </span>
                        <span>• Full-time</span>
                        <span>• Applied: {formatDateTime(new Date(cv.createdAt))}</span>
                      </div>

                      {/* Candidate note */}
                      {cv.message ? (
                        <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-foreground/90">
                          <p className="font-semibold text-muted-foreground mb-0.5">
                            Applicant Introduction:
                          </p>
                          <p className="whitespace-pre-line">{cv.message}</p>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions Box */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 lg:flex-col lg:items-end">
                      {/* CV Download / View Button */}
                      {cv.resumeUrl ? (
                        <Button
                          asChild
                          size="sm"
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <a href={cv.resumeUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" /> View / Download CV
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No CV Attached
                        </Badge>
                      )}

                      {/* Quick Contact Buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                          <a
                            href={`https://wa.me/${cv.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `Hello ${cv.name}, thank you for applying to Purple Haze Restro & Garden in Biratnagar for the ${cv.position} role. We reviewed your CV and would like to connect with you.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="size-3.5 text-emerald-600" /> WhatsApp
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                          <a href={`tel:${cv.phone}`}>
                            <Phone className="size-3.5 text-primary" /> Call
                          </a>
                        </Button>
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <select
                          value={cv.status}
                          onChange={(e) =>
                            handleUpdateCVStatus(cv.id, e.target.value as ReceivedCV["status"])
                          }
                          className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                        >
                          <option value="NEW">Status: New</option>
                          <option value="REVIEWED">Status: Reviewed</option>
                          <option value="SHORTLISTED">Status: Shortlisted</option>
                          <option value="REJECTED">Status: Rejected</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCV(cv.id, cv.name)}
                          className="size-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete application"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
