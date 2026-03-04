import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function IncomeRecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Income Records" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
