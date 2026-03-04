"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  IncomeRecordForm,
  type IncomeRecordFormValues,
} from "../../components/income-record-form";
import { supabase } from "../../../../../utils/supabase";

type IncomeRecordRow = {
  name: string;
  amount: number;
};

export default function EditIncomeRecordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [values, setValues] = useState<IncomeRecordFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecord = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("income_sources")
        .select("name, amount")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const row = data as IncomeRecordRow;
      setValues({
        name: row.name ?? "",
        amount: String(row.amount ?? 0),
      });
      setLoading(false);
    };

    loadRecord();
  }, [id]);

  const onSubmit = async () => {
    if (!values || !values.name.trim()) {
      setError("Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("income_sources")
      .update({
        name: values.name.trim(),
        amount: Number(values.amount) || 0,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/income-records");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading record...</p>;
  }

  return (
    <IncomeRecordForm
      mode="edit"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/income-records")}
    />
  );
}
