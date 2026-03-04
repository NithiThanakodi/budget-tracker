"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

type IntervalType = "monthly" | "bi-monthly" | "quarterly" | "specific_months";

type ExpenseTemplate = {
  id: string;
  item_name: string;
  default_amount: number;
  interval_type: IntervalType;
  specific_months: number[];
  is_active: boolean;
  categories: { name: string } | null;
};

type ExpenseTemplateRow = {
  id: string;
  item_name: string;
  default_amount: number;
  interval_type: IntervalType;
  specific_months: number[];
  is_active: boolean;
  categories: { name: string } | { name: string }[] | null;
};

type BudgetEntry = {
  id: string;
  template_id: string;
  month_year: string;
  planned_amount: number | null;
  is_paid: boolean;
};

type IncomeSource = {
  id: string;
  name: string;
  amount: number;
  sort_order: number;
  is_active: boolean;
};

type IncomeMonthlyOverride = {
  id: string;
  income_source_id: string;
  month_year: string;
  amount: number;
};

type CashInHandEntry = {
  id: string;
  month_year: string;
  amount: number;
};

type LoanPaymentEntry = {
  id: string;
  loan_kind: "fixed" | "jewel_type";
  loan_ref: string;
  month_year: string;
  is_paid: boolean;
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
  loan_type: "bank" | "pawn";
  loan_amount: number | null;
  interest_rate: number | null;
  due_date: string | null;
};

type CellState = {
  amount: string;
  is_paid: boolean;
  entry_id?: string;
};

type AmountCellState = {
  amount: string;
  entry_id?: string;
};

type PaidCellState = {
  is_paid: boolean;
  entry_id?: string;
};

const monthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const firstDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

const monthInputFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const parseMonthInput = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const isTemplateApplicable = (template: ExpenseTemplate, monthDate: Date) => {
  const monthIndex = monthDate.getMonth();
  if (template.interval_type === "monthly") {
    return true;
  }
  if (template.interval_type === "bi-monthly") {
    return monthIndex % 2 === 0;
  }
  if (template.interval_type === "quarterly") {
    return monthIndex % 3 === 0;
  }
  return (template.specific_months ?? []).includes(monthIndex + 1);
};

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const jewelInterestOnDueMonth = (loan: JewelLoan, monthDate: Date) => {
  if (!loan.due_date) {
    return 0;
  }
  const dueDate = new Date(loan.due_date);
  if (!isSameMonth(monthDate, dueDate)) {
    return 0;
  }
  return (Number(loan.loan_amount ?? 0) * Number(loan.interest_rate ?? 0)) / 100;
};

