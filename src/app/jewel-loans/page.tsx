"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

type JewelLoan = {
  id: string;
  lender_name: string;
  jeweler_name: string | null;
  loan_type: "bank" | "pawn";
  item_details: string | null;
  grams: number | null;
  loan_amount: number | null;
  interest_rate: number | null;
  loan_date: string | null;
  due_date: string | null;
  status: "active" | "recovered";
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const GRAMS_PER_POUN = 8;

const formatPounAndGrams = (totalGrams: number) => {
  const safeTotal = Number.isFinite(totalGrams) ? Math.max(totalGrams, 0) : 0;
  const poun = Math.floor(safeTotal / GRAMS_PER_POUN);
  const grams = safeTotal - poun * GRAMS_PER_POUN;
  return `${poun} poun ${grams.toFixed(2)} g`;
};

const isInSameMonth = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-GB").format(d);
};

export default function JewelLoansPage() {
  const [items, setItems] = useState<JewelLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "bank" | "pawn">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "recovered">(
    "all",
  );
  const [dueFilter, setDueFilter] = useState<
    "all" | "overdue" | "current" | "next" | "no_due"
  >("all");

  const loadLoans = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("jewel_loans")
      .select(
        "id, lender_name, jeweler_name, loan_type, item_details, grams, loan_amount, interest_rate, loan_date, due_date, status",
      )
      .order("due_date", { ascending: true, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data as JewelLoan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const filteredItems = items.filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      item.lender_name.toLowerCase().includes(keyword) ||
      (item.jeweler_name ?? "").toLowerCase().includes(keyword);
    const matchesType = typeFilter === "all" || item.loan_type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    const dueDate = item.due_date ? new Date(item.due_date) : null;
    const isCurrentMonth = !!dueDate && isInSameMonth(dueDate, today);
    const isNextMonth = !!dueDate && isInSameMonth(dueDate, nextMonth);
    const isOverdue = !!dueDate && dueDate < startOfToday;
    const isNoDue = !dueDate;

    const matchesDue =
      dueFilter === "all" ||
      (dueFilter === "current" && isCurrentMonth) ||
      (dueFilter === "next" && isNextMonth) ||
      (dueFilter === "overdue" && isOverdue) ||
      (dueFilter === "no_due" && isNoDue);

    return matchesSearch && matchesType && matchesStatus && matchesDue;
  });

  const totals = filteredItems.reduce(
    (acc, item) => {
      const principal = Number(item.loan_amount ?? 0);
      const interestRate = Number(item.interest_rate ?? 0);
      const grams = Number(item.grams ?? 0);
      const interestAmount = (principal * interestRate) / 100;

      acc.totalAmount += principal;
      acc.totalInterest += interestAmount;
      acc.totalGrams += grams;
      return acc;
    },
    { totalAmount: 0, totalInterest: 0, totalGrams: 0 },
  );

  const onDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Delete this jewel loan? This cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("jewel_loans")
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
          <h2 className="text-xl font-semibold">Jewel Loan List</h2>
          <p className="text-sm text-muted-foreground">
            Track active and recovered jewel loans.
          </p>
        </div>
        <Button asChild>
          <Link href="/jewel-loans/new">Create Loan</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">Total Grams</p>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            {formatPounAndGrams(totals.totalGrams)}
          </p>
        </div>
        <div className="rounded-md border bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">Total Interest</p>
          <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {formatMoney(totals.totalInterest)}
          </p>
        </div>
        <div className="rounded-md border bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {formatMoney(totals.totalAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-4">
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          placeholder="Search lender/jeweler..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as "all" | "bank" | "pawn")
          }
        >
          <option value="all">All Types</option>
          <option value="bank">Bank</option>
          <option value="pawn">Pawn</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | "active" | "recovered")
          }
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="recovered">Recovered</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={dueFilter}
          onChange={(event) =>
            setDueFilter(
              event.target.value as "all" | "overdue" | "current" | "next" | "no_due",
            )
          }
        >
          <option value="all">All Due</option>
          <option value="overdue">Overdue</option>
          <option value="current">Current Month</option>
          <option value="next">Next Month</option>
          <option value="no_due">No Due Date</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1320px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Lender</th>
              <th className="px-4 py-3 text-left font-medium">Jeweler</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Grams</th>
              <th className="px-4 py-3 text-left font-medium">Loan Amount</th>
              <th className="px-4 py-3 text-left font-medium">Interest %</th>
              <th className="px-4 py-3 text-left font-medium">Interest Amount</th>
              <th className="px-4 py-3 text-left font-medium">Total + Interest</th>
              <th className="px-4 py-3 text-left font-medium">Loan Date</th>
              <th className="px-4 py-3 text-left font-medium">Due Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading jewel loans...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No jewel loans found for current filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const principal = Number(item.loan_amount ?? 0);
                const interestRate = Number(item.interest_rate ?? 0);
                const interestAmount = (principal * interestRate) / 100;
                const totalWithInterest = principal + interestAmount;

                const dueDate = item.due_date ? new Date(item.due_date) : null;
                const isCurrentMonth =
                  !!dueDate && isInSameMonth(dueDate, today);
                const isNextMonth =
                  !!dueDate && isInSameMonth(dueDate, nextMonth);
                const dueDateClass = isCurrentMonth
                  ? "text-rose-600 dark:text-rose-400"
                  : isNextMonth
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground";

                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{item.lender_name}</td>
                    <td className="px-4 py-3">{item.jeweler_name ?? "-"}</td>
                    <td className="px-4 py-3">{item.loan_type}</td>
                    <td className="px-4 py-3">{item.grams ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">
                      {formatMoney(principal)}
                    </td>
                    <td className="px-4 py-3">{item.interest_rate ?? "-"}%</td>
                    <td className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-300">
                      {formatMoney(interestAmount)}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
                      {formatMoney(totalWithInterest)}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.loan_date)}</td>
                    <td className={`px-4 py-3 ${dueDateClass}`}>{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/jewel-loans/${item.id}/edit`}>Edit</Link>
                        </Button>
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
