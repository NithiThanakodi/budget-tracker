import {
  CalendarRange,
  FolderTree,
  Gauge,
  Gem,
  HandCoins,
  Landmark,
  type LucideIcon,
  MessagesSquare,
  ReceiptText,
} from "lucide-react";

export type SiteConfig = typeof siteConfig;
export type Navigation = {
  icon: LucideIcon;
  name: string;
  href: string;
};

export const siteConfig = {
  title: "VisActor Next Template",
  description: "Template for VisActor and Next.js",
};

export const navigations: Navigation[] = [
  {
    icon: Gauge,
    name: "Dashboard",
    href: "/",
  },
  {
    icon: CalendarRange,
    name: "Budget Grid",
    href: "/budget-grid",
  },
  {
    icon: FolderTree,
    name: "Categories",
    href: "/categories",
  },
  {
    icon: ReceiptText,
    name: "Expense Templates",
    href: "/expense-templates",
  },
  {
    icon: Gem,
    name: "Jewel Loans",
    href: "/jewel-loans",
  },
  {
    icon: Landmark,
    name: "Income",
    href: "/income-records",
  },
  {
    icon: HandCoins,
    name: "Fixed Loans",
    href: "/fixed-loans",
  },
  {
    icon: MessagesSquare,
    name: "Ticket",
    href: "/ticket",
  },
];
