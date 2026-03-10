"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  loan_kind: "fixed" | "jewel_type" | "investment";
  loan_ref: string;
  month_year: string;
  is_paid: boolean;
};

type LoanMonthlyOverride = {
  id: string;
  loan_kind: "fixed" | "jewel_type" | "investment";
  loan_ref: string;
  month_year: string;
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
  loan_type: "bank" | "pawn";
  loan_amount: number | null;
  interest_rate: number | null;
  due_date: string | null;
};

type CeetuInvestment = {
  id: string;
  name: string;
  monthly_emi: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
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

type GridComment = {
  id: string;
  cell_kind: "expense" | "loan" | "income" | "cash";
  cell_ref: string;
  month_year: string;
  comment: string;
};

type CommentCellState = {
  comment: string;
  entry_id?: string;
};

type AuditFieldName = "amount" | "is_paid" | "comment";

type BudgetGridAuditLog = {
  id: string;
  changed_at: string;
  month_year: string;
  cell_kind: "expense" | "loan" | "income" | "cash" | "comment";
  cell_ref: string;
  field_name: AuditFieldName;
  old_value: string;
  new_value: string;
  changed_by: string | null;
};

type SnapshotFieldName = "amount" | "is_paid" | "comment";

type BudgetGridSnapshot = {
  id: string;
  snapshot_name: string;
  created_at: string;
  created_by: string | null;
  start_month: string;
  end_month: string;
};

type BudgetGridSnapshotItem = {
  id: string;
  snapshot_id: string;
  month_year: string;
  cell_kind: "expense" | "loan" | "income" | "cash" | "comment";
  cell_ref: string;
  field_name: SnapshotFieldName;
  field_value: string;
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

const controlClass =
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const moneyInputClass =
  "h-[1.25rem] w-[82px] rounded-[5px] border bg-transparent px-1.5 text-right text-sm font-semibold text-black shadow-none tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-100";

const checkboxBaseClass =
  "h-[1.2rem] w-[1.2rem] shrink-0 rounded-[5px] border bg-white/80 shadow-sm";
const checkboxExpenseClass =
  `${checkboxBaseClass} border-slate-500/70 accent-slate-800`;
const checkboxFixedLoanClass =
  `${checkboxBaseClass} border-rose-400/80 accent-rose-700`;
const checkboxJewelLoanClass =
  `${checkboxBaseClass} border-blue-400/80 accent-blue-700`;
const checkboxInvestmentClass =
  `${checkboxBaseClass} border-violet-400/80 accent-violet-700`;

const getBalanceCellClass = (value: number) => {
  if (value > 0) {
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-100";
  }
  if (value < 0) {
    return "bg-rose-100 text-rose-900 dark:bg-rose-900/35 dark:text-rose-100";
  }
  return "bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-100";
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
  const [ceetuInvestments, setCeetuInvestments] = useState<CeetuInvestment[]>([]);
  const [cellMap, setCellMap] = useState<Record<string, CellState>>({});
  const [committedCellMap, setCommittedCellMap] = useState<Record<string, CellState>>({});
  const [incomeCellMap, setIncomeCellMap] = useState<Record<string, AmountCellState>>({});
  const [committedIncomeCellMap, setCommittedIncomeCellMap] = useState<
    Record<string, AmountCellState>
  >({});
  const [cashCellMap, setCashCellMap] = useState<Record<string, AmountCellState>>({});
  const [committedCashCellMap, setCommittedCashCellMap] = useState<
    Record<string, AmountCellState>
  >({});
  const [loanPaidMap, setLoanPaidMap] = useState<Record<string, PaidCellState>>({});
  const [committedLoanPaidMap, setCommittedLoanPaidMap] = useState<
    Record<string, PaidCellState>
  >({});
  const [loanAmountMap, setLoanAmountMap] = useState<Record<string, AmountCellState>>({});
  const [committedLoanAmountMap, setCommittedLoanAmountMap] = useState<
    Record<string, AmountCellState>
  >({});
  const [commentMap, setCommentMap] = useState<Record<string, CommentCellState>>({});
  const [committedCommentMap, setCommittedCommentMap] = useState<
    Record<string, CommentCellState>
  >({});
  const [openCommentKey, setOpenCommentKey] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<BudgetGridAuditLog[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<BudgetGridSnapshot[]>([]);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

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
      loanOverridesRes,
      loansRes,
      jewelLoansRes,
      ceetuInvestmentsRes,
      commentsRes,
      auditsRes,
      snapshotsRes,
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
          .from("loan_monthly_overrides")
          .select("id, loan_kind, loan_ref, month_year, amount")
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
        supabase
          .from("ceetu_investments")
          .select("id, name, monthly_emi, start_date, end_date, is_active")
          .order("name", { ascending: true }),
        supabase
          .from("budget_grid_comments")
          .select("id, cell_kind, cell_ref, month_year, comment")
          .gte("month_year", startDate)
          .lte("month_year", endDate),
        supabase
          .from("budget_grid_audit_logs")
          .select(
            "id, changed_at, month_year, cell_kind, cell_ref, field_name, old_value, new_value, changed_by",
          )
          .order("changed_at", { ascending: false })
          .limit(200),
        supabase
          .from("budget_grid_snapshots")
          .select("id, snapshot_name, created_at, created_by, start_month, end_month")
          .order("created_at", { ascending: false })
          .limit(30),
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
    if (loanOverridesRes.error) {
      setError(loanOverridesRes.error.message);
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
    if (ceetuInvestmentsRes.error) {
      setError(ceetuInvestmentsRes.error.message);
      setLoading(false);
      return;
    }
    if (commentsRes.error) {
      setError(commentsRes.error.message);
      setLoading(false);
      return;
    }
    if (auditsRes.error) {
      setError(auditsRes.error.message);
      setLoading(false);
      return;
    }
    if (snapshotsRes.error) {
      setError(snapshotsRes.error.message);
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
    const loanOverrideRows = (loanOverridesRes.data as LoanMonthlyOverride[]) ?? [];
    const fixedLoanRows = (loansRes.data as FixedLoan[]) ?? [];
    const jewelLoanRows = (jewelLoansRes.data as JewelLoan[]) ?? [];
    const ceetuInvestmentRows =
      (ceetuInvestmentsRes.data as CeetuInvestment[]) ?? [];
    const commentRows = (commentsRes.data as GridComment[]) ?? [];
    const auditRows = (auditsRes.data as BudgetGridAuditLog[]) ?? [];
    const snapshotRows = (snapshotsRes.data as BudgetGridSnapshot[]) ?? [];

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

    const overrideByKey = new Map(
      loanOverrideRows.map((row) => [
        `${row.loan_kind}__${row.loan_ref}__${row.month_year}`,
        row,
      ]),
    );
    const nextLoanAmountMap: Record<string, AmountCellState> = {};
    const nextCommentMap: Record<string, CommentCellState> = {};

    const getJewelTypeDefault = (type: "bank" | "pawn", monthDate: Date) => {
      let total = 0;
      for (const loan of jewelLoanRows) {
        if (loan.loan_type === type) {
          total += jewelInterestOnDueMonth(loan, monthDate);
        }
      }
      return total;
    };

    for (const loan of fixedLoanRows) {
      for (const month of months) {
        const start = new Date(loan.start_date);
        const end = loan.end_date ? new Date(loan.end_date) : null;
        const inRange =
          month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
        const key = `fixed__${loan.id}__${month.key}`;
        const override = overrideByKey.get(key);
        nextLoanAmountMap[key] = {
          amount: String(override?.amount ?? (inRange ? Number(loan.monthly_emi ?? 0) : 0)),
          entry_id: override?.id,
        };
      }
    }

    for (const month of months) {
      const bankKey = `jewel_type__bank__${month.key}`;
      const pawnKey = `jewel_type__pawn__${month.key}`;
      const bankOverride = overrideByKey.get(bankKey);
      const pawnOverride = overrideByKey.get(pawnKey);
      nextLoanAmountMap[bankKey] = {
        amount: String(bankOverride?.amount ?? getJewelTypeDefault("bank", month.date)),
        entry_id: bankOverride?.id,
      };
      nextLoanAmountMap[pawnKey] = {
        amount: String(pawnOverride?.amount ?? getJewelTypeDefault("pawn", month.date)),
        entry_id: pawnOverride?.id,
      };
    }

    for (const investment of ceetuInvestmentRows) {
      for (const month of months) {
        const start = new Date(investment.start_date);
        const end = investment.end_date ? new Date(investment.end_date) : null;
        const inRange =
          month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
        const key = `investment__${investment.id}__${month.key}`;
        const override = overrideByKey.get(key);
        nextLoanAmountMap[key] = {
          amount: String(
            override?.amount ?? (inRange ? Number(investment.monthly_emi ?? 0) : 0),
          ),
          entry_id: override?.id,
        };
      }
    }

    for (const row of commentRows) {
      const commentKey = `${row.cell_kind}__${row.cell_ref}__${row.month_year}`;
      nextCommentMap[commentKey] = {
        comment: row.comment ?? "",
        entry_id: row.id,
      };
    }

    setTemplates(templateRows);
    setIncomeSources(sourceRows);
    setFixedLoans(fixedLoanRows);
    setCeetuInvestments(ceetuInvestmentRows);
    setCellMap(nextCellMap);
    setCommittedCellMap(nextCellMap);
    setIncomeCellMap(nextIncomeCellMap);
    setCommittedIncomeCellMap(nextIncomeCellMap);
    setCashCellMap(nextCashCellMap);
    setCommittedCashCellMap(nextCashCellMap);
    setLoanPaidMap(nextLoanPaidMap);
    setCommittedLoanPaidMap(nextLoanPaidMap);
    setLoanAmountMap(nextLoanAmountMap);
    setCommittedLoanAmountMap(nextLoanAmountMap);
    setCommentMap(nextCommentMap);
    setCommittedCommentMap(nextCommentMap);
    setAuditLogs(auditRows);
    setSnapshots(snapshotRows);
    setLoading(false);
  }, [months, monthsToShow, startMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserEmail(data.user?.email?.toLowerCase() ?? null);
    };
    loadCurrentUser();
  }, []);

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
    (kind: "fixed" | "jewel_type" | "investment", ref: string, monthKey: string) =>
      loanPaidMap[`${kind}__${ref}__${monthKey}`] ?? { is_paid: false },
    [loanPaidMap],
  );

  const getLoanAmountCell = useCallback(
    (kind: "fixed" | "jewel_type" | "investment", ref: string, monthKey: string) =>
      loanAmountMap[`${kind}__${ref}__${monthKey}`] ?? { amount: "0" },
    [loanAmountMap],
  );

  const recordAuditLog = useCallback(
    async ({
      cellKind,
      cellRef,
      monthKey,
      fieldName,
      oldValue,
      newValue,
    }: {
      cellKind: "expense" | "loan" | "income" | "cash" | "comment";
      cellRef: string;
      monthKey: string;
      fieldName: AuditFieldName;
      oldValue: string;
      newValue: string;
    }) => {
      if (oldValue === newValue) {
        return;
      }

      const { data, error: insertError } = await supabase
        .from("budget_grid_audit_logs")
        .insert({
          month_year: monthKey,
          cell_kind: cellKind,
          cell_ref: cellRef,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          changed_by: currentUserEmail,
        })
        .select(
          "id, changed_at, month_year, cell_kind, cell_ref, field_name, old_value, new_value, changed_by",
        )
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setAuditLogs((prev) => [data as BudgetGridAuditLog, ...prev].slice(0, 200));
    },
    [currentUserEmail],
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
    const committed = committedCellMap[key] ?? current;

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
    setCommittedCellMap((prev) => ({
      ...prev,
      [key]: {
        amount: String(nextAmount),
        is_paid: nextPaid,
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "expense",
      cellRef: templateId,
      monthKey,
      fieldName: "amount",
      oldValue: String(committed.amount),
      newValue: String(nextAmount),
    });
    await recordAuditLog({
      cellKind: "expense",
      cellRef: templateId,
      monthKey,
      fieldName: "is_paid",
      oldValue: String(committed.is_paid),
      newValue: String(nextPaid),
    });
    setSavingCellKey(null);
  };

  const saveIncomeCell = async (sourceId: string, monthKey: string) => {
    const key = `${sourceId}__${monthKey}`;
    const current = getIncomeCell(sourceId, monthKey);
    const committed = committedIncomeCellMap[key] ?? current;
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
    setCommittedIncomeCellMap((prev) => ({
      ...prev,
      [key]: {
        amount: String(current.amount),
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "income",
      cellRef: sourceId,
      monthKey,
      fieldName: "amount",
      oldValue: String(committed.amount),
      newValue: String(current.amount),
    });
    setSavingCellKey(null);
  };

  const saveCashCell = async (monthKey: string) => {
    const current = getCashCell(monthKey);
    const committed = committedCashCellMap[monthKey] ?? current;
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
    setCommittedCashCellMap((prev) => ({
      ...prev,
      [monthKey]: {
        amount: String(current.amount),
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "cash",
      cellRef: "cash_in_hand",
      monthKey,
      fieldName: "amount",
      oldValue: String(committed.amount),
      newValue: String(current.amount),
    });
    setSavingCellKey(null);
  };

  const saveLoanPaidCell = async (
    kind: "fixed" | "jewel_type" | "investment",
    ref: string,
    monthKey: string,
    isPaid: boolean,
  ) => {
    const key = `${kind}__${ref}__${monthKey}`;
    const current = getLoanPaidCell(kind, ref, monthKey);
    const committed = committedLoanPaidMap[key] ?? current;

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
    setCommittedLoanPaidMap((prev) => ({
      ...prev,
      [key]: {
        is_paid: isPaid,
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "loan",
      cellRef: ref,
      monthKey,
      fieldName: "is_paid",
      oldValue: String(committed.is_paid),
      newValue: String(isPaid),
    });
    setSavingCellKey(null);
  };

  const saveLoanAmountCell = async (
    kind: "fixed" | "jewel_type" | "investment",
    ref: string,
    monthKey: string,
  ) => {
    const key = `${kind}__${ref}__${monthKey}`;
    const current = getLoanAmountCell(kind, ref, monthKey);
    const committed = committedLoanAmountMap[key] ?? current;
    setSavingCellKey(`loan-amount:${key}`);

    const { data, error: upsertError } = await supabase
      .from("loan_monthly_overrides")
      .upsert(
        {
          id: current.entry_id,
          loan_kind: kind,
          loan_ref: ref,
          month_year: monthKey,
          amount: Number(current.amount) || 0,
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

    setLoanAmountMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        entry_id: data.id,
      },
    }));
    setCommittedLoanAmountMap((prev) => ({
      ...prev,
      [key]: {
        amount: String(current.amount),
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "loan",
      cellRef: ref,
      monthKey,
      fieldName: "amount",
      oldValue: String(committed.amount),
      newValue: String(current.amount),
    });
    setSavingCellKey(null);
  };

  const getCommentCell = useCallback(
    (kind: "expense" | "loan" | "income" | "cash", ref: string, monthKey: string) =>
      commentMap[`${kind}__${ref}__${monthKey}`] ?? { comment: "" },
    [commentMap],
  );

  const saveCommentCell = async (
    kind: "expense" | "loan" | "income" | "cash",
    ref: string,
    monthKey: string,
  ) => {
    const key = `${kind}__${ref}__${monthKey}`;
    const current = getCommentCell(kind, ref, monthKey);
    const committed = committedCommentMap[key] ?? { comment: "" };
    const nextComment = String(current.comment ?? "").trim();
    setSavingCellKey(`comment:${key}`);

    const { data, error: upsertError } = await supabase
      .from("budget_grid_comments")
      .upsert(
        {
          id: current.entry_id,
          cell_kind: kind,
          cell_ref: ref,
          month_year: monthKey,
          comment: nextComment,
        },
        { onConflict: "cell_kind,cell_ref,month_year" },
      )
      .select("id")
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingCellKey(null);
      return;
    }

    setCommentMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment: nextComment,
        entry_id: data.id,
      },
    }));
    setCommittedCommentMap((prev) => ({
      ...prev,
      [key]: {
        comment: nextComment,
        entry_id: data.id,
      },
    }));
    await recordAuditLog({
      cellKind: "comment",
      cellRef: `${kind}__${ref}`,
      monthKey,
      fieldName: "comment",
      oldValue: String(committed.comment ?? ""),
      newValue: nextComment,
    });
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
          total += Number(getLoanAmountCell("fixed", loan.id, month.key).amount) || 0;
        }
      }
      return total;
    });
  }, [months, fixedLoans, getLoanAmountCell]);

  const monthlyJewelBankTotals = useMemo(() => {
    return months.map(
      (month) => Number(getLoanAmountCell("jewel_type", "bank", month.key).amount) || 0,
    );
  }, [months, getLoanAmountCell]);

  const monthlyJewelPawnTotals = useMemo(() => {
    return months.map(
      (month) => Number(getLoanAmountCell("jewel_type", "pawn", month.key).amount) || 0,
    );
  }, [months, getLoanAmountCell]);

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
          total += Number(getLoanAmountCell("fixed", loan.id, month.key).amount) || 0;
        }
      }
      return total;
    });
  }, [months, fixedLoans, getLoanPaidCell, getLoanAmountCell]);

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

  const monthlyInvestmentTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const investment of ceetuInvestments) {
        const start = new Date(investment.start_date);
        const end = investment.end_date ? new Date(investment.end_date) : null;
        const inRange =
          month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
        if (inRange) {
          total +=
            Number(getLoanAmountCell("investment", investment.id, month.key).amount) || 0;
        }
      }
      return total;
    });
  }, [months, ceetuInvestments, getLoanAmountCell]);

  const monthlyRemainingInvestmentTotals = useMemo(() => {
    return months.map((month) => {
      let total = 0;
      for (const investment of ceetuInvestments) {
        const start = new Date(investment.start_date);
        const end = investment.end_date ? new Date(investment.end_date) : null;
        const inRange =
          month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
        if (!inRange) {
          continue;
        }
        const paid = getLoanPaidCell("investment", investment.id, month.key).is_paid;
        if (!paid) {
          total +=
            Number(getLoanAmountCell("investment", investment.id, month.key).amount) || 0;
        }
      }
      return total;
    });
  }, [
    months,
    ceetuInvestments,
    getLoanPaidCell,
    getLoanAmountCell,
  ]);

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

  const templateNameById = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template.item_name]));
  }, [templates]);

  const incomeNameById = useMemo(() => {
    return new Map(incomeSources.map((source) => [source.id, source.name]));
  }, [incomeSources]);

  const fixedLoanNameById = useMemo(() => {
    return new Map(fixedLoans.map((loan) => [loan.id, loan.loan_name]));
  }, [fixedLoans]);

  const investmentNameById = useMemo(() => {
    return new Map(ceetuInvestments.map((investment) => [investment.id, investment.name]));
  }, [ceetuInvestments]);

  const getAuditTargetLabel = useCallback(
    (row: BudgetGridAuditLog) => {
      if (row.cell_kind === "expense") {
        return templateNameById.get(row.cell_ref) ?? `Expense ${row.cell_ref}`;
      }
      if (row.cell_kind === "income") {
        return incomeNameById.get(row.cell_ref) ?? `Income ${row.cell_ref}`;
      }
      if (row.cell_kind === "cash") {
        return "Cash In Hand";
      }
      if (row.cell_kind === "comment") {
        const [baseKind, ...rest] = row.cell_ref.split("__");
        const ref = rest.join("__");
        if (baseKind === "expense") {
          return templateNameById.get(ref) ?? "Expense Comment";
        }
        if (baseKind === "income") {
          return incomeNameById.get(ref) ?? "Income Comment";
        }
        if (baseKind === "cash") {
          return "Cash Comment";
        }
        if (baseKind === "loan") {
          if (ref.startsWith("fixed__")) {
            const id = ref.replace("fixed__", "");
            return fixedLoanNameById.get(id) ?? "Fixed Loan Comment";
          }
          if (ref.startsWith("investment__")) {
            const id = ref.replace("investment__", "");
            return investmentNameById.get(id) ?? "Investment Comment";
          }
          if (ref === "jewel_type__bank") {
            return "Jewel Bank Comment";
          }
          if (ref === "jewel_type__pawn") {
            return "Jewel Pawn Comment";
          }
          return "Loan Comment";
        }
        return "Comment";
      }

      if (row.cell_ref === "bank") {
        return "Jewel Bank";
      }
      if (row.cell_ref === "pawn") {
        return "Jewel Pawn";
      }
      if (fixedLoanNameById.has(row.cell_ref)) {
        return fixedLoanNameById.get(row.cell_ref) ?? row.cell_ref;
      }
      if (investmentNameById.has(row.cell_ref)) {
        return investmentNameById.get(row.cell_ref) ?? row.cell_ref;
      }
      return `Loan ${row.cell_ref}`;
    },
    [templateNameById, incomeNameById, fixedLoanNameById, investmentNameById],
  );

  const formatAuditValue = (fieldName: AuditFieldName, value: string) => {
    if (fieldName === "is_paid") {
      return value === "true" ? "Paid" : "Unpaid";
    }
    return value === "" ? "(empty)" : value;
  };

  const parseLoanRef = (loanRef: string) => {
    if (loanRef.startsWith("fixed__")) {
      return { kind: "fixed" as const, ref: loanRef.replace("fixed__", "") };
    }
    if (loanRef.startsWith("investment__")) {
      return {
        kind: "investment" as const,
        ref: loanRef.replace("investment__", ""),
      };
    }
    if (loanRef.startsWith("jewel_type__")) {
      return {
        kind: "jewel_type" as const,
        ref: loanRef.replace("jewel_type__", ""),
      };
    }
    return null;
  };

  const createSnapshot = async () => {
    const defaultName = `Snapshot ${new Date().toLocaleString("en-GB")}`;
    const snapshotName = window.prompt("Snapshot name", defaultName)?.trim();
    if (!snapshotName) {
      return;
    }
    if (months.length === 0) {
      return;
    }

    setSnapshotBusy(true);
    setError(null);

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("budget_grid_snapshots")
      .insert({
        snapshot_name: snapshotName,
        created_by: currentUserEmail,
        start_month: months[0].key,
        end_month: months[months.length - 1].key,
      })
      .select("id, snapshot_name, created_at, created_by, start_month, end_month")
      .single();

    if (snapshotError) {
      setError(snapshotError.message);
      setSnapshotBusy(false);
      return;
    }

    const snapshotId = (snapshotData as BudgetGridSnapshot).id;
    const items: Omit<BudgetGridSnapshotItem, "id">[] = [];

    for (const month of months) {
      for (const template of templates) {
        const cell = getCell(template.id, month.key);
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "expense",
          cell_ref: template.id,
          field_name: "amount",
          field_value: String(cell.amount ?? "0"),
        });
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "expense",
          cell_ref: template.id,
          field_name: "is_paid",
          field_value: String(cell.is_paid ?? false),
        });
        const comment = getCommentCell("expense", template.id, month.key);
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "comment",
          cell_ref: `expense__${template.id}`,
          field_name: "comment",
          field_value: String(comment.comment ?? ""),
        });
      }

      for (const source of incomeSources) {
        const cell = getIncomeCell(source.id, month.key);
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "income",
          cell_ref: source.id,
          field_name: "amount",
          field_value: String(cell.amount ?? "0"),
        });
        const comment = getCommentCell("income", source.id, month.key);
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "comment",
          cell_ref: `income__${source.id}`,
          field_name: "comment",
          field_value: String(comment.comment ?? ""),
        });
      }

      const cashCell = getCashCell(month.key);
      items.push({
        snapshot_id: snapshotId,
        month_year: month.key,
        cell_kind: "cash",
        cell_ref: "cash_in_hand",
        field_name: "amount",
        field_value: String(cashCell.amount ?? "0"),
      });
      const cashComment = getCommentCell("cash", "cash_in_hand", month.key);
      items.push({
        snapshot_id: snapshotId,
        month_year: month.key,
        cell_kind: "comment",
        cell_ref: "cash__cash_in_hand",
        field_name: "comment",
        field_value: String(cashComment.comment ?? ""),
      });

      const loanRefs = [
        ...fixedLoans.map((loan) => `fixed__${loan.id}`),
        ...ceetuInvestments.map((investment) => `investment__${investment.id}`),
        "jewel_type__bank",
        "jewel_type__pawn",
      ];

      for (const loanRef of loanRefs) {
        const parsed = parseLoanRef(loanRef);
        if (!parsed) {
          continue;
        }
        const amountCell = getLoanAmountCell(
          parsed.kind,
          parsed.ref,
          month.key,
        );
        const paidCell = getLoanPaidCell(
          parsed.kind,
          parsed.ref,
          month.key,
        );
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "loan",
          cell_ref: loanRef,
          field_name: "amount",
          field_value: String(amountCell.amount ?? "0"),
        });
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "loan",
          cell_ref: loanRef,
          field_name: "is_paid",
          field_value: String(paidCell.is_paid ?? false),
        });
        const loanComment = getCommentCell("loan", loanRef, month.key);
        items.push({
          snapshot_id: snapshotId,
          month_year: month.key,
          cell_kind: "comment",
          cell_ref: `loan__${loanRef}`,
          field_name: "comment",
          field_value: String(loanComment.comment ?? ""),
        });
      }
    }

    const { error: itemsError } = await supabase.from("budget_grid_snapshot_items").insert(items);
    if (itemsError) {
      setError(itemsError.message);
      setSnapshotBusy(false);
      return;
    }

    setSnapshots((prev) => [snapshotData as BudgetGridSnapshot, ...prev].slice(0, 30));
    setSnapshotBusy(false);
  };

  const restoreSnapshot = async (snapshotId: string) => {
    const confirmed = window.confirm(
      "Restore this snapshot to active grid values? Current values will be overwritten.",
    );
    if (!confirmed) {
      return;
    }

    setSnapshotBusy(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("budget_grid_snapshot_items")
      .select("id, snapshot_id, month_year, cell_kind, cell_ref, field_name, field_value")
      .eq("snapshot_id", snapshotId);

    if (fetchError) {
      setError(fetchError.message);
      setSnapshotBusy(false);
      return;
    }

    const rows = (data as BudgetGridSnapshotItem[]) ?? [];

    const expenseByKey = new Map<string, { amount: string; is_paid: string }>();
    const incomeByKey = new Map<string, { amount: string }>();
    const cashByKey = new Map<string, { amount: string }>();
    const loanByKey = new Map<string, { amount: string; is_paid: string }>();
    const commentByKey = new Map<string, { comment: string }>();

    for (const row of rows) {
      const key = `${row.cell_ref}|||${row.month_year}`;
      if (row.cell_kind === "expense") {
        const current = expenseByKey.get(key) ?? { amount: "0", is_paid: "false" };
        if (row.field_name === "amount") current.amount = row.field_value;
        if (row.field_name === "is_paid") current.is_paid = row.field_value;
        expenseByKey.set(key, current);
      } else if (row.cell_kind === "income") {
        const current = incomeByKey.get(key) ?? { amount: "0" };
        if (row.field_name === "amount") current.amount = row.field_value;
        incomeByKey.set(key, current);
      } else if (row.cell_kind === "cash") {
        const current = cashByKey.get(key) ?? { amount: "0" };
        if (row.field_name === "amount") current.amount = row.field_value;
        cashByKey.set(key, current);
      } else if (row.cell_kind === "loan") {
        const current = loanByKey.get(key) ?? { amount: "0", is_paid: "false" };
        if (row.field_name === "amount") current.amount = row.field_value;
        if (row.field_name === "is_paid") current.is_paid = row.field_value;
        loanByKey.set(key, current);
      } else if (row.cell_kind === "comment") {
        const current = commentByKey.get(key) ?? { comment: "" };
        if (row.field_name === "comment") current.comment = row.field_value;
        commentByKey.set(key, current);
      }
    }

    const budgetEntries = Array.from(expenseByKey.entries()).map(([key, value]) => {
      const [templateId, monthYear] = key.split("|||");
      return {
        template_id: templateId,
        month_year: monthYear,
        planned_amount: Number(value.amount) || 0,
        is_paid: value.is_paid === "true",
      };
    });

    const incomeEntries = Array.from(incomeByKey.entries()).map(([key, value]) => {
      const [sourceId, monthYear] = key.split("|||");
      return {
        income_source_id: sourceId,
        month_year: monthYear,
        amount: Number(value.amount) || 0,
      };
    });

    const cashEntries = Array.from(cashByKey.entries()).map(([key, value]) => {
      const [, monthYear] = key.split("|||");
      return {
        month_year: monthYear,
        amount: Number(value.amount) || 0,
      };
    });

    const loanAmountEntries: {
      loan_kind: "fixed" | "jewel_type" | "investment";
      loan_ref: string;
      month_year: string;
      amount: number;
    }[] = [];
    const loanPaidEntries: {
      loan_kind: "fixed" | "jewel_type" | "investment";
      loan_ref: string;
      month_year: string;
      is_paid: boolean;
    }[] = [];

    for (const [key, value] of loanByKey.entries()) {
      const [loanRefPart, monthYearPart] = key.split("|||");
      const parsed = parseLoanRef(loanRefPart);
      if (!parsed) {
        continue;
      }
      loanAmountEntries.push({
        loan_kind: parsed.kind,
        loan_ref: parsed.ref,
        month_year: monthYearPart,
        amount: Number(value.amount) || 0,
      });
      loanPaidEntries.push({
        loan_kind: parsed.kind,
        loan_ref: parsed.ref,
        month_year: monthYearPart,
        is_paid: value.is_paid === "true",
      });
    }

    const commentEntries: {
      cell_kind: "expense" | "loan" | "income" | "cash";
      cell_ref: string;
      month_year: string;
      comment: string;
    }[] = [];

    for (const [key, value] of commentByKey.entries()) {
      const [refWithKind, monthYearPart] = key.split("|||");
      const [cellKind, ...refParts] = refWithKind.split("__");
      commentEntries.push({
        cell_kind: cellKind as "expense" | "loan" | "income" | "cash",
        cell_ref: refParts.join("__"),
        month_year: monthYearPart,
        comment: value.comment ?? "",
      });
    }

    if (budgetEntries.length > 0) {
      const { error: budgetError } = await supabase
        .from("budget_entries")
        .upsert(budgetEntries, { onConflict: "template_id,month_year" });
      if (budgetError) {
        setError(budgetError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    if (incomeEntries.length > 0) {
      const { error: incomeError } = await supabase
        .from("income_monthly_overrides")
        .upsert(incomeEntries, { onConflict: "income_source_id,month_year" });
      if (incomeError) {
        setError(incomeError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    if (cashEntries.length > 0) {
      const { error: cashError } = await supabase
        .from("cash_in_hand_entries")
        .upsert(cashEntries, { onConflict: "month_year" });
      if (cashError) {
        setError(cashError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    if (loanAmountEntries.length > 0) {
      const { error: loanAmountError } = await supabase
        .from("loan_monthly_overrides")
        .upsert(loanAmountEntries, { onConflict: "loan_kind,loan_ref,month_year" });
      if (loanAmountError) {
        setError(loanAmountError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    if (loanPaidEntries.length > 0) {
      const { error: loanPaidError } = await supabase
        .from("loan_payment_entries")
        .upsert(loanPaidEntries, { onConflict: "loan_kind,loan_ref,month_year" });
      if (loanPaidError) {
        setError(loanPaidError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    if (commentEntries.length > 0) {
      const { error: commentError } = await supabase
        .from("budget_grid_comments")
        .upsert(commentEntries, { onConflict: "cell_kind,cell_ref,month_year" });
      if (commentError) {
        setError(commentError.message);
        setSnapshotBusy(false);
        return;
      }
    }

    await loadData();
    setSnapshotBusy(false);
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-cyan-50 p-8 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <p className="text-sm text-muted-foreground">Loading budget grid...</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              Multi-Month Budget Grid
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Spreadsheet-style planning with live totals and paid tracking.
            </p>
          </div>
          {savingCellKey ? (
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
              Saving changes...
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              All changes saved
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Month</label>
            <input
              type="month"
              value={startMonth}
              onChange={(event) => setStartMonth(event.target.value)}
              className={controlClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Months</label>
            <select
              value={String(monthsToShow)}
              onChange={(event) => setMonthsToShow(Number(event.target.value))}
              className={controlClass}
            >
              <option value="6">6</option>
              <option value="12">12</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
          </div>
          <Button variant="outline" onClick={loadData} className="h-10 rounded-lg border-slate-300 dark:border-slate-700">
            Reload
          </Button>
          <Button
            variant="outline"
            onClick={createSnapshot}
            disabled={snapshotBusy}
            className="h-10 rounded-lg border-slate-300 dark:border-slate-700"
          >
            {snapshotBusy ? "Working..." : "Create Snapshot"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto overflow-y-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <table className="min-w-[1120px] border-collapse text-sm">
            <thead className="sticky top-0 z-40">
              <tr className="border-b bg-slate-100/80 dark:bg-slate-900/80">
                <th className="sticky left-0 top-0 z-50 min-w-[160px] border-r border-slate-200 bg-slate-100/95 px-2 py-1 text-center text-sm font-bold uppercase tracking-wide text-black dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100">
                  Expense / Section
                </th>
                {months.map((month) => (
                  <th key={month.key} className="sticky top-0 z-40 min-w-[108px] border-r border-slate-200 bg-slate-100/95 px-2 py-1 text-center text-sm font-extrabold uppercase tracking-wide text-black dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100">
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
                  getCommentCell={getCommentCell}
                  openCommentKey={openCommentKey}
                  setOpenCommentKey={setOpenCommentKey}
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
                  onCommentChange={(templateId, monthKey, value) =>
                    setCommentMap((prev) => ({
                      ...prev,
                      [`expense__${templateId}__${monthKey}`]: {
                        ...getCommentCell("expense", templateId, monthKey),
                        comment: value,
                      },
                    }))
                  }
                  onCommentSave={(templateId, monthKey) =>
                    saveCommentCell("expense", templateId, monthKey)
                  }
                />
              ))}

              <tr className="border-y border-amber-200 bg-amber-100/80 font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <td className="sticky left-0 z-10 border-r border-amber-200 bg-amber-100/95 px-3 py-1.5 dark:border-amber-900/40 dark:bg-amber-900/30">
                  Total Expense
                </td>
                {monthlyExpenseTotals.map((total, index) => (
                  <td key={`expense-total-${index}`} className="border-r border-amber-200 px-3 py-1.5 text-right text-base font-semibold tabular-nums dark:border-amber-900/40">
                    {total}
                  </td>
                ))}
              </tr>

              <tr className="border-y bg-violet-100/60 font-semibold dark:bg-violet-900/30">
                <td className="sticky left-0 z-10 border-r bg-violet-100/60 px-3 py-1.5 dark:bg-violet-900/30">
                  Ceetu Investments
                </td>
                {months.map((month) => (
                  <td key={`investment-header-${month.key}`} className="border-r px-3 py-1.5" />
                ))}
              </tr>
              {ceetuInvestments.map((investment) => (
                <tr key={investment.id} className="border-t bg-violet-50/40 dark:bg-violet-950/20">
                  <td className="sticky left-0 z-10 border-r bg-violet-50/40 px-3 py-1.5 dark:bg-violet-950/20">
                    {investment.name}
                    {!investment.is_active ? " (inactive)" : ""}
                  </td>
                  {months.map((month) => {
                    const start = new Date(investment.start_date);
                    const end = investment.end_date ? new Date(investment.end_date) : null;
                    const inRange =
                      month.date >= new Date(start.getFullYear(), start.getMonth(), 1) &&
                      (!end || month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
                    const investmentPaid = getLoanPaidCell(
                      "investment",
                      investment.id,
                      month.key,
                    ).is_paid;
                    const investmentAmountCell = getLoanAmountCell(
                      "investment",
                      investment.id,
                      month.key,
                    );
                    return (
                      <td
                        key={`investment-${investment.id}-${month.key}`}
                        className={`border-r px-3 py-1.5 text-right tabular-nums ${inRange && investmentPaid
                          ? "bg-violet-100/70 dark:bg-violet-900/30"
                          : ""
                          }`}
                      >
                        {inRange ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="checkbox"
                              className={checkboxInvestmentClass}
                              checked={investmentPaid}
                              onChange={(event) =>
                                saveLoanPaidCell(
                                  "investment",
                                  investment.id,
                                  month.key,
                                  event.target.checked,
                                )
                              }
                            />
                            <input
                              value={investmentAmountCell.amount}
                              onChange={(event) =>
                                setLoanAmountMap((prev) => ({
                                  ...prev,
                                  [`investment__${investment.id}__${month.key}`]: {
                                    ...getLoanAmountCell(
                                      "investment",
                                      investment.id,
                                      month.key,
                                    ),
                                    amount: event.target.value,
                                  },
                                }))
                              }
                              onBlur={() =>
                                saveLoanAmountCell("investment", investment.id, month.key)
                              }
                              disabled={investmentPaid}
                              className={`${moneyInputClass} ${investmentPaid
                                ? "cursor-not-allowed border bg-violet-50/90 text-violet-800 opacity-80 dark:bg-violet-950/70 dark:text-violet-200"
                                : ""
                                }`}
                            />
                            <InlineCommentEditor
                              commentKey={`loan__investment__${investment.id}__${month.key}`}
                              value={
                                getCommentCell(
                                  "loan",
                                  `investment__${investment.id}`,
                                  month.key,
                                ).comment
                              }
                              isOpen={
                                openCommentKey ===
                                `loan__investment__${investment.id}__${month.key}`
                              }
                              onToggle={() =>
                                setOpenCommentKey(
                                  openCommentKey ===
                                    `loan__investment__${investment.id}__${month.key}`
                                    ? null
                                    : `loan__investment__${investment.id}__${month.key}`,
                                )
                              }
                              onChange={(value) =>
                                setCommentMap((prev) => ({
                                  ...prev,
                                  [`loan__investment__${investment.id}__${month.key}`]: {
                                    ...getCommentCell(
                                      "loan",
                                      `investment__${investment.id}`,
                                      month.key,
                                    ),
                                    comment: value,
                                  },
                                }))
                              }
                              onSave={() =>
                                saveCommentCell(
                                  "loan",
                                  `investment__${investment.id}`,
                                  month.key,
                                )
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm tabular-nums">0</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-y bg-rose-100/60 font-semibold dark:bg-rose-900/30">
                <td className="sticky left-0 z-10 border-r bg-rose-100/60 px-3 py-1.5 dark:bg-rose-900/30">
                  Fixed Loans
                </td>
                {months.map((month) => (
                  <td key={`fixed-header-${month.key}`} className="border-r px-3 py-1.5" />
                ))}
              </tr>
              {fixedLoans.map((loan) => (
                <tr key={loan.id} className="border-t bg-rose-50/40 dark:bg-rose-950/20">
                  <td className="sticky left-0 z-10 border-r bg-rose-50/40 px-3 py-1.5 dark:bg-rose-950/20">
                    {loan.loan_name}
                    {!loan.is_active ? " (inactive)" : ""}
                  </td>
                  {months.map((month) => {
                    const start = new Date(loan.start_date);
                    const end = loan.end_date ? new Date(loan.end_date) : null;
                    const fixedPaid = getLoanPaidCell("fixed", loan.id, month.key).is_paid;
                    const fixedAmountCell = getLoanAmountCell("fixed", loan.id, month.key);
                    const inRange =
                      month.date >=
                      new Date(start.getFullYear(), start.getMonth(), 1) &&
                      (!end ||
                        month.date <= new Date(end.getFullYear(), end.getMonth(), 1));
                    return (
                      <td
                        key={`fixed-${loan.id}-${month.key}`}
                        className={`border-r px-3 py-1.5 text-right tabular-nums ${inRange && fixedPaid
                          ? "bg-rose-100/70 dark:bg-rose-900/30"
                          : ""
                          }`}
                      >
                        {inRange ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="checkbox"
                              className={checkboxFixedLoanClass}
                              checked={fixedPaid}
                              onChange={(event) =>
                                saveLoanPaidCell(
                                  "fixed",
                                  loan.id,
                                  month.key,
                                  event.target.checked,
                                )
                              }
                            />
                            <input
                              value={fixedAmountCell.amount}
                              onChange={(event) =>
                                setLoanAmountMap((prev) => ({
                                  ...prev,
                                  [`fixed__${loan.id}__${month.key}`]: {
                                    ...getLoanAmountCell("fixed", loan.id, month.key),
                                    amount: event.target.value,
                                  },
                                }))
                              }
                              onBlur={() => saveLoanAmountCell("fixed", loan.id, month.key)}
                              disabled={fixedPaid}
                              className={`${moneyInputClass} ${fixedPaid
                                ? "cursor-not-allowed border bg-rose-50/90 text-rose-800 opacity-80 dark:bg-rose-950/70 dark:text-rose-200"
                                : ""
                                }`}
                            />
                            <InlineCommentEditor
                              commentKey={`loan__fixed__${loan.id}__${month.key}`}
                              value={getCommentCell("loan", `fixed__${loan.id}`, month.key).comment}
                              isOpen={openCommentKey === `loan__fixed__${loan.id}__${month.key}`}
                              onToggle={() =>
                                setOpenCommentKey(
                                  openCommentKey === `loan__fixed__${loan.id}__${month.key}`
                                    ? null
                                    : `loan__fixed__${loan.id}__${month.key}`,
                                )
                              }
                              onChange={(value) =>
                                setCommentMap((prev) => ({
                                  ...prev,
                                  [`loan__fixed__${loan.id}__${month.key}`]: {
                                    ...getCommentCell("loan", `fixed__${loan.id}`, month.key),
                                    comment: value,
                                  },
                                }))
                              }
                              onSave={() =>
                                saveCommentCell("loan", `fixed__${loan.id}`, month.key)
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm tabular-nums">0</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-y bg-sky-100/60 font-semibold dark:bg-sky-900/30">
                <td className="sticky left-0 z-10 border-r bg-sky-100/60 px-3 py-1.5 dark:bg-sky-900/30">
                  Jewel Loans
                </td>
                {months.map((month) => (
                  <td key={`jewel-header-${month.key}`} className="border-r px-3 py-1.5" />
                ))}
              </tr>
              <tr className="border-t bg-sky-50/40 font-semibold dark:bg-sky-950/20">
                <td className="sticky left-0 z-10 border-r bg-sky-50/40 px-3 py-1.5 dark:bg-sky-950/20">
                  Bank (Interest)
                </td>
                {months.map((month, index) => (
                  <td
                    key={`jewel-bank-${index}`}
                    className={`border-r px-3 py-1.5 text-right tabular-nums ${getLoanPaidCell("jewel_type", "bank", month.key).is_paid
                      ? "bg-blue-100/70 dark:bg-blue-900/30"
                      : ""
                      }`}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="checkbox"
                        className={checkboxJewelLoanClass}
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
                      <input
                        value={getLoanAmountCell("jewel_type", "bank", month.key).amount}
                        onChange={(event) =>
                          setLoanAmountMap((prev) => ({
                            ...prev,
                            [`jewel_type__bank__${month.key}`]: {
                              ...getLoanAmountCell("jewel_type", "bank", month.key),
                              amount: event.target.value,
                            },
                          }))
                        }
                        onBlur={() => saveLoanAmountCell("jewel_type", "bank", month.key)}
                        disabled={getLoanPaidCell("jewel_type", "bank", month.key).is_paid}
                        className={`${moneyInputClass} ${getLoanPaidCell("jewel_type", "bank", month.key).is_paid
                          ? "cursor-not-allowed border bg-blue-50/90 text-blue-800 opacity-80 dark:bg-blue-950/70 dark:text-blue-200"
                          : ""
                          }`}
                      />
                      <InlineCommentEditor
                        commentKey={`loan__jewel_type__bank__${month.key}`}
                        value={getCommentCell("loan", "jewel_type__bank", month.key).comment}
                        isOpen={openCommentKey === `loan__jewel_type__bank__${month.key}`}
                        onToggle={() =>
                          setOpenCommentKey(
                            openCommentKey === `loan__jewel_type__bank__${month.key}`
                              ? null
                              : `loan__jewel_type__bank__${month.key}`,
                          )
                        }
                        onChange={(value) =>
                          setCommentMap((prev) => ({
                            ...prev,
                            [`loan__jewel_type__bank__${month.key}`]: {
                              ...getCommentCell("loan", "jewel_type__bank", month.key),
                              comment: value,
                            },
                          }))
                        }
                        onSave={() => saveCommentCell("loan", "jewel_type__bank", month.key)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-t bg-sky-50/40 font-semibold dark:bg-sky-950/20">
                <td className="sticky left-0 z-10 border-r bg-sky-50/40 px-3 py-1.5 dark:bg-sky-950/20">
                  Pawn (Interest)
                </td>
                {months.map((month, index) => (
                  <td
                    key={`jewel-pawn-${index}`}
                    className={`border-r px-3 py-1.5 text-right tabular-nums ${getLoanPaidCell("jewel_type", "pawn", month.key).is_paid
                      ? "bg-blue-100/70 dark:bg-blue-900/30"
                      : ""
                      }`}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="checkbox"
                        className={checkboxJewelLoanClass}
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
                      <input
                        value={getLoanAmountCell("jewel_type", "pawn", month.key).amount}
                        onChange={(event) =>
                          setLoanAmountMap((prev) => ({
                            ...prev,
                            [`jewel_type__pawn__${month.key}`]: {
                              ...getLoanAmountCell("jewel_type", "pawn", month.key),
                              amount: event.target.value,
                            },
                          }))
                        }
                        onBlur={() => saveLoanAmountCell("jewel_type", "pawn", month.key)}
                        disabled={getLoanPaidCell("jewel_type", "pawn", month.key).is_paid}
                        className={`${moneyInputClass} ${getLoanPaidCell("jewel_type", "pawn", month.key).is_paid
                          ? "cursor-not-allowed border bg-blue-50/90 text-blue-800 opacity-80 dark:bg-blue-950/70 dark:text-blue-200"
                          : ""
                          }`}
                      />
                      <InlineCommentEditor
                        commentKey={`loan__jewel_type__pawn__${month.key}`}
                        value={getCommentCell("loan", "jewel_type__pawn", month.key).comment}
                        isOpen={openCommentKey === `loan__jewel_type__pawn__${month.key}`}
                        onToggle={() =>
                          setOpenCommentKey(
                            openCommentKey === `loan__jewel_type__pawn__${month.key}`
                              ? null
                              : `loan__jewel_type__pawn__${month.key}`,
                          )
                        }
                        onChange={(value) =>
                          setCommentMap((prev) => ({
                            ...prev,
                            [`loan__jewel_type__pawn__${month.key}`]: {
                              ...getCommentCell("loan", "jewel_type__pawn", month.key),
                              comment: value,
                            },
                          }))
                        }
                        onSave={() => saveCommentCell("loan", "jewel_type__pawn", month.key)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-y border-fuchsia-200 bg-fuchsia-100/70 font-semibold text-fuchsia-900 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/25 dark:text-fuchsia-100">
                <td className="sticky left-0 z-10 border-r border-fuchsia-200 bg-fuchsia-100/90 px-3 py-1.5 dark:border-fuchsia-900/40 dark:bg-fuchsia-900/35">
                  Total EMI
                </td>
                {months.map((month, index) => (
                  <td key={`emi-total-${month.key}`} className="border-r border-fuchsia-200 px-3 py-1.5 text-right text-base font-semibold tabular-nums dark:border-fuchsia-900/40">
                    {monthlyFixedLoanTotals[index] +
                      monthlyJewelLoanTotals[index] +
                      monthlyInvestmentTotals[index]}
                  </td>
                ))}
              </tr>



              <tr className="border-y border-violet-200 bg-violet-100/70 font-semibold text-violet-900 dark:border-violet-900/40 dark:bg-violet-900/25 dark:text-violet-100">
                <td className="sticky left-0 z-10 border-r border-violet-200 bg-violet-100/90 px-3 py-1.5 dark:border-violet-900/40 dark:bg-violet-900/35">
                  Total Expenses
                </td>
                {monthlyExpenseTotals.map((expense, index) => (
                  <td key={`confirmed-${index}`} className="border-r border-violet-200 px-3 py-1.5 text-right text-base font-semibold tabular-nums dark:border-violet-900/40">
                    {expense +
                      monthlyFixedLoanTotals[index] +
                      monthlyJewelLoanTotals[index] +
                      monthlyInvestmentTotals[index]}
                  </td>
                ))}
              </tr>

              <tr className="border-y bg-orange-100/60 font-semibold dark:bg-orange-900/30">
                <td className="sticky left-0 z-10 border-r bg-orange-100/60 px-3 py-1.5 dark:bg-orange-900/30">
                  Income Sources
                </td>
                {months.map((month) => (
                  <td key={`income-header-${month.key}`} className="border-r px-3 py-1.5" />
                ))}
              </tr>
              {incomeSources.map((source, sourceIndex) => (
                <tr
                  key={`${source.id}-${sourceIndex}`}
                  className="border-t bg-orange-50/40 font-semibold dark:bg-orange-950/20"
                >
                  <td className="sticky left-0 z-10 border-r bg-orange-50/40 px-3 py-1.5 dark:bg-orange-950/20">
                    {source.name}
                  </td>
                  {months.map((month) => {
                    const cell = getIncomeCell(source.id, month.key);
                    return (
                      <td
                        key={`income-${source.id}-${month.key}`}
                        className="border-r px-2 py-1 text-right tabular-nums"
                      >
                        <div className="flex items-center justify-end gap-2">
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
                            className={moneyInputClass}
                          />
                          <InlineCommentEditor
                            commentKey={`income__${source.id}__${month.key}`}
                            value={getCommentCell("income", source.id, month.key).comment}
                            isOpen={openCommentKey === `income__${source.id}__${month.key}`}
                            onToggle={() =>
                              setOpenCommentKey(
                                openCommentKey === `income__${source.id}__${month.key}`
                                  ? null
                                  : `income__${source.id}__${month.key}`,
                              )
                            }
                            onChange={(value) =>
                              setCommentMap((prev) => ({
                                ...prev,
                                [`income__${source.id}__${month.key}`]: {
                                  ...getCommentCell("income", source.id, month.key),
                                  comment: value,
                                },
                              }))
                            }
                            onSave={() => saveCommentCell("income", source.id, month.key)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-y bg-indigo-100/60 font-semibold dark:bg-indigo-900/30">
                <td className="sticky left-0 z-10 border-r bg-indigo-100/60 px-3 py-1.5 dark:bg-indigo-900/30">
                  Remaining Exp
                </td>
                {months.map((month, index) => (
                  <td key={`remaining-expenses-${month.key}`} className="border-r px-3 py-1.5 text-right text-base font-semibold tabular-nums">
                    {monthlyRemainingExpenseTemplateTotals[index] +
                      monthlyRemainingFixedLoanTotals[index] +
                      monthlyRemainingJewelLoanTotals[index] +
                      monthlyRemainingInvestmentTotals[index]}
                  </td>
                ))}
              </tr>
              <tr className="border-y bg-indigo-100/60 font-semibold dark:bg-indigo-900/30">
                <td className="sticky left-0 z-10 border-r bg-indigo-100/60 px-3 py-1.5 dark:bg-indigo-900/30">
                  Cash In Hand
                </td>
                {months.map((month) => {
                  const cell = getCashCell(month.key);
                  return (
                    <td key={`cash-in-hand-${month.key}`} className="border-r px-2 py-1 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
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
                          className={moneyInputClass}
                        />
                        <InlineCommentEditor
                          commentKey={`cash__cash_in_hand__${month.key}`}
                          value={getCommentCell("cash", "cash_in_hand", month.key).comment}
                          isOpen={openCommentKey === `cash__cash_in_hand__${month.key}`}
                          onToggle={() =>
                            setOpenCommentKey(
                              openCommentKey === `cash__cash_in_hand__${month.key}`
                                ? null
                                : `cash__cash_in_hand__${month.key}`,
                            )
                          }
                          onChange={(value) =>
                            setCommentMap((prev) => ({
                              ...prev,
                              [`cash__cash_in_hand__${month.key}`]: {
                                ...getCommentCell("cash", "cash_in_hand", month.key),
                                comment: value,
                              },
                            }))
                          }
                          onSave={() => saveCommentCell("cash", "cash_in_hand", month.key)}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr className="border-y border-cyan-300 bg-cyan-200/80 font-bold text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-900/35 dark:text-cyan-100">
                <td className="sticky left-0 z-10 border-r border-cyan-300 bg-cyan-200/95 px-3 py-1.5 dark:border-cyan-900/50 dark:bg-cyan-900/50">
                  Balance Amount
                </td>
                {months.map((month, index) => {
                  const balanceValue =
                    monthlyCashInHandTotals[index] -
                    (monthlyRemainingExpenseTemplateTotals[index] +
                      monthlyRemainingFixedLoanTotals[index] +
                      monthlyRemainingJewelLoanTotals[index] +
                      monthlyRemainingInvestmentTotals[index]);
                  return (
                    <td
                      key={`est-balance-${month.key}`}
                      className={`border-r border-cyan-300 px-3 py-1.5 text-right text-lg font-extrabold tabular-nums dark:border-cyan-900/50 ${getBalanceCellClass(
                        balanceValue,
                      )}`}
                    >
                      {balanceValue}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Snapshots
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {snapshots.length}
              </span>
            </div>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {snapshots.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 p-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No snapshots yet.
                </p>
              ) : (
                snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="font-medium text-slate-700 dark:text-slate-200">
                      {snapshot.snapshot_name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(snapshot.created_at).toLocaleString("en-GB")}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Range:{" "}
                      {new Date(snapshot.start_month).toLocaleDateString("en-GB")} -{" "}
                      {new Date(snapshot.end_month).toLocaleDateString("en-GB")}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={snapshotBusy}
                        onClick={() => restoreSnapshot(snapshot.id)}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Audit History
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {auditLogs.length}
            </span>
          </div>
          <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No changes recorded yet.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {getAuditTargetLabel(log)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(log.changed_at).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    <span className="uppercase tracking-wide text-[10px]">
                      {log.field_name}
                    </span>
                    {" : "}
                    <span className="font-medium text-rose-700 dark:text-rose-300">
                      {formatAuditValue(log.field_name, log.old_value)}
                    </span>
                    {" -> "}
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {formatAuditValue(log.field_name, log.new_value)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{new Date(log.month_year).toLocaleDateString("en-GB")}</span>
                    <span>{log.changed_by ?? "Unknown user"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function InlineCommentEditor({
  commentKey,
  value,
  isOpen,
  onToggle,
  onChange,
  onSave,
}: {
  commentKey: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const hasComment = value.trim().length > 0;

  return (
    <div className="relative group/comment">
      <Popover
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen !== isOpen) {
            onToggle();
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Comment"
            className={`h-5 rounded border px-1 text-[10px] leading-none ${hasComment
                ? "border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                : "border-slate-300 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400"
              }`}
          >
            C
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <div className="space-y-2">
            <textarea
              key={commentKey}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Add comment..."
              className="min-h-20 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  onSave();
                  onToggle();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasComment ? (
        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 max-w-52 rounded border border-slate-300 bg-white px-2 py-1 text-left text-[10px] text-slate-700 opacity-0 shadow-md transition-opacity group-hover/comment:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {value}
        </div>
      ) : null}
    </div>
  );
}

function FragmentGroup({
  groupName,
  rows,
  months,
  getCell,
  getCommentCell,
  openCommentKey,
  setOpenCommentKey,
  onAmountChange,
  onAmountBlur,
  onPaidToggle,
  onCommentChange,
  onCommentSave,
}: {
  groupName: string;
  rows: ExpenseTemplate[];
  months: { label: string; key: string; date: Date }[];
  getCell: (templateId: string, monthKey: string) => CellState;
  getCommentCell: (
    kind: "expense" | "loan" | "income" | "cash",
    ref: string,
    monthKey: string,
  ) => CommentCellState;
  openCommentKey: string | null;
  setOpenCommentKey: (value: string | null) => void;
  onAmountChange: (templateId: string, monthKey: string, value: string) => void;
  onAmountBlur: (templateId: string, monthKey: string) => void;
  onPaidToggle: (templateId: string, monthKey: string, value: boolean) => void;
  onCommentChange: (templateId: string, monthKey: string, value: string) => void;
  onCommentSave: (templateId: string, monthKey: string) => void;
}) {
  return (
    <>
      <tr className="border-t border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60">
        <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900/85 dark:text-slate-300">
          {groupName}
        </td>
        {months.map((month) => (
          <td key={`${groupName}-${month.key}`} className="border-r border-slate-200 px-3 py-1.5 dark:border-slate-800" />
        ))}
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-3 py-1.5 font-medium text-slate-900 dark:border-slate-800 dark:text-slate-100">
            {row.item_name}
          </td>
          {months.map((month) => {
            const cell = getCell(row.id, month.key);
            return (
              <td
                key={`${row.id}-${month.key}`}
                className={`border-r border-slate-200 px-2 py-1 text-right tabular-nums dark:border-slate-800 ${cell.is_paid
                  ? "bg-slate-200/80 dark:bg-slate-800/80"
                  : "bg-transparent"
                  }`}
              >
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="checkbox"
                    className={checkboxExpenseClass}
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
                    disabled={cell.is_paid}
                    className={`${moneyInputClass} ${cell.is_paid
                      ? "cursor-not-allowed border bg-slate-100 text-slate-600 opacity-90 dark:bg-slate-900 dark:text-slate-300"
                      : ""
                      }`}
                  />
                  <InlineCommentEditor
                    commentKey={`expense__${row.id}__${month.key}`}
                    value={getCommentCell("expense", row.id, month.key).comment}
                    isOpen={openCommentKey === `expense__${row.id}__${month.key}`}
                    onToggle={() =>
                      setOpenCommentKey(
                        openCommentKey === `expense__${row.id}__${month.key}`
                          ? null
                          : `expense__${row.id}__${month.key}`,
                      )
                    }
                    onChange={(value) => onCommentChange(row.id, month.key, value)}
                    onSave={() => onCommentSave(row.id, month.key)}
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
