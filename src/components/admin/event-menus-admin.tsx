"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Edit,
  Eye,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteEventMenuAction,
  saveEventMenuAction,
  toggleEventMenuStatusAction,
} from "@/actions/event-menus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SmartImage } from "@/components/ui/smart-image";
import { formatNPR } from "@/lib/money";
import type { EventMenuCourse, EventMenuPackage } from "@/lib/event-menus-store";

const EVENT_TYPE_OPTIONS = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Garden Party",
  "Cocktail & BBQ",
  "Anniversary",
  "Buffet",
] as const;

export function EventMenusAdmin({
  packages,
}: {
  packages: EventMenuPackage[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [editingPackage, setEditingPackage] = useState<EventMenuPackage | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [previewPackage, setPreviewPackage] = useState<EventMenuPackage | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const filtered = packages.filter((pkg) => {
    const matchSearch =
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.tagline.toLowerCase().includes(search.toLowerCase()) ||
      pkg.eventType.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || pkg.eventType === typeFilter;
    return matchSearch && matchType;
  });

  const handleToggleStatus = (id: string, current: boolean) => {
    startTransition(async () => {
      const result = await toggleEventMenuStatusAction(id, !current);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete package "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteEventMenuAction(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event menus by name, type, dish..."
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium"
            aria-label="Filter by event type"
          >
            <option value="ALL">All Occasions</option>
            {EVENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/events/menu" target="_blank">
              <Eye className="size-3.5" /> View Public Page
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingPackage(null);
              setIsCreating(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Add Event Package
          </Button>
        </div>
      </div>

      {/* PACKAGES GRID */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          <UtensilsCrossed className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-3 font-semibold text-foreground">
            No event menu packages found
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adjust your search or click &quot;Add Event Package&quot; to create
            one.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => {
            const itemCount = pkg.courses.reduce(
              (sum, c) => sum + c.items.length,
              0,
            );
            return (
              <article
                key={pkg.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <SmartImage
                      src={pkg.image || "/images/venues/banquet-hall-setup.jpg"}
                      alt={pkg.name}
                      fill
                      sizes="350px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                      <Badge variant="violet" className="text-[10px]">
                        {pkg.eventType}
                      </Badge>
                      {pkg.isPopular ? (
                        <Badge variant="gold" className="text-[10px]">
                          Popular
                        </Badge>
                      ) : null}
                      {pkg.isVegetarian ? (
                        <Badge variant="green" className="text-[10px]">
                          100% Veg
                        </Badge>
                      ) : null}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider opacity-80">
                          Per Plate
                        </span>
                        <p className="font-display text-xl font-bold text-gold">
                          {formatNPR(pkg.pricePerPerson * 100)}
                        </p>
                      </div>
                      <Badge
                        variant={pkg.isActive ? "green" : "muted"}
                        className="text-[10px]"
                      >
                        {pkg.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-display text-base font-semibold group-hover:text-primary">
                      {pkg.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {pkg.tagline || pkg.description}
                    </p>

                    <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3 text-primary" /> Min.{" "}
                        {pkg.minGuests} guests
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3 text-primary" />{" "}
                        {pkg.courses.length} courses ({itemCount} dishes)
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {pkg.badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                      {pkg.badges.length > 3 ? (
                        <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{pkg.badges.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 p-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setPreviewPackage(pkg)}
                    >
                      <Eye className="size-3.5" /> Preview
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleToggleStatus(pkg.id, pkg.isActive)}
                      disabled={pending}
                    >
                      {pkg.isActive ? "Hide" : "Show"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsCreating(true);
                      }}
                    >
                      <Edit className="size-3.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                      onClick={() => handleDelete(pkg.id, pkg.name)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PACKAGE MODAL */}
      {isCreating ? (
        <PackageEditDialog
          pkg={editingPackage}
          onClose={() => {
            setIsCreating(false);
            setEditingPackage(null);
          }}
          onSaved={() => {
            setIsCreating(false);
            setEditingPackage(null);
            router.refresh();
          }}
        />
      ) : null}

      {/* PREVIEW MODAL */}
      {previewPackage ? (
        <PackagePreviewDialog
          pkg={previewPackage}
          onClose={() => setPreviewPackage(null)}
        />
      ) : null}
    </div>
  );
}

function PackageEditDialog({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: EventMenuPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(pkg?.name ?? "");
  const [eventType, setEventType] = useState(pkg?.eventType ?? "Wedding");
  const [tagline, setTagline] = useState(pkg?.tagline ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [pricePerPerson, setPricePerPerson] = useState(
    pkg?.pricePerPerson ?? 1500,
  );
  const [minGuests, setMinGuests] = useState(pkg?.minGuests ?? 25);
  const [image, setImage] = useState(
    pkg?.image ?? "/images/venues/banquet-hall-setup.jpg",
  );
  const [isPopular, setIsPopular] = useState(pkg?.isPopular ?? false);
  const [isVegetarian, setIsVegetarian] = useState(pkg?.isVegetarian ?? false);
  const [isActive, setIsActive] = useState(pkg?.isActive ?? true);
  const [badgesText, setBadgesText] = useState(
    (pkg?.badges ?? ["Full Buffet", "Live Counter"]).join(", "),
  );

  // Courses builder
  const [courses, setCourses] = useState<EventMenuCourse[]>(
    pkg?.courses ?? [
      {
        category: "Welcome Drinks",
        items: ["Fresh Mint Mojito", "Virgin Pina Colada"],
      },
      {
        category: "Appetizers & Starters",
        items: ["Chicken Sekuwa", "Paneer Tikka", "Veg Spring Rolls"],
      },
      {
        category: "Main Course",
        items: ["Butter Chicken", "Kadai Paneer", "Dal Makhani", "Jeera Rice"],
      },
      { category: "Desserts", items: ["Gulab Jamun", "Vanilla Ice Cream"] },
    ],
  );

  const addCourse = () => {
    setCourses([
      ...courses,
      { category: "New Course Section", items: ["Dish Item 1"] },
    ]);
  };

  const removeCourse = (idx: number) => {
    setCourses(courses.filter((_, i) => i !== idx));
  };

  const updateCourseCategory = (idx: number, category: string) => {
    const updated = [...courses];
    updated[idx] = { ...updated[idx], category };
    setCourses(updated);
  };

  const updateCourseItems = (idx: number, itemsStr: string) => {
    const updated = [...courses];
    updated[idx] = {
      ...updated[idx],
      items: itemsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setCourses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a package name.");
      return;
    }

    const badges = badgesText
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveEventMenuAction(
        {
          name,
          eventType,
          tagline,
          description,
          pricePerPerson: Number(pricePerPerson),
          minGuests: Number(minGuests),
          image,
          isPopular,
          isVegetarian,
          isActive,
          badges,
          courses,
        },
        pkg?.id,
      );

      if (result.success) {
        toast.success(result.message);
        onSaved();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold">
              {pkg ? `Edit Package: ${pkg.name}` : "Create New Event Package"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure dishes, pricing, guest thresholds and visual presentation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Package Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Garden Wedding Banquet"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Occasion / Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
              >
                {EVENT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Price Per Person (NPR) *
              </label>
              <Input
                type="number"
                min="100"
                step="50"
                value={pricePerPerson}
                onChange={(e) => setPricePerPerson(Number(e.target.value))}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Minimum Guests Required
              </label>
              <Input
                type="number"
                min="5"
                value={minGuests}
                onChange={(e) => setMinGuests(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Tagline (Short Highlight)
            </label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Multi-cuisine buffet with live tandoor and dessert bar."
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Full Description
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed summary of the package, ideal atmosphere, seating arrangements..."
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Image Path / URL
              </label>
              <Input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/images/venues/banquet-hall-setup.jpg"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Feature Badges (comma separated)
              </label>
              <Input
                value={badgesText}
                onChange={(e) => setBadgesText(e.target.value)}
                placeholder="Live Tandoor, Full Buffet, Unlimited Soft Drinks"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              Mark as Most Popular
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isVegetarian}
                onChange={(e) => setIsVegetarian(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              100% Pure Vegetarian
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              Public / Active on Website
            </label>
          </div>

          {/* DYNAMIC COURSES BUILDER */}
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Menu Courses &amp; Dishes
                </h3>
                <p className="text-xs text-muted-foreground">
                  Break down dishes by course category (Starters, Mains, Desserts, etc.).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCourse}
                className="gap-1 text-xs"
              >
                <Plus className="size-3.5" /> Add Course Section
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {courses.map((course, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/80 bg-background p-4 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={course.category}
                      onChange={(e) =>
                        updateCourseCategory(idx, e.target.value)
                      }
                      placeholder="Course Title (e.g. Live Grills & Starters)"
                      className="font-semibold text-xs h-9 max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCourse(idx)}
                      className="h-8 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>

                  <div className="mt-2.5">
                    <label className="text-[11px] text-muted-foreground">
                      Dishes in this course (comma separated)
                    </label>
                    <Textarea
                      rows={2}
                      value={course.items.join(", ")}
                      onChange={(e) => updateCourseItems(idx, e.target.value)}
                      placeholder="Chicken Sekuwa, Paneer Tikka, Crispy Corn..."
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pkg ? "Save Changes" : "Create Event Package"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PackagePreviewDialog({
  pkg,
  onClose,
}: {
  pkg: EventMenuPackage;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="violet">{pkg.eventType}</Badge>
              {pkg.isPopular ? <Badge variant="gold">Popular</Badge> : null}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold">{pkg.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{pkg.tagline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between rounded-xl bg-muted/40 p-3.5 text-xs">
          <div>
            <span className="text-muted-foreground">Price per person:</span>
            <span className="ml-1.5 font-bold text-primary text-sm">
              {formatNPR(pkg.pricePerPerson * 100)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Min. guests:</span>
            <span className="ml-1.5 font-semibold text-foreground">
              {pkg.minGuests} guests
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-sm">Included Courses &amp; Items:</h3>
          {pkg.courses.map((course, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/70 bg-background p-3.5"
            >
              <h4 className="font-semibold text-xs text-primary">
                {course.category}
              </h4>
              <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                {course.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="size-3 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onClose} variant="outline" size="sm">
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
}
