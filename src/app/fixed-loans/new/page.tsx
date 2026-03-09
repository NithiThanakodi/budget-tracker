"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FixedLoanForm,
  type FixedLoanFormValues,
} from "../components/fixed-loan-form";
import { supabase } from "../../../../utils/supabase";

const defaultValues: FixedLoanFormValues = {
  loan_name: "",
  loan_amount: "",
  interest_rate: "",
  interest_type: "simple",
  monthly_emi: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

export default function NewFixedLoanPage() {
  const router = useRouter();
  const [values, setValues] = useState<FixedLoanFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
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

    const { error: insertError } = await supabase.from("fixed_loans").insert([
      {
        loan_name: cleanLoanName,
        loan_amount: Number(values.loan_amount) || 0,
        interest_rate: Number(values.interest_rate) || 0,
        interest_type: values.interest_type,
        monthly_emi: Number(values.monthly_emi) || 0,
        start_date: values.start_date,
        end_date: values.end_date || null,
        is_active: values.is_active,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/fixed-loans");
    router.refresh();
  };

  return (
    <FixedLoanForm
      mode="create"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/fixed-loans")}
    />
  );
}
