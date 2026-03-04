"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  JewelLoanForm,
  type JewelLoanFormValues,
} from "../components/jewel-loan-form";
import { supabase } from "../../../../utils/supabase";

const defaultValues: JewelLoanFormValues = {
  lender_name: "",
  loan_type: "bank",
  item_details: "",
  grams: "",
  loan_amount: "",
  interest_rate: "",
  loan_date: "",
  due_date: "",
  status: "active",
};

export default function NewJewelLoanPage() {
  const router = useRouter();
  const [values, setValues] = useState<JewelLoanFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const cleanLenderName = values.lender_name.trim();
    if (!cleanLenderName) {
      setError("Lender name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("jewel_loans").insert([
      {
        lender_name: cleanLenderName,
        loan_type: values.loan_type,
        item_details: values.item_details.trim() || null,
        grams: values.grams ? Number(values.grams) : null,
        loan_amount: values.loan_amount ? Number(values.loan_amount) : null,
        interest_rate: values.interest_rate ? Number(values.interest_rate) : null,
        loan_date: values.loan_date || null,
        due_date: values.due_date || null,
        status: values.status,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/jewel-loans");
    router.refresh();
  };

  return (
    <JewelLoanForm
      mode="create"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/jewel-loans")}
    />
  );
}
