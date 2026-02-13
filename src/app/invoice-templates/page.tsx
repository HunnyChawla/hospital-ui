"use client";

import { useState } from "react";
import { InvoiceTemplatesManagement } from "@/components/invoices/InvoiceTemplatesManagement";
import { TemplateFormModal } from "@/components/invoices/TemplateFormModal";
import { InvoiceTemplate } from "@/services/invoiceTemplatesApi";
import { FileText } from "lucide-react";

export default function InvoiceTemplatesPage() {
    const [showFormModal, setShowFormModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);

    const handleCreateTemplate = () => {
        setSelectedTemplate(null);
        setShowFormModal(true);
    };

    const handleEditTemplate = (template: InvoiceTemplate) => {
        setSelectedTemplate(template);
        setShowFormModal(true);
    };

    const handleCloseModal = () => {
        setShowFormModal(false);
        setSelectedTemplate(null);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-surface border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Invoice Templates
                            </h1>
                            <p className="text-sm text-slate-600 mt-0.5">
                                Create and manage reusable invoice templates
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <InvoiceTemplatesManagement
                    onCreateTemplate={handleCreateTemplate}
                    onEditTemplate={handleEditTemplate}
                />
            </div>

            {/* Form Modal */}
            <TemplateFormModal
                isOpen={showFormModal}
                onClose={handleCloseModal}
                template={selectedTemplate}
            />
        </div>
    );
}
