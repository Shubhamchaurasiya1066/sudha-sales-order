"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const companies = [
    "Sudha Chemical Company",
    "Sudha Core Chemical Pvt. Ltd.",
    "Nirmal Agencies Gwalior",
    "Nirmal Agencies Bilaspur",
];

const initialForm = {
    companyName: "",
    place: "",
    qty: "",
    qtyUnit: "KG",
    status: "Pending",
    filledBy: "",
    ipAddress: "",
    customerName: "",
    customerAddress: "",
    customerNumber: "",
    emailId: "",
    rate: "",
    freight: "",
    exFor: "",
    paymentTerms: "",
    itemName: "",
    brokerName: "",
    brokerContactNumber: "",
    brokerEmailId: "",
    gstExtra: false,
};

const fields = [
    { name: "place", label: "Place", placeholder: "Enter place", required: true },
    { name: "qty", label: "Quantity", placeholder: "Enter quantity", type: "number", required: true },
    { name: "customerName", label: "Customer Name", placeholder: "Enter customer name", required: true },
    { name: "customerAddress", label: "Customer Address", placeholder: "Enter complete address", required: true, textarea: true },
    { name: "customerNumber", label: "Customer Number", placeholder: "10-digit mobile number", type: "tel", required: true },
    { name: "emailId", label: "Customer Email ID", placeholder: "customer@example.com", type: "email", required: true },
    { name: "rate", label: "Rate (₹)", placeholder: "Enter rate", type: "number", required: true },
    { name: "freight", label: "Freight (₹)", placeholder: "Enter freight amount", type: "number", required: true },
    {
        name: "itemName", label: "Item / Chemical Name", placeholder: "Select chemical / product", required: true, options: [
            "Sulphuric Acid (98%)",
            "Hydrochloric Acid (30-33%)",
            "Nitric Acid",
            "Phosphoric Acid",
            "Acetic Acid",
            "Caustic Soda Lye",
            "Soda Ash",
            "Cuastic Soda Flakes",
            "Citric Acid",
            "Oleum(23%)",
        ]
    },
    { name: "brokerName", label: "Broker Name", placeholder: "Enter broker name" },
    { name: "brokerContactNumber", label: "Broker Contact Number", placeholder: "10-digit mobile number", type: "tel" },
    { name: "brokerEmailId", label: "Broker Email ID", placeholder: "broker@example.com", type: "email" },
];

