"use client";

import { useState, useCallback, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { patientsApi } from "@/services/patientsApi";
import { useCreateInvoice } from "@/hooks/queries/useInvoices";
import { CreateInvoiceLineItem } from "@/services/invoicesApi";
import { useInvoiceTemplates } from "@/hooks/queries/useInvoiceTemplates";
import { InvoiceTemplate } from "@/services/invoiceTemplatesApi";
import { toast } from "sonner";
import { Search, User, X, Plus, Trash2, FileText, Smartphone, Bookmark } from "lucide-react";
import { useRef } from "react";
import { Patient } from "@/types";

interface InvoiceCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    discount: number;
    discount_type: "percentage" | "amount";
}

export function InvoiceCreateModal({ isOpen, onClose, onSuccess }: InvoiceCreateModalProps) {
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [selectedPatientName, setSelectedPatientName] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
    const justSelectedRef = useRef(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const [lineItems, setLineItems] = useState<LineItem[]>(() => {
        const defaultDiscountType = (typeof window !== "undefined"
            ? localStorage.getItem("invoice_line_discount_type_pref") as "percentage" | "amount"
            : null) || "amount";
        return [{ description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: defaultDiscountType }];
    });
    const [taxRate, setTaxRate] = useState<number>(0);
    const [discount, setDiscount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<"percentage" | "amount">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("invoice_discount_type_pref") as "percentage" | "amount") || "amount";
        }
        return "amount";
    });
    const [gstNumber, setGstNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    const createInvoice = useCreateInvoice();
    const { data: templatesData } = useInvoiceTemplates({ is_active: true });

    // Save discount type preference
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("invoice_discount_type_pref", discountType);
        }
    }, [discountType]);

    // Patient search
    useEffect(() => {
        if (!isOpen) return;

        // Don't search if we just selected a patient
        if (justSelectedRef.current) {
            return;
        }

        // Don't search if patient is already selected and search term matches patient name
        if (selectedPatientId && searchTerm === selectedPatientData?.name) {
            return;
        }

        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await patientsApi.searchGlobal({ q: searchTerm.trim(), page_size: 5 });
                const patients = patientsApi.mapToPatients(response.items);
                setSearchResults(patients);
                setShowDropdown(true);
            } catch (error) {
                console.error("Search failed:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, isOpen]);

    const handlePatientSelect = useCallback((patient: Patient) => {
        justSelectedRef.current = true;
        setSelectedPatientId(patient.id);
        setSelectedPatientName(patient.name);
        setSearchTerm(patient.name);
        setSelectedPatientData(patient);
        setShowDropdown(false);
        setSearchResults([]);

        // Reset the flag after a short delay
        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);
    }, []);

    const handleClearPatient = useCallback(() => {
        setSelectedPatientId("");
        setSelectedPatientName("");
        setSearchTerm("");
        setSelectedPatientData(null);
        setShowDropdown(false);
        setSearchResults([]);
    }, []);

    const handleAddLineItem = () => {
        const defaultDiscountType = (typeof window !== "undefined"
            ? localStorage.getItem("invoice_line_discount_type_pref") as "percentage" | "amount"
            : null) || "amount";
        setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: defaultDiscountType }]);
    };

    const handleRemoveLineItem = (index: number) => {
        if (lineItems.length === 1) {
            toast.error("At least one line item is required");
            return;
        }
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
        const newLineItems = [...lineItems];
        newLineItems[index] = { ...newLineItems[index], [field]: value };
        setLineItems(newLineItems);

        // Save discount type preference when it changes
        if (field === "discount_type" && typeof window !== "undefined") {
            localStorage.setItem("invoice_line_discount_type_pref", value as string);
        }
    };

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => {
        const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity;
        const price = typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price;
        const lineSubtotal = quantity * price;

        // Calculate line item discount (rounded)
        const itemDiscount = typeof item.discount === 'string' ? parseFloat(item.discount) || 0 : item.discount;
        const lineDiscountAmount = Math.round(
            item.discount_type === "percentage"
                ? (lineSubtotal * itemDiscount / 100)
                : itemDiscount
        );

        // Add line total (after line discount) to sum
        return sum + (lineSubtotal - lineDiscountAmount);
    }, 0);

    const discountAmount = Math.round(discountType === "percentage" ? (subtotal * discount) / 100 : discount);
    const amountAfterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((amountAfterDiscount * taxRate) / 100);
    const totalAmount = amountAfterDiscount + taxAmount;

    // Handle template selection and populate form
    const handleTemplateSelect = useCallback((templateId: string) => {
        setSelectedTemplateId(templateId);

        if (!templateId) return;

        // Save to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("invoice_last_template_id", templateId);
        }

        // Find the template
        const template = templatesData?.items.find((t) => t.id === templateId);
        if (!template) return;

        // Populate line items
        setLineItems(template.line_items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            discount_type: item.discount_type,
        })));

        // Populate other fields
        setTaxRate(template.tax_rate);
        setDiscount(template.discount);
        setNotes(template.notes || "");

        toast.success(`Template "${template.name}" loaded`);
    }, [templatesData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!selectedPatientId) {
            toast.error("Please select a patient");
            return;
        }

        if (lineItems.length === 0 || lineItems.some(item => !item.description.trim())) {
            toast.error("Please fill in all line item descriptions");
            return;
        }

        if (lineItems.some(item => item.quantity <= 0 || item.unit_price <= 0)) {
            toast.error("Quantity and unit price must be greater than 0");
            return;
        }

        try {
            const invoiceData: any = {
                patient_id: selectedPatientId,
                line_items: lineItems.map(item => {
                    const lineSubtotal = Number(item.quantity) * Number(item.unit_price);
                    const lineDiscountAmount = Math.round(
                        item.discount_type === "percentage"
                            ? (lineSubtotal * Number(item.discount) / 100)
                            : Number(item.discount)
                    );

                    return {
                        description: item.description,
                        quantity: Number(item.quantity),
                        unit_price: Number(item.unit_price),
                        discount: lineDiscountAmount,
                    };
                }),
                tax_rate: Number(taxRate),
                discount: Number(discountAmount), // Send calculated discount amount in rupees
            };

            if (gstNumber.trim()) {
                invoiceData.gst_number = gstNumber.trim();
            }

            if (notes.trim()) {
                invoiceData.notes = notes.trim();
            }

            await createInvoice.mutateAsync(invoiceData);

            // Reset form
            handleClose();

            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.error("Failed to create invoice:", error);
            // Error toast is handled by the mutation
        }
    };

    const handleClose = () => {
        // Reset all state
        setSelectedPatientId("");
        setSelectedPatientName("");
        setSearchTerm("");
        setSelectedPatientData(null);
        setSearchResults([]);
        setShowDropdown(false);
        const defaultDiscountType = (typeof window !== "undefined"
            ? localStorage.getItem("invoice_line_discount_type_pref") as "percentage" | "amount"
            : null) || "amount";
        setLineItems([{ description: "", quantity: 1, unit_price: 0, discount: 0, discount_type: defaultDiscountType }]);
        setTaxRate(0);
        setDiscount(0);
        setGstNumber("");
        setNotes("");
        setSelectedTemplateId("");
        onClose();
    };

    // Load last used template on mount and populate form
    useEffect(() => {
        if (isOpen && typeof window !== "undefined" && templatesData?.items) {
            const lastTemplateId = localStorage.getItem("invoice_last_template_id");
            if (lastTemplateId) {
                // Check if template exists in current data
                const templateExists = templatesData.items.some(t => t.id === lastTemplateId);
                if (templateExists) {
                    handleTemplateSelect(lastTemplateId);
                }
            }
        }
    }, [isOpen, templatesData, handleTemplateSelect]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create New Invoice" size="xl" contentClassName="scrollbar-hide">
            <form onSubmit={handleSubmit} className="space-y-4 -mx-6 -mb-6 px-6 pb-6">
                {/* Template Selection */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        <Bookmark className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
                        Quick Start from Template
                    </label>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700"
                    >
                        <option value="">-- Select a template (optional) --</option>
                        {templatesData?.items.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.name} ({template.line_items.length} items, {template.tax_rate}% tax)
                            </option>
                        ))}
                    </select>
                    {selectedTemplateId && (
                        <p className="mt-1.5 text-xs text-slate-500">
                            Template loaded. You can modify the values below before creating the invoice.
                        </p>
                    )}
                </div>

                {/* Patient Selection */}
                <div ref={searchRef}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Patient <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <div className="relative flex items-center">
                            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchTerm(value);
                                    if (!value.trim()) {
                                        handleClearPatient();
                                    }
                                    // Clear selected patient if user is typing a different value
                                    if (selectedPatientData && value !== selectedPatientData.name) {
                                        setSelectedPatientData(null);
                                        setSelectedPatientId("");
                                    }
                                    // Only show dropdown if we have results or are searching, or if user is typing
                                    if (value.trim().length >= 2) {
                                        setShowDropdown(true);
                                    } else {
                                        setShowDropdown(false);
                                    }
                                }}
                                onFocus={() => {
                                    // Show dropdown if we have results or user has typed at least 2 characters
                                    if (searchResults.length > 0 || searchTerm.trim().length >= 2) {
                                        setShowDropdown(true);
                                    }
                                }}
                                placeholder="Search by name, mobile, or health ID..."
                                className="w-full rounded-lg border border-slate-200 bg-white pl-11 pr-12 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400"
                            />
                            {selectedPatientId && (
                                <button
                                    type="button"
                                    onClick={handleClearPatient}
                                    className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    title="Clear selection"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {showDropdown && (isSearching || searchResults.length > 0) && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl max-h-56 overflow-y-auto scrollbar-hide">
                                {isSearching ? (
                                    <div className="p-4 text-center">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"></div>
                                            <span className="text-sm text-slate-600">Searching patients...</span>
                                        </div>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map((patient: Patient) => (
                                        <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => handlePatientSelect(patient)}
                                            className="w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm truncate">{patient.name}</p>
                                                    <div className="mt-0.5 flex flex-col gap-0.5">
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                                                            <span>{patient.mobile}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{patient.healthId}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span>{patient.age}y, {patient.gender}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-sm text-slate-500">No patients found</div>
                                )}
                            </div>
                        )}
                    </div>
                    {selectedPatientId && selectedPatientData && (
                        <div className="mt-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">{selectedPatientData.name}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                                        <span>{selectedPatientData.healthId}</span>
                                        <span>•</span>
                                        <span>{selectedPatientData.mobile}</span>
                                        <span>•</span>
                                        <span>{selectedPatientData.age}y, {selectedPatientData.gender}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Item
                        </button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 p-3 bg-slate-50 scrollbar-hide">
                        {/* Column Headers */}
                        <div className="flex items-center gap-2 px-3 pb-2 border-b border-slate-300">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                <div className="md:col-span-1">
                                    <span className="text-xs font-bold text-slate-700">Description</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-700">Quantity</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-700">Unit Price (₹)</span>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-700">Discount</span>
                                </div>
                            </div>
                            <div className="w-10">
                                <span className="text-xs font-bold text-slate-700">Action</span>
                            </div>
                        </div>

                        {/* Line Items */}
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-slate-200">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <div className="md:col-span-1">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                                            placeholder="Description"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleLineItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                                            placeholder="Qty"
                                            min="1"
                                            step="1"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => handleLineItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                                            placeholder="Unit Price"
                                            min="0"
                                            step="0.01"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            value={item.discount}
                                            onChange={(e) => handleLineItemChange(index, "discount", parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            min="0"
                                            max={item.discount_type === "percentage" ? 100 : undefined}
                                            step="0.01"
                                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        />
                                        <select
                                            value={item.discount_type}
                                            onChange={(e) => {
                                                const newType = e.target.value as "percentage" | "amount";
                                                handleLineItemChange(index, "discount_type", newType);
                                                // Clamp percentage to 100
                                                if (newType === "percentage" && item.discount > 100) {
                                                    handleLineItemChange(index, "discount", 100);
                                                }
                                            }}
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white"
                                        >
                                            <option value="amount">₹</option>
                                            <option value="percentage">%</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLineItem(index)}
                                    className="mt-1 rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                                    title="Remove item"
                                    disabled={lineItems.length === 1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tax Rate and Discount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Discount
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    min="0"
                                    max={discountType === "percentage" ? 100 : undefined}
                                    step="0.01"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                />
                            </div>
                            <select
                                value={discountType}
                                onChange={(e) => {
                                    const newType = e.target.value as "percentage" | "amount";
                                    setDiscountType(newType);
                                    if (newType === "percentage" && discount > 100) {
                                        setDiscount(100);
                                    }
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white"
                            >
                                <option value="amount">₹</option>
                                <option value="percentage">%</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* GST Number */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        GST Number
                    </label>
                    <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="Enter GST number (optional)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional notes (optional)"
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
                    />
                </div>

                {/* Calculation Summary */}
                <div className="rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-teal-50 p-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">Subtotal</span>
                            <span className="text-sm font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {taxRate > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Tax ({taxRate}%)</span>
                                <span className="text-sm font-semibold text-slate-900">₹{taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {discount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">
                                    Discount {discountType === "percentage" ? `(${discount}%)` : ""}
                                </span>
                                <span className="text-sm font-bold text-emerald-600">-₹{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-t-2 border-sky-300 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-slate-900">Total Amount</span>
                                <span className="text-xl font-bold text-sky-700">₹{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                        disabled={createInvoice.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createInvoice.isPending || !selectedPatientId || totalAmount <= 0}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:to-teal-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {createInvoice.isPending ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4" />
                                Create Invoice
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
