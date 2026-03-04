import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function ExpenseTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Expense Templates" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