function Field({ field, value, onChange, error }) {
    const common = {
        id: field.name,
        name: field.name,
        value,
        onChange,
        placeholder: field.placeholder,
        required: field.required,
        className: `w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${error ? "border-red-400" : "border-slate-200"
            }`,
    };

    return (
        <div className={field.name === "customerAddress" ? "md:col-span-2" : ""}>
            <label htmlFor={field.name} className="mb-2 block text-sm font-semibold text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>

            {field.options ? (
                <select {...common}>
                    <option value="">{field.placeholder || "Select an option"}</option>
                    {field.options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : field.textarea ? (
                <textarea {...common} rows={3} />
            ) : (
                <input
                    {...common}
                    type={field.type || "text"}
                    min={field.type === "number" ? "0" : undefined}
                    step={field.name === "qty" ? "any" : "0.01"}
                />
            )}

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export default function SalesOrderPage() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!success) return;
        const timeoutId = window.setTimeout(() => setSuccess(""), 4500);
        return () => window.clearTimeout(timeoutId);
    }, [success]);

    function updateField(event) {
        const { name, value } = event.target;

        setForm((previous) => ({ ...previous, [name]: value }));
        setErrors((previous) => ({ ...previous, [name]: "" }));
        setSuccess("");
    }

    function validate() {
        const nextErrors = {};

        if (!form.companyName) nextErrors.companyName = "Please select a company.";
        if (!form.place.trim()) nextErrors.place = "Place is required.";
        if (!form.qty || Number(form.qty) <= 0) {
            nextErrors.qty = "Quantity must be greater than zero.";
        }
        if (!form.customerName.trim()) {
            nextErrors.customerName = "Customer name is required.";
        }
        if (!form.customerAddress.trim()) {
            nextErrors.customerAddress = "Customer address is required.";
        }

        if (!/^[0-9]{10}$/.test(form.customerNumber.trim())) {
            nextErrors.customerNumber = "Enter a valid 10-digit mobile number.";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailId.trim())) {
            nextErrors.emailId = "Enter a valid email address.";
        }

        if (form.rate === "" || Number(form.rate) < 0) {
            nextErrors.rate = "Enter a valid rate.";
        }

        if (form.freight === "" || Number(form.freight) < 0) {
            nextErrors.freight = "Enter a valid freight amount.";
        }

        if (!form.exFor) nextErrors.exFor = "Please select Ex/For.";
        if (!form.paymentTerms.trim()) {
            nextErrors.paymentTerms = "Payment terms are required.";
        }
        if (!form.itemName.trim()) {
            nextErrors.itemName = "Item name is required.";
        }

        if (
            form.brokerContactNumber &&
            !/^[0-9]{10}$/.test(form.brokerContactNumber.trim())
        ) {
            nextErrors.brokerContactNumber = "Enter a valid 10-digit mobile number.";
        }

        if (
            form.brokerEmailId &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.brokerEmailId.trim())
        ) {
            nextErrors.brokerEmailId = "Enter a valid broker email address.";
        }

        if (!form.filledBy.trim()) {
            nextErrors.filledBy = "Please enter the name of the person filling the form.";
        }

        return nextErrors;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validate();
        setErrors(nextErrors);
        setSuccess("");

        if (Object.keys(nextErrors).length > 0) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        try {
            let capturedIpAddress = "Unavailable";

            try {
                const response = await fetch("/api/client-info", {
                    cache: "no-store",
                });

                if (response.ok) {
                    const clientInfo = await response.json();
                    capturedIpAddress = clientInfo.ipAddress || "Unavailable";
                }
            } catch {
                // Order will still be saved if IP lookup fails.
            }

            const savedOrders = JSON.parse(
                localStorage.getItem("sudha_sales_orders") || "[]"
            );

            const nextSerial =
                savedOrders.reduce((max, order) => {
                    const serial = Number(order.serialNo) || 0;
                    return Math.max(max, serial);
                }, 0) + 1;

            const orderNumber = `SC-${new Date().getFullYear()}-${String(
                nextSerial
            ).padStart(4, "0")}`;

            const newOrder = {
                ...form,
                ipAddress: capturedIpAddress,
                serialNo: nextSerial,
                orderNumber,
                orderDate: new Date().toLocaleString("en-IN"),
                id: `${Date.now()}-${nextSerial}`,
                createdAt: new Date().toISOString(),
            };

            localStorage.setItem(
                "sudha_sales_orders",
                JSON.stringify([...savedOrders, newOrder])
            );

            setForm(initialForm);
            setErrors({});
            setSuccess(`Sales Order ${orderNumber} submitted successfully!`);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
            setErrors({
                form: "Unable to save this order in your browser. Please check your browser storage settings.",
            });
        }
    }

    return (
        <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-100 text-slate-900">
            <header className="bg-slate-950 text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-xl font-black shadow-lg shadow-blue-500/20">
                            S
                        </div>
                        <div>
                            <p className="text-lg font-bold tracking-wide">
                                SUDHA CHEMICALS
                            </p>
                            <p className="text-xs text-slate-400">
                                Sales & Order Management
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/sales-orders"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-blue-400 hover:bg-slate-900"
                    >
                        View Sales Orders <span className="ml-2">→</span>
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                <div className="mb-8">
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
                        Order Management
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        Sales Order
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                        Create and record customer orders with accurate product, pricing,
                        delivery and payment details.
                    </p>
                </div>

                {success && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-800 shadow-2xl shadow-emerald-900/10 sm:right-6 sm:top-6"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                            ✓
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-emerald-800">Sales Order Saved!</p>
                            <p className="mt-1 break-words text-slate-600">{success}</p>
                            <Link href="/sales-orders" className="mt-2 inline-block font-semibold text-blue-700 underline underline-offset-2">
                                View orders
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSuccess("")}
                            aria-label="Dismiss notification"
                            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            ×
                        </button>
                    </div>
                )}

                {errors.form && (
                    <div
                        role="alert"
                        className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
                    >
                        {errors.form}
                    </div>
                )}
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
                >
                    <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-6 py-6 sm:px-8">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Order Information
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Fields marked with * are required.
                                </p>
                            </div>
                            <span className="w-fit rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-800">
                                NEW SALES ORDER
                            </span>
                        </div>
                    </div>

                    <div className="min-w-0 space-y-8 p-4 sm:p-6 lg:p-8">
                        <section>
                            <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                    01
                                </span>
                                Company & Order Details
                            </h3>

                            <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="companyName"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Company Name <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="companyName"
                                        name="companyName"
                                        value={form.companyName}
                                        onChange={updateField}
                                        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.companyName
                                            ? "border-red-400"
                                            : "border-slate-200"
                                            }`}
                                    >
                                        <option value="">Select company</option>
                                        {companies.map((company) => (
                                            <option key={company} value={company}>
                                                {company}
                                            </option>
                                        ))}
                                    </select>

                                    {errors.companyName && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.companyName}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Serial Number
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-700">
                                        Auto-generated on submission
                                    </p>
                                </div>

                                <Field
                                    field={fields[0]}
                                    value={form[fields[0].name]}
                                    onChange={updateField}
                                    error={errors[fields[0].name]}
                                />


                                <div className="w-full min-w-0">
                                    <label
                                        htmlFor="qty"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Quantity <span className="text-red-500">*</span>
                                    </label>

                                    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_100px] gap-2">
                                        <input
                                            id="qty"
                                            name="qty"
                                            type="number"
                                            min="0.001"
                                            step="any"
                                            value={form.qty}
                                            onChange={updateField}
                                            placeholder="e.g. 100"
                                            className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />

                                        <select
                                            name="qtyUnit"
                                            value={form.qtyUnit}
                                            onChange={updateField}
                                            aria-label="Quantity unit"
                                            className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        >
                                            <option value="L">L</option>
                                            <option value="KG">KG</option>
                                            <option value="MT">MT</option>
                                            <option value="BAG">BAG</option>
                                        </select>
                                    </div>

                                    {errors.qty && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.qty}
                                        </p>
                                    )}
                                </div>


                                <div>
                                    <label
                                        htmlFor="exFor"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Ex/For <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="exFor"
                                        name="exFor"
                                        value={form.exFor}
                                        onChange={updateField}
                                        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.exFor
                                            ? "border-red-400"
                                            : "border-slate-200"
                                            }`}
                                    >
                                        <option value="">Select option</option>
                                        <option value="Ex">Ex</option>
                                        <option value="For">For</option>
                                    </select>

                                    {errors.exFor && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.exFor}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="paymentTerms"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Payment Terms <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="paymentTerms"
                                        name="paymentTerms"
                                        value={form.paymentTerms}
                                        onChange={updateField}
                                        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.paymentTerms
                                            ? "border-red-400"
                                            : "border-slate-200"
                                            }`}
                                    >
                                        <option value="">Select payment terms</option>
                                        <option value="Advance Payment">Advance Payment</option>
                                        <option value="Cash on Delivery">Cash on Delivery</option>
                                        <option value="2-3 Days">2-3 Days</option>
                                        <option value="7-10 Days">7-10 Days</option>
                                        <option value="15 Days">15 Days</option>
                                        <option value="30 Days">30 Days</option>
                                        <option value="45 Days">45 Days</option>
                                        <option value="60 Days">60 Days</option>
                                        <option value="90 Days">90 Days</option>
                                    </select>

                                    {errors.paymentTerms && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.paymentTerms}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="status"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Order Status <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        id="status"
                                        name="status"
                                        value={form.status}
                                        onChange={updateField}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Dispatched">Dispatched</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-slate-100" />

                        <section>
                            <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                    02
                                </span>
                                Customer & Pricing Details
                            </h3>

                            <div className="grid gap-5 md:grid-cols-2">
                                {fields.slice(2, 8).map((field) => (
                                    <Field
                                        key={field.name}
                                        field={field}
                                        value={form[field.name]}
                                        onChange={updateField}
                                        error={errors[field.name]}
                                    />
                                ))}
                            </div>

                            <div className="mt-5">
                                <label className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-300 sm:p-4">
                                    <input
                                        type="checkbox"
                                        name="gstExtra"
                                        checked={form.gstExtra}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                gstExtra: event.target.checked,
                                            }))
                                        }
                                        className="h-5 w-5 rounded accent-blue-700"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">
                                        GST Extra
                                    </span>
                                    <span
                                        className={`sm:ml-auto rounded-full px-3 py-1 text-xs font-bold ${form.gstExtra
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {form.gstExtra ? "GST Extra" : "Not specified"}
                                    </span>
                                </label>
                            </div>
                        </section>

                        <div className="border-t border-slate-100" />

                        <div>
                            <label
                                htmlFor="filledBy"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Form Filled By <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="filledBy"
                                name="filledBy"
                                type="text"
                                value={form.filledBy}
                                onChange={updateField}
                                placeholder="Enter employee name"
                                required
                                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${errors.filledBy
                                    ? "border-red-400"
                                    : "border-slate-200"
                                    }`}
                            />

                            {errors.filledBy && (
                                <p className="mt-1 text-xs text-red-600">
                                    {errors.filledBy}
                                </p>
                            )}
                        </div>

                        <section>
                            <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    03
                                </span>
                                Product & Broker Details
                            </h3>

                            <div className="grid gap-5 md:grid-cols-2">
                                {fields.slice(8).map((field) => (
                                    <Field
                                        key={field.name}
                                        field={field}
                                        value={form[field.name]}
                                        onChange={updateField}
                                        error={errors[field.name]}
                                    />
                                ))}
                            </div>
                        </section>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm(initialForm);
                                    setErrors({});
                                    setSuccess("");
                                }}
                                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Reset Form
                            </button>

                            <button
                                type="submit"
                                className="rounded-xl bg-blue-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                            >
                                Submit Sales Order →
                            </button>
                        </div>
                    </div>
                </form>

                <p className="mt-5 text-center text-xs text-slate-400">
                    Sudha Chemicals · Sales Order Management
                </p>
            </div>
        </main>
    );
}