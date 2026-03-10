"use client";

import { Button } from "@/components/ui/button";

export type JewelLoanFormValues = {
  lender_name: string;
  jeweler_name: string;
  loan_type: "bank" | "pawn";
  item_details: string;
  grams: string;
  loan_amount: string;
  interest_rate: string;
  loan_date: string;
  due_date: string;
  status: "active" | "recovered";
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function JewelLoanForm({
  mode,
  values,
  error,
  submitting,
  hideActions,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: JewelLoanFormValues;
  error: string | null;
  submitting: boolean;
  hideActions?: boolean;
  onChange: (nextValues: JewelLoanFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "Create Jewel Loan" : "Edit Jewel Loan"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Track lenders, jewel details, and repayment status.
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
          <label htmlFor="lender-name" className="text-sm font-medium">
            Lender Name
          </label>
          <input
            id="lender-name"
            className={inputClassName}
            value={values.lender_name}
            onChange={(event) =>
              onChange({ ...values, lender_name: event.target.value })
            }
            placeholder="Indian Bank"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="jeweler-name" className="text-sm font-medium">
            Jeweler Name
          </label>
          <input
            id="jeweler-name"
            className={inputClassName}
            value={values.jeweler_name}
            onChange={(event) =>
              onChange({ ...values, jeweler_name: event.target.value })
            }
            placeholder="ABC Jewellers"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="loan-type" className="text-sm font-medium">
              Loan Type
            </label>
            <select
              id="loan-type"
              className={inputClassName}
              value={values.loan_type}
              onChange={(event) =>
                onChange({
                  ...values,
                  loan_type: event.target.value as JewelLoanFormValues["loan_type"],
                })
              }
            >
              <option value="bank">bank</option>
              <option value="pawn">pawn</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              className={inputClassName}
              value={values.status}
              onChange={(event) =>
                onChange({
                  ...values,
                  status: event.target.value as JewelLoanFormValues["status"],
                })
              }
            >
              <option value="active">active</option>
              <option value="recovered">recovered</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="item-details" className="text-sm font-medium">
            Item Details
          </label>
          <textarea
            id="item-details"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.item_details}
            onChange={(event) =>
              onChange({ ...values, item_details: event.target.value })
            }
            placeholder="2 bangles, 1 chain"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="grams" className="text-sm font-medium">
              Grams
            </label>
            <input
              id="grams"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={values.grams}
              onChange={(event) => onChange({ ...values, grams: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="loan-amount" className="text-sm font-medium">
              Loan Amount
            </label>
            <input
              id="loan-amount"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={values.loan_amount}
              onChange={(event) =>
                onChange({ ...values, loan_amount: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="interest-rate" className="text-sm font-medium">
              Interest Rate (%)
            </label>
            <input
              id="interest-rate"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={values.interest_rate}
              onChange={(event) =>
                onChange({ ...values, interest_rate: event.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="loan-date" className="text-sm font-medium">
              Loan Date
            </label>
            <input
              id="loan-date"
              className={inputClassName}
              type="date"
              value={values.loan_date}
              onChange={(event) =>
                onChange({ ...values, loan_date: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="due-date" className="text-sm font-medium">
              Due Date
            </label>
            <input
              id="due-date"
              className={inputClassName}
              type="date"
              value={values.due_date}
              onChange={(event) => onChange({ ...values, due_date: event.target.value })}
            />
          </div>
        </div>

        {hideActions ? null : (
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
        )}
      </form>
    </section>
  );
}
