"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";

const PURCHASE_KEY = "sudha_purchase_orders";
const SALES_KEY = "sudha_sales_orders";

function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return "0";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
}

// Group array by a key function
function groupBy(array, keyFn) {
    const map = new Map();
    array.forEach((item) => {
        const key = keyFn(item);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
}

export default function SheetPage() {
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [ready, setReady] = useState(false);
    const [openProducts, setOpenProducts] = useState({});

    useEffect(() => {
        try {
            const p = JSON.parse(localStorage.getItem(PURCHASE_KEY) || "[]");
            const s = JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
            setPurchases(Array.isArray(p) ? p : []);
            setSales(Array.isArray(s) ? s : []);
        } catch {
            setPurchases([]);
            setSales([]);
        } finally {
            setReady(true);
        }
    }, []);

    // ---------- Product-wise calculation (same as before) ----------
    // Har product ke saath uske original purchase aur sale records bhi store karte hain
    const products = useMemo(() => {
        const map = new Map();

        const ensure = (itemName, unit) => {
            const key = `${String(itemName || "").trim().toLowerCase()}::${String(unit || "KG").toUpperCase()}`;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    itemName: String(itemName || "").trim(),
                    unit: String(unit || "KG").toUpperCase(),
                    purchaseQty: 0,
                    purchaseValue: 0,
                    saleQty: 0,
                    saleValue: 0,
                    purchaseRecords: [],
                    saleRecords: [],
                });
            }
            return map.get(key);
        };

        // ----- Purchases -----
        purchases.forEach((p) => {
            if (!p.itemName) return;
            if (p.status === "Cancelled") return;

            const item = ensure(p.itemName, p.qtyUnit);
            const qty = Number(p.qty) || 0;
            const price = Number(p.actualPrice) || 0;

            item.purchaseQty += qty;
            item.purchaseValue += qty * price;

            // Save raw record for breakdown
            item.purchaseRecords.push({
                id: p.id,
                company: p.manufacturerName || "Unknown Company",
                poNumber: p.purchaseOrderNumber || "",
                qty,
                rate: price,
                total: qty * price,
                unit: p.qtyUnit || "KG",
                date: p.orderDate || "",
                status: p.status || "Pending",
                place: p.place || "",
                broker: p.brokerName || "",
                freight: Number(p.freight) || 0,
            });
        });

        // ----- Sales -----
        sales.forEach((s) => {
            if (!s.itemName) return;
            if (s.status === "Cancelled") return;

            const item = ensure(s.itemName, s.qtyUnit);
            const qty = Number(s.qty) || 0;
            const price = Number(s.rate) || 0;

            item.saleQty += qty;
            item.saleValue += qty * price;

            item.saleRecords.push({
                id: s.id,
                company: s.companyName || "Unknown Company",
                orderNumber: s.orderNumber || "",
                customer: s.customerName || "",
                customerNumber: s.customerNumber || "",
                qty,
                rate: price,
                total: qty * price,
                unit: s.qtyUnit || "KG",
                date: s.orderDate || "",
                status: s.status || "Pending",
                place: s.place || "",
                paymentTerms: s.paymentTerms || "",
                filledBy: s.filledBy || "",
                freight: Number(s.freight) || 0,
            });
        });

        // ----- Averages, remaining, profit -----
        return Array.from(map.values()).map((item) => {
            const avgPurchaseRate =
                item.purchaseQty > 0 ? item.purchaseValue / item.purchaseQty : 0;
            const avgSaleRate =
                item.saleQty > 0 ? item.saleValue / item.saleQty : 0;
            const remainingQty = item.purchaseQty - item.saleQty;
            const costOfGoodsSold = item.saleQty * avgPurchaseRate;
            const profit = item.saleValue - costOfGoodsSold;

            return {
                ...item,
                avgPurchaseRate,
                avgSaleRate,
                remainingQty,
                profit,
            };
        });
    }, [purchases, sales]);

    // ---------- Grand totals ----------
    const grandTotals = useMemo(() => {
        return products.reduce(
            (acc, item) => ({
                purchaseValue: acc.purchaseValue + item.purchaseValue,
                saleValue: acc.saleValue + item.saleValue,
                profit: acc.profit + item.profit,
            }),
            { purchaseValue: 0, saleValue: 0, profit: 0 }
        );
    }, [products]);

    function toggleProduct(key) {
        setOpenProducts((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function exportCSV() {
        const headers = [
            "PRODUCT", "UNIT",
            "PURCHASE QTY", "AVG PURCHASE RATE", "PURCHASE VALUE",
            "SALE QTY", "AVG SALE RATE", "SALE VALUE",
            "REMAINING QTY", "PROFIT/LOSS",
        ];

        const rows = products.map((item) => [
            item.itemName,
            item.unit,
            item.purchaseQty,
            item.avgPurchaseRate.toFixed(2),
            item.purchaseValue.toFixed(2),
            item.saleQty,
            item.avgSaleRate.toFixed(2),
            item.saleValue.toFixed(2),
            item.remainingQty,
            item.profit.toFixed(2),
        ]);

        rows.push([]);
        rows.push([
            "GRAND TOTAL", "",
            "", "",
            grandTotals.purchaseValue.toFixed(2),
            "", "",
            grandTotals.saleValue.toFixed(2),
            "",
            grandTotals.profit.toFixed(2),
        ]);

        const escapeCSV = (value) => {
            const str = String(value ?? "");
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csv = [
            headers.map(escapeCSV).join(","),
            ...rows.map((row) => row.map(escapeCSV).join(",")),
        ].join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sudha-product-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900">
            <header className="bg-slate-950 text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black shadow-lg shadow-emerald-500/20">
                            S
                        </div>
                        <div>
                            <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
                            <p className="text-xs text-slate-400">Product-wise Sheet</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={exportCSV}
                            disabled={products.length === 0}
                            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Export CSV ↓
                        </button>
                        <Link href="/inventory" className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:bg-slate-900">
                            Inventory Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                        Product-wise Sheet
                    </p>
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                        Purchase, Sale & Stock Summary
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Har product ki purchase, sale, average rate, remaining qty aur profit ek hi line mein.{" "}
                        <strong className="text-emerald-700">Details</strong> button dabao → kis company se kharida aur kis customer ko becha, sab dikhega.
                    </p>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {!ready ? (
                        <div className="p-12 text-center text-sm text-slate-500">Loading sheet...</div>
                    ) : products.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📊</div>
                            <h3 className="mt-5 text-lg font-bold">No data yet</h3>
                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                Create purchase and sales orders to see them here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1200px] text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th colSpan={2} className="border-r-2 border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Product
                                        </th>
                                        <th colSpan={3} className="border-r-2 border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-violet-700">
                                            Purchase
                                        </th>
                                        <th colSpan={3} className="border-r-2 border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-blue-700">
                                            Sale
                                        </th>
                                        <th colSpan={2} className="border-r-2 border-slate-300 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-emerald-700">
                                            Result
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Breakdown
                                        </th>
                                    </tr>
                                    <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold">Item Name</th>
                                        <th className="border-r-2 border-slate-300 px-4 py-3 font-bold">Unit</th>
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold text-right">Qty</th>
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold text-right">Avg Rate</th>
                                        <th className="border-r-2 border-slate-300 px-4 py-3 font-bold text-right">Value</th>
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold text-right">Qty</th>
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold text-right">Avg Rate</th>
                                        <th className="border-r-2 border-slate-300 px-4 py-3 font-bold text-right">Value</th>
                                        <th className="border-r border-slate-200 px-4 py-3 font-bold text-right">Remaining</th>
                                        <th className="border-r-2 border-slate-300 px-4 py-3 font-bold text-right">Profit/Loss</th>
                                        <th className="px-4 py-3 font-bold text-center">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {products.map((item) => {
    const isOpen = !!openProducts[item.key];
    return (
        <Fragment key={item.key}>
            <tr className={`hover:bg-slate-50 ${isOpen ? "bg-emerald-50/40" : ""}`}>
                <td className="border-r border-slate-100 px-4 py-3 font-bold text-slate-800">
                    {item.itemName}
                </td>
                <td className="border-r-2 border-slate-300 px-4 py-3 text-xs font-semibold text-slate-500">
                    {item.unit}
                </td>
                <td className="border-r border-slate-100 px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.purchaseQty)}
                </td>
                <td className="border-r border-slate-100 px-4 py-3 text-right tabular-nums text-violet-700">
                    {formatCurrency(item.avgPurchaseRate)}
                </td>
                <td className="border-r-2 border-slate-300 px-4 py-3 text-right tabular-nums font-semibold">
                    {formatCurrency(item.purchaseValue)}
                </td>
                <td className="border-r border-slate-100 px-4 py-3 text-right tabular-nums">
                    {formatNumber(item.saleQty)}
                </td>
                <td className="border-r border-slate-100 px-4 py-3 text-right tabular-nums text-blue-700">
                    {formatCurrency(item.avgSaleRate)}
                </td>
                <td className="border-r-2 border-slate-300 px-4 py-3 text-right tabular-nums font-semibold">
                    {formatCurrency(item.saleValue)}
                </td>
                <td className={`border-r border-slate-100 px-4 py-3 text-right tabular-nums font-bold ${item.remainingQty > 0 ? "text-amber-700" : item.remainingQty < 0 ? "text-red-600" : "text-slate-500"}`}>
                    {formatNumber(item.remainingQty)} {item.unit}
                </td>
                <td className={`border-r-2 border-slate-300 px-4 py-3 text-right tabular-nums font-bold ${item.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(item.profit)}
                </td>
                <td className="px-4 py-3 text-center">
                    <button
                        onClick={() => toggleProduct(item.key)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${isOpen
                            ? "border-emerald-300 bg-emerald-600 text-white"
                            : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                            }`}
                    >
                        {isOpen ? "▲ Hide" : "🔍 Details"}
                    </button>
                </td>
            </tr>

            {isOpen && (
                <tr>
                    <td colSpan={11} className="bg-slate-50 px-4 py-5">
                        <div className="grid gap-5 lg:grid-cols-2">
                            {/* ============ PURCHASE BREAKDOWN ============ */}
                            <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between border-b border-violet-100 pb-2">
                                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-violet-700">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs">📥</span>
                                        Kahan se kharida (Companies)
                                    </h4>
                                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                                        {item.purchaseRecords.length} record{item.purchaseRecords.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                {item.purchaseRecords.length === 0 ? (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        Koi purchase record nahi
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {groupBy(item.purchaseRecords, (r) => r.company).map(({ key: company, items: records }) => {
                                            const companyQty = records.reduce((s, r) => s + r.qty, 0);
                                            const companyValue = records.reduce((s, r) => s + r.total, 0);
                                            const companyAvg = companyQty > 0 ? companyValue / companyQty : 0;
                                            return (
                                                <div key={company} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-slate-800">{company}</p>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                {records.length} PO{records.length > 1 ? "s" : ""} · {formatNumber(companyQty)} {item.unit} · Avg {formatCurrency(companyAvg)}
                                                            </p>
                                                        </div>
                                                        <p className="shrink-0 text-sm font-bold text-violet-700">
                                                            {formatCurrency(companyValue)}
                                                        </p>
                                                    </div>

                                                    <div className="mt-2 space-y-1 border-t border-violet-100 pt-2">
                                                        {records.map((r) => (
                                                            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                                                                <div className="min-w-0 flex items-center gap-2">
                                                                    <span className="font-mono text-[10px] font-semibold text-violet-600">{r.poNumber || "—"}</span>
                                                                    <span className="text-slate-400">·</span>
                                                                    <span className="tabular-nums">{formatNumber(r.qty)} {r.unit}</span>
                                                                    <span className="text-slate-400">@</span>
                                                                    <span className="tabular-nums">{formatCurrency(r.rate)}</span>
                                                                </div>
                                                                <span className="shrink-0 tabular-nums font-semibold text-slate-700">{formatCurrency(r.total)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="mt-3 rounded-xl bg-violet-600 px-3 py-2.5 text-white">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span>📊 Total Purchase</span>
                                                <span className="tabular-nums">{formatNumber(item.purchaseQty)} {item.unit} · {formatCurrency(item.purchaseValue)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ============ SALE BREAKDOWN ============ */}
                            <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between border-b border-blue-100 pb-2">
                                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-blue-700">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs">📤</span>
                                        Kisko becha (Customers)
                                    </h4>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                                        {item.saleRecords.length} record{item.saleRecords.length !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                {item.saleRecords.length === 0 ? (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        Koi sale record nahi
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {groupBy(item.saleRecords, (r) => r.company).map(({ key: company, items: records }) => {
                                            const companyQty = records.reduce((s, r) => s + r.qty, 0);
                                            const companyValue = records.reduce((s, r) => s + r.total, 0);
                                            const companyAvg = companyQty > 0 ? companyValue / companyQty : 0;
                                            return (
                                                <div key={company} className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-slate-800">{company}</p>
                                                            <p className="mt-0.5 text-xs text-slate-500">
                                                                {records.length} order{records.length > 1 ? "s" : ""} · {formatNumber(companyQty)} {item.unit} · Avg {formatCurrency(companyAvg)}
                                                            </p>
                                                        </div>
                                                        <p className="shrink-0 text-sm font-bold text-blue-700">
                                                            {formatCurrency(companyValue)}
                                                        </p>
                                                    </div>

                                                    <div className="mt-2 space-y-1 border-t border-blue-100 pt-2">
                                                        {records.map((r) => (
                                                            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                                                                <div className="min-w-0 flex items-center gap-2">
                                                                    <span className="font-mono text-[10px] font-semibold text-blue-600">{r.orderNumber || "—"}</span>
                                                                    <span className="text-slate-400">·</span>
                                                                    <span className="truncate text-slate-600">{r.customer || "—"}</span>
                                                                    <span className="text-slate-400">·</span>
                                                                    <span className="tabular-nums">{formatNumber(r.qty)} {r.unit}</span>
                                                                    <span className="text-slate-400">@</span>
                                                                    <span className="tabular-nums">{formatCurrency(r.rate)}</span>
                                                                </div>
                                                                <span className="shrink-0 tabular-nums font-semibold text-slate-700">{formatCurrency(r.total)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="mt-3 rounded-xl bg-blue-600 px-3 py-2.5 text-white">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span>📊 Total Sale</span>
                                                <span className="tabular-nums">{formatNumber(item.saleQty)} {item.unit} · {formatCurrency(item.saleValue)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ---------- PROFIT SUMMARY BAR ---------- */}
                        <div className={`mt-4 rounded-xl border p-3 ${item.profit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                <div className="flex flex-wrap items-center gap-4">
                                    <span className="text-slate-600">
                                        Remaining: <strong className={item.remainingQty >= 0 ? "text-amber-700" : "text-red-600"}>
                                            {formatNumber(item.remainingQty)} {item.unit}
                                        </strong>
                                    </span>
                                    <span className="text-slate-600">
                                        Cost of Sold: <strong className="text-slate-800">{formatCurrency(item.saleQty * item.avgPurchaseRate)}</strong>
                                    </span>
                                </div>
                                <span className={`text-base font-black ${item.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {item.profit >= 0 ? "✓ Profit: " : "⚠ Loss: "}
                                    {formatCurrency(Math.abs(item.profit))}
                                </span>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
})}
                                </tbody>
                                <tfoot className="bg-slate-100 font-bold text-slate-800">
                                    <tr>
                                        <td colSpan={2} className="border-r-2 border-t border-slate-200 px-4 py-3 text-xs uppercase text-slate-700">
                                            Grand Total (Value Only)
                                        </td>
                                        <td className="border-r border-t border-slate-200 px-4 py-3"></td>
                                        <td className="border-r border-t border-slate-200 px-4 py-3"></td>
                                        <td className="border-r-2 border-t border-slate-200 px-4 py-3 text-right tabular-nums text-violet-700">
                                            {formatCurrency(grandTotals.purchaseValue)}
                                        </td>
                                        <td className="border-r border-t border-slate-200 px-4 py-3"></td>
                                        <td className="border-r border-t border-slate-200 px-4 py-3"></td>
                                        <td className="border-r-2 border-t border-slate-200 px-4 py-3 text-right tabular-nums text-blue-700">
                                            {formatCurrency(grandTotals.saleValue)}
                                        </td>
                                        <td className="border-r border-t border-slate-200 px-4 py-3"></td>
                                        <td className={`border-r-2 border-t border-slate-200 px-4 py-3 text-right tabular-nums ${grandTotals.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                            {formatCurrency(grandTotals.profit)}
                                        </td>
                                        <td className="border-t border-slate-200 px-4 py-3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>

                <p className="mt-5 text-center text-xs text-slate-400">
                    Sudha Chemicals · Product-wise Sheet
                </p>
            </div>
        </main>
    );
}