export default function BudgetGridPage() {
  const [startMonth, setStartMonth] = useState(monthInputFromDate(new Date()));
  const [monthsToShow, setMonthsToShow] = useState(12);
  const [loading, setLoading] = useState(true);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [fixedLoans, setFixedLoans] = useState<FixedLoan[]>([]);
  const [jewelLoans, setJewelLoans] = useState<JewelLoan[]>([]);
  const [cellMap, setCellMap] = useState<Record<string, CellState>>({});
  const [incomeCellMap, setIncomeCellMap] = useState<Record<string, AmountCellState>>({});
  const [cashCellMap, setCashCellMap] = useState<Record<string, AmountCellState>>({});
  const [loanPaidMap, setLoanPaidMap] = useState<Record<string, PaidCellState>>({});

  const months = useMemo(() => {
    const start = parseMonthInput(startMonth);
    return Array.from({ length: monthsToShow }).map((_, index) => {
      const d = new Date(start.getFullYear(), start.getMonth() + index, 1);
      return {
        label: monthLabel(d),
        key: firstDay(d),
        date: d,
      };
    });
  }, [startMonth, monthsToShow]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const start = parseMonthInput(startMonth);
    const end = new Date(start.getFullYear(), start.getMonth() + monthsToShow - 1, 1);
    const startDate = firstDay(start);
    const endDate = firstDay(end);

    const [
      templatesRes,
      entriesRes,
      incomesRes,
      incomeOverridesRes,
      cashInHandRes,
      loanPaymentsRes,
      loansRes,
      jewelLoansRes,
    ] =
      await Promise.all([
      supabase
        .from("expense_templates")
        .select(
          "id, item_name, default_amount, interval_type, specific_months, is_active, categories(name)",
        )
        .eq("is_active", true)
        .order("item_name", { ascending: true }),
      supabase
        .from("budget_entries")
        .select("id, template_id, month_year, planned_amount, is_paid")
        .gte("month_year", startDate)
        .lte("month_year", endDate),
      supabase
        .from("income_sources")
        .select("id, name, amount, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("income_monthly_overrides")
        .select("id, income_source_id, month_year, amount")
        .gte("month_year", startDate)
        .lte("month_year", endDate),
      supabase
        .from("cash_in_hand_entries")
        .select("id, month_year, amount")
        .gte("month_year", startDate)
        .lte("month_year", endDate),
      supabase
        .from("loan_payment_entries")
        .select("id, loan_kind, loan_ref, month_year, is_paid")
        .gte("month_year", startDate)
        .lte("month_year", endDate),
      supabase
        .from("fixed_loans")
        .select("id, loan_name, monthly_emi, start_date, end_date, is_active")
        .order("loan_name", { ascending: true }),
      supabase
        .from("jewel_loans")
        .select("loan_type, loan_amount, interest_rate, due_date")
        .order("loan_type", { ascending: true })
        .order("due_date", { ascending: true }),
    ]);

    if (templatesRes.error) {
      setError(templatesRes.error.message);
      setLoading(false);
      return;
    }
    if (entriesRes.error) {
      setError(entriesRes.error.message);
      setLoading(false);
      return;
    }
    if (incomesRes.error) {
      setError(incomesRes.error.message);
      setLoading(false);
      return;
    }
    if (incomeOverridesRes.error) {
      setError(incomeOverridesRes.error.message);
      setLoading(false);
      return;
    }
    if (cashInHandRes.error) {
      setError(cashInHandRes.error.message);
      setLoading(false);
      return;
    }
    if (loanPaymentsRes.error) {
      setError(loanPaymentsRes.error.message);
      setLoading(false);
      return;
    }
    if (loansRes.error) {
      setError(loansRes.error.message);
      setLoading(false);
      return;
    }
    if (jewelLoansRes.error) {
      setError(jewelLoansRes.error.message);
      setLoading(false);
      return;
    }

    const templateRows: ExpenseTemplate[] =
      ((templatesRes.data as ExpenseTemplateRow[]) ?? []).map((row) => ({
        ...row,
        categories: Array.isArray(row.categories)
          ? (row.categories[0] ?? null)
          : row.categories,
      }));
    const entryRows = (entriesRes.data as BudgetEntry[]) ?? [];
    const sourceRows = (incomesRes.data as IncomeSource[]) ?? [];
    const sourceOverrideRows =
      (incomeOverridesRes.data as IncomeMonthlyOverride[]) ?? [];
    const cashRows = (cashInHandRes.data as CashInHandEntry[]) ?? [];
    const loanPaymentRows = (loanPaymentsRes.data as LoanPaymentEntry[]) ?? [];

    const nextCellMap: Record<string, CellState> = {};
    const entryByKey = new Map(
      entryRows.map((entry) => [`${entry.template_id}__${entry.month_year}`, entry]),
    );

    for (const template of templateRows) {
      for (const month of months) {
        const mapKey = `${template.id}__${month.key}`;
        const entry = entryByKey.get(mapKey);
        const applicable = isTemplateApplicable(template, month.date);
        const defaultAmount = applicable ? Number(template.default_amount ?? 0) : 0;
        nextCellMap[mapKey] = {
          amount: String(entry?.planned_amount ?? defaultAmount),
          is_paid: entry?.is_paid ?? false,
          entry_id: entry?.id,
        };
      }
    }

    const nextIncomeCellMap: Record<string, AmountCellState> = {};
    const incomeOverrideByKey = new Map(
      sourceOverrideRows.map((row) => [`${row.income_source_id}__${row.month_year}`, row]),
    );

    for (const source of sourceRows) {
      for (const month of months) {
        const mapKey = `${source.id}__${month.key}`;
        const override = incomeOverrideByKey.get(mapKey);
        nextIncomeCellMap[mapKey] = {
          amount: String(override?.amount ?? source.amount ?? 0),
          entry_id: override?.id,
        };
      }
    }

    const cashByMonth = new Map(cashRows.map((row) => [row.month_year, row]));
    const nextCashCellMap: Record<string, AmountCellState> = {};
    for (const month of months) {
      let defaultIncomeForMonth = 0;
      for (const source of sourceRows) {
        defaultIncomeForMonth +=
          Number(nextIncomeCellMap[`${source.id}__${month.key}`]?.amount ?? 0) || 0;
      }
      const row = cashByMonth.get(month.key);
      nextCashCellMap[month.key] = {
        amount: String(row?.amount ?? defaultIncomeForMonth),
        entry_id: row?.id,
      };
    }

    const nextLoanPaidMap: Record<string, PaidCellState> = {};
    for (const row of loanPaymentRows) {
      const mapKey = `${row.loan_kind}__${row.loan_ref}__${row.month_year}`;
      nextLoanPaidMap[mapKey] = {
        is_paid: row.is_paid,
        entry_id: row.id,
      };
    }

    setTemplates(templateRows);
    setIncomeSources(sourceRows);
    setFixedLoans((loansRes.data as FixedLoan[]) ?? []);
    setJewelLoans((jewelLoansRes.data as JewelLoan[]) ?? []);
    setCellMap(nextCellMap);
    setIncomeCellMap(nextIncomeCellMap);
    setCashCellMap(nextCashCellMap);
    setLoanPaidMap(nextLoanPaidMap);
    setLoading(false);
  }, [months, monthsToShow, startMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupedTemplates = useMemo(() => {
    return templates.reduce<Record<string, ExpenseTemplate[]>>((acc, template) => {
      const group = template.categories?.name ?? "Uncategorized";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(template);
      return acc;
    }, {});
  }, [templates]);

  const getCell = useCallback(
    (templateId: string, monthKey: string) =>
      cellMap[`${templateId}__${monthKey}`] ?? { amount: "0", is_paid: false },
    [cellMap],
  );

  const getIncomeCell = useCallback(
    (sourceId: string, monthKey: string) =>
      incomeCellMap[`${sourceId}__${monthKey}`] ?? { amount: "0" },
    [incomeCellMap],
  );

  const getCashCell = useCallback(
    (monthKey: string) => cashCellMap[monthKey] ?? { amount: "0" },
    [cashCellMap],
  );

  const getLoanPaidCell = useCallback(
    (kind: "fixed" | "jewel_type", ref: string, monthKey: string) =>
      loanPaidMap[`${kind}__${ref}__${monthKey}`] ?? { is_paid: false },
    [loanPaidMap],
  );

  const saveCell = async (
    templateId: string,
    monthKey: string,
    next: { amount?: string; is_paid?: boolean },
  ) => {
    const key = `${templateId}__${monthKey}`;
    const current = getCell(templateId, monthKey);
    const nextAmount = next.amount ?? current.amount;
    const nextPaid = next.is_paid ?? current.is_paid;

    setCellMap((prev) => ({
      ...prev,
      [key]: {
        ...current,
        amount: nextAmount,
        is_paid: nextPaid,
      },
    }));

    setSavingCellKey(key);
    const { data, error: upsertError } = await supabase
      .from("budget_entries")
      .upsert(
        {
          id: current.entry_id,
          template_id: templateId,
          month_year: monthKey,
          planned_amount: Number(nextAmount) || 0,
          is_paid: nextPaid,
        },
        { onConflict: "template_id,month_year" },
      )
      .select("id")
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingCellKey(null);
      return;
    }

    setCellMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        entry_id: data.id,
      },
    }));
    setSavingCellKey(null);
  };

  const saveIncomeCell = async (sourceId: string, monthKey: string) => {
    const key = `${sourceId}__${monthKey}`;
    const current = getIncomeCell(sourceId, monthKey);
    setSavingCellKey(`income:${key}`);

    const { data, error: upsertError } = await supabase
      .from("income_monthly_overrides")
      .upsert(
        {
          id: current.entry_id,
          income_source_id: sourceId,
          month_year: monthKey,
          amount: Number(current.amount) || 0,
        },
        { onConflict: "income_source_id,month_year" },
      )
      .select("id")
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingCellKey(null);
      return;
    }

    setIncomeCellMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        entry_id: data.id,
      },
    }));
    setSavingCellKey(null);
  };

  const saveCashCell = async (monthKey: string) => {
    const current = getCashCell(monthKey);
    setSavingCellKey(`cash:${monthKey}`);

    const { data, error: upsertError } = await supabase
      .from("cash_in_hand_entries")
      .upsert(
        {
          id: current.entry_id,
          month_year: monthKey,
          amount: Number(current.amount) || 0,
        },
        { onConflict: "month_year" },
      )
      .select("id")
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingCellKey(null);
      return;
    }

    setCashCellMap((prev) => ({
      ...prev,
      [monthKey]: {
        ...prev[monthKey],
        entry_id: data.id,
      },
    }));
    setSavingCellKey(null);
  };

  const saveLoanPaidCell = async (
    kind: "fixed" | "jewel_type",
    ref: string,
    monthKey: string,
    isPaid: boolean,
  ) => {
    const key = `${kind}__${ref}__${monthKey}`;
    const current = getLoanPaidCell(kind, ref, monthKey);

    setLoanPaidMap((prev) => ({
      ...prev,
      [key]: {
        ...current,
        is_paid: isPaid,
      },
    }));

    setSavingCellKey(`loan:${key}`);
    const { data, error: upsertError } = await supabase
      .from("loan_payment_entries")
      .upsert(
        {
          id: current.entry_id,
          loan_kind: kind,
          loan_ref: ref,
          month_year: monthKey,
          is_paid: isPaid,
        },
        { onConflict: "loan_kind,loan_ref,month_year" },
      )
      .select("id")
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingCellKey(null);
      return;
    }

    setLoanPaidMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        entry_id: data.id,
      },
    }));
    setSavingCellKey(null);
  };

  const monthlyExpenseTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const template of templates) {
        const value = Number(getCell(template.id, month.key).amount) || 0;
        total += value;
      }
      return total;
    });
  }, [months, templates, getCell]);

  const monthlyRemainingExpenseTemplateTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const template of templates) {
        const cell = getCell(template.id, month.key);
        if (!cell.is_paid) {
          total += Number(cell.amount) || 0;
        }
      }
      return total;
    });
  }, [months, templates, getCell]);

  const monthlyFixedLoanTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const loan of fixedLoans) {
        const start = new Date(loan.start_date);
        const end = loan.end_date ? new Date(loan.end_date) : null;
        const m = month.date;
        const inRange =
          m >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || m <= new Date(end.getFullYear(), end.getMonth(), 1));
        if (inRange) {
          total += Number(loan.monthly_emi ?? 0);
        }
      }
      return total;
    });
  }, [months, fixedLoans]);

  const monthlyJewelBankTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const loan of jewelLoans) {
        if (loan.loan_type === "bank") {
          total += jewelInterestOnDueMonth(loan, month.date);
        }
      }
      return total;
    });
  }, [months, jewelLoans]);

  const monthlyJewelPawnTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const loan of jewelLoans) {
        if (loan.loan_type === "pawn") {
          total += jewelInterestOnDueMonth(loan, month.date);
        }
      }
      return total;
    });
  }, [months, jewelLoans]);

  const monthlyJewelLoanTotals = useMemo(
    () =>
      monthlyJewelBankTotals.map(
        (bankTotal, index) => bankTotal + monthlyJewelPawnTotals[index],
      ),
    [monthlyJewelBankTotals, monthlyJewelPawnTotals],
  );

  const monthlyRemainingFixedLoanTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const loan of fixedLoans) {
        const start = new Date(loan.start_date);
        const end = loan.end_date ? new Date(loan.end_date) : null;
        const inRange =
          month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
        if (!inRange) {
          continue;
        }
        const paid = getLoanPaidCell("fixed", loan.id, month.key).is_paid;
        if (!paid) {
          total += Number(loan.monthly_emi ?? 0);
        }
      }
      return total;
    });
  }, [months, fixedLoans, getLoanPaidCell]);

  const monthlyRemainingJewelBankTotals = useMemo(() => {
    return months.map((month, index) => {
      const paid = getLoanPaidCell("jewel_type", "bank", month.key).is_paid;
      return paid ? 0 : monthlyJewelBankTotals[index];
    });
  }, [months, monthlyJewelBankTotals, getLoanPaidCell]);

  const monthlyRemainingJewelPawnTotals = useMemo(() => {
    return months.map((month, index) => {
      const paid = getLoanPaidCell("jewel_type", "pawn", month.key).is_paid;
      return paid ? 0 : monthlyJewelPawnTotals[index];
    });
  }, [months, monthlyJewelPawnTotals, getLoanPaidCell]);

  const monthlyRemainingJewelLoanTotals = useMemo(
    () =>
      monthlyRemainingJewelBankTotals.map(
        (bankTotal, index) => bankTotal + monthlyRemainingJewelPawnTotals[index],
      ),
    [monthlyRemainingJewelBankTotals, monthlyRemainingJewelPawnTotals],
  );

  const monthlyIncomeTotals = useMemo(
    () =>
      months.map((month) => {
        let total = 0;
        for (const source of incomeSources) {
          total += Number(getIncomeCell(source.id, month.key).amount) || 0;
        }
        return total;
      }),
    [months, incomeSources, getIncomeCell],
  );

  const monthlyCashInHandTotals = useMemo(
    () => months.map((month) => Number(getCashCell(month.key).amount) || 0),
    [months, getCashCell],
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading budget grid...</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Start Month</label>
          <input
            type="month"
            value={startMonth}
            onChange={(event) => setStartMonth(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Months</label>
          <select
            value={String(monthsToShow)}
            onChange={(event) => setMonthsToShow(Number(event.target.value))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="6">6</option>
            <option value="12">12</option>
            <option value="18">18</option>
            <option value="24">24</option>
          </select>
        </div>
        <Button variant="outline" onClick={loadData}>
          Reload
        </Button>
        {savingCellKey ? (
          <span className="text-xs text-muted-foreground">Saving changes...</span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-[1300px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 min-w-[250px] border-r bg-muted/40 px-3 py-2 text-left">
                Expense
              </th>
              {months.map((month) => (
                <th key={month.key} className="min-w-[130px] border-r px-3 py-2 text-left">
                  {month.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedTemplates).map(([groupName, rows]) => (
              <FragmentGroup
                key={groupName}
                groupName={groupName}
                rows={rows}
                months={months}
                getCell={getCell}
                onAmountChange={(templateId, monthKey, value) =>
                  setCellMap((prev) => ({
                    ...prev,
                    [`${templateId}__${monthKey}`]: {
                      ...getCell(templateId, monthKey),
                      amount: value,
                    },
                  }))
                }
                onAmountBlur={(templateId, monthKey) =>
                  saveCell(templateId, monthKey, {
                    amount: getCell(templateId, monthKey).amount,
                  })
                }
                onPaidToggle={(templateId, monthKey, value) =>
                  saveCell(templateId, monthKey, { is_paid: value })
                }
              />
            ))}

            <tr className="border-y bg-amber-100/60 font-semibold dark:bg-amber-900/30">
              <td className="sticky left-0 z-10 border-r bg-amber-100/60 px-3 py-2 dark:bg-amber-900/30">
                Total Expense
              </td>
              {monthlyExpenseTotals.map((total, index) => (
                <td key={`expense-total-${index}`} className="border-r px-3 py-2">
                  {total}
                </td>
              ))}
            </tr>

            <tr className="border-y bg-rose-100/60 font-semibold dark:bg-rose-900/30">
              <td className="sticky left-0 z-10 border-r bg-rose-100/60 px-3 py-2 dark:bg-rose-900/30">
                Fixed Loans
              </td>
              {months.map((month) => (
                <td key={`fixed-header-${month.key}`} className="border-r px-3 py-2" />
              ))}
            </tr>
            {fixedLoans.map((loan) => (
              <tr key={loan.id} className="border-t bg-rose-50/40 dark:bg-rose-950/20">
                <td className="sticky left-0 z-10 border-r bg-rose-50/40 px-3 py-2 dark:bg-rose-950/20">
                  {loan.loan_name}
                  {!loan.is_active ? " (inactive)" : ""}
                </td>
                {months.map((month) => {
                  const start = new Date(loan.start_date);
                  const end = loan.end_date ? new Date(loan.end_date) : null;
                  const inRange =
                    month.date >=
                      new Date(start.getFullYear(), start.getMonth(), 1) &&
                    (!end ||
                      month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
                  return (
                    <td key={`fixed-${loan.id}-${month.key}`} className="border-r px-3 py-2">
                      {inRange ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={getLoanPaidCell("fixed", loan.id, month.key).is_paid}
                            onChange={(event) =>
                              saveLoanPaidCell(
                                "fixed",
                                loan.id,
                                month.key,
                                event.target.checked,
                              )
                            }
                          />
                          <span>{Number(loan.monthly_emi ?? 0)}</span>
                        </div>
                      ) : (
                        0
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-y bg-rose-100/60 font-semibold dark:bg-rose-900/30">
              <td className="sticky left-0 z-10 border-r bg-rose-100/60 px-3 py-2 dark:bg-rose-900/30">
                Total Fixed Loans
              </td>
              {monthlyFixedLoanTotals.map((total, index) => (
                <td key={`loan-total-${index}`} className="border-r px-3 py-2">
                  {total}
                </td>
              ))}
            </tr>

            <tr className="border-y bg-sky-100/60 font-semibold dark:bg-sky-900/30">
              <td className="sticky left-0 z-10 border-r bg-sky-100/60 px-3 py-2 dark:bg-sky-900/30">
                Jewel Loans (Interest Only on Due Month)
              </td>
              {months.map((month) => (
                <td key={`jewel-header-${month.key}`} className="border-r px-3 py-2" />
              ))}
            </tr>
            <tr className="border-t bg-sky-50/40 font-semibold dark:bg-sky-950/20">
              <td className="sticky left-0 z-10 border-r bg-sky-50/40 px-3 py-2 dark:bg-sky-950/20">
                Bank (Interest)
              </td>
              {months.map((month, index) => (
                <td key={`jewel-bank-${index}`} className="border-r px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getLoanPaidCell("jewel_type", "bank", month.key).is_paid}
                      onChange={(event) =>
                        saveLoanPaidCell(
                          "jewel_type",
                          "bank",
                          month.key,
                          event.target.checked,
                        )
                      }
                    />
                    <span>{monthlyJewelBankTotals[index]}</span>
                  </div>
                </td>
              ))}
            </tr>
            <tr className="border-t bg-sky-50/40 font-semibold dark:bg-sky-950/20">
              <td className="sticky left-0 z-10 border-r bg-sky-50/40 px-3 py-2 dark:bg-sky-950/20">
                Pawn (Interest)
              </td>
              {months.map((month, index) => (
                <td key={`jewel-pawn-${index}`} className="border-r px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getLoanPaidCell("jewel_type", "pawn", month.key).is_paid}
                      onChange={(event) =>
                        saveLoanPaidCell(
                          "jewel_type",
                          "pawn",
                          month.key,
                          event.target.checked,
                        )
                      }
                    />
                    <span>{monthlyJewelPawnTotals[index]}</span>
                  </div>
                </td>
              ))}
            </tr>
            <tr className="border-y bg-sky-100/60 font-semibold dark:bg-sky-900/30">
              <td className="sticky left-0 z-10 border-r bg-sky-100/60 px-3 py-2 dark:bg-sky-900/30">
                Total Jewel Loans
              </td>
              {monthlyJewelLoanTotals.map((total, index) => (
                <td key={`jewel-total-${index}`} className="border-r px-3 py-2">
                  {total}
                </td>
              ))}
            </tr>

            <tr className="border-y bg-sky-100/60 font-semibold dark:bg-sky-900/30">
              <td className="sticky left-0 z-10 border-r bg-sky-100/60 px-3 py-2 dark:bg-sky-900/30">
                Total Monthly Confirmed
              </td>
              {monthlyExpenseTotals.map((expense, index) => (
                <td key={`confirmed-${index}`} className="border-r px-3 py-2">
                  {expense + monthlyFixedLoanTotals[index] + monthlyJewelLoanTotals[index]}
                </td>
              ))}
            </tr>

            <tr className="border-y bg-emerald-100/60 font-semibold dark:bg-emerald-900/30">
              <td className="sticky left-0 z-10 border-r bg-emerald-100/60 px-3 py-2 dark:bg-emerald-900/30">
                Income Sources
              </td>
              {months.map((month) => (
                <td key={`income-header-${month.key}`} className="border-r px-3 py-2" />
              ))}
            </tr>
            {incomeSources.map((source, sourceIndex) => (
              <tr
                key={`${source.id}-${sourceIndex}`}
                className="border-t bg-emerald-50/40 font-semibold dark:bg-emerald-950/20"
              >
                <td className="sticky left-0 z-10 border-r bg-emerald-50/40 px-3 py-2 dark:bg-emerald-950/20">
                  {source.name}
                </td>
                {months.map((month) => {
                  const cell = getIncomeCell(source.id, month.key);
                  return (
                    <td
                      key={`income-${source.id}-${month.key}`}
                      className="border-r px-2 py-1"
                    >
                      <input
                        value={cell.amount}
                        onChange={(event) =>
                          setIncomeCellMap((prev) => ({
                            ...prev,
                            [`${source.id}__${month.key}`]: {
                              ...getIncomeCell(source.id, month.key),
                              amount: event.target.value,
                            },
                          }))
                        }
                        onBlur={() => saveIncomeCell(source.id, month.key)}
                        className="h-8 w-[88px] rounded border border-input bg-background px-2 text-right text-xs"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-y bg-emerald-100/60 font-semibold dark:bg-emerald-900/30">
              <td className="sticky left-0 z-10 border-r bg-emerald-100/60 px-3 py-2 dark:bg-emerald-900/30">
                Total Income
              </td>
              {months.map((month, index) => (
                <td key={`income-total-${month.key}`} className="border-r px-3 py-2">
                  {monthlyIncomeTotals[index]}
                </td>
              ))}
            </tr>
            <tr className="border-y bg-indigo-100/60 font-semibold dark:bg-indigo-900/30">
              <td className="sticky left-0 z-10 border-r bg-indigo-100/60 px-3 py-2 dark:bg-indigo-900/30">
                Remaining Expenses
              </td>
              {months.map((month, index) => (
                <td key={`remaining-expenses-${month.key}`} className="border-r px-3 py-2">
                  {monthlyRemainingExpenseTemplateTotals[index] +
                    monthlyRemainingFixedLoanTotals[index] +
                    monthlyRemainingJewelLoanTotals[index]}
                </td>
              ))}
            </tr>
            <tr className="border-y bg-indigo-100/60 font-semibold dark:bg-indigo-900/30">
              <td className="sticky left-0 z-10 border-r bg-indigo-100/60 px-3 py-2 dark:bg-indigo-900/30">
                Cash In Hand
              </td>
              {months.map((month) => {
                const cell = getCashCell(month.key);
                return (
                  <td key={`cash-in-hand-${month.key}`} className="border-r px-2 py-1">
                    <input
                      value={cell.amount}
                      onChange={(event) =>
                        setCashCellMap((prev) => ({
                          ...prev,
                          [month.key]: {
                            ...getCashCell(month.key),
                            amount: event.target.value,
                          },
                        }))
                      }
                      onBlur={() => saveCashCell(month.key)}
                      className="h-8 w-[88px] rounded border border-input bg-background px-2 text-right text-xs"
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="border-y bg-green-200/70 font-bold dark:bg-green-900/50">
              <td className="sticky left-0 z-10 border-r bg-green-200/70 px-3 py-2 dark:bg-green-900/50">
                Balance Amount
              </td>
              {months.map((month, index) => (
                <td key={`est-balance-${month.key}`} className="border-r px-3 py-2">
                  {monthlyCashInHandTotals[index] -
                    (monthlyRemainingExpenseTemplateTotals[index] +
                      monthlyRemainingFixedLoanTotals[index] +
                      monthlyRemainingJewelLoanTotals[index])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FragmentGroup({
  groupName,
  rows,
  months,
  getCell,
  onAmountChange,
  onAmountBlur,
  onPaidToggle,
}: {
  groupName: string;
  rows: ExpenseTemplate[];
  months: { label: string; key: string; date: Date }[];
  getCell: (templateId: string, monthKey: string) => CellState;
  onAmountChange: (templateId: string, monthKey: string, value: string) => void;
  onAmountBlur: (templateId: string, monthKey: string) => void;
  onPaidToggle: (templateId: string, monthKey: string, value: boolean) => void;
}) {
  return (
    <>
      <tr className="border-t bg-muted/20">
        <td className="sticky left-0 z-10 border-r bg-muted/20 px-3 py-2 font-semibold">
          {groupName}
        </td>
        {months.map((month) => (
          <td key={`${groupName}-${month.key}`} className="border-r px-3 py-2" />
        ))}
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-t">
          <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 font-medium">
            {row.item_name}
          </td>
          {months.map((month) => {
            const cell = getCell(row.id, month.key);
            return (
              <td key={`${row.id}-${month.key}`} className="border-r px-2 py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cell.is_paid}
                    onChange={(event) =>
                      onPaidToggle(row.id, month.key, event.target.checked)
                    }
                  />
                  <input
                    value={cell.amount}
                    onChange={(event) =>
                      onAmountChange(row.id, month.key, event.target.value)
                    }
                    onBlur={() => onAmountBlur(row.id, month.key)}
                    className="h-8 w-[88px] rounded border border-input bg-background px-2 text-right text-xs"
                  />
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
