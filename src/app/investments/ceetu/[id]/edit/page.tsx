"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CeetuInvestmentForm,
  type CeetuInvestmentFormValues,
} from "../../components/ceetu-investment-form";
import { supabase } from "../../../../../../utils/supabase";

type CeetuInvestmentRow = {
  name: string;
  monthly_emi: number;
  start_date: string;
  end_date: string | null;
  total_claim_amount: number;
  claimed_amount: number;
  claim_details: string | null;
  claim_date: string | null;
  is_active: boolean;
};

export default function EditCeetuInvestmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [values, setValues] = useState<CeetuInvestmentFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("ceetu_investments")
        .select(
          "name, monthly_emi, start_date, end_date, total_claim_amount, claimed_amount, claim_details, claim_date, is_active",
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const row = data as CeetuInvestmentRow;
      setValues({
        name: row.name ?? "",
        monthly_emi: String(row.monthly_emi ?? 0),
        start_date: row.start_date ?? "",
        end_date: row.end_date ?? "",
        total_claim_amount: String(row.total_claim_amount ?? 0),
        claimed_amount: String(row.claimed_amount ?? 0),
        claim_details: row.claim_details ?? "",
        claim_date: row.claim_date ?? "",
        is_active: row.is_active ?? true,
      });
      setLoading(false);
    };

    loadItem();
  }, [id]);

  const onSubmit = async () => {
    if (!values) {
      return;
    }

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

    const { error: updateError } = await supabase
      .from("ceetu_investments")
      .update({
        name: cleanName,
        monthly_emi: Number(values.monthly_emi) || 0,
        start_date: values.start_date,
        end_date: values.end_date || null,
        total_claim_amount: Number(values.total_claim_amount) || 0,
        claimed_amount: Number(values.claimed_amount) || 0,
        claim_details: values.claim_details.trim() || null,
        claim_date: values.claim_date || null,
        is_active: values.is_active,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/investments/ceetu");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading investment...</p>;
  }

  return (
    <CeetuInvestmentForm
      mode="edit"
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/investments/ceetu")}
    />
  );
}
