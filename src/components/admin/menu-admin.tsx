"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronDown,
  CircleOff,
  Edit3,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteAddOnAction,
  deleteCategoryAction,
  deleteDishAction,
  saveAddOnAction,
  saveCategoryAction,
  saveDishAction,
  setDishAvailabilityAction,
} from "@/actions/admin/catalogue";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  categoryAdminSchema,
  dishAdminSchema,
  type CategoryAdminInput,
  type DishAdminInput,
} from "@/lib/validations";
import { formatNPR, paisaToRupees } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ImageUploadMode } from "@/lib/upload-types";

export type MenuCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  dishCount: number;
};

export type MenuDishRow = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  details: string | null;
  price: number;
  comparePrice: number | null;
  image: string | null;
  isVeg: boolean;
  isSpicy: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  prepTime: number;
  calories: number | null;
  sortOrder: number;
  variants: Array<{ id: string; name: string; priceDelta: number; isDefault: boolean }>;
  addOnIds: string[];
};

export type MenuAddOnRow = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  dishCount: number;
};

export function MenuAdmin({
  categories,
  dishes,
  addOns,
  uploadMode,
  imageOptions,
}: {
  categories: MenuCategoryRow[];
  dishes: MenuDishRow[];
  addOns: MenuAddOnRow[];
  uploadMode: ImageUploadMode;
  imageOptions: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"dishes" | "categories" | "addons">("dishes");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [dishDialog, setDishDialog] = useState<{ open: boolean; dish?: MenuDishRow }>({
    open: false,
  });
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    category?: MenuCategoryRow;
  }>({ open: false });
  const [addOnDialog, setAddOnDialog] = useState<{
    open: boolean;
    addOn?: MenuAddOnRow;
  }>({ open: false });
  const [bulkPending, startBulk] = useTransition();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return dishes.filter((dish) => {
      if (categoryFilter !== "ALL" && dish.categoryId !== categoryFilter) return false;
      if (!needle) return true;
      return (
        dish.name.toLowerCase().includes(needle) ||
        dish.categoryName.toLowerCase().includes(needle) ||
        (dish.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [dishes, search, categoryFilter]);

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function bulkAvailability(isAvailable: boolean) {
    startBulk(async () => {
      const result = await setDishAvailabilityAction(selected, isAvailable);
      if (result.success) {
        toast.success(result.message);
        setSelected([]);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["dishes", `Dishes (${dishes.length})`, UtensilsCrossed],
            ["categories", `Categories (${categories.length})`, ChevronDown],
            ["addons", `Add-ons (${addOns.length})`, Sparkles],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
              tab === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "dishes" ? (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search dishes…"
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Filter by category"
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button type="button" onClick={() => setDishDialog({ open: true })}>
              <Plus className="size-4" /> Add dish
            </Button>
          </div>

          {selected.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
              <span className="font-semibold">{selected.length} selected</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => bulkAvailability(true)}
              >
                {bulkPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Mark available
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => bulkAvailability(false)}
              >
                <CircleOff className="size-3" /> Mark unavailable
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((dish) => selected.includes(dish.id))}
                        onCheckedChange={(checked) =>
                          setSelected(checked ? filtered.map((dish) => dish.id) : [])
                        }
                        aria-label="Select all visible dishes"
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold">Dish</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Price</th>
                    <th className="px-3 py-3 font-semibold">Flags</th>
                    <th className="px-3 py-3 font-semibold">Available</th>
                    <th className="px-3 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((dish) => (
                    <tr key={dish.id} className="hover:bg-muted/30">
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selected.includes(dish.id)}
                          onCheckedChange={() => toggleSelected(dish.id)}
                          aria-label={`Select ${dish.name}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{dish.name}</p>
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-[11px] text-muted-foreground">
                          {dish.description}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {dish.categoryName}
                      </td>
                      <td className="px-3 py-3 font-semibold">{formatNPR(dish.price)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {dish.isVeg ? <Badge variant="green">Veg</Badge> : null}
                          {dish.isSpicy ? <Badge variant="red">Spicy</Badge> : null}
                          {dish.isFeatured ? <Badge variant="gold">Featured</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <AvailabilityToggle
                          dishId={dish.id}
                          isAvailable={dish.isAvailable}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${dish.name}`}
                            onClick={() => setDishDialog({ open: true, dish })}
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          <ConfirmActionButton
                            action={deleteDishAction.bind(null, dish.id)}
                            label=""
                            title={`Delete ${dish.name}?`}
                            description="The dish disappears from the menu and favourites. Past order lines keep their snapshot. To hide it temporarily, mark it unavailable instead."
                            confirmLabel="Delete dish"
                            variant="ghost"
                            size="icon-sm"
                            icon
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No dishes match this search.
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "categories" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <Button type="button" onClick={() => setCategoryDialog({ open: true })}>
              <Plus className="size-4" /> Add category
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{category.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {category.dishCount} dish{category.dishCount === 1 ? "" : "es"} · order{" "}
                      {category.sortOrder}
                    </p>
                  </div>
                  <Badge variant={category.isActive ? "green" : "muted"}>
                    {category.isActive ? "Active" : "Hidden"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {category.description || "No description yet."}
                </p>
                <div className="mt-3 flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCategoryDialog({ open: true, category })}
                  >
                    <Edit3 className="size-3.5" /> Edit
                  </Button>
                  <ConfirmActionButton
                    action={deleteCategoryAction.bind(null, category.id)}
                    label="Delete"
                    title={`Delete ${category.name}?`}
                    description="Categories with dishes cannot be deleted. Move or delete the dishes first."
                    confirmLabel="Delete category"
                    variant="ghost"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "addons" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <Button type="button" onClick={() => setAddOnDialog({ open: true })}>
              <Plus className="size-4" /> Add add-on
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Add-on</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Used by</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {addOns.map((addOn) => (
                  <tr key={addOn.id}>
                    <td className="px-4 py-3 font-medium">{addOn.name}</td>
                    <td className="px-4 py-3">{formatNPR(addOn.price)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {addOn.dishCount} dish{addOn.dishCount === 1 ? "" : "es"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={addOn.isActive ? "green" : "muted"}>
                        {addOn.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${addOn.name}`}
                          onClick={() => setAddOnDialog({ open: true, addOn })}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <ConfirmActionButton
                          action={deleteAddOnAction.bind(null, addOn.id)}
                          label=""
                          title={`Delete ${addOn.name}?`}
                          description="The add-on is removed from every dish. Past order snapshots are unchanged."
                          confirmLabel="Delete add-on"
                          variant="ghost"
                          size="icon-sm"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {addOns.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No add-ons yet. Create extras like cheese, extra momo chutney or a fried egg.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {dishDialog.open ? (
        <DishDialog
          key={dishDialog.dish?.id ?? "new-dish"}
          dish={dishDialog.dish}
          categories={categories}
          addOns={addOns}
          uploadMode={uploadMode}
          imageOptions={imageOptions}
          onClose={() => setDishDialog({ open: false })}
        />
      ) : null}
      {categoryDialog.open ? (
        <CategoryDialog
          key={categoryDialog.category?.id ?? "new-category"}
          category={categoryDialog.category}
          uploadMode={uploadMode}
          imageOptions={imageOptions}
          onClose={() => setCategoryDialog({ open: false })}
        />
      ) : null}
      {addOnDialog.open ? (
        <AddOnDialog
          key={addOnDialog.addOn?.id ?? "new-addon"}
          addOn={addOnDialog.addOn}
          onClose={() => setAddOnDialog({ open: false })}
        />
      ) : null}
    </div>
  );
}

function AvailabilityToggle({
  dishId,
  isAvailable,
}: {
  dishId: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={isAvailable ? "Mark dish unavailable" : "Mark dish available"}
      onClick={() =>
        startTransition(async () => {
          const result = await setDishAvailabilityAction([dishId], !isAvailable);
          if (result.success) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition",
        isAvailable
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-muted text-muted-foreground hover:bg-muted/70",
      )}
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full",
            isAvailable ? "bg-emerald-500" : "bg-muted-foreground",
          )}
        />
      )}
      {isAvailable ? "Available" : "Unavailable"}
    </button>
  );
}

function DishDialog({
  dish,
  categories,
  addOns,
  uploadMode,
  imageOptions,
  onClose,
}: {
  dish?: MenuDishRow;
  categories: MenuCategoryRow[];
  addOns: MenuAddOnRow[];
  uploadMode: ImageUploadMode;
  imageOptions: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<DishAdminInput>({
    resolver: zodResolver(dishAdminSchema),
    defaultValues: {
      name: dish?.name ?? "",
      slug: dish?.slug ?? "",
      categoryId:
        dish?.categoryId ??
        categories.find((category) => category.isActive)?.id ??
        categories[0]?.id ??
        "",
      description: dish?.description ?? "",
      details: dish?.details ?? "",
      price: dish ? paisaToRupees(dish.price) : 0,
      comparePrice: dish?.comparePrice ? paisaToRupees(dish.comparePrice) : 0,
      image: dish?.image ?? "",
      isVeg: dish?.isVeg ?? false,
      isSpicy: dish?.isSpicy ?? false,
      isFeatured: dish?.isFeatured ?? false,
      isAvailable: dish?.isAvailable ?? true,
      prepTime: dish?.prepTime ?? 20,
      calories: dish?.calories ?? 0,
      sortOrder: dish?.sortOrder ?? 0,
      variants:
        dish?.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          priceDelta: paisaToRupees(variant.priceDelta),
          isDefault: variant.isDefault,
        })) ?? [{ name: "Regular", priceDelta: 0, isDefault: true }],
      addOnIds: dish?.addOnIds ?? [],
    },
  });
  const image = useWatch({ control: form.control, name: "image" });
  const variants = useWatch({ control: form.control, name: "variants" });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dish ? `Edit ${dish.name}` : "Add a dish"}</DialogTitle>
          <DialogDescription>
            Prices are entered in Nepali rupees. Changes go live on the public menu
            immediately.
          </DialogDescription>
        </DialogHeader>

        <form
          id="dish-form"
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveDishAction(values, dish?.id);
              if (result.success) {
                toast.success(result.message);
                router.refresh();
                onClose();
              } else {
                toast.error(result.message);
              }
            });
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Dish name" htmlFor="dish-name" required error={form.formState.errors.name?.message}>
              <Input id="dish-name" {...form.register("name")} />
            </FormField>
            <FormField label="Category" htmlFor="dish-category" required error={form.formState.errors.categoryId?.message}>
              <div className="space-y-2">
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        void form.trigger("categoryId");
                      }}
                      disabled={categories.length === 0}
                    >
                      <SelectTrigger
                        id="dish-category"
                        aria-invalid={Boolean(form.formState.errors.categoryId)}
                      >
                        <SelectValue
                          placeholder={
                            categories.length === 0
                              ? "No categories available"
                              : "Choose category"
                          }
                        />
                      </SelectTrigger>
                      {categories.length > 0 ? (
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              {category.isActive ? "" : " (hidden)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      ) : null}
                    </Select>
                  )}
                />
                {categories.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    Add a category first from the Categories tab, then come back
                    to create this dish.
                  </p>
                ) : null}
              </div>
            </FormField>
          </div>

          <FormField
            label="Short description"
            htmlFor="dish-description"
            required
            error={form.formState.errors.description?.message}
            hint="Appears on the menu card. One or two appetising sentences."
          >
            <Textarea id="dish-description" rows={3} {...form.register("description")} />
          </FormField>

          <FormField label="Longer details" htmlFor="dish-details" error={form.formState.errors.details?.message}>
            <Textarea
              id="dish-details"
              rows={2}
              placeholder="Ingredients, allergens or the story behind the dish."
              {...form.register("details")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Price (NPR)" htmlFor="dish-price" required error={form.formState.errors.price?.message}>
              <Input id="dish-price" type="number" step="0.01" min="0" {...form.register("price")} />
            </FormField>
            <FormField
              label="Compare-at price"
              htmlFor="dish-compare-price"
              error={form.formState.errors.comparePrice?.message}
              hint="Optional, for a strike-through price."
            >
              <Input
                id="dish-compare-price"
                type="number"
                step="0.01"
                min="0"
                {...form.register("comparePrice")}
              />
            </FormField>
            <FormField label="Prep time (min)" htmlFor="dish-prep" error={form.formState.errors.prepTime?.message}>
              <Input id="dish-prep" type="number" min="1" max="180" {...form.register("prepTime")} />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Calories" htmlFor="dish-calories" error={form.formState.errors.calories?.message}>
              <Input id="dish-calories" type="number" min="0" {...form.register("calories")} />
            </FormField>
            <FormField label="Sort order" htmlFor="dish-sort" error={form.formState.errors.sortOrder?.message}>
              <Input id="dish-sort" type="number" min="0" {...form.register("sortOrder")} />
            </FormField>
            <FormField
              label="Custom slug"
              htmlFor="dish-slug"
              error={form.formState.errors.slug?.message}
              hint="Leave blank to generate from the name."
            >
              <Input id="dish-slug" {...form.register("slug")} />
            </FormField>
          </div>

          <ImageUploadField
            id="dish-image"
            label="Dish photo"
            value={image ?? ""}
            onChange={(value) => form.setValue("image", value, { shouldDirty: true })}
            uploadMode={uploadMode}
            folder="menu"
            imageOptions={imageOptions}
            error={form.formState.errors.image?.message}
          />

          <div className="grid gap-2 rounded-xl border border-border p-4 sm:grid-cols-2">
            {(
              [
                ["isVeg", "Vegetarian"],
                ["isSpicy", "Spicy"],
                ["isFeatured", "Featured on home"],
                ["isAvailable", "Available to order"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-primary"
                  {...form.register(name)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Portion sizes / variants</p>
                <p className="text-[11px] text-muted-foreground">
                  Optional. Add a price difference for half/full or small/large.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", priceDelta: 0, isDefault: fields.length === 0 })}
              >
                <Plus className="size-3.5" /> Add variant
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Variant name (e.g. Full)"
                    className="flex-1 bg-background"
                    {...form.register(`variants.${index}.name`)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Extra NPR"
                    className="w-full bg-background sm:w-32"
                    {...form.register(`variants.${index}.priceDelta`)}
                  />
                  <label className="flex items-center gap-2 whitespace-nowrap text-[11px]">
                    <input
                      type="radio"
                      name="default-variant"
                      className="accent-primary"
                      checked={Boolean(variants?.[index]?.isDefault)}
                      onChange={() => {
                        fields.forEach((_, variantIndex) =>
                          form.setValue(`variants.${variantIndex}.isDefault`, variantIndex === index),
                        );
                      }}
                    />
                    Default
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove variant"
                    onClick={() => remove(index)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              {fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">No variants — the base price is used.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Available add-ons</p>
            <p className="text-[11px] text-muted-foreground">
              Tick extras customers can add to this dish.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {addOns.map((addOn) => (
                <label key={addOn.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    value={addOn.id}
                    className="size-4 rounded border-border accent-primary"
                    {...form.register("addOnIds")}
                  />
                  {addOn.name}{" "}
                  <span className="text-muted-foreground">+{formatNPR(addOn.price)}</span>
                  {!addOn.isActive ? <Badge variant="muted">Hidden</Badge> : null}
                </label>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="dish-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {dish ? "Save dish" : "Add dish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  category,
  uploadMode,
  imageOptions,
  onClose,
}: {
  category?: MenuCategoryRow;
  uploadMode: ImageUploadMode;
  imageOptions: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CategoryAdminInput>({
    resolver: zodResolver(categoryAdminSchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      image: category?.image ?? "",
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });
  const image = useWatch({ control: form.control, name: "image" });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : "Add a category"}</DialogTitle>
          <DialogDescription>
            Categories organise the menu. Hidden categories disappear from the public site.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await saveCategoryAction(values, category?.id);
              if (result.success) {
                toast.success(result.message);
                router.refresh();
                onClose();
              } else {
                toast.error(result.message);
              }
            });
          })}
        >
          <FormField label="Category name" htmlFor="category-name" required error={form.formState.errors.name?.message}>
            <Input id="category-name" {...form.register("name")} />
          </FormField>
          <FormField label="Description" htmlFor="category-description" error={form.formState.errors.description?.message}>
            <Textarea id="category-description" rows={3} {...form.register("description")} />
          </FormField>
          <ImageUploadField
            id="category-image"
            label="Category photo"
            value={image ?? ""}
            onChange={(value) =>
              form.setValue("image", value, { shouldDirty: true })
            }
            uploadMode={uploadMode}
            folder="menu"
            imageOptions={imageOptions}
            hint="Used on the menu category cards and navigation tiles."
            error={form.formState.errors.image?.message}
          />
          <FormField
            label="Sort order"
            htmlFor="category-sort"
            error={form.formState.errors.sortOrder?.message}
          >
            <Input
              id="category-sort"
              type="number"
              min="0"
              {...form.register("sortOrder")}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...form.register("isActive")}
            />
            Show this category on the website
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddOnDialog({
  addOn,
  onClose,
}: {
  addOn?: MenuAddOnRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(addOn?.name ?? "");
  const [price, setPrice] = useState(addOn ? paisaToRupees(addOn.price) : 0);
  const [sortOrder, setSortOrder] = useState(addOn?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(addOn?.isActive ?? true);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{addOn ? `Edit ${addOn.name}` : "Add an add-on"}</DialogTitle>
          <DialogDescription>
            Add-ons are shared across dishes. Attach them to individual dishes in the dish editor.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveAddOnAction(
                { name, price, sortOrder, isActive },
                addOn?.id,
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
          <FormField label="Add-on name" htmlFor="addon-name" required>
            <Input
              id="addon-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Extra cheese"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (NPR)" htmlFor="addon-price" required>
              <Input
                id="addon-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(Number(event.target.value))}
              />
            </FormField>
            <FormField label="Sort order" htmlFor="addon-sort">
              <Input
                id="addon-sort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save add-on
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
