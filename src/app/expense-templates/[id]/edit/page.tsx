"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ExpenseTemplateForm,
  type ExpenseTemplateFormValues,
} from "../../components/expense-template-form";
import { supabase } from "../../../../../utils/supabase";

type Category = {
  id: string;
  name: string;
};

const parseSpecificMonths = (raw: string) => {
  if (!raw.trim()) {
    return [];
  }

  const parsed = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isInteger(value));

  const unique = [...new Set(parsed)];
  const hasInvalidMonth = unique.some((value) => value < 1 || value > 12);

  if (hasInvalidMonth) {
    return null;
  }

  return unique.sort((a, b) => a - b);
};

export default function EditExpenseTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<ExpenseTemplateFormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      const [{ data: categoriesData, error: categoriesError }, { data, error: fetchError }] =
        await Promise.all([
          supabase
            .from("categories")
            .select("id, name")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("expense_templates")
            .select(
              "item_name, category_id, default_amount, interval_type, specific_months, is_active",
            )
            .eq("id", id)
            .single(),
        ]);

      if (categoriesError) {
        setError(categoriesError.message);
        setLoading(false);
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setCategories(categoriesData ?? []);
      setValues({
        item_name: data.item_name,
        category_id: data.category_id ?? "",
        default_amount: String(data.default_amount ?? 0),
        interval_type: data.interval_type,
        specific_months: (data.specific_months ?? []).join(","),
        is_active: data.is_active ?? true,
      });
      setLoading(false);
    };

    loadInitialData();
  }, [id]);

  const onSubmit = async () => {
    if (!values) {
      return;
    }

    const cleanName = values.item_name.trim();
    if (!cleanName) {
      setError("Item name is required.");
      return;
    }

    const specificMonths = parseSpecificMonths(values.specific_months);
    if (specificMonths === null) {
      setError("Specific months must be numbers from 1 to 12.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("expense_templates")
      .update({
        item_name: cleanName,
        category_id: values.category_id || null,
        default_amount: Number(values.default_amount) || 0,
        interval_type: values.interval_type,
        specific_months:
          values.interval_type === "specific_months" ? specificMonths : [],
        is_active: values.is_active,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/expense-templates");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading template...</p>;
  }

  return (
    <ExpenseTemplateForm
      mode="edit"
      categories={categories}
      values={values}
      error={error}
      submitting={submitting}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={() => router.push("/expense-templates")}
    />
  );
}
