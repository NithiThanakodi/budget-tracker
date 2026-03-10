"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  JewelLoanForm,
  type JewelLoanFormValues,
} from "../../components/jewel-loan-form";
import { supabase } from "../../../../../utils/supabase";

type JewelLoanRow = {
  id: string;
  lender_name: string;
  jeweler_name: string | null;
  loan_type: "bank" | "pawn";
  item_details: string | null;
  grams: number | null;
  loan_amount: number | null;
  interest_rate: number | null;
  loan_date: string | null;
  due_date: string | null;
  status: "active" | "recovered";
};

type JewelLoanRenewalRow = {
  id: string;
  renewed_on: string;
  previous_loan_date: string | null;
  previous_due_date: string | null;
  previous_grams: number | null;
  previous_loan_amount: number | null;
  previous_interest_rate: number | null;
  renewed_loan_date: string | null;
  renewed_due_date: string | null;
  renewed_grams: number | null;
  renewed_loan_amount: number | null;
  interest_paid: number | null;
  comment: string | null;
  created_at: string;
};

type RenewalDraft = {
  renewed_on: string;
  renewed_loan_amount: string;
  interest_paid: string;
  renewed_loan_date: string;
  renewed_due_date: string;
  renewed_grams: string;
  comment: string;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB").format(new Date(value));
};

