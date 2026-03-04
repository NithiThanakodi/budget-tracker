"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

type ExpenseTemplate = {
  id: string;
  item_name: string;
  default_amount: number;
  interval_type: "monthly" | "bi-monthly" | "quarterly" | "specific_months";
  specific_months: number[];
  is_active: boolean;
  categories: {
    name: string;
  } | null;
};

export default function ExpenseTemplatesPage() {
  const [items, setItems] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("expense_templates")
      .select(
        "id, item_name, default_amount, interval_type, specific_months, is_active, categories(name)",
      )
      .order("item_name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data as ExpenseTemplate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const onDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Delete this expense template? This cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("expense_templates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Expense Template List</h2>
          <p className="text-sm text-muted-foreground">
            Manage repeating expense rules used to build monthly budgets.
          </p>
        </div>
        <Button asChild>
          <Link href="/expense-templates/new">Create Template</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Interval</th>
              <th className="px-4 py-3 text-left font-medium">
                Specific Months
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading expense templates...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No expense templates found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{item.item_name}</td>
                  <td className="px-4 py-3">
                    {item.categories?.name ?? "Uncategorized"}
                  </td>
                  <td className="px-4 py-3">{Number(item.default_amount)}</td>
                  <td className="px-4 py-3">{item.interval_type}</td>
                  <td className="px-4 py-3">
                    {item.specific_months?.length
                      ? item.specific_months.join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {item.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/expense-templates/${item.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === item.id}
                        onClick={() => onDelete(item.id)}
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
