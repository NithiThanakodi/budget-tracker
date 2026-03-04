"use client";

import { Button } from "@/components/ui/button";

export type IncomeRecordFormValues = {
  name: string;
  amount: string;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function IncomeRecordForm({
  mode,
  values,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: IncomeRecordFormValues;
  error: string | null;
  submitting: boolean;
  onChange: (nextValues: IncomeRecordFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "Create Income Source" : "Edit Income Source"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage recurring income sources used in the budget grid.
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
          <label htmlFor="income-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="income-name"
            className={inputClassName}
            value={values.name}
            onChange={(event) =>
              onChange({ ...values, name: event.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="income-amount" className="text-sm font-medium">
            Amount
          </label>
          <input
            id="income-amount"
            className={inputClassName}
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(event) =>
              onChange({ ...values, amount: event.target.value })
            }
            required
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Saving..."
              : mode === "create"
                ? "Create Source"
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
