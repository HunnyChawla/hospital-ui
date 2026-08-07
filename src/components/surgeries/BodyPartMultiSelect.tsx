import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BodyPart } from "@/services/bodyPartsApi";

interface BodyPartMultiSelectProps {
    bodyParts: BodyPart[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export function BodyPartMultiSelect({ bodyParts, selectedIds, onChange }: BodyPartMultiSelectProps) {
    const [search, setSearch] = useState("");

    const grouped = useMemo(() => {
        const filtered = bodyParts.filter((bp) => {
            if (!bp.is_active) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return bp.name.toLowerCase().includes(q) || bp.code.toLowerCase().includes(q);
        });
        const byDept = new Map<string, BodyPart[]>();
        for (const bp of filtered) {
            const list = byDept.get(bp.department) || [];
            list.push(bp);
            byDept.set(bp.department, list);
        }
        return Array.from(byDept.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [bodyParts, search]);

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((i) => i !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    if (bodyParts.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No body parts configured yet — add them in{" "}
                <a href="/master-data" className="font-semibold text-sky-600 hover:underline">
                    Master Data → Body Parts
                </a>
                .
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search body parts..."
                    className="w-full rounded-lg border-0 px-3 py-2 pl-9 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-sky-600"
                />
            </div>
            <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {grouped.length === 0 ? (
                    <p className="text-sm text-slate-500">No matching body parts.</p>
                ) : (
                    grouped.map(([department, parts]) => (
                        <div key={department}>
                            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{department}</p>
                            <div className="grid grid-cols-2 gap-1">
                                {parts.map((bp) => (
                                    <label
                                        key={bp.id}
                                        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(bp.id)}
                                            onChange={() => toggle(bp.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                        />
                                        {bp.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <p className="text-xs text-slate-500">
                {selectedIds.length === 0
                    ? "No body parts selected — this will be a general surgery with no body-part picker."
                    : selectedIds.length === 1
                        ? "One body part selected — it will be auto-applied without showing a picker."
                        : `${selectedIds.length} body parts selected — a picker will be shown when this surgery is advised.`}
            </p>
        </div>
    );
}
