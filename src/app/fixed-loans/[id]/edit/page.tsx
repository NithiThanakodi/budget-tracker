"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FixedLoanForm,
  type FixedLoanFormValues,
} from "../../components/fixed-loan-form";
import { supabase } from "../../../../../utils/supabase";

type FixedLoanRow = {
  loan_name: string;
  loan_amount: number;
  interest_rate: number;
  interest_type: "simple" | "compound";
  monthly_emi: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export default function EditFixedLoanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [values, setValues] = useState<FixedLoanFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("fixed_loans")
        .select(
          "loan_name, loan_amount, interest_rate, interest_type, monthly_emi, start_date, end_date, is_active",
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const row = data as FixedLoanRow;
      setValues({
        loan_name: row.loan_name ?? "",
        loan_amount: String(row.loan_amount ?? 0),
        interest_rate: String(row.interest_rate ?? 0),
        interest_type: row.interest_type ?? "simple",
        monthly_emi: String(row.monthly_emi ?? 0),
        start_date: row.start_date ?? "",
        end_date: row.end_date ?? "",
        is_active: row.is_active ?? true,
      });
      setLoading(false);
    };

    loadLoan();
  }, [id]);

  const onSubmit = async () => {
    if (!values) {
      return;
    }

    const cleanLoanName = values.loan_name.trim();
    if (!cleanLoanName) {
      setError("Loan name is required.");
      return;
    }

    if (!values.start_date) {
      setError("Start date is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("fixed_loans")
      .update({
        loan_name: cleanLoanName,
        loan_amount: Number(values.loan_amount) || 0,
        interest_rate: Number(values.interest_rate) || 0,
        interest_type: values.interest_type,
        monthly_emi: Number(values.monthly_emi) || 0,
        start_date: values.start_date,
        end_date: values.end_date || null,
        is_active: values.is_active,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/fixed-loans");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading loan...</p>;
  }

  return (
    <FixedLoanForm
      mode="edit"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/fixed-loans")}
    />
  );
}
