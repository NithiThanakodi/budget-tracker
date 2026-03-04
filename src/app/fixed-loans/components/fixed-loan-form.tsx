"use client";

import { Button } from "@/components/ui/button";

export type FixedLoanFormValues = {
  loan_name: string;
  monthly_emi: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function FixedLoanForm({
  mode,
  values,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: FixedLoanFormValues;
  error: string | null;
  submitting: boolean;
  onChange: (nextValues: FixedLoanFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "Create Fixed Loan" : "Edit Fixed Loan"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage long-term fixed EMI loans.
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
          <label htmlFor="loan-name" className="text-sm font-medium">
            Loan Name
          </label>
          <input
            id="loan-name"
            className={inputClassName}
            value={values.loan_name}
            onChange={(event) =>
              onChange({ ...values, loan_name: event.target.value })
            }
            placeholder="Home Loan"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="monthly-emi" className="text-sm font-medium">
            Monthly EMI
          </label>
          <input
            id="monthly-emi"
            className={inputClassName}
            type="number"
            min="0"
            step="0.01"
            value={values.monthly_emi}
            onChange={(event) =>
              onChange({ ...values, monthly_emi: event.target.value })
            }
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="start-date" className="text-sm font-medium">
              Start Date
            </label>
            <input
              id="start-date"
              className={inputClassName}
              type="date"
              value={values.start_date}
              onChange={(event) =>
                onChange({ ...values, start_date: event.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="end-date" className="text-sm font-medium">
              End Date
            </label>
            <input
              id="end-date"
              className={inputClassName}
              type="date"
              value={values.end_date}
              onChange={(event) =>
                onChange({ ...values, end_date: event.target.value })
              }
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
                ? "Create Loan"
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
