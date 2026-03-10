"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../../utils/supabase";

type CeetuInvestment = {
  id: string;
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

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-GB").format(d);
};

const getRemainingMonths = (endDateValue: string | null) => {
  if (!endDateValue) return null;
  const today = new Date();
  const endDate = new Date(endDateValue);
  return Math.max(
    0,
    (endDate.getFullYear() - today.getFullYear()) * 12 +
    (endDate.getMonth() - today.getMonth()) +
    1,
  );
};

export default function CeetuInvestmentsPage() {
  const [items, setItems] = useState<CeetuInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("ceetu_investments")
      .select(
        "id, name, monthly_emi, start_date, end_date, total_claim_amount, claimed_amount, claim_details, claim_date, is_active",
      )
      .order("end_date", { ascending: true, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setItems((data as CeetuInvestment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Delete this investment? This cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const { error: deleteError } = await supabase
      .from("ceetu_investments")
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
          <h2 className="text-xl font-semibold">Ceetu Investment List</h2>
          <p className="text-sm text-muted-foreground">
            Track monthly ceetu payments and claim progress.
          </p>
        </div>
        <Button asChild>
          <Link href="/investments/ceetu/new">Create Investment</Link>
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1360px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Monthly EMI</th>
              <th className="px-4 py-3 text-left font-medium">Start Date</th>
              <th className="px-4 py-3 text-left font-medium">End Date</th>
              <th className="px-4 py-3 text-left font-medium">Total Claim</th>
              <th className="px-4 py-3 text-left font-medium">Claimed</th>
              <th className="px-4 py-3 text-left font-medium">Remaining</th>
              <th className="px-4 py-3 text-left font-medium">Claimed Date</th>
              <th className="px-4 py-3 text-left font-medium">Claimed For</th>
              <th className="px-4 py-3 text-left font-medium">Remaining Months</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading investments...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No ceetu investments found.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const totalClaim = Number(item.total_claim_amount ?? 0);
                const claimed = Number(item.claimed_amount ?? 0);
                const remaining = Math.max(totalClaim - claimed, 0);
                const remainingMonths = getRemainingMonths(item.end_date);

                return (
                  <tr key={item.id} className="border-b last:border-b-0" onClick={() => window.location.href = `/investments/ceetu/${item.id}/edit`} style={{ cursor: "pointer" }}>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{formatMoney(Number(item.monthly_emi ?? 0))}</td>
                    <td className="px-4 py-3">{formatDate(item.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(item.end_date)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">
                      {formatMoney(totalClaim)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatMoney(claimed)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-300">
                      {formatMoney(remaining)}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.claim_date)}</td>
                    <td className="max-w-[240px] truncate px-4 py-3">
                      {item.claim_details?.trim() ? item.claim_details : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {remainingMonths === null ? "-" : `${remainingMonths} month(s)`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
