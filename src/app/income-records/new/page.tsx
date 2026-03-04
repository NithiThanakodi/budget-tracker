"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IncomeRecordForm,
  type IncomeRecordFormValues,
} from "../components/income-record-form";
import { supabase } from "../../../../utils/supabase";

const defaultValues: IncomeRecordFormValues = {
  name: "",
  amount: "0",
};

export default function NewIncomeRecordPage() {
  const router = useRouter();
  const [values, setValues] = useState<IncomeRecordFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!values.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("income_sources").insert([
      {
        name: values.name.trim(),
        amount: Number(values.amount) || 0,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/income-records");
    router.refresh();
  };

  return (
    <IncomeRecordForm
      mode="create"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/income-records")}
    />
  );
}
