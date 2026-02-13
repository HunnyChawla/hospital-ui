"use client";

import { useState, useMemo } from "react";
import {
    useInvoiceTemplates,
    useDeleteTemplate,
} from "@/hooks/queries/useInvoiceTemplates";
import { InvoiceTemplate } from "@/services/invoiceTemplatesApi";
import { Modal } from "@/components/common/Modal";
import { currency } from "@/utils/format";
import {
    Search,
    PlusCircle,
    Edit,
    Trash2,
    FileText,
    Filter,
    X,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface InvoiceTemplatesManagementProps {
    onCreateTemplate?: () => void;
    onEditTemplate?: (template: InvoiceTemplate) => void;
}

export function InvoiceTemplatesManagement({
    onCreateTemplate,
    onEditTemplate,
}: InvoiceTemplatesManagementProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(
        undefined
    );
    const [templateToDelete, setTemplateToDelete] =
        useState<InvoiceTemplate | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch templates
    const { data, isLoading, error } = useInvoiceTemplates({
        search: searchTerm || undefined,
        is_active: activeFilter,
    });

    const deleteTemplateMutation = useDeleteTemplate();

    // Filter templates locally for instant feedback
    const filteredTemplates = useMemo(() => {
        if (!data?.items) return [];

        let filtered = data.items;

        // Apply active filter
        if (activeFilter !== undefined) {
            filtered = filtered.filter((t) => t.is_active === activeFilter);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (t) =>
                    t.name.toLowerCase().includes(term) ||
                    t.description?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [data, searchTerm, activeFilter]);

    const handleDeleteTemplate = (template: InvoiceTemplate) => {
        setTemplateToDelete(template);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;

        try {
            await deleteTemplateMutation.mutateAsync({
                id: templateToDelete.id,
                permanent: false, // Soft delete by default
            });
            setShowDeleteConfirm(false);
            setTemplateToDelete(null);
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 w-full sm:max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Active Filter */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1">
                        <button
                            onClick={() => setActiveFilter(undefined)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeFilter === undefined
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveFilter(true)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeFilter === true
                                ? "bg-green-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveFilter(false)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeFilter === false
                                ? "bg-slate-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            Archived
                        </button>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={onCreateTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-md transition-all font-medium whitespace-nowrap active:scale-95"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Create Template
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>Failed to load templates. Please try again.</p>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        {searchTerm || activeFilter !== undefined
                            ? "No templates found"
                            : "No templates yet"}
                    </h3>
                    <p className="text-slate-500 mb-6">
                        {searchTerm || activeFilter !== undefined
                            ? "Try adjusting your search or filters"
                            : "Create your first template to get started"}
                    </p>
                    {!searchTerm && activeFilter === undefined && (
                        <button
                            onClick={onCreateTemplate}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-lg transition-all font-medium active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Create Template
                        </button>
                    )}
                </div>
            )}

            {/* Templates Grid */}
            {!isLoading && !error && filteredTemplates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">
                                        {template.name}
                                    </h3>
                                    {template.description && (
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                                {!template.is_active && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full flex-shrink-0">
                                        Archived
                                    </span>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Items:</span>
                                    <span className="font-medium text-slate-900">
                                        {template.line_items.length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Tax Rate:</span>
                                    <span className="font-medium text-slate-900">
                                        {template.tax_rate}%
                                    </span>
                                </div>
                                {template.discount > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Discount:</span>
                                        <span className="font-medium text-green-600">
                                            {currency(template.discount)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => onEditTemplate?.(template)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(template)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && templateToDelete && (
                <Modal
                    isOpen={showDeleteConfirm}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setTemplateToDelete(null);
                    }}
                    title="Delete Template"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-slate-700 mb-2">
                                    Are you sure you want to delete the template "
                                    <span className="font-semibold">{templateToDelete.name}</span>
                                    "?
                                </p>
                                <p className="text-sm text-slate-500">
                                    This will archive the template. You can restore it later from
                                    the archived templates.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setTemplateToDelete(null);
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                disabled={deleteTemplateMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteTemplateMutation.isPending}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleteTemplateMutation.isPending && (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                )}
                                Delete Template
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
