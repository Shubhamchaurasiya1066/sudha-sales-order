"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PURCHASE_KEY = "sudha_purchase_orders";
const SALES_KEY = "sudha_sales_orders";

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatQty(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    purchaseQty: 0,
    purchaseValue: 0,
    saleQty: 0,
    saleValue: 0,
    remainingQty: 0,
    profit: 0,
  });
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [includePending, setIncludePending] = useState(false);

  useEffect(() => {
    try {
      const purchases = JSON.parse(localStorage.getItem(PURCHASE_KEY) || "[]");
      const sales = JSON.parse(localStorage.getItem(SALES_KEY) || "[]");

      const itemMap = new Map();

      const getKey = (itemName, unit) =>
        `${String(itemName || "").trim().toLowerCase()}::${String(unit || "KG").toUpperCase()}`;

      const ensureItem = (itemName, unit) => {
        const key = getKey(itemName, unit);
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemName: String(itemName || "").trim(),
            unit: String(unit || "KG").toUpperCase(),
            purchaseQty: 0,
            purchaseValue: 0,
            saleQty: 0,
            saleValue: 0,
          });
        }
        return itemMap.get(key);
      };

      // Process Purchases
      (Array.isArray(purchases) ? purchases : []).forEach((order) => {
        if (!order.itemName) return;
        if (order.status === "Cancelled") return;

        // Agar toggle off hai, to sirf Completed count honge (Stock Ledger ke hisaab se)
        const shouldCount = includePending || order.status === "Completed";
        if (!shouldCount) return;

        const item = ensureItem(order.itemName, order.qtyUnit);
        const qty = Number(order.qty) || 0;
        const price = Number(order.billingPrice) || Number(order.actualPrice) || 0;

        item.purchaseQty += qty;
        item.purchaseValue += qty * price;
      });

      // Process Sales
      (Array.isArray(sales) ? sales : []).forEach((order) => {
        if (!order.itemName) return;
        if (order.status === "Cancelled") return;

        const item = ensureItem(order.itemName, order.qtyUnit);
        const qty = Number(order.qty) || 0;
        const price = Number(order.rate) || 0;

        item.saleQty += qty;
        item.saleValue += qty * price;
      });

      // Calculate Averages, Remaining & Profit
      const computed = Array.from(itemMap.values()).map((item) => {
        const avgPurchaseRate = item.purchaseQty > 0 ? item.purchaseValue / item.purchaseQty : 0;
        const avgSaleRate = item.saleQty > 0 ? item.saleValue / item.saleQty : 0;
        const remainingQty = item.purchaseQty - item.saleQty;

        // Profit = Sale Revenue - Cost of Goods Sold
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

      const grand = computed.reduce(
        (acc, item) => ({
          purchaseQty: acc.purchaseQty + item.purchaseQty,
          purchaseValue: acc.purchaseValue + item.purchaseValue,
          saleQty: acc.saleQty + item.saleQty,
          saleValue: acc.saleValue + item.saleValue,
          remainingQty: acc.remainingQty + item.remainingQty,
          profit: acc.profit + item.profit,
        }),
        { purchaseQty: 0, purchaseValue: 0, saleQty: 0, saleValue: 0, remainingQty: 0, profit: 0 }
      );

      setItems(computed);
      setTotals(grand);
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, [includePending]);

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.itemName.toLowerCase().includes(q);
  });

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
              <p className="text-xs text-slate-400">Inventory & Stock Management</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/company-purchases" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500">
              🏢 Company Purchases
            </Link>
            <Link href="/company-sales" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              🏢 Company Sales
            </Link>
            <Link
              href="/sheet"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              📊 View Sheet
            </Link>
            <Link href="/purchase-order" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500">
              + Purchase
            </Link>
            <Link href="/sales-order" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">
              + Sale
            </Link>
            <Link href="/purchase-orders" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-900">
              View Purchases
            </Link>
            <Link href="/sales-orders" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-900">
              View Sales
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Inventory Dashboard
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Stock & Profit Summary
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Item-wise purchase, sale, average rates, remaining stock and profit overview.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Purchase Value</p>
            <p className="mt-2 text-2xl font-black text-violet-700">{formatCurrency(totals.purchaseValue)}</p>
            <p className="mt-1 text-xs text-slate-400">{formatQty(totals.purchaseQty)} total qty</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Sale Value</p>
            <p className="mt-2 text-2xl font-black text-blue-700">{formatCurrency(totals.saleValue)}</p>
            <p className="mt-1 text-xs text-slate-400">{formatQty(totals.saleQty)} total qty</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Remaining Stock</p>
            <p className="mt-2 text-2xl font-black text-amber-700">{formatQty(totals.remainingQty)}</p>
            <p className="mt-1 text-xs text-slate-400">Across all items</p>
          </div>
          <div className={`rounded-2xl border p-5 shadow-sm ${totals.profit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-sm font-medium ${totals.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {totals.profit >= 0 ? "Estimated Profit" : "Estimated Loss"}
            </p>
            <p className={`mt-2 text-2xl font-black ${totals.profit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
              {formatCurrency(Math.abs(totals.profit))}
            </p>
            <p className="mt-1 text-xs text-slate-500">Sale - Cost of Goods Sold</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item name..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 sm:max-w-sm"
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-600"
            />
            <span className="font-semibold text-slate-700">
              Include Pending / Approved / Processing purchases
            </span>
          </label>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
          {!ready ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading inventory...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">📦</div>
              <h3 className="mt-5 text-lg font-bold">No inventory data</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Create purchase orders (and mark them as Completed) and sales orders to see the summary here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Item</th>
                    <th className="px-5 py-4 font-bold text-right">Pur. Qty</th>
                    <th className="px-5 py-4 font-bold text-right">Avg Pur. Rate</th>
                    <th className="px-5 py-4 font-bold text-right">Pur. Value</th>
                    <th className="px-5 py-4 font-bold text-right">Sale Qty</th>
                    <th className="px-5 py-4 font-bold text-right">Avg Sale Rate</th>
                    <th className="px-5 py-4 font-bold text-right">Sale Value</th>
                    <th className="px-5 py-4 font-bold text-right">Remaining</th>
                    <th className="px-5 py-4 font-bold text-right">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{item.itemName}</p>
                        <p className="text-xs text-slate-400">Unit: {item.unit}</p>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {formatQty(item.purchaseQty)} {item.unit}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                        {formatCurrency(item.avgPurchaseRate)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-semibold">
                        {formatCurrency(item.purchaseValue)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {formatQty(item.saleQty)} {item.unit}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                        {formatCurrency(item.avgSaleRate)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-semibold">
                        {formatCurrency(item.saleValue)}
                      </td>
                      <td className={`px-5 py-4 text-right tabular-nums font-bold ${item.remainingQty > 0 ? "text-amber-700" : item.remainingQty < 0 ? "text-red-600" : "text-slate-500"}`}>
                        {formatQty(item.remainingQty)} {item.unit}
                      </td>
                      <td className={`px-5 py-4 text-right tabular-nums font-bold ${item.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(item.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Sudha Chemicals · Inventory Management
        </p>
      </div>
    </main>
  );
}