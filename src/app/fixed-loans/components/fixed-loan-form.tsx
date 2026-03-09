"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export type FixedLoanFormValues = {
  loan_name: string;
  loan_amount: string;
  interest_rate: string;
  interest_type: "simple" | "compound";
  monthly_emi: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const monthDiffInclusive = (startDate: Date, endDate: Date) =>
  (endDate.getFullYear() - startDate.getFullYear()) * 12 +
  (endDate.getMonth() - startDate.getMonth()) +
  1;

type YearlySplit = {
  year: number;
  principal: number;
  interest: number;
  total: number;
  endBalance: number;
  periodEnd: Date;
};

type MonthlySplit = {
  date: Date;
  principal: number;
  interest: number;
  total: number;
  endBalance: number;
};

const buildMonthlySchedule = (
  principalAmount: number,
  annualRatePercent: number,
  emiInput: number,
  startDateValue: string,
  endDateValue: string,
  interestType: "simple" | "compound",
) => {
  if (!startDateValue || !endDateValue || principalAmount <= 0) {
    return [] as MonthlySplit[];
  }

  const startDate = new Date(startDateValue);
  const endDate = new Date(endDateValue);
  const months = monthDiffInclusive(startDate, endDate);
  if (!Number.isFinite(months) || months <= 0) {
    return [] as MonthlySplit[];
  }

  const monthlyRows: MonthlySplit[] = [];
  let balance = principalAmount;
  const annualRate = Math.max(annualRatePercent, 0) / 100;
  const monthlyRate = annualRate / 12;

  let emi = emiInput;
  if (emi <= 0) {
    if (interestType === "compound" && monthlyRate > 0) {
      emi =
        (principalAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
    } else {
      emi = principalAmount / months;
    }
  }

  const simpleMonthlyInterest =
    interestType === "simple" ? (principalAmount * annualRate) / 12 : 0;
  let monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  for (let i = 0; i < months; i++) {
    const interest =
      interestType === "compound" ? balance * monthlyRate : simpleMonthlyInterest;
    let principal = emi - interest;
    if (!Number.isFinite(principal) || principal < 0) {
      principal = 0;
    }
    if (principal > balance) {
      principal = balance;
    }
    balance = Math.max(0, balance - principal);
    const total = principal + interest;
    monthlyRows.push({
      date: new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1),
      principal,
      interest,
      total,
      endBalance: balance,
    });

    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
    if (balance <= 0) {
      break;
    }
  }

  return monthlyRows;
};

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
  const monthlySchedule = useMemo(() => {
    return buildMonthlySchedule(
      Number(values.loan_amount) || 0,
      Number(values.interest_rate) || 0,
      Number(values.monthly_emi) || 0,
      values.start_date,
      values.end_date,
      values.interest_type,
    );
  }, [
    values.loan_amount,
    values.interest_rate,
    values.monthly_emi,
    values.start_date,
    values.end_date,
    values.interest_type,
  ]);

  const yearlySchedule = useMemo(() => {
    const yearlyMap = new Map<number, YearlySplit>();
    for (const row of monthlySchedule) {
      const year = row.date.getFullYear();
      const current = yearlyMap.get(year) ?? {
        year,
        principal: 0,
        interest: 0,
        total: 0,
        endBalance: row.endBalance,
        periodEnd: row.date,
      };
      current.principal += row.principal;
      current.interest += row.interest;
      current.total += row.total;
      current.endBalance = row.endBalance;
      current.periodEnd = row.date;
      yearlyMap.set(year, current);
    }
    return Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
  }, [monthlySchedule]);

  const totalPrincipal = monthlySchedule.reduce((sum, row) => sum + row.principal, 0);
  const totalInterest = monthlySchedule.reduce((sum, row) => sum + row.interest, 0);
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const finishedRows = monthlySchedule.filter((row) => row.date < thisMonthStart);
  const finishedPrincipal = finishedRows.reduce((sum, row) => sum + row.principal, 0);
  const finishedInterest = finishedRows.reduce((sum, row) => sum + row.interest, 0);
  const remainingPrincipal = Math.max(totalPrincipal - finishedPrincipal, 0);
  const remainingInterest = Math.max(totalInterest - finishedInterest, 0);

  const formatYearsMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years}y ${remainingMonths}m`;
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
      <div className="space-y-4">
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

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
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
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="interest-rate" className="text-sm font-medium">
              Interest Rate (% yearly)
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
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="interest-type" className="text-sm font-medium">
              Interest Type
            </label>
            <select
              id="interest-type"
              className={inputClassName}
              value={values.interest_type}
              onChange={(event) =>
                onChange({
                  ...values,
                  interest_type: event.target.value as FixedLoanFormValues["interest_type"],
                })
              }
            >
              <option value="simple">simple</option>
              <option value="compound">compound</option>
            </select>
          </div>
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
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div>
          <h3 className="text-base font-semibold">Yearly Principal/Interest</h3>
          <p className="text-xs text-muted-foreground">
            Split by year based on current loan inputs.
          </p>
        </div>

        {!values.start_date || !values.end_date ? (
          <p className="text-sm text-muted-foreground">
            Select both start and end date to see yearly details.
          </p>
        ) : monthlySchedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Enter valid amount/EMI/interest to calculate yearly details.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Total Interest Paid</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(finishedInterest)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Total Principal Paid</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(finishedPrincipal)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Remaining Interest</p>
                <p className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatMoney(remainingInterest)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Remaining Principal</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(remainingPrincipal)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">Finished</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatYearsMonths(finishedRows.length)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground">To Go</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatYearsMonths(Math.max(monthlySchedule.length - finishedRows.length, 0))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Year</th>
                    <th className="px-3 py-2 text-right font-medium">Principal</th>
                    <th className="px-3 py-2 text-right font-medium">Interest</th>
                    <th className="px-3 py-2 text-right font-medium">Total Paid</th>
                    <th className="px-3 py-2 text-right font-medium">End Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySchedule.map((row) => {
                    const isFinished = row.periodEnd < thisMonthStart;
                    return (
                      <tr
                        key={row.year}
                        className={`border-b last:border-b-0 ${
                          isFinished
                            ? "bg-emerald-50 dark:bg-emerald-950/20"
                            : "bg-transparent"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{row.year}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(row.principal)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">
                          {formatMoney(row.interest)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(row.total)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(row.endBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Principal</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(totalPrincipal)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Total Interest</span>
                <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatMoney(totalInterest)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
