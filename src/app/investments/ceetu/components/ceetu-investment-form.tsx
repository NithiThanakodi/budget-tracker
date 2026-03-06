"use client";

import { Button } from "@/components/ui/button";

export type CeetuInvestmentFormValues = {
  name: string;
  monthly_emi: string;
  start_date: string;
  end_date: string;
  total_claim_amount: string;
  claimed_amount: string;
  claim_details: string;
  claim_date: string;
  is_active: boolean;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function CeetuInvestmentForm({
  mode,
  values,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  values: CeetuInvestmentFormValues;
  error: string | null;
  submitting: boolean;
  onChange: (nextValues: CeetuInvestmentFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {mode === "create" ? "Create Ceetu Investment" : "Edit Ceetu Investment"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Track monthly contribution, claim target, and claim progress.
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
          <label htmlFor="investment-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="investment-name"
            className={inputClassName}
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            placeholder="TM Kuzu Ceetu"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
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

          <div className="space-y-2">
            <label htmlFor="total-claim-amount" className="text-sm font-medium">
              Total Need to Claim
            </label>
            <input
              id="total-claim-amount"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={values.total_claim_amount}
              onChange={(event) =>
                onChange({ ...values, total_claim_amount: event.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="claimed-amount" className="text-sm font-medium">
              Claimed Amount
            </label>
            <input
              id="claimed-amount"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={values.claimed_amount}
              onChange={(event) =>
                onChange({ ...values, claimed_amount: event.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
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
              onChange={(event) => onChange({ ...values, end_date: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="claim-date" className="text-sm font-medium">
              Claimed Date
            </label>
            <input
              id="claim-date"
              className={inputClassName}
              type="date"
              value={values.claim_date}
              onChange={(event) => onChange({ ...values, claim_date: event.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="claim-details" className="text-sm font-medium">
            Claimed For Details
          </label>
          <textarea
            id="claim-details"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.claim_details}
            onChange={(event) =>
              onChange({ ...values, claim_details: event.target.value })
            }
            placeholder="Claimed for school admission"
          />
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
                ? "Create Investment"
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
