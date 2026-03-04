"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../utils/supabase";

type JewelLoan = {
  id: string;
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

export default function JewelLoansPage() {
  const [items, setItems] = useState<JewelLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLoans = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("jewel_loans")
      .select(
        "id, lender_name, loan_type, item_details, grams, loan_amount, interest_rate, loan_date, due_date, status",
      )
      .order("loan_date", { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data as JewelLoan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const onDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Delete this jewel loan? This cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("jewel_loans")
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
          <h2 className="text-xl font-semibold">Jewel Loan List</h2>
          <p className="text-sm text-muted-foreground">
            Track active and recovered jewel loans.
          </p>
        </div>
        <Button asChild>
          <Link href="/jewel-loans/new">Create Loan</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Lender</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Grams</th>
              <th className="px-4 py-3 text-left font-medium">Loan Amount</th>
              <th className="px-4 py-3 text-left font-medium">Interest %</th>
              <th className="px-4 py-3 text-left font-medium">Loan Date</th>
              <th className="px-4 py-3 text-left font-medium">Due Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading jewel loans...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No jewel loans found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{item.lender_name}</td>
                  <td className="px-4 py-3">{item.loan_type}</td>
                  <td className="px-4 py-3">{item.grams ?? "-"}</td>
                  <td className="px-4 py-3">{item.loan_amount ?? "-"}</td>
                  <td className="px-4 py-3">{item.interest_rate ?? "-"}</td>
                  <td className="px-4 py-3">{item.loan_date ?? "-"}</td>
                  <td className="px-4 py-3">{item.due_date ?? "-"}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/jewel-loans/${item.id}/edit`}>Edit</Link>
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
