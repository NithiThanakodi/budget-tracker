"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Coins,
  Gem,
  HandCoins,
  Landmark,
  ListChecks,
} from "lucide-react";
import Container from "@/components/container";
import { supabase } from "../../../utils/supabase";

type BudgetEntry = {
  planned_amount: number | null;
  is_paid: boolean;
  expense_templates:
  | {
    item_name: string;
    categories: { name: string } | { name: string }[] | null;
  }
  | {
    item_name: string;
    categories: { name: string } | { name: string }[] | null;
  }[]
  | null;
};

type IncomeSource = {
  id: string;
  name: string;
  amount: number;
};

type IncomeOverride = {
  income_source_id: string;
  amount: number;
};

type CashInHand = {
  amount: number;
};

type FixedLoan = {
  id: string;
  loan_name: string;
  monthly_emi: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

type JewelLoan = {
  lender_name: string;
  loan_type: "bank" | "pawn";
  loan_amount: number | null;
  interest_rate: number | null;
  due_date: string | null;
  status: "active" | "recovered";
};

type ExpenseChartItem = {
  name: string;
  amount: number;
  paid: number;
};

const monthStartKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const isInMonth = (isoDate: string | null, monthDate: Date) => {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  return (
    d.getFullYear() === monthDate.getFullYear() &&
    d.getMonth() === monthDate.getMonth()
  );
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [incomeOverrides, setIncomeOverrides] = useState<IncomeOverride[]>([]);
  const [cashInHand, setCashInHand] = useState<number | null>(null);
  const [fixedLoans, setFixedLoans] = useState<FixedLoan[]>([]);
  const [jewelLoans, setJewelLoans] = useState<JewelLoan[]>([]);

  const today = useMemo(() => new Date(), []);
  const currentMonthKey = monthStartKey(today);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [entriesRes, incomeRes, overridesRes, cashRes, fixedRes, jewelRes] =
        await Promise.all([
          supabase
            .from("budget_entries")
            .select(
              "planned_amount, is_paid, expense_templates(item_name, categories(name))",
            )
            .eq("month_year", currentMonthKey),
          supabase
            .from("income_sources")
            .select("id, name, amount")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("income_monthly_overrides")
            .select("income_source_id, amount")
            .eq("month_year", currentMonthKey),
          supabase
            .from("cash_in_hand_entries")
            .select("amount")
            .eq("month_year", currentMonthKey)
            .maybeSingle(),
          supabase
            .from("fixed_loans")
            .select("id, loan_name, monthly_emi, start_date, end_date, is_active")
            .order("loan_name", { ascending: true }),
          supabase
            .from("jewel_loans")
            .select("lender_name, loan_type, loan_amount, interest_rate, due_date, status")
            .order("due_date", { ascending: true }),
        ]);

      if (entriesRes.error) return setErrorAndStop(entriesRes.error.message);
      if (incomeRes.error) return setErrorAndStop(incomeRes.error.message);
      if (overridesRes.error) return setErrorAndStop(overridesRes.error.message);
      if (cashRes.error) return setErrorAndStop(cashRes.error.message);
      if (fixedRes.error) return setErrorAndStop(fixedRes.error.message);
      if (jewelRes.error) return setErrorAndStop(jewelRes.error.message);

      const fixedRows = (fixedRes.data as FixedLoan[]) ?? [];
      const jewelRows = (jewelRes.data as JewelLoan[]) ?? [];

      setEntries((entriesRes.data as BudgetEntry[]) ?? []);
      setIncomeSources((incomeRes.data as IncomeSource[]) ?? []);
      setIncomeOverrides((overridesRes.data as IncomeOverride[]) ?? []);
      setCashInHand((cashRes.data as CashInHand | null)?.amount ?? null);
      setFixedLoans(fixedRows);
      setJewelLoans(jewelRows);
      setLoading(false);

      function setErrorAndStop(message: string) {
        setError(message);
        setLoading(false);
      }
    };

    load();
  }, [today, currentMonthKey]);

  const currentIncomeTotal = useMemo(() => {
    const overrideMap = new Map(
      incomeOverrides.map((item) => [item.income_source_id, Number(item.amount ?? 0)]),
    );
    return incomeSources.reduce((sum, source) => {
      const value = overrideMap.get(source.id) ?? Number(source.amount ?? 0);
      return sum + value;
    }, 0);
  }, [incomeSources, incomeOverrides]);

  const expenseTotal = useMemo(
    () => entries.reduce((sum, row) => sum + Number(row.planned_amount ?? 0), 0),
    [entries],
  );
  const expensePaid = useMemo(
    () =>
      entries.reduce(
        (sum, row) => sum + (row.is_paid ? Number(row.planned_amount ?? 0) : 0),
        0,
      ),
    [entries],
  );
  const expenseRemaining = expenseTotal - expensePaid;

  const fixedThisMonth = useMemo(() => {
    return fixedLoans.reduce((sum, loan) => {
      const monthDate = today;
      const startDate = new Date(loan.start_date);
      const endDate = loan.end_date ? new Date(loan.end_date) : null;
      const inRange =
        monthDate >= new Date(startDate.getFullYear(), startDate.getMonth(), 1) &&
        (!endDate ||
          monthDate <= new Date(endDate.getFullYear(), endDate.getMonth(), 1));
      return sum + (inRange ? Number(loan.monthly_emi ?? 0) : 0);
    }, 0);
  }, [fixedLoans, today]);

  const jewelInterestThisMonth = useMemo(() => {
    return jewelLoans.reduce((sum, loan) => {
      if (!isInMonth(loan.due_date, today)) return sum;
      return (
        sum +
        (Number(loan.loan_amount ?? 0) * Number(loan.interest_rate ?? 0)) / 100
      );
    }, 0);
  }, [jewelLoans, today]);

  const currentCashInHand = cashInHand ?? currentIncomeTotal;
  const currentBalance =
    currentCashInHand - (expenseRemaining + fixedThisMonth + jewelInterestThisMonth);

  const expenseChartData = useMemo<ExpenseChartItem[]>(() => {
    const map = new Map<string, ExpenseChartItem>();
    for (const row of entries) {
      const rel = row.expense_templates;
      const relObj = Array.isArray(rel) ? rel[0] : rel;
      const relCategory = relObj?.categories;
      const categoryName = Array.isArray(relCategory)
        ? (relCategory[0]?.name ?? "Uncategorized")
        : (relCategory?.name ?? "Uncategorized");
      const amount = Number(row.planned_amount ?? 0);
      const prev = map.get(categoryName) ?? { name: categoryName, amount: 0, paid: 0 };
      prev.amount += amount;
      if (row.is_paid) {
        prev.paid += amount;
      }
      map.set(categoryName, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const maxExpenseValue = useMemo(
    () => Math.max(...expenseChartData.map((item) => item.amount), 1),
    [expenseChartData],
  );
  const chartMax = useMemo(() => {
    const rounded = Math.ceil(maxExpenseValue / 1000) * 1000;
    return Math.max(rounded, 1000);
  }, [maxExpenseValue]);

  const jewelLoanRows = useMemo(() => {
    return jewelLoans
      .map((loan) => {
        const principal = Number(loan.loan_amount ?? 0);
        const interest = (principal * Number(loan.interest_rate ?? 0)) / 100;
        return {
          ...loan,
          principal,
          interest,
          totalWithInterest: principal + interest,
        };
      })
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [jewelLoans]);

  const fixedLoanStatus = useMemo(() => {
    return fixedLoans
      .map((loan) => {
        const start = new Date(loan.start_date);
        const end = loan.end_date ? new Date(loan.end_date) : null;
        const monthsRemaining = end
          ? Math.max(
            0,
            (end.getFullYear() - today.getFullYear()) * 12 +
            (end.getMonth() - today.getMonth()) +
            1,
          )
          : null;
        const hasStarted =
          today >= new Date(start.getFullYear(), start.getMonth(), 1);
        return {
          ...loan,
          monthsRemaining,
          hasStarted,
        };
      })
      .sort((a, b) => {
        if (a.monthsRemaining === null && b.monthsRemaining === null) return 0;
        if (a.monthsRemaining === null) return 1;
        if (b.monthsRemaining === null) return -1;
        return a.monthsRemaining - b.monthsRemaining;
      });
  }, [fixedLoans, today]);

  return (
    <div className="space-y-6 pb-8">
      <Container className="pt-5">
        <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-blue-50 p-4 dark:from-slate-950 dark:to-slate-900">
          <p className="text-xs font-medium text-muted-foreground">
            Current Month Snapshot
          </p>
          <p className="text-sm text-muted-foreground">
            {new Date(currentMonthKey).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </Container>

      {error ? (
        <Container>
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        </Container>
      ) : null}

      <Container>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          <DashboardCard
            icon={<Coins className="h-4 w-4" />}
            title="Current Balance"
            value={loading ? "..." : formatMoney(currentBalance)}
            tone={currentBalance >= 0 ? "good" : "bad"}
          />
          <DashboardCard
            icon={<Landmark className="h-4 w-4" />}
            title="Total Income"
            value={loading ? "..." : formatMoney(currentIncomeTotal)}
          />
          <DashboardCard
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Remaining Expenses"
            value={loading ? "..." : formatMoney(expenseRemaining)}
            tone="warn"
          />
          <DashboardCard
            icon={<HandCoins className="h-4 w-4" />}
            title="Cash In Hand"
            value={loading ? "..." : formatMoney(currentCashInHand)}
          />
        </div>
      </Container>





      <Container>
        <div className="grid grid-cols-1 gap-4 laptop:grid-cols-2">
          <section className="rounded-xl border bg-background p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-rose-600" />
              Fixed Loans Completion Status
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading fixed loans...</p>
            ) : fixedLoanStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fixed loans found.</p>
            ) : (
              <div className="space-y-2">
                {fixedLoanStatus.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{loan.loan_name}</p>
                      <p className="text-xs text-muted-foreground">
                        EMI: {formatMoney(Number(loan.monthly_emi ?? 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {loan.end_date
                          ? `Ends: ${new Date(loan.end_date).toLocaleDateString("en-GB")}`
                          : "No end date"}
                      </p>
                      <p className="font-semibold">
                        {loan.monthsRemaining === null
                          ? "-"
                          : `${loan.monthsRemaining} month(s) left`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>


          <section className="rounded-xl border bg-background p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Gem className="h-4 w-4 text-sky-600" />
              Jewel Loans (Sorted by Due Date)
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading jewel loans...</p>
            ) : jewelLoanRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jewel loans found.</p>
            ) : (
              <div className="space-y-2">
                {jewelLoanRows.map((loan, index) => {
                  const dueDate = loan.due_date ? new Date(loan.due_date) : null;
                  const isOverdue = !!dueDate && dueDate < today && !isInMonth(loan.due_date, today);
                  const isCurrentMonth = !!dueDate && isInMonth(loan.due_date, today);
                  const isNextMonth =
                    !!dueDate &&
                    dueDate.getFullYear() ===
                    new Date(today.getFullYear(), today.getMonth() + 1, 1).getFullYear() &&
                    dueDate.getMonth() ===
                    new Date(today.getFullYear(), today.getMonth() + 1, 1).getMonth();

                  const cardBgClass = isOverdue || isCurrentMonth
                    ? "bg-rose-50 dark:bg-rose-950/20"
                    : isNextMonth
                      ? "bg-amber-50 dark:bg-amber-950/20"
                      : "bg-slate-50 dark:bg-slate-900/30";

                  return (
                    <div
                      key={`${loan.lender_name}-${loan.due_date}-${index}`}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${cardBgClass}`}
                    >
                      <div>
                        <p className="font-medium"> {loan.lender_name} ({loan.loan_type})</p>
                        <p className="text-xs text-muted-foreground">
                          <span>Loan Amount: {formatMoney(loan.principal)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${isCurrentMonth
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              : isNextMonth
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                          >
                            {loan.due_date
                              ? new Date(loan.due_date).toLocaleDateString("en-GB")
                              : "-"}
                          </span>
                        </p>
                        <p className="font-semibold">
                          Interest: {formatMoney(loan.interest)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </Container>
      <Container>
        <section className="rounded-xl border bg-background p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Expense Payment Progress (Current Month)
          </h3>
          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Total Planned</p>
              <p className="text-base font-semibold">{formatMoney(expenseTotal)}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Already Paid</p>
              <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
                {formatMoney(expensePaid)}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Still Pending</p>
              <p className="text-base font-semibold text-amber-700 dark:text-amber-300">
                {formatMoney(expenseRemaining)}
              </p>
            </div>
          </div>
        </section>
      </Container>
      <Container>
        <section className="rounded-xl border bg-background p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Expense by Category (Current Month)
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading expense chart...</p>
          ) : expenseChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expense data for this month.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span className="text-muted-foreground">Paid</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                  <span className="text-muted-foreground">Remaining</span>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="relative h-72">
                  <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground">
                    {[5, 4, 3, 2, 1, 0].map((step) => (
                      <div key={step} className="relative border-t border-slate-200 dark:border-slate-800">
                        <span className="absolute -left-1 -translate-x-full -translate-y-1/2">
                          {Math.round((chartMax * step) / 5).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-0 flex items-end gap-3 pt-2">
                    {expenseChartData.map((item) => {
                      const totalHeight = Math.max((item.amount / chartMax) * 100, 2);
                      const paidRatio = item.amount > 0 ? item.paid / item.amount : 0;
                      const paidHeight = paidRatio * 100;
                      const remainingHeight = (1 - paidRatio) * 100;

                      return (
                        <div
                          key={item.name}
                          className="flex h-full min-w-0 flex-1 flex-col items-center gap-2"
                        >
                          <div className="relative flex-1 w-full">
                            <div
                              className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-t-md"
                              style={{ height: `${totalHeight}%` }}
                            >
                              <div
                                className="absolute bottom-0 left-0 right-0 bg-blue-600"
                                style={{ height: `${paidHeight}%` }}
                              />
                              <div
                                className="absolute left-0 right-0 top-0 bg-cyan-500"
                                style={{ height: `${remainingHeight}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  value,
  tone = "normal",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  tone?: "normal" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "bad"
          ? "text-rose-700 dark:text-rose-300"
          : "text-foreground";

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
