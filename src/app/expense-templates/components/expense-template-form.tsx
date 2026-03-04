"use client";

import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
};

export type ExpenseTemplateFormValues = {
  item_name: string;
  category_id: string;
  default_amount: string;
  interval_type: "monthly" | "bi-monthly" | "quarterly" | "specific_months";
  specific_months: string;
  is_active: boolean;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function ExpenseTemplateForm({
  mode,
  categories,
  values,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  categories: Category[];
  values: ExpenseTemplateFormValues;
  error: string | null;
  submitting: boolean;
  onChange: (nextValues: ExpenseTemplateFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "Create Expense Template" : "Edit Expense Template"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure recurring expense rules for your budget plan.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-4 rounded-md border p-4"
      >
        <div className="space-y-2">
          <label htmlFor="item-name" className="text-sm font-medium">
            Item Name
          </label>
          <input
            id="item-name"
            className={inputClassName}
            value={values.item_name}
            onChange={(event) =>
              onChange({ ...values, item_name: event.target.value })
            }
            placeholder="School Fees"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="category-id" className="text-sm font-medium">
              Category
            </label>
            <select
              id="category-id"
              className={inputClassName}
              value={values.category_id}
              onChange={(event) =>
                onChange({ ...values, category_id: event.target.value })
              }
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="default-amount" className="text-sm font-medium">
              Default Amount
            </label>
            <input
              id="default-amount"
              className={inputClassName}
              type="number"
              step="0.01"
              min="0"
              value={values.default_amount}
              onChange={(event) =>
                onChange({ ...values, default_amount: event.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="interval-type" className="text-sm font-medium">
              Interval Type
            </label>
            <select
              id="interval-type"
              className={inputClassName}
              value={values.interval_type}
              onChange={(event) =>
                onChange({
                  ...values,
                  interval_type: event.target.value as ExpenseTemplateFormValues["interval_type"],
                })
              }
            >
              <option value="monthly">monthly</option>
              <option value="bi-monthly">bi-monthly</option>
              <option value="quarterly">quarterly</option>
              <option value="specific_months">specific_months</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="specific-months" className="text-sm font-medium">
              Specific Months (comma separated)
            </label>
            <input
              id="specific-months"
              className={inputClassName}
              value={values.specific_months}
              onChange={(event) =>
                onChange({ ...values, specific_months: event.target.value })
              }
              placeholder="3,6,9,12"
              disabled={values.interval_type !== "specific_months"}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(event) =>
              onChange({ ...values, is_active: event.target.checked })
            }
          />
          Active
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Saving..."
              : mode === "create"
                ? "Create Template"
                : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
