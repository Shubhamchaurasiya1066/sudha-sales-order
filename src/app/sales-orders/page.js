"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAvailableStock } from "@/lib/inventory";

const STORAGE_KEY = "sudha_sales_orders";

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function getQuantity(order) {
    return `${order.qty ?? ""}${order.qtyUnit ? ` ${order.qtyUnit}` : ""}`.trim() || "—";
}

function getGstExtra(order) {
    if (typeof order.gstExtra !== "boolean") return "Not specified";
    return order.gstExtra ? "GST Extra" : "No GST Extra";
}

function downloadCSV(orders) {
    const columns = [
        ["serialNo", "S.No."],
        ["orderNumber", "Order Number"],
        ["orderDate", "Order Date"],
        ["companyName", "Company Name"],
        ["manufacturerName", "Manufacturer / Trader"],
        ["place", "Place"],
        ["qty", "Quantity"],
        ["qtyUnit", "Quantity Unit"],
        ["filledBy", "Form Filled By"],
        ["ipAddress", "IP Address"],
        ["customerName", "Customer Name"],
        ["customerAddress", "Customer Address"],
        ["customerNumber", "Customer Number"],
        ["emailId", "Customer Email"],
        ["rate", "Rate"],
        ["gstExtra", "GST Extra"],
        ["freight", "Freight"],
        ["exFor", "Ex/For"],
        ["paymentTerms", "Payment Terms"],
        ["itemName", "Item Name"],
        ["brokerName", "Broker Name"],
        ["brokerContactNumber", "Broker Contact Number"],
        ["brokerEmailId", "Broker Email"],
        ["otherPersonName", "Other Person Name"],
    ];

    const escapeCSV = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
        columns.map((column) => escapeCSV(column[1])).join(","),
        ...orders.map((order) =>
            columns.map(([key]) => {
                if (key === "qty") return escapeCSV(getQuantity(order));
                if (key === "gstExtra") return escapeCSV(getGstExtra(order));
                return escapeCSV(order[key]);
            }).join(",")
        ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "sudha-sales-orders.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export default function SalesOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [ready, setReady] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            setOrders(Array.isArray(saved) ? saved : []);
        } catch {
            setOrders([]);
            setNotice("Saved orders could not be read from this browser.");
        }

        setReady(true);
    }, []);

    useEffect(() => {
        if (!notice) return;
        const timeoutId = window.setTimeout(() => setNotice(""), 4000);
        return () => window.clearTimeout(timeoutId);
    }, [notice]);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        return orders
            .filter((order) => {
                const searchable = [
                    order.serialNo,
                    order.orderNumber,
                    order.orderDate,
                    order.companyName,
                    order.manufacturerName,
                    order.customerName,
                    order.customerNumber,
                    order.emailId,
                    order.itemName,
                    order.place,
                    order.brokerName,
                    order.otherPersonName,
                    order.filledBy,
                    order.ipAddress,
                    getQuantity(order),
                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(query);
            })
            .sort((a, b) => Number(b.serialNo) - Number(a.serialNo));
    }, [orders, search]);

    function deleteOrder(order) {
        const confirmed = window.confirm(
            `Delete Sales Order #${order.serialNo}? This cannot be undone.`
        );

        if (!confirmed) return;

        const updated = orders.filter((item) => item.id !== order.id);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setOrders(updated);

            if (selectedOrder?.id === order.id) setSelectedOrder(null);
            if (editingOrder?.id === order.id) {
                setEditingOrder(null);
                setEditForm({});
            }

            setNotice(
                `Sales Order #${order.serialNo} deleted. Inventory will recalculate automatically.`
            );
        } catch {
            setNotice("Could not update saved orders.");
        }
    }

    function startEdit(order) {
        setEditingOrder(order);
        setEditForm({
            ...order,
            qty: order.qty ?? "",
            qtyUnit: order.qtyUnit || "KG",
            gstExtra: typeof order.gstExtra === "boolean" ? order.gstExtra : true,
        });
        setSelectedOrder(null);
    }

    function saveEditedOrder(event) {
        event.preventDefault();

        if (!editingOrder) return;

        const qty = Number(editForm.qty);
        const rate = Number(editForm.rate);
        const freight = Number(
            editForm.freight ?? editingOrder.freight ?? editingOrder.frieght ?? 0
        );

        const itemName = String(editForm.itemName || "").trim();
        const qtyUnit = String(editForm.qtyUnit || "KG").trim().toUpperCase();

        if (!itemName) {
            setNotice("Please enter an item name.");
            return;
        }

        if (!Number.isFinite(qty) || qty <= 0) {
            setNotice("Quantity must be greater than zero.");
            return;
        }

        if (!Number.isFinite(rate) || rate < 0) {
            setNotice("Please enter a valid rate.");
            return;
        }

        // Freight optional — only validate if provided
        if (
            editForm.freight !== "" &&
            editForm.freight !== undefined &&
            editForm.freight !== null &&
            (!Number.isFinite(freight) || freight < 0)
        ) {
            setNotice("Please enter a valid freight amount.");
            return;
        }

        // Stock validation
        const stock = getAvailableStock(itemName, qtyUnit);
        let availableQty = Number(stock.availableQty) || 0;

        const oldItem = String(editingOrder.itemName || "").trim().toLowerCase();
        const oldUnit = String(editingOrder.qtyUnit || "KG").trim().toUpperCase();
        const sameItem =
            oldItem === itemName.toLowerCase() && oldUnit === qtyUnit;

        // Restore current order's effect before validating
        if (sameItem) {
            availableQty += Number(editingOrder.qty) || 0;
        }

        if (qty > availableQty) {
            setNotice(
                `Insufficient stock for ${itemName}. ` +
                `Available: ${Math.max(0, availableQty)} ${qtyUnit}; ` +
                `requested: ${qty} ${qtyUnit}.`
            );
            return;
        }

        const updated = orders.map((order) => {
            if (order.id !== editingOrder.id) return order;

            return {
                ...order,
                ...editForm,
                itemName,
                qty,
                qtyUnit,
                rate,
                freight: Number.isFinite(freight) ? freight : 0,
                updatedAt: new Date().toISOString(),
            };
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setOrders(updated);
            setEditingOrder(null);
            setEditForm({});
            setNotice(
                `Sales Order #${editingOrder.serialNo} updated successfully.`
            );
        } catch {
            setNotice("Could not save changes. Please check browser storage.");
        }
    }

    function printOrder(order) {
        const rows = [
            ["S.No.", order.serialNo],
            ["Order Number", order.orderNumber],
            ["Order Date", order.orderDate],
            ["Company Name", order.companyName],
            ["Manufacturer / Trader", order.manufacturerName],
            ["Place", order.place],
            ["Quantity", getQuantity(order)],
            ["Filled By", order.filledBy],
            ["IP Address", order.ipAddress],
            ["Customer Name", order.customerName],
            ["Customer Address", order.customerAddress],
            ["Customer Number", order.customerNumber],
            ["Email", order.emailId],
            ["Item Name", order.itemName],
            ["Rate", money(order.rate)],
            ["GST", getGstExtra(order)],
            ["Freight", money(order.freight)],
            ["Ex/For", order.exFor],
            ["Payment Terms", order.paymentTerms],
            ["Broker Name", order.brokerName],
            ["Broker Contact Number", order.brokerContactNumber],
            ["Broker Email", order.brokerEmailId],
            ["Other Person Name", order.otherPersonName],
        ];
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) {
            setNotice("Please allow pop-ups to print the sales order.");
            return;
        }
        const esc = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
        printWindow.document.write(`<!doctype html><html><head><title>Sales Order ${esc(order.orderNumber || order.serialNo)}</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#172033;padding:32px}h1{margin:0;color:#0f172a}p{color:#64748b;margin-top:6px}.top{border-bottom:3px solid #2563eb;padding-bottom:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse}td{border:1px solid #cbd5e1;padding:11px;font-size:13px}td:first-child{font-weight:bold;background:#f1f5f9;width:34%}.footer{margin-top:30px;font-size:11px;color:#64748b}@media print{button{display:none}}</style></head><body><div class="top"><h1>SUDHA CHEMICALS</h1><p>SALES ORDER</p></div><table>${rows.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value || "—")}</td></tr>`).join("")}</table><p class="footer">Generated from Sudha Chemicals Sales Order Management.</p><script>window.onload=()=>{window.print();};</script></body></html>`);
        printWindow.document.close();
    }

    function shareOrder(order) {
        const subject = `Sudha Chemicals - Sales Order #${order.serialNo}`;

        const body = [
            "SUDHA CHEMICALS",
            "SALES ORDER DETAILS",
            "",
            `S.No.: ${order.serialNo ?? "-"}`,
            `Order Number: ${order.orderNumber || "-"}`,
            `Order Date: ${order.orderDate || "-"}`,
            `Company: ${order.companyName || "-"}`,
            `Manufacturer / Trader: ${order.manufacturerName || "-"}`,
            `Place: ${order.place || "-"}`,
            `Quantity: ${getQuantity(order)}`,
            `Form Filled By: ${order.filledBy || "-"}`,
            `IP Address: ${order.ipAddress || "Unavailable"}`,
            `Customer: ${order.customerName || "-"}`,
            `Address: ${order.customerAddress || "-"}`,
            `Customer Number: ${order.customerNumber || "-"}`,
            `Customer Email: ${order.emailId || "-"}`,
            `Item: ${order.itemName || "-"}`,
            `Rate: ${money(order.rate)}`,
            `GST: ${getGstExtra(order)}`,
            `Freight: ${money(order.freight)}`,
            `Ex/For: ${order.exFor || "-"}`,
            `Payment Terms: ${order.paymentTerms || "-"}`,
            `Broker: ${order.brokerName || "-"}`,
            `Broker Contact: ${order.brokerContactNumber || "-"}`,
            `Broker Email: ${order.brokerEmailId || "-"}`,
            `Other Person: ${order.otherPersonName || "-"}`,
        ].join("\n");

        window.location.href =
            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    function shareFilteredOrders() {
        if (filteredOrders.length === 0) return;

        const subject = "Sudha Chemicals - Sales Orders";

        const body = filteredOrders
            .map((order) =>
                [
                    `Order #${order.orderNumber || order.serialNo}`,
                    `Company: ${order.companyName || "-"}`,
                    `Manufacturer: ${order.manufacturerName || "-"}`,
                    `Customer: ${order.customerName || "-"}`,
                    `Item: ${order.itemName || "-"}`,
                    `Qty: ${getQuantity(order)}`,
                    `Filled By: ${order.filledBy || "-"}`,
                    `Rate: ${money(order.rate)}`,
                    `GST: ${getGstExtra(order)}`,
                ].join(" | ")
            )
            .join("\n\n");

        window.location.href =
            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900">
            <style jsx global>{`@keyframes toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
            <header className="bg-slate-950 text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-xl font-black">
                            S
                        </div>
                        <div>
                            <p className="text-lg font-bold tracking-wide">
                                SUDHA CHEMICALS
                            </p>
                            <p className="text-xs text-slate-400">
                                Sales Order Management
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/inventory"
                        className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-bold transition hover:bg-slate-900"
                    >
                        Inventory Dashboard →
                    </Link>

                    <Link
                        href="/sales-order"
                        className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold transition hover:bg-blue-500"
                    >
                        + Create Sales Order
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                        Order Administration
                    </p>
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                        Sales Orders
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Search, review, track and share your recorded customer orders.
                    </p>
                </div>

                {notice && (() => {
                    const isError = /could not|unable|failed|error/i.test(notice);
                    const isDelete = /deleted/i.test(notice);
                    const isEdit = /updated successfully/i.test(notice);
                    const toastStyle = isError
                        ? "border-red-200 bg-red-50 text-red-900"
                        : isDelete
                            ? "border-rose-200 bg-rose-50 text-rose-900"
                            : isEdit
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : "border-emerald-200 bg-emerald-50 text-emerald-900";
                    const icon = isError ? "⚠" : isDelete ? "🗑" : isEdit ? "✎" : "✓";

                    return (
                        <div
                            role={isError ? "alert" : "status"}
                            aria-live="polite"
                            className={`fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl shadow-slate-900/15 backdrop-blur transition-all ${toastStyle}`}
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-lg font-black shadow-sm">
                                {icon}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">
                                    {isError ? "Something went wrong" : isDelete ? "Order Deleted" : isEdit ? "Order Updated" : "Notification"}
                                </p>
                                <p className="mt-1 break-words text-sm opacity-90">{notice}</p>
                                <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/10">
                                    <div className="h-full w-full origin-left animate-[toast-progress_4s_linear_forwards] rounded-full bg-current" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotice("")}
                                aria-label="Close notification"
                                className="rounded-lg px-2 py-1 text-lg font-bold opacity-70 transition hover:bg-black/5 hover:opacity-100"
                            >
                                ×
                            </button>
                        </div>
                    );
                })()}

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Total Sales Orders
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">
                            {ready ? orders.length : "—"}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                            Recorded in this browser
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">
                            Matching Results
                        </p>
                        <p className="mt-2 text-3xl font-black text-blue-700">
                            {ready ? filteredOrders.length : "—"}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                            Based on your search
                        </p>
                    </div>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Order Register</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Review saved orders and export records for sharing.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <input
                                aria-label="Search sales orders"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search customer, company, manufacturer, item..."
                                className={inputClass + " sm:min-w-64"}
                            />

                            <button
                                onClick={() => downloadCSV(filteredOrders)}
                                disabled={filteredOrders.length === 0}
                                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Export CSV ↓
                            </button>

                            <button
                                onClick={shareFilteredOrders}
                                disabled={filteredOrders.length === 0}
                                className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Email Share ↗
                            </button>
                        </div>
                    </div>

                    {!ready ? (
                        <div className="p-12 text-center text-sm text-slate-500">
                            Loading sales orders...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                                {orders.length === 0 ? "▤" : "⌕"}
                            </div>
                            <h3 className="mt-5 text-lg font-bold">
                                {orders.length === 0
                                    ? "No sales orders yet"
                                    : "No matching orders"}
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                {orders.length === 0
                                    ? "Create your first order using the Sales Order form. Once submitted, it will appear here."
                                    : "Try another search term or clear the search box."}
                            </p>
                            {orders.length === 0 && (
                                <Link
                                    href="/sales-order"
                                    className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
                                >
                                    Create First Order
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1350px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-bold">Order</th>
                                        <th className="px-5 py-4 font-bold">Company</th>
                                        <th className="px-5 py-4 font-bold">Manufacturer / Trader</th>
                                        <th className="px-5 py-4 font-bold">Customer</th>
                                        <th className="px-5 py-4 font-bold">Item Name</th>
                                        <th className="px-5 py-4 font-bold">Quantity</th>
                                        <th className="px-5 py-4 font-bold">Rate</th>
                                        <th className="px-5 py-4 font-bold">Freight</th>
                                        <th className="px-5 py-4 font-bold">GST Extra</th>
                                        <th className="px-5 py-4 font-bold">Payment Terms</th>
                                        <th className="px-5 py-4 font-bold">Filled By</th>
                                        <th className="px-5 py-4 font-bold">IP Address</th>
                                        <th className="px-5 py-4 font-bold">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.map((order) => (
                                        <tr
                                            key={order.id || order.serialNo}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-blue-700">
                                                    {order.orderNumber ||
                                                        `SC-2026-${String(order.serialNo).padStart(4, "0")}`}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {order.orderDate || "-"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800">
                                                    {order.companyName || "—"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-800">
                                                    {order.manufacturerName || "—"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-800">
                                                    {order.customerName || "—"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {order.customerNumber || "—"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 font-medium text-slate-700">
                                                {order.itemName || "—"}
                                            </td>

                                            <td className="px-5 py-4 font-semibold tabular-nums">
                                                {getQuantity(order)}
                                            </td>

                                            <td className="px-5 py-4 font-semibold tabular-nums">
                                                {money(order.rate)}
                                            </td>

                                            <td className="px-5 py-4 font-semibold tabular-nums text-slate-700">
                                                {money(order.freight ?? order.frieght)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${order.gstExtra === true
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : order.gstExtra === false
                                                            ? "bg-slate-100 text-slate-600"
                                                            : "bg-amber-50 text-amber-700"
                                                        }`}
                                                >
                                                    {getGstExtra(order)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-slate-600">
                                                {order.paymentTerms || "—"}
                                            </td>

                                            <td className="px-5 py-4 text-slate-700">
                                                {order.filledBy || "—"}
                                            </td>

                                            <td className="px-5 py-4 font-mono text-xs text-slate-600">
                                                {order.ipAddress || "Unavailable"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:border-blue-300 hover:bg-blue-50"
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        onClick={() => startEdit(order)}
                                                        className="rounded-lg border border-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() => printOrder(order)}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Print
                                                    </button>

                                                    <button
                                                        onClick={() => shareOrder(order)}
                                                        className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                                    >
                                                        Email
                                                    </button>

                                                    <button
                                                        onClick={() => deleteOrder(order)}
                                                        className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {ready && filteredOrders.length > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">
                            Showing {filteredOrders.length} of {orders.length} orders
                        </div>
                    )}
                </section>

                <p className="mt-5 text-center text-xs text-slate-400">
                    Sudha Chemicals · Sales Order Management
                </p>
            </div>

            {editingOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <section role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-3 bg-slate-950 px-6 py-5 text-white">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Update Order Record</p>
                                <h2 id="edit-order-title" className="mt-1 text-xl font-black">Edit Sales Order #{editingOrder.serialNo}</h2>
                            </div>
                            <button type="button" onClick={() => setEditingOrder(null)} className="rounded-xl border border-slate-700 px-3 py-2 hover:bg-slate-800">✕</button>
                        </div>
                        <form onSubmit={saveEditedOrder} className="p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    ["companyName", "Company Name"],
                                    ["manufacturerName", "Manufacturer / Trader"],
                                    ["place", "Place"],
                                    ["customerName", "Customer Name"],
                                    ["customerAddress", "Customer Address"],
                                    ["customerNumber", "Customer Number"],
                                    ["emailId", "Customer Email"],
                                    ["itemName", "Item Name"],
                                    ["rate", "Rate"],
                                    ["freight", "Freight"],
                                    ["exFor", "Ex/For"],
                                    ["paymentTerms", "Payment Terms"],
                                    ["filledBy", "Form Filled By"],
                                    ["brokerName", "Broker Name"],
                                    ["brokerContactNumber", "Broker Contact Number"],
                                    ["brokerEmailId", "Broker Email"],
                                    ["otherPersonName", "Other Person Name"],
                                ].map(([key, label]) => (
                                    <label key={key} className="block">
                                        <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
                                        <input
                                            value={editForm[key] ?? ""}
                                            onChange={(event) => setEditForm((current) => ({ ...current, [key]: event.target.value }))}
                                            type={key === "rate" || key === "freight" ? "number" : "text"}
                                            step={key === "rate" || key === "freight" ? "0.01" : undefined}
                                            className={inputClass}
                                        />
                                    </label>
                                ))}
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-600">Quantity</span>
                                    <div className="flex gap-2">
                                        <input required value={editForm.qty ?? ""} onChange={(event) => setEditForm((current) => ({ ...current, qty: event.target.value }))} className={inputClass} />
                                        <select value={editForm.qtyUnit || "KG"} onChange={(event) => setEditForm((current) => ({ ...current, qtyUnit: event.target.value }))} className={inputClass + " max-w-28"}>
                                            {[["L", "L"], ["KG", "KG"], ["MT", "MT"], ["BAG", "BAG"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-slate-600">GST Setting</span>
                                    <select value={String(editForm.gstExtra !== false)} onChange={(event) => setEditForm((current) => ({ ...current, gstExtra: event.target.value === "true" }))} className={inputClass}>
                                        <option value="true">Rate + GST Extra</option>
                                        <option value="false">No GST Extra</option>
                                    </select>
                                </label>
                            </div>
                            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                                <button type="button" onClick={() => setEditingOrder(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">Save Changes</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {selectedOrder && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedOrder(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-detail-title"
                        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between gap-3 bg-slate-950 px-6 py-5 text-white">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                                    Sales Order Details
                                </p>
                                <h2 id="order-detail-title" className="mt-1 text-xl font-black">
                                    {selectedOrder.orderNumber ||
                                        `Order #${selectedOrder.serialNo}`}
                                </h2>
                            </div>

                            <button
                                onClick={() => setSelectedOrder(null)}
                                aria-label="Close order details"
                                className="rounded-xl border border-slate-700 px-3 py-2 hover:bg-slate-800"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            {[
                                ["Company Name", selectedOrder.companyName],
                                ["Manufacturer / Trader", selectedOrder.manufacturerName],
                                ["Order Date", selectedOrder.orderDate],
                                ["Place", selectedOrder.place],
                                ["Quantity", getQuantity(selectedOrder)],
                                ["Form Filled By", selectedOrder.filledBy],
                                ["IP Address", selectedOrder.ipAddress],
                                ["Customer Name", selectedOrder.customerName],
                                ["Customer Address", selectedOrder.customerAddress],
                                ["Customer Number", selectedOrder.customerNumber],
                                ["Customer Email", selectedOrder.emailId],
                                ["Item Name", selectedOrder.itemName],
                                ["Rate", money(selectedOrder.rate)],
                                ["GST Extra", getGstExtra(selectedOrder)],
                                ["Freight", money(selectedOrder.freight)],
                                ["Ex/For", selectedOrder.exFor],
                                ["Payment Terms", selectedOrder.paymentTerms],
                                ["Broker Name", selectedOrder.brokerName],
                                ["Broker Contact", selectedOrder.brokerContactNumber],
                                ["Broker Email", selectedOrder.brokerEmailId],
                                ["Other Person Name", selectedOrder.otherPersonName],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                                >
                                    <p className="text-xs font-semibold text-slate-500">
                                        {label}
                                    </p>
                                    <p className="mt-1 break-words text-sm font-bold text-slate-800">
                                        {value === null ||
                                            value === undefined ||
                                            value === ""
                                            ? "—"
                                            : value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
                            <button
                                onClick={() => startEdit(selectedOrder)}
                                className="rounded-xl border border-emerald-200 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                            >
                                Edit Order
                            </button>

                            <button
                                onClick={() => printOrder(selectedOrder)}
                                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Print Order
                            </button>

                            <button
                                onClick={() => shareOrder(selectedOrder)}
                                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
                            >
                                Share by Email
                            </button>

                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}