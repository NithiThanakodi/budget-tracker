import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function FixedLoansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Fixed Loans" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
