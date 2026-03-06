import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function CeetuInvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Ceetu Investments" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
