import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableRowProps {
    id: string;
    children: React.ReactNode;
}

export function SortableRow({ id, children }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as const,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`${isDragging ? 'bg-blue-50 opacity-80 shadow-md' : 'hover:bg-slate-50'}`}
        >
            <td className="w-10 px-0 py-4 pl-4">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-move touch-none p-1 text-slate-400 hover:text-slate-600"
                    title="Drag to reorder"
                >
                    <GripVertical className="h-5 w-5" />
                </button>
            </td>
            {children}
        </tr>
    );
}
