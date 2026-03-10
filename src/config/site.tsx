import {
  CalendarRange,
  CircleDollarSign,
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
  title: "Nirai Budget Tracker",
  description: "A budget tracking application built with VisActor and Next.js.",
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
    icon: Gem,
    name: "Jewel Loans",
    href: "/jewel-loans",
  },
  {
    icon: HandCoins,
    name: "Fixed Loans",
    href: "/fixed-loans",
  },
  {
    icon: CircleDollarSign,
    name: "Investments",
    href: "/investments/ceetu",
  },
  {
    icon: Landmark,
    name: "Income",
    href: "/income-records",
  },
  {
    icon: FolderTree,
    name: "Categories",
    href: "/categories",
  },
  {
    icon: ReceiptText,
    name: "Expense Format",
    href: "/expense-templates",
  },
];
