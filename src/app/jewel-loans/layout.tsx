import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function JewelLoansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Jewel Loans" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
