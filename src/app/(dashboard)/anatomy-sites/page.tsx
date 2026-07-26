import { AnatomySitesManagement } from "@/components/anatomy-sites/AnatomySitesManagement";

export const metadata = {
  title: "Anatomy Sites Master | Hospital Management System",
  description: "Manage global surgical anatomy sites and eye laterality (OD, OS, OU).",
};

export default function AnatomySitesPage() {
  return <AnatomySitesManagement />;
}
