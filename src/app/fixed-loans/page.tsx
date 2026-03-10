"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

type FixedLoan = {
  id: string;
  loan_name: string;
  loan_amount: number;
  interest_rate: number;
  interest_type: "simple" | "compound";
  monthly_emi: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-GB").format(d);
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const isInSameMonth = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

const getRemainingMonths = (startDateValue: string | null, endDateValue: string | null) => {
  if (!endDateValue || !startDateValue) return null;
  var startDate = new Date(startDateValue);
  const today = new Date();
  if (startDate <= today) {
    startDate = today;
  }

  const endDate = new Date(endDateValue);
  return Math.max(
    0,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1,
  );
};

const monthDiffInclusive = (startDate: Date, endDate: Date) =>
  (endDate.getFullYear() - startDate.getFullYear()) * 12 +
  (endDate.getMonth() - startDate.getMonth()) +
  1;

const estimateLoanTotals = (loan: FixedLoan) => {
  const principal = Number(loan.loan_amount ?? 0);
  const rate = Number(loan.interest_rate ?? 0) / 100;
  const startDate = loan.start_date ? new Date(loan.start_date) : null;
  const endDate = loan.end_date ? new Date(loan.end_date) : null;
  if (!startDate || !endDate || principal <= 0) {
    return { principal, interest: 0, total: principal };
  }
  const months = monthDiffInclusive(startDate, endDate);
  if (months <= 0) {
    return { principal, interest: 0, total: principal };
  }

  if (loan.interest_type === "simple") {
    const interest = principal * rate * (months / 12);
    return { principal, interest, total: principal + interest };
  }

  const monthlyRate = rate / 12;
  if (monthlyRate <= 0) {
    return { principal, interest: 0, total: principal };
  }
  let emi = Number(loan.monthly_emi ?? 0);
  if (emi <= 0) {
    emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }
  let balance = principal;
  let interest = 0;
  for (let i = 0; i < months; i++) {
    const monthInterest = balance * monthlyRate;
    interest += monthInterest;
    const monthPrincipal = Math.min(Math.max(emi - monthInterest, 0), balance);
    balance = Math.max(0, balance - monthPrincipal);
    if (balance <= 0) break;
  }
  return { principal, interest, total: principal + interest };
};

export default function FixedLoansPage() {
  const [items, setItems] = useState<FixedLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("fixed_loans")
      .select(
        "id, loan_name, loan_amount, interest_rate, interest_type, monthly_emi, start_date, end_date, is_active",
      )
      .order("end_date", { ascending: true, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = ((data as FixedLoan[]) ?? []).sort((a, b) => {
      if (!a.end_date && !b.end_date) return 0;
      if (!a.end_date) return 1;
      if (!b.end_date) return -1;
      return a.end_date.localeCompare(b.end_date);
    });
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Delete this fixed loan? This cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("fixed_loans")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Fixed Loan List</h2>
          <p className="text-sm text-muted-foreground">
            Manage long-term EMIs and active status.
          </p>
        </div>
        <Button asChild>
          <Link href="/fixed-loans/new">Create Loan</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {(() => {
          const totals = items.reduce(
            (acc, loan) => {
              const split = estimateLoanTotals(loan);
              acc.principal += split.principal;
              acc.interest += split.interest;
              acc.total += split.total;
              return acc;
            },
            { principal: 0, interest: 0, total: 0 },
          );
          return (
            <>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total Loan Amount</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {formatMoney(totals.principal)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total Interest To Be Paid</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatMoney(totals.interest)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total Amount To Be Paid</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {formatMoney(totals.total)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">No. of Loans</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {items.length}
                </p>
              </div>
            </>
          );
        })()}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Loan Name</th>
              <th className="px-4 py-3 text-left font-medium">Loan Amount</th>
              <th className="px-4 py-3 text-left font-medium">Interest</th>
              <th className="px-4 py-3 text-left font-medium">Interest Type</th>
              <th className="px-4 py-3 text-left font-medium">Monthly EMI</th>
              <th className="px-4 py-3 text-left font-medium">Start Date</th>
              <th className="px-4 py-3 text-left font-medium">End Date</th>
              <th className="px-4 py-3 text-left font-medium">Remaining Months</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading fixed loans...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No fixed loans found.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const today = new Date();
                const nextMonth = new Date(
                  today.getFullYear(),
                  today.getMonth() + 1,
                  1,
                );
                const endDate = item.end_date ? new Date(item.end_date) : null;
                const remainingMonths = getRemainingMonths(item.start_date, item.end_date);
                const isOverdue = !!endDate && endDate < today && !isInSameMonth(endDate, today);
                const isCurrentMonth = !!endDate && isInSameMonth(endDate, today);
                const isNextMonth = !!endDate && isInSameMonth(endDate, nextMonth);
                const rowColor = isOverdue || isCurrentMonth
                  ? "bg-rose-50 dark:bg-rose-950/20"
                  : isNextMonth
                    ? "bg-amber-50 dark:bg-amber-950/20"
                    : "bg-transparent";

                return (
                  <tr key={item.id} className={`border-b last:border-b-0 ${rowColor}`} onClick={() => window.location.href = `/fixed-loans/${item.id}/edit`} style={{ cursor: "pointer" }}>
                    <td className="px-4 py-3 font-bold ">{item.loan_name}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">
                      {formatMoney(Number(item.loan_amount ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      {Number(item.interest_rate ?? 0)}%
                    </td>
                    <td className="px-4 py-3 uppercase">
                      {item.interest_type ?? "simple"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300">
                      {formatMoney(Number(item.monthly_emi ?? 0))}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.start_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5  font-semibold ${isOverdue || isCurrentMonth
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                          : isNextMonth
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                      >
                        {formatDate(item.end_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {remainingMonths === null ? "-" : `${remainingMonths} month(s)`}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deletingId === item.id}
                          onClick={() => onDelete(item.id)}
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
