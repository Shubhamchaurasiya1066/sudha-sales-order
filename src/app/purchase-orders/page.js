"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_purchase_orders";

const units = ["L", "KG", "MT", "BAG"];
const packagingOptions = [
    "50kg can",
    "30kg can",
    "Tanker",
    "210kg drum",
    "25kg bag",
    "50kg bag",
];

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}

export default function PurchaseOrdersPage() {
    const [viewOrder, setViewOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");
    const [editingOrder, setEditingOrder] = useState(null);
    const [deleteOrder, setDeleteOrder] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            setOrders(Array.isArray(stored) ? stored : []);
        } catch {
            setOrders([]);
        } finally {
            setIsReady(true);
        }
    }, []);

    function showNotice(message, type = "success") {
        setNotice(message);
        setNoticeType(type);
    }

    function persistOrders(updatedOrders) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
        setOrders(updatedOrders);
    }

    const filteredOrders = orders.filter((order) => {
        const searchText = search.trim().toLowerCase();
        if (!searchText) return true;

        return [
            order.purchaseOrderNumber,
            order.manufacturerName,
            order.itemName,
            order.packaging,
            order.place,
            order.supplierEmail,
            order.brokerName,
            // ✅ transportName search se hata diya
        ].some((value) => String(value || "").toLowerCase().includes(searchText));
    });

    const totalOrders = orders.length;

    const totalBilling = orders.reduce(
        (sum, order) => sum + (Number(order.billingPrice) || 0),
        0
    );

    function saveEdit(event) {
        event.preventDefault();
        if (!editingOrder) return;

        const formData = new FormData(event.currentTarget);
        const qty = Number(formData.get("qty"));
        const actualPrice = Number(formData.get("actualPrice"));
        const discount = Number(formData.get("discount"));
        const billingPrice = Number(formData.get("billingPrice"));

        if (!Number.isFinite(qty) || qty <= 0) return showNotice("Quantity must be greater than zero.", "error");
        if (!Number.isFinite(actualPrice) || actualPrice < 0) return showNotice("Enter a valid actual price.", "error");
        if (!Number.isFinite(discount) || discount < 0 || (formData.get("discountType") === "percent" && discount > 100)) return showNotice("Enter a valid discount.", "error");
        if (!Number.isFinite(billingPrice) || billingPrice < 0) return showNotice("Enter a valid billing price.", "error");

        const updatedOrder = {
            ...editingOrder,
            manufacturerName: String(formData.get("manufacturerName") || "").trim(),
            itemName: String(formData.get("itemName") || "").trim(),
            packaging: String(formData.get("packaging") || "").trim(),
            qty,
            qtyUnit: String(formData.get("qtyUnit") || "KG"),
            actualPrice,
            discount,
            discountType: String(formData.get("discountType") || "percent"),
            billingPrice,
            place: String(formData.get("place") || "").trim(),
            supplierEmail: String(formData.get("supplierEmail") || "").trim(),
            exFor: String(formData.get("exFor") || ""),
            brokerName: String(formData.get("brokerName") || "").trim(),
            brokerContactNumber: String(formData.get("brokerContactNumber") || "").trim(),
            brokerEmail: String(formData.get("brokerEmail") || "").trim(),
            // ✅ Purane data me agar transport/freight tha to usko khali kar rahe hain taaki error na aaye
            freight: 0,
            transportName: "",
            updatedAt: new Date().toISOString(),
        };

        if (!updatedOrder.manufacturerName || !updatedOrder.itemName || !updatedOrder.place) {
            return showNotice("Manufacturer, item and place are required.", "error");
        }

        if (updatedOrder.brokerContactNumber && !/^[0-9]{10}$/.test(updatedOrder.brokerContactNumber)) {
            return showNotice("Broker contact must be a 10-digit number.", "error");
        }
        
        if (updatedOrder.brokerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedOrder.brokerEmail)) {
            return showNotice("Enter a valid broker email.", "error");
        }

        try {
            const updatedOrders = orders.map((order) =>
                String(order.id) === String(editingOrder.id) ? updatedOrder : order
            );
            persistOrders(updatedOrders);
            setEditingOrder(null);
            showNotice(`${updatedOrder.purchaseOrderNumber} updated successfully.`);
        } catch (error) {
            showNotice(error?.message || "Unable to save your changes.", "error");
        }
    }

    function confirmDelete() {
        if (!deleteOrder) return;
        try {
            const updatedOrders = orders.filter(
                (order) => String(order.id) !== String(deleteOrder.id)
            );
            persistOrders(updatedOrders);
            showNotice(`${deleteOrder.purchaseOrderNumber || "Purchase order"} deleted successfully.`);
            setDeleteOrder(null);
        } catch (error) {
            showNotice(error?.message || "Unable to delete this purchase order.", "error");
        }
    }

    function printOrder(order) {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return showNotice("Print window blocked. Please allow pop-ups and try again.", "error");

        const escapeHtml = (value) =>
            String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

        const details = [
            ["Purchase Order Number", order.purchaseOrderNumber],
            ["Order Date", order.orderDate],
            ["Manufacturer / Trader", order.manufacturerName],
            ["Item Name", order.itemName],
            ["Packaging", order.packaging],
            ["Quantity", `${order.qty ?? ""} ${order.qtyUnit || "KG"}`],
            ["Place", order.place],
            ["Supplier Email", order.supplierEmail],
            ["Ex / For", order.exFor],
            ["Actual Price", formatCurrency(order.actualPrice)],
            ["Discount", `${order.discount ?? 0}${order.discountType === "percent" ? "%" : " (fixed ₹)"}`],
            ["Billing Price", formatCurrency(order.billingPrice)],
            // ✅ Freight aur Transport Print se hata diya
            ["Broker Name", order.brokerName || "—"],
            ["Broker Contact", order.brokerContactNumber || "—"],
            ["Broker Email", order.brokerEmail || "—"],
        ];

        const rows = details.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "—")}</td></tr>`).join("");

        printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(order.purchaseOrderNumber || "Purchase Order")}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
            h1 { margin-bottom: 4px; }
            .subtitle { color: #64748b; margin-bottom: 28px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 11px; text-align: left; }
            th { width: 35%; background: #f8fafc; }
            .footer { margin-top: 28px; color: #64748b; font-size: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>SUDHA CHEMICALS</h1>
          <p class="subtitle">Purchase Order Details</p>
          <table>${rows}</table>
          <p class="footer">Generated on ${escapeHtml(new Date().toLocaleString("en-IN"))}</p>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
        printWindow.document.close();
    }

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900">
            <header className="bg-slate-950 text-white">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black shadow-lg shadow-violet-500/20">S</div>
                        <div>
                            <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
                            <p className="text-xs text-slate-400">Purchase & Supplier Management</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link href="/inventory" className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:bg-slate-900">
                            Inventory Dashboard →
                        </Link>
                        <Link href="/purchase-order" className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500">
                            + New Purchase Order
                        </Link>
                        <Link href="/sales-orders" className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:bg-slate-900">
                            View Sales Orders →
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-violet-700">Procurement Management</p>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Purchase Orders</h1>
                    <p className="mt-3 text-sm text-slate-500 sm:text-base">Manage supplier purchases and print purchase order details.</p>
                </div>

                {notice && (
                    <div role={noticeType === "error" ? "alert" : "status"} aria-live="polite" className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm ${noticeType === "error" ? "border-red-200" : "border-emerald-200"}`}>
                        <p className={`text-sm font-semibold ${noticeType === "error" ? "text-red-700" : "text-emerald-700"}`}>{notice}</p>
                        <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification" className="text-lg text-slate-400">×</button>
                    </div>
                )}

                <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Total Purchase Orders</p>
                        <p className="mt-3 text-3xl font-black text-slate-950">{totalOrders}</p>
                        <p className="mt-2 text-xs text-slate-400">All saved purchase orders</p>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-slate-500">Total Billing Price</p>
                        <p className="mt-3 break-words text-2xl font-black text-violet-700">{formatCurrency(totalBilling)}</p>
                        <p className="mt-2 text-xs text-slate-400">Sum of saved billing prices</p>
                    </div>
                </div>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">All Purchase Orders</h2>
                                <p className="mt-1 text-sm text-slate-500">{filteredOrders.length} of {orders.length} orders shown</p>
                            </div>

                            <div className="xl:w-[300px]">
                                <label className={labelClass} htmlFor="search-orders">Search Orders</label>
                                <input id="search-orders" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO number, supplier, item..." className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {!isReady ? (
                        <div className="p-12 text-center text-sm text-slate-500">Loading purchase orders...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-3xl">📋</div>
                            <h3 className="mt-5 text-lg font-bold text-slate-900">{orders.length === 0 ? "No purchase orders yet" : "No matching purchase orders"}</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{orders.length === 0 ? "Create your first purchase order to see it listed here." : "Try changing your search text."}</p>
                            {orders.length === 0 && (
                                <Link href="/purchase-order" className="mt-6 inline-flex rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800">Create Purchase Order</Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* ✅ Table me Freight aur Transport columns hata diye */}
                            <table className="w-full min-w-[1200px] border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="px-5 py-4 font-bold">PO Number / Date</th>
                                        <th className="px-5 py-4 font-bold">Supplier / Place</th>
                                        <th className="px-5 py-4 font-bold">Item & Packaging</th>
                                        <th className="px-5 py-4 font-bold">Quantity</th>
                                        <th className="px-5 py-4 font-bold">Actual Price</th>
                                        <th className="px-5 py-4 font-bold">Discount</th>
                                        <th className="px-5 py-4 font-bold">Billing Price</th>
                                        <th className="px-5 py-4 font-bold">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id || order.purchaseOrderNumber} className="align-top transition hover:bg-violet-50/30">
                                            <td className="px-5 py-5">
                                                <p className="font-bold text-violet-700">{order.purchaseOrderNumber || "—"}</p>
                                                <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{order.orderDate || "—"}</p>
                                            </td>
                                            <td className="px-5 py-5">
                                                <p className="max-w-[190px] break-words font-semibold text-slate-800">{order.manufacturerName || "—"}</p>
                                                <p className="mt-1 text-xs text-slate-500">{order.place || "—"}</p>
                                                <p className="mt-1 break-all text-xs text-slate-400">{order.supplierEmail || ""}</p>
                                            </td>
                                            <td className="px-5 py-5">
                                                <p className="max-w-[180px] break-words font-semibold text-slate-800">{order.itemName || "—"}</p>
                                                <p className="mt-1 text-xs font-semibold text-violet-600 bg-violet-50 inline-block px-1.5 py-0.5 rounded">
                                                    {order.packaging || "No Packaging"}
                                                </p>
                                            </td>
                                            <td className="px-5 py-5">
                                                <p className="text-sm font-semibold text-slate-800">{order.qty ?? "—"} {order.qtyUnit || "KG"}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-700">{formatCurrency(order.actualPrice)}</td>
                                            <td className="px-5 py-5 text-sm text-slate-700">{order.discount ?? 0}{order.discountType === "percent" ? "%" : " (₹)"}</td>
                                            <td className="whitespace-nowrap px-5 py-5 text-sm font-bold text-slate-900">{formatCurrency(order.billingPrice)}</td>
                                            <td className="px-5 py-5">
                                                <div className="flex flex-col items-start gap-2">
                                                    <button type="button" onClick={() => { setEditingOrder({ ...order }); setNotice(""); }} className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">Edit</button>
                                                    <button type="button" onClick={() => printOrder(order)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Print</button>
                                                    <button type="button" onClick={() => { setViewOrder(order); setNotice(""); }} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50">View</button>
                                                    <button type="button" onClick={() => setDeleteOrder(order)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                <p className="mt-5 text-center text-xs text-slate-400">Sudha Chemicals · Purchase Order Management</p>
            </div>

            {/* ============ EDIT MODAL ============ */}
            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingOrder(null); }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="my-5 w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <h2 id="edit-order-title" className="text-xl font-black text-slate-950">Edit Purchase Order</h2>
                                <p className="mt-1 text-sm text-slate-500">{editingOrder.purchaseOrderNumber}</p>
                            </div>
                            <button type="button" onClick={() => setEditingOrder(null)} aria-label="Close edit form" className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100">×</button>
                        </div>

                        <form onSubmit={saveEdit} className="p-5 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass} htmlFor="edit-manufacturer">Manufacturer / Trader *</label>
                                    <input id="edit-manufacturer" name="manufacturerName" required defaultValue={editingOrder.manufacturerName || ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-item">Item Name *</label>
                                    <input id="edit-item" name="itemName" required defaultValue={editingOrder.itemName || ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-packaging">Packaging</label>
                                    <select id="edit-packaging" name="packaging" defaultValue={editingOrder.packaging || ""} className={inputClass}>
                                        <option value="">Select packaging type</option>
                                        {packagingOptions.map((pack) => (
                                            <option key={pack} value={pack}>{pack}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-qty">Quantity *</label>
                                    <div className="flex gap-2">
                                        <input id="edit-qty" name="qty" type="number" min="0.001" step="any" required defaultValue={editingOrder.qty ?? ""} className={inputClass} />
                                        <select name="qtyUnit" aria-label="Quantity unit" defaultValue={editingOrder.qtyUnit || "KG"} className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm">
                                            {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-place">Place *</label>
                                    <input id="edit-place" name="place" required defaultValue={editingOrder.place || ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-email">Supplier Email</label>
                                    <input id="edit-email" name="supplierEmail" type="email" defaultValue={editingOrder.supplierEmail || ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-exfor">Ex / For *</label>
                                    <select id="edit-exfor" name="exFor" required defaultValue={editingOrder.exFor || ""} className={inputClass}>
                                        <option value="">Select option</option>
                                        <option value="Ex">Ex</option>
                                        <option value="For">For</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-actual-price">Actual Price (₹) *</label>
                                    <input id="edit-actual-price" name="actualPrice" type="number" min="0" step="any" required defaultValue={editingOrder.actualPrice ?? ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-discount">Discount *</label>
                                    <div className="flex gap-2">
                                        <input id="edit-discount" name="discount" type="number" min="0" step="any" required defaultValue={editingOrder.discount ?? 0} className={inputClass} />
                                        <select name="discountType" aria-label="Discount type" defaultValue={editingOrder.discountType || "percent"} className="w-32 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm">
                                            <option value="percent">Percent %</option>
                                            <option value="amount">Fixed ₹</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-billing-price">Billing Price (₹) *</label>
                                    <input id="edit-billing-price" name="billingPrice" type="number" min="0" step="any" required defaultValue={editingOrder.billingPrice ?? ""} className={inputClass} />
                                </div>
                                {/* ✅ Edit Form se Freight aur Transport hata diya */}
                                <div>
                                    <label className={labelClass} htmlFor="edit-broker">Broker Name</label>
                                    <input id="edit-broker" name="brokerName" defaultValue={editingOrder.brokerName || ""} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass} htmlFor="edit-broker-phone">Broker Contact Number</label>
                                    <input id="edit-broker-phone" name="brokerContactNumber" type="tel" maxLength={10} defaultValue={editingOrder.brokerContactNumber || ""} className={inputClass} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass} htmlFor="edit-broker-email">Broker Email</label>
                                    <input id="edit-broker-email" name="brokerEmail" type="email" defaultValue={editingOrder.brokerEmail || ""} className={inputClass} />
                                </div>
                            </div>

                            <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                                Billing Price is edited manually and will not be recalculated when the discount changes.
                            </p>

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setEditingOrder(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white hover:bg-violet-800">Save Changes</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {deleteOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <section role="dialog" aria-modal="true" aria-labelledby="delete-order-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl text-red-600">!</div>
                        <h2 id="delete-order-title" className="mt-4 text-xl font-black text-slate-950">Delete Purchase Order?</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Are you sure you want to delete <strong className="text-slate-800">{deleteOrder.purchaseOrderNumber || "this order"}</strong>? This action cannot be undone.</p>
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setDeleteOrder(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={confirmDelete} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700">Delete Order</button>
                        </div>
                    </section>
                </div>
            )}

            {viewOrder && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewOrder(null); }}>
                    <section role="dialog" aria-modal="true" aria-labelledby="view-order-title" className="my-5 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5 sm:p-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Sudha Chemicals</p>
                                <h2 id="view-order-title" className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">Purchase Order Details</h2>
                                <p className="mt-1 text-sm text-slate-500">{viewOrder.purchaseOrderNumber || "Purchase Order"}</p>
                            </div>
                            <button type="button" onClick={() => setViewOrder(null)} aria-label="Close order details" className="rounded-xl px-3 py-2 text-2xl text-slate-400 hover:bg-slate-100">×</button>
                        </div>

                        <div className="space-y-7 p-5 sm:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Purchase Order Number</p>
                                    <p className="mt-1 font-bold text-violet-700">{viewOrder.purchaseOrderNumber || "—"}</p>
                                </div>
                            </div>

                            <section>
                                <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Supplier & Item Details</h3>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {[
                                        ["Order Date", viewOrder.orderDate],
                                        ["Manufacturer / Trader", viewOrder.manufacturerName],
                                        ["Item Name", viewOrder.itemName],
                                        ["Packaging", viewOrder.packaging],
                                        ["Quantity", `${viewOrder.qty ?? "—"} ${viewOrder.qtyUnit || "KG"}`],
                                        ["Place", viewOrder.place],
                                        ["Supplier Email", viewOrder.supplierEmail],
                                        ["Ex / For", viewOrder.exFor],
                                    ].map(([label, value]) => (
                                        <div key={label} className="min-w-0">
                                            <p className="text-xs font-medium text-slate-500">{label}</p>
                                            <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Pricing</h3>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {[
                                        ["Actual Price", formatCurrency(viewOrder.actualPrice)],
                                        ["Discount", `${viewOrder.discount ?? 0}${viewOrder.discountType === "percent" ? "%" : " (Fixed ₹)"}`],
                                        ["Billing Price", formatCurrency(viewOrder.billingPrice)],
                                        // ✅ View se Freight aur Transport hata diya
                                    ].map(([label, value]) => (
                                        <div key={label} className="min-w-0">
                                            <p className="text-xs font-medium text-slate-500">{label}</p>
                                            <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Billing Price is stored separately from Discount.</p>
                            </section>

                            <section>
                                <h3 className="mb-4 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Broker Details</h3>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {[
                                        ["Broker Name", viewOrder.brokerName],
                                        ["Broker Contact Number", viewOrder.brokerContactNumber],
                                        ["Broker Email", viewOrder.brokerEmail],
                                    ].map(([label, value]) => (
                                        <div key={label} className="min-w-0">
                                            <p className="text-xs font-medium text-slate-500">{label}</p>
                                            <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => printOrder(viewOrder)}
                                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Print Details
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingOrder({ ...viewOrder });
                                        setViewOrder(null);
                                    }}
                                    className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800"
                                >
                                    Edit Purchase Order
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setViewOrder(null)}
                                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}