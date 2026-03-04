"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  JewelLoanForm,
  type JewelLoanFormValues,
} from "../../components/jewel-loan-form";
import { supabase } from "../../../../../utils/supabase";

type JewelLoanRow = {
  lender_name: string;
  loan_type: "bank" | "pawn";
  item_details: string | null;
  grams: number | null;
  loan_amount: number | null;
  interest_rate: number | null;
  loan_date: string | null;
  due_date: string | null;
  status: "active" | "recovered";
};

export default function EditJewelLoanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [values, setValues] = useState<JewelLoanFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("jewel_loans")
        .select(
          "lender_name, loan_type, item_details, grams, loan_amount, interest_rate, loan_date, due_date, status",
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const row = data as JewelLoanRow;
      setValues({
        lender_name: row.lender_name ?? "",
        loan_type: row.loan_type ?? "bank",
        item_details: row.item_details ?? "",
        grams: row.grams?.toString() ?? "",
        loan_amount: row.loan_amount?.toString() ?? "",
        interest_rate: row.interest_rate?.toString() ?? "",
        loan_date: row.loan_date ?? "",
        due_date: row.due_date ?? "",
        status: row.status ?? "active",
      });
      setLoading(false);
    };

    loadLoan();
  }, [id]);

  const onSubmit = async () => {
    if (!values) {
      return;
    }

    const cleanLenderName = values.lender_name.trim();
    if (!cleanLenderName) {
      setError("Lender name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("jewel_loans")
      .update({
        lender_name: cleanLenderName,
        loan_type: values.loan_type,
        item_details: values.item_details.trim() || null,
        grams: values.grams ? Number(values.grams) : null,
        loan_amount: values.loan_amount ? Number(values.loan_amount) : null,
        interest_rate: values.interest_rate ? Number(values.interest_rate) : null,
        loan_date: values.loan_date || null,
        due_date: values.due_date || null,
        status: values.status,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/jewel-loans");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading loan...</p>;
  }

  return (
    <JewelLoanForm
      mode="edit"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/jewel-loans")}
    />
  );
}
