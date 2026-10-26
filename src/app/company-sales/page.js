"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const SALES_KEY = "sudha_sales_orders";

const STATUS_OPTIONS = ["Pending", "Confirmed", "Processing", "Dispatched", "Delivered", "Cancelled"];

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(amount);
}

function formatQty(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function statusClass(status) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
    Processing: "bg-violet-50 text-violet-700 ring-violet-600/20",
    Dispatched: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  };
  return styles[status] || "bg-slate-100 text-slate-700 ring-slate-500/20";
}

export default function CompanySalesPage() {
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);

  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openCompanies, setOpenCompanies] = useState({});

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
      setOrders(Array.isArray(raw) ? raw : []);
    } catch {
      setOrders([]);
    } finally {
      setReady(true);
    }
  }, []);

  const companyList = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.companyName) set.add(o.companyName);
    });
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return orders.filter((o) => {
      const matchSearch =
        !q ||
        String(o.companyName || "").toLowerCase().includes(q) ||
        String(o.itemName || "").toLowerCase().includes(q) ||
        String(o.orderNumber || "").toLowerCase().includes(q) ||
        String(o.customerName || "").toLowerCase().includes(q) ||
        String(o.place || "").toLowerCase().includes(q) ||
        String(o.brokerName || "").toLowerCase().includes(q) ||
        String(o.filledBy || "").toLowerCase().includes(q);

      const matchCompany = !companyFilter || o.companyName === companyFilter;
      const matchStatus = !statusFilter || (o.status || "Pending") === statusFilter;

      const orderDate = o.createdAt ? new Date(o.createdAt) : null;
      const matchFrom = !from || (orderDate && orderDate >= from);
      const matchTo = !to || (orderDate && orderDate <= to);

      return matchSearch && matchCompany && matchStatus && matchFrom && matchTo;
    });
  }, [orders, search, companyFilter, statusFilter, fromDate, toDate]);

  const grouped = useMemo(() => {
    const map = new Map();

    filtered.forEach((o) => {
      const company = o.companyName || "Unknown Company";
      if (!map.has(company)) {
        map.set(company, {
          company,
          items: [],
          totalQtyByUnit: {},
          totalValue: 0,
          totalFreight: 0,
          orderCount: 0,
          customers: new Set(),
        });
      }
      const g = map.get(company);
      const qty = Number(o.qty) || 0;
      const unit = o.qtyUnit || "KG";
      const rate = Number(o.rate) || 0;
      const freight = Number(o.freight) || 0;

      g.items.push(o);
      g.totalQtyByUnit[unit] = (g.totalQtyByUnit[unit] || 0) + qty;
      g.totalValue += qty * rate;
      g.totalFreight += freight;
      g.orderCount += 1;
      if (o.customerName) g.customers.add(o.customerName);
    });

    return Array.from(map.values())
      .map((g) => ({ ...g, customers: g.customers.size }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [filtered]);

  const summary = useMemo(() => {
    let companies = grouped.length;
    let lines = 0;
    let value = 0;
    grouped.forEach((g) => { lines += g.items.length; value += g.totalValue; });
    return { companies, lines, value };
  }, [grouped]);

  function toggleCompany(name) {
    setOpenCompanies((prev) => ({ ...prev, [name]: !prev[name] }));
  }
  function isOpen(name) { return openCompanies[name] !== false; }
  function expandAll() {
    const n = {}; grouped.forEach((g) => (n[g.company] = true));
    setOpenCompanies(n);
  }
  function collapseAll() {
    const n = {}; grouped.forEach((g) => (n[g.company] = false));
    setOpenCompanies(n);
  }
  function resetFilters() {
    setSearch(""); setCompanyFilter(""); setStatusFilter("");
    setFromDate(""); setToDate("");
  }

  function exportCSV() {
    const headers = ["Company", "Order No", "Order Date", "Customer", "Item", "Qty", "Unit", "Rate", "Total", "Freight", "Payment Terms", "Status", "Filled By"];
    const rows = [];
    grouped.forEach((g) => {
      g.items.forEach((o) => {
        const qty = Number(o.qty) || 0;
        const rate = Number(o.rate) || 0;
        rows.push([
          g.company, o.orderNumber || "", o.orderDate || "",
          o.customerName || "", o.itemName || "", qty, o.qtyUnit || "",
          rate.toFixed(2), (qty * rate).toFixed(2),
          (Number(o.freight) || 0).toFixed(2),
          o.paymentTerms || "", o.status || "Pending", o.filledBy || "",
        ]);
      });
    });
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `company-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black">S</div>
            <div>
              <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
              <p className="text-xs text-slate-400">Company-wise Sales</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportCSV} disabled={grouped.length === 0}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40">
              Export CSV ↓
            </button>
            <Link href="/sales-orders" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">All Sales</Link>
            <Link href="/inventory" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Inventory</Link>
            <Link href="/sales-order" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500">+ New Sale</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Sales Analytics</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Company-wise Sales Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">Har company ke saare customer orders, products aur totals ek jagah.</p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Companies</p>
            <p className="mt-2 text-2xl font-black text-blue-700">{summary.companies}</p>
            <p className="mt-1 text-xs text-slate-400">With matching orders</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Order Lines</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{summary.lines}</p>
            <p className="mt-1 text-xs text-slate-400">Product rows</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Sale Value</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(summary.value)}</p>
            <p className="mt-1 text-xs text-slate-400">Qty × Rate</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search company, customer, item, order no..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500">
              <option value="">All Companies</option>
              {companyList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500" title="From" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500" title="To" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={resetFilters} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset Filters</button>
            <button onClick={expandAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Expand All</button>
            <button onClick={collapseAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Collapse All</button>
            <span className="ml-auto text-xs text-slate-400">{filtered.length} order{filtered.length !== 1 ? "s" : ""} matched</span>
          </div>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading sales...</div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">🏢</div>
            <h3 className="mt-5 text-lg font-bold">Koi sales record nahi mila</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Filter change karo ya naya sales order create karo.</p>
            <Link href="/sales-order" className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800">+ New Sales Order</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => {
              const open = isOpen(g.company);
              const qtyDisplay = Object.entries(g.totalQtyByUnit)
                .map(([u, q]) => `${formatQty(q)} ${u}`).join(" · ");
              return (
                <div key={g.company} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button onClick={() => toggleCompany(g.company)}
                    className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-white px-5 py-4 text-left hover:from-blue-100">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                        {g.company.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-slate-900">{g.company}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {g.orderCount} order{g.orderCount > 1 ? "s" : ""} · {g.items.length} product line{g.items.length > 1 ? "s" : ""} · {g.customers} customer{g.customers > 1 ? "s" : ""} · Total: <span className="font-semibold text-blue-700">{formatCurrency(g.totalValue)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-slate-400">Qty</p>
                        <p className="text-sm font-bold text-amber-700">{qtyDisplay || "—"}</p>
                      </div>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-black text-slate-500 transition ${open ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </button>

                  {open && (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full min-w-[1000px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-bold">Order / Date</th>
                            <th className="px-4 py-3 font-bold">Customer</th>
                            <th className="px-4 py-3 font-bold">Product</th>
                            <th className="px-4 py-3 text-right font-bold">Qty</th>
                            <th className="px-4 py-3 text-right font-bold">Rate</th>
                            <th className="px-4 py-3 text-right font-bold">Total</th>
                            <th className="px-4 py-3 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.items.map((o) => {
                            const qty = Number(o.qty) || 0;
                            const rate = Number(o.rate) || 0;
                            return (
                              <tr key={o.id || o.orderNumber} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <p className="font-mono text-xs font-semibold text-blue-700">{o.orderNumber || "—"}</p>
                                  <p className="text-xs text-slate-400">{o.orderDate || "—"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">{o.customerName || "—"}</p>
                                  <p className="text-xs text-slate-400">{o.customerNumber || ""}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-800">{o.itemName || "—"}</p>
                                  {o.place && <p className="text-xs text-slate-400">📍 {o.place}</p>}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  {formatQty(qty)} <span className="text-xs text-slate-400">{o.qtyUnit || ""}</span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatCurrency(rate)}</td>
                                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800">{formatCurrency(qty * rate)}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusClass(o.status || "Pending")}`}>
                                    {o.status || "Pending"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-xs uppercase text-slate-600">Company Total</td>
                            <td className="px-4 py-3 text-right tabular-nums text-amber-700">{qtyDisplay || "—"}</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatCurrency(g.totalValue)}</td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">Sudha Chemicals · Company-wise Sales Dashboard</p>
      </div>
    </main>
  );
}