export default function EditJewelLoanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [values, setValues] = useState<JewelLoanFormValues | null>(null);
  const [originalLoan, setOriginalLoan] = useState<JewelLoanRow | null>(null);
  const [renewals, setRenewals] = useState<JewelLoanRenewalRow[]>([]);
  const [renewOnSave, setRenewOnSave] = useState(false);
  const [renewal, setRenewal] = useState<RenewalDraft>({
    renewed_on: "",
    renewed_loan_amount: "",
    interest_paid: "",
    renewed_loan_date: "",
    renewed_due_date: "",
    renewed_grams: "",
    comment: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLoan = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("jewel_loans")
        .select(
          "id, lender_name, jeweler_name, loan_type, item_details, grams, loan_amount, interest_rate, loan_date, due_date, status",
        )
        .eq("id", id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const row = data as JewelLoanRow;
      setOriginalLoan(row);
      setValues({
        lender_name: row.lender_name ?? "",
        jeweler_name: row.jeweler_name ?? "",
        loan_type: row.loan_type ?? "bank",
        item_details: row.item_details ?? "",
        grams: row.grams?.toString() ?? "",
        loan_amount: row.loan_amount?.toString() ?? "",
        interest_rate: row.interest_rate?.toString() ?? "",
        loan_date: row.loan_date ?? "",
        due_date: row.due_date ?? "",
        status: row.status ?? "active",
      });

      setRenewal({
        renewed_on: "",
        renewed_loan_amount: row.loan_amount?.toString() ?? "",
        interest_paid: "",
        renewed_loan_date: row.loan_date ?? "",
        renewed_due_date: row.due_date ?? "",
        renewed_grams: row.grams?.toString() ?? "",
        comment: "",
      });

      const { data: renewalData, error: renewalError } = await supabase
        .from("jewel_loan_renewals")
        .select(
          "id, renewed_on, previous_loan_date, previous_due_date, previous_grams, previous_loan_amount, previous_interest_rate, renewed_loan_date, renewed_due_date, renewed_grams, renewed_loan_amount, interest_paid, comment, created_at",
        )
        .eq("jewel_loan_id", id)
        .order("renewed_on", { ascending: false });

      if (!renewalError) {
        setRenewals((renewalData as JewelLoanRenewalRow[]) ?? []);
      }

      setLoading(false);
    };

    loadLoan();
  }, [id]);

  const onSubmit = async () => {
    if (!values) {
      return;
    }

    const cleanLenderName = values.lender_name.trim();
    if (!cleanLenderName) {
      setError("Lender name is required.");
      return;
    }

    if (!originalLoan) {
      setError("Unable to load loan details.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const updatePayload = {
      lender_name: cleanLenderName,
      jeweler_name: values.jeweler_name.trim() || null,
      loan_type: values.loan_type,
      item_details: values.item_details.trim() || null,
      grams: values.grams ? Number(values.grams) : null,
      loan_amount: values.loan_amount ? Number(values.loan_amount) : null,
      interest_rate: values.interest_rate ? Number(values.interest_rate) : null,
      loan_date: values.loan_date || null,
      due_date: values.due_date || null,
      status: values.status,
    };

    if (renewOnSave) {
      if (
        !renewal.renewed_on ||
        !renewal.renewed_loan_date ||
        !renewal.renewed_due_date ||
        !renewal.renewed_loan_amount
      ) {
        setError(
          "For renewal, fill renewal date, renewed start/end date, and renewed loan amount.",
        );
        setSubmitting(false);
        return;
      }

      const renewedLoanAmount = Number(renewal.renewed_loan_amount);
      const interestPaid = renewal.interest_paid ? Number(renewal.interest_paid) : 0;
      const renewedGrams = renewal.renewed_grams ? Number(renewal.renewed_grams) : null;

      const { error: renewalInsertError } = await supabase
        .from("jewel_loan_renewals")
        .insert([
          {
            jewel_loan_id: id,
            renewed_on: renewal.renewed_on,
            previous_loan_date: originalLoan.loan_date,
            previous_due_date: originalLoan.due_date,
            previous_grams: originalLoan.grams,
            previous_loan_amount: originalLoan.loan_amount,
            previous_interest_rate: originalLoan.interest_rate,
            renewed_loan_date: renewal.renewed_loan_date,
            renewed_due_date: renewal.renewed_due_date,
            renewed_grams: renewedGrams,
            renewed_loan_amount: renewedLoanAmount,
            interest_paid: interestPaid,
            comment: renewal.comment.trim() || null,
          },
        ]);

      if (renewalInsertError) {
        setError(renewalInsertError.message);
        setSubmitting(false);
        return;
      }

      updatePayload.loan_amount = renewedLoanAmount;
      updatePayload.loan_date = renewal.renewed_loan_date;
      updatePayload.due_date = renewal.renewed_due_date;
      updatePayload.grams = renewedGrams;
    }

    const { error: updateError } = await supabase
      .from("jewel_loans")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/jewel-loans");
    router.refresh();
  };

  if (loading || !values) {
    return <p className="text-sm text-muted-foreground">Loading loan...</p>;
  }

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(420px,1fr)]">
      <div className="space-y-4">
        <JewelLoanForm
          mode="edit"
          values={values}
          error={error}
          submitting={submitting}
          hideActions
          onChange={setValues}
          onSubmit={onSubmit}
          onCancel={() => router.push("/jewel-loans")}
        />

        <div className="max-w-2xl rounded-md border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Renewal Update</h3>
              <p className="text-xs text-muted-foreground">
                Save renewal history and update the active jewel loan in one step.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={renewOnSave}
                onChange={(event) => setRenewOnSave(event.target.checked)}
              />
              Record renewal on save
            </label>
          </div>

          {renewOnSave ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Renewal Date</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.renewed_on}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        renewed_on: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Interest Paid</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.interest_paid}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        interest_paid: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Renewed Loan Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.renewed_loan_amount}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        renewed_loan_amount: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Renewed Grams</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.renewed_grams}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        renewed_grams: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Renewed Start Date</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.renewed_loan_date}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        renewed_loan_date: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Renewed Due Date</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={renewal.renewed_due_date}
                    onChange={(event) =>
                      setRenewal((current) => ({
                        ...current,
                        renewed_due_date: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Comment</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={renewal.comment}
                  onChange={(event) =>
                    setRenewal((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  placeholder="Removed 2 grams, renewed for 6 months"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/jewel-loans")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="min-w-28"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="h-fit rounded-md border p-4 xl:sticky xl:top-4">
        <h3 className="text-base font-semibold">Renewal History</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Immutable history of old and renewed values with comments.
        </p>

        {renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No renewals yet.</p>
        ) : (
          <div className="max-h-[78vh] space-y-2 overflow-y-auto pr-1">
            {renewals.map((entry) => {
              const previous = Number(entry.previous_loan_amount ?? 0);
              const renewed = Number(entry.renewed_loan_amount ?? 0);
              const interestPaid = Number(entry.interest_paid ?? 0);
              return (
                <div
                  key={entry.id}
                  className="rounded-md border bg-muted/20 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      Renewal on {formatDate(entry.renewed_on)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saved {formatDate(entry.created_at)}
                    </p>
                  </div>
                  <div className="mt-1 grid grid-cols-1 gap-1 tablet:grid-cols-2">
                    <p>
                      Amount:{" "}
                      <span className="font-semibold text-amber-700">
                        {formatMoney(previous)}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-emerald-700">
                        {formatMoney(renewed)}
                      </span>
                    </p>
                    <p>
                      Interest Paid:{" "}
                      <span className="font-semibold text-rose-700">
                        {formatMoney(interestPaid)}
                      </span>
                    </p>
                    <p>
                      Dates: {formatDate(entry.previous_loan_date)} to{" "}
                      {formatDate(entry.previous_due_date)} ->{" "}
                      {formatDate(entry.renewed_loan_date)} to{" "}
                      {formatDate(entry.renewed_due_date)}
                    </p>
                    <p>
                      Grams: {entry.previous_grams ?? "-"} ->{" "}
                      {entry.renewed_grams ?? "-"}
                    </p>
                  </div>
                  {entry.comment ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Note: {entry.comment}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
