"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExpenseTemplateForm,
  type ExpenseTemplateFormValues,
} from "../components/expense-template-form";
import { supabase } from "../../../../utils/supabase";

type Category = {
  id: string;
  name: string;
};

const defaultValues: ExpenseTemplateFormValues = {
  item_name: "",
  category_id: "",
  default_amount: "0",
  interval_type: "monthly",
  specific_months: "",
  is_active: true,
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

export default function NewExpenseTemplatePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<ExpenseTemplateFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error: fetchError } = await supabase
        .from("categories")
        .select("id, name")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setCategories(data ?? []);
    };

    loadCategories();
  }, []);

  const onSubmit = async () => {
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

    const { error: insertError } = await supabase.from("expense_templates").insert([
      {
        item_name: cleanName,
        category_id: values.category_id || null,
        default_amount: Number(values.default_amount) || 0,
        interval_type: values.interval_type,
        specific_months:
          values.interval_type === "specific_months" ? specificMonths : [],
        is_active: values.is_active,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/expense-templates");
    router.refresh();
  };

  return (
    <ExpenseTemplateForm
      mode="create"
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
