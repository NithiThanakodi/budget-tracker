import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function BudgetGridLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Budget Grid" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
