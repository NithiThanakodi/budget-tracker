"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "../../../../utils/supabase";

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function NewCategoryPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("categories").insert([
      {
        name: cleanName,
        sort_order: Number(sortOrder) || 0,
      },
    ]);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/categories");
    router.refresh();
  };

  return (
    <section className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Create Category</h2>
        <p className="text-sm text-muted-foreground">
          Add a new category to organize your budget items.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-md border p-4">
        <div className="space-y-2">
          <label htmlFor="category-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="category-name"
            className={inputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Groceries"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category-sort-order" className="text-sm font-medium">
            Sort Order
          </label>
          <input
            id="category-sort-order"
            className={inputClassName}
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/categories">Cancel</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
