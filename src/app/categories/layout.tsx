import Container from "@/components/container";
import { TopNav } from "@/components/nav";

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav title="Categories" />
      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </>
  );
}
