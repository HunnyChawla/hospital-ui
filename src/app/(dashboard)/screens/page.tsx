import { ScreenList } from "@/components/screens/ScreenList";

export const metadata = {
    title: "Screen Management | HMS",
    description: "Manage application screens and menus",
};

export default function ServicesPage() {
    return (
        <div className="flex h-full flex-col space-y-4 p-8">
            <ScreenList />
        </div>
    );
}
