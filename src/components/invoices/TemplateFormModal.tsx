"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import {
    useCreateTemplate,
    useUpdateTemplate
} from "@/hooks/queries/useInvoiceTemplates";
import { InvoiceTemplate, TemplateLineItem } from "@/services/invoiceTemplatesApi";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface TemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: InvoiceTemplate | null;
    onSuccess?: () => void;
}

interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    discount_type: "percentage" | "amount";
}

export function TemplateFormModal({
    isOpen,
    onClose,
    template,
    onSuccess
}: TemplateFormModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: "amount" }
    ]);
    const [taxRate, setTaxRate] = useState<number>(0);
    const [discount, setDiscount] = useState<number>(0);
    const [notes, setNotes] = useState("");

    const createTemplate = useCreateTemplate();
    const updateTemplate = useUpdateTemplate();

    const isEditMode = !!template && !!template.id;

    // Load template data when editing or saving as template
    useEffect(() => {
        if (isOpen && template) {
            setName(template.name);
            setDescription(template.description || "");
            setLineItems(template.line_items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                discount_type: item.discount_type,
            })));
            setTaxRate(template.tax_rate);
            setDiscount(template.discount);
            setNotes(template.notes || "");
        }
    }, [isOpen, template]);

    const handleAddLineItem = () => {
        setLineItems([
            ...lineItems,
            { description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: "amount" }
        ]);
    };

    const handleRemoveLineItem = (index: number) => {
        if (lineItems.length === 1) {
            toast.error("At least one line item is required");
            return;
        }
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (
        index: number,
        field: keyof LineItem,
        value: string | number
    ) => {
        const newLineItems = [...lineItems];
        newLineItems[index] = { ...newLineItems[index], [field]: value };
        setLineItems(newLineItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name.trim()) {
            toast.error("Template name is required");
            return;
        }

        if (lineItems.some(item => !item.description.trim())) {
            toast.error("All line items must have a description");
            return;
        }

        try {
            const templateData = {
                name: name.trim(),
                description: description.trim() || undefined,
                line_items: lineItems.map(item => ({
                    description: item.description.trim(),
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    discount: Number(item.discount),
                    discount_type: item.discount_type,
                })),
                tax_rate: Number(taxRate),
                discount: Number(discount),
                notes: notes.trim() || undefined,
            };

            if (isEditMode && template) {
                await updateTemplate.mutateAsync({
                    id: template.id,
                    data: templateData,
                });
            } else {
                await createTemplate.mutateAsync(templateData);
            }

            handleClose();

            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.error("Failed to save template:", error);
            // Error toast is handled by the mutation
        }
    };

    const handleClose = () => {
        // Reset form
        setName("");
        setDescription("");
        setLineItems([{ description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: "amount" }]);
        setTaxRate(0);
        setDiscount(0);
        setNotes("");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Edit Template" : "Create New Template"}
            size="xl"
            contentClassName="scrollbar-hide"
        >
            <form onSubmit={handleSubmit} className="space-y-4 -mx-6 -mb-6 px-6 pb-6">
                {/* Template Name */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Template Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Standard Consultation"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Description
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Line Items */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-slate-700">
                            Line Items <span className="text-rose-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={handleAddLineItem}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Item
                        </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {lineItems.map((item, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                                {/* Description */}
                                <div className="col-span-12 sm:col-span-4">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) =>
                                            handleLineItemChange(index, "description", e.target.value)
                                        }
                                        placeholder="Description"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                {/* Quantity */}
                                <div className="col-span-3 sm:col-span-2">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            handleLineItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                                        }
                                        placeholder="Qty"
                                        min="0"
                                        step="1"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div className="col-span-3 sm:col-span-2">
                                    <input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) =>
                                            handleLineItemChange(index, "unit_price", parseFloat(e.target.value) || 0)
                                        }
                                        placeholder="Price"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Discount */}
                                <div className="col-span-4 sm:col-span-2">
                                    <input
                                        type="number"
                                        value={item.discount}
                                        onChange={(e) =>
                                            handleLineItemChange(index, "discount", parseFloat(e.target.value) || 0)
                                        }
                                        placeholder="Discount"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Discount Type */}
                                <div className="col-span-5 sm:col-span-1">
                                    <select
                                        value={item.discount_type}
                                        onChange={(e) =>
                                            handleLineItemChange(index, "discount_type", e.target.value)
                                        }
                                        className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="amount">₹</option>
                                        <option value="percentage">%</option>
                                    </select>
                                </div>

                                {/* Remove Button */}
                                <div className="col-span-3 sm:col-span-1 flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLineItem(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        disabled={lineItems.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tax Rate and Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Tax Rate (%)
                        </label>
                        <input
                            type="number"
                            value={taxRate}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Overall Discount (₹)
                        </label>
                        <input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes for this template"
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200 -mx-6 px-6 bg-slate-50 -mb-6 pb-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        disabled={createTemplate.isPending || updateTemplate.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createTemplate.isPending || updateTemplate.isPending}
                        className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createTemplate.isPending || updateTemplate.isPending
                            ? "Saving..."
                            : isEditMode
                                ? "Update Template"
                                : "Create Template"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
