"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CeetuInvestmentForm,
  type CeetuInvestmentFormValues,
} from "../components/ceetu-investment-form";
import { supabase } from "../../../../../utils/supabase";

const defaultValues: CeetuInvestmentFormValues = {
  name: "",
  monthly_emi: "",
  start_date: "",
  end_date: "",
  total_claim_amount: "",
  claimed_amount: "",
  claim_details: "",
  claim_date: "",
  is_active: true,
};

export default function NewCeetuInvestmentPage() {
  const router = useRouter();
  const [values, setValues] = useState<CeetuInvestmentFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const cleanName = values.name.trim();
    if (!cleanName) {
      setError("Name is required.");
      return;
    }

    if (!values.start_date) {
      setError("Start date is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("ceetu_investments").insert([
      {
        name: cleanName,
        monthly_emi: Number(values.monthly_emi) || 0,
        start_date: values.start_date,
        end_date: values.end_date || null,
        total_claim_amount: Number(values.total_claim_amount) || 0,
        claimed_amount: Number(values.claimed_amount) || 0,
        claim_details: values.claim_details.trim() || null,
        claim_date: values.claim_date || null,
        is_active: values.is_active,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/investments/ceetu");
    router.refresh();
  };

  return (
    <CeetuInvestmentForm
      mode="create"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/investments/ceetu")}
    />
  );
}
