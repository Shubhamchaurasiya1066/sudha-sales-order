"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_transporter_shipments";

const companies = [
    "Sudha Chemical Company",
    "Sudha Core Chemical Pvt. Ltd.",
    "Nirmal Agencies Gwalior",
    "Nirmal Agencies Bilaspur",
];

const chemicalOptions = [
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
];

const units = ["L", "KG", "MT", "BAG"];

const statuses = [
    "Pending",
    "Dispatched",
    "In Transit",
    "Delivered",
    "Cancelled",
];

const initialForm = {
    transporterCode: "",
    transporterName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    vehicleType: "Truck",
    vehicleNumber: "",
    fromCompany: "",
    toCompany: "",
    pickupLocation: "",
    deliveryLocation: "",
    itemName: "",
    qty: "",
    qtyUnit: "KG",
    freight: "",
    paymentTerms: "To Pay",
    dispatchDate: "",
    expectedDelivery: "",
    status: "Pending",
    remarks: "",
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

export default function TransportersPage() {
    const [form, setForm] = useState(initialForm);
    const [shipments, setShipments] = useState([]);
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");

    useEffect(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            setShipments(Array.isArray(saved) ? saved : []);
        } catch {
            setShipments([]);
        }

    }, []);

    function updateField(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));

        setErrors((current) => ({
            ...current,
            [name]: "",
        }));

        setNotice("");
    }

    function validate() {
        const next = {};

        if (!form.transporterCode.trim()) {
            next.transporterCode = "Transporter code is required.";
        } else if (
            shipments.some(
                (item) =>
                    item.transporterCode?.toLowerCase() ===
                    form.transporterCode.trim().toLowerCase()
            )
        ) {
            next.transporterCode =
                "This transporter code already exists.";
        }

        if (!form.transporterName.trim()) {
            next.transporterName = "Transporter name is required.";
        }

        if (!form.contactPerson.trim()) {
            next.contactPerson = "Contact person is required.";
        }

        if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
            next.mobile = "Enter a valid 10-digit mobile number.";
        }

        if (
            form.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ) {
            next.email = "Enter a valid email address.";
        }

        if (!form.vehicleNumber.trim()) {
            next.vehicleNumber = "Vehicle number is required.";
        }

        if (!form.fromCompany) {
            next.fromCompany = "Select the source company.";
        }

        if (!form.toCompany) {
            next.toCompany = "Select the destination company.";
        }

        if (
            form.fromCompany &&
            form.toCompany &&
            form.fromCompany === form.toCompany
        ) {
            next.toCompany =
                "Source and destination companies must be different.";
        }

        if (!form.pickupLocation.trim()) {
            next.pickupLocation = "Pickup location is required.";
        }

        if (!form.deliveryLocation.trim()) {
            next.deliveryLocation = "Delivery location is required.";
        }

        if (!form.itemName.trim()) {
            next.itemName = "Item name is required.";
        }

        if (
            form.qty === "" ||
            !Number.isFinite(Number(form.qty)) ||
            Number(form.qty) <= 0
        ) {
            next.qty = "Quantity must be greater than zero.";
        }

        if (
            form.freight === "" ||
            !Number.isFinite(Number(form.freight)) ||
            Number(form.freight) < 0
        ) {
            next.freight = "Enter a valid freight amount.";
        }

        if (
            form.dispatchDate &&
            form.expectedDelivery &&
            form.expectedDelivery < form.dispatchDate
        ) {
            next.expectedDelivery =
                "Delivery date cannot be before dispatch date.";
        }

        return next;
    }

    function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = validate();
        setErrors(nextErrors);
        setNotice("");

        if (Object.keys(nextErrors).length > 0) {
            setNoticeType("error");
            setNotice("Please correct the highlighted fields.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        try {
            const now = new Date();

            const shipment = {
                ...form,
                transporterCode: form.transporterCode.trim(),
                transporterName: form.transporterName.trim(),
                contactPerson: form.contactPerson.trim(),
                mobile: form.mobile.trim(),
                email: form.email.trim(),
                vehicleNumber: form.vehicleNumber.trim(),
                itemName: form.itemName.trim(),
                qty: Number(form.qty),
                freight: Number(form.freight),
                id: `${now.getTime()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                shipmentNumber: `SH-${now.getFullYear()}-${String(
                    shipments.length + 1
                ).padStart(4, "0")}`,
                createdAt: now.toISOString(),
            };

            const updated = [...shipments, shipment];

            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setShipments(updated);
            setForm({ ...initialForm });
            setErrors({});
            setNoticeType("success");
            setNotice(
                `${shipment.shipmentNumber} saved successfully.`
            );

            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
            setNoticeType("error");
            setNotice(
                "Unable to save. Please check your browser storage."
            );
        }
    }

    function resetForm() {
        setForm({ ...initialForm });
        setErrors({});
        setNotice("");
    }

    function field(name, label, options = {}) {
        return (
            <div>
                <label className={labelClass} htmlFor={name}>
                    {label}
                    {options.required && (
                        <span className="text-red-500"> *</span>
                    )}
                </label>

                {options.options ? (
                    <select
                        id={name}
                        name={name}
                        value={form[name]}
                        onChange={updateField}
                        className={inputClass}
                        required={options.required}
                    >
                        <option value="">Select {label}</option>
                        {options.options.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        id={name}
                        name={name}
                        type={options.type || "text"}
                        value={form[name]}
                        onChange={updateField}
                        placeholder={options.placeholder || `Enter ${label}`}
                        min={options.type === "number" ? "0" : undefined}
                        step={options.type === "number" ? "any" : undefined}
                        className={inputClass}
                        required={options.required}
                    />
                )}

                {errors[name] && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors[name]}
                    </p>
                )}
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900">
            <header className="bg-slate-950 text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xl font-black tracking-wide">
                            SUDHA CHEMICALS
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            Transporter & Shipment Management
                        </p>
                    </div>

                    <Link
                        href="/transporters/view"
                        className="rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
                    >
                        View Transporters & Shipments →
                    </Link>

                    <Link
                        href="/purchase-orders"
                        className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-semibold hover:bg-slate-800"
                    >
                        Purchase Orders →
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="text-sm font-bold uppercase tracking-widest text-violet-700">
                        Logistics Management
                    </p>
                    <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                        Transporter Management
                    </h1>
                    <p className="mt-3 text-sm text-slate-500">
                        Manage transporters and track company-to-company shipments.
                    </p>
                </div>

                {notice && (
                    <div
                        role={noticeType === "error" ? "alert" : "status"}
                        className={`mb-6 flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${noticeType === "error"
                                ? "border-red-200 text-red-700"
                                : "border-emerald-200 text-emerald-800"
                            }`}
                    >
                        <p className="text-sm font-semibold">{notice}</p>
                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            aria-label="Dismiss notification"
                            className="text-xl"
                        >
                            ×
                        </button>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
                >
                    <div className="border-b border-slate-100 bg-violet-50 px-6 py-5">
                        <h2 className="text-lg font-bold">New Shipment Entry</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Fields marked with * are required.
                        </p>
                    </div>

                    <div className="space-y-8 p-5 sm:p-8">
                        <section>
                            <h3 className="mb-5 font-bold text-violet-800">
                                01. Transporter Details
                            </h3>

                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {field("transporterCode", "Transporter Code", {
                                    required: true,
                                    placeholder: "e.g. TR-001",
                                })}
                                {field("transporterName", "Transporter Name", {
                                    required: true,
                                })}
                                {field("contactPerson", "Contact Person", {
                                    required: true,
                                })}
                                {field("mobile", "Mobile Number", {
                                    required: true,
                                    type: "tel",
                                    placeholder: "10-digit mobile number",
                                })}
                                {field("email", "Email ID", {
                                    type: "email",
                                })}
                                {field("vehicleType", "Vehicle Type", {
                                    options: ["Truck", "Tanker", "Trailer", "Mini Truck", "Container"],
                                })}
                                {field("vehicleNumber", "Vehicle Number", {
                                    required: true,
                                    placeholder: "e.g. MP07AB1234",
                                })}
                            </div>
                        </section>

                        <div className="border-t border-slate-100" />

                        <section>
                            <h3 className="mb-5 font-bold text-violet-800">
                                02. Company & Route Details
                            </h3>

                            <div className="grid gap-5 md:grid-cols-2">
                                {field("fromCompany", "From Company", {
                                    required: true,
                                    options: companies,
                                })}
                                {field("toCompany", "To Company", {
                                    required: true,
                                })}
                                {field("pickupLocation", "Pickup Location", {
                                    required: true,
                                })}
                                {field("deliveryLocation", "Delivery Location", {
                                    required: true,
                                })}
                            </div>
                        </section>

                        <div className="border-t border-slate-100" />

                        <section>
                            <h3 className="mb-5 font-bold text-violet-800">
                                03. Material & Freight
                            </h3>

                            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {field("itemName", "Item / Chemical Name", {
                                    required: true,
                                    options: chemicalOptions,
                                })}

                                <div>
                                    <label className={labelClass} htmlFor="qty">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="qty"
                                            name="qty"
                                            type="number"
                                            min="0.001"
                                            step="any"
                                            value={form.qty}
                                            onChange={updateField}
                                            placeholder="e.g. 10"
                                            className={inputClass}
                                        />
                                        <select
                                            name="qtyUnit"
                                            aria-label="Quantity unit"
                                            value={form.qtyUnit}
                                            onChange={updateField}
                                            className={`${inputClass} max-w-28`}
                                        >
                                            {units.map((unit) => (
                                                <option key={unit} value={unit}>
                                                    {unit}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.qty && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.qty}
                                        </p>
                                    )}
                                </div>

                                {field("freight", "Freight Amount (₹)", {
                                    required: true,
                                    type: "number",
                                })}

                                {field("paymentTerms", "Payment Terms", {
                                    options: ["Advance", "To Pay", "Credit"],
                                })}

                                {field("dispatchDate", "Dispatch Date", {
                                    type: "date",
                                })}

                                {field("expectedDelivery", "Expected Delivery Date", {
                                    type: "date",
                                })}

                                {field("status", "Shipment Status", {
                                    options: statuses,
                                })}
                            </div>

                            <div className="mt-5">
                                <label className={labelClass} htmlFor="remarks">
                                    Remarks
                                </label>
                                <textarea
                                    id="remarks"
                                    name="remarks"
                                    rows={3}
                                    value={form.remarks}
                                    onChange={updateField}
                                    placeholder="Additional shipment notes..."
                                    className={inputClass}
                                />
                            </div>
                        </section>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold hover:bg-slate-50"
                            >
                                Reset Form
                            </button>
                            <button
                                type="submit"
                                className="rounded-xl bg-violet-700 px-7 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-800"
                            >
                                Save Shipment →
                            </button>
                        </div>
                    </div>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                    Sudha Chemicals · Transporter & Shipment Management
                </p>
            </div>
        </main>
    );
}