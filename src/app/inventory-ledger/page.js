
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventoryReport } from "@/lib/inventory";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const number = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InventoryLedgerPage() {
  const [report, setReport] = useState({
    inventory: [],
    history: [],
    totals: {},
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isReady, setIsReady] = useState(false);

  function refreshLedger() {
    try {
      setReport(getInventoryReport());
    } catch (error) {
      console.error("Unable to load inventory ledger:", error);
      setReport({ inventory: [], history: [], totals: {} });
    }
    setIsReady(true);
  }

  useEffect(() => {
    refreshLedger();

    function onStorageChange() {
      refreshLedger();
    }

    window.addEventListener("storage", onStorageChange);

    return () => {
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...report.history]
      .filter((entry) => {
        const type = entry.type === "purchase" ? "Purchase" : "Sale";
        const searchable = [
          entry.id,
          entry.itemName,
          entry.unit,
          entry.description,
          type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const date = entry.date ? String(entry.date).slice(0, 10) : "";

        return (
          searchable.includes(query) &&
          (typeFilter === "All" || type === typeFilter) &&
          (!fromDate || (date && date >= fromDate)) &&
          (!toDate || (date && date <= toDate))
        );
      })
      .sort(
        (a, b) =>
          (new Date(b.date || 0).getTime() || 0) -
          (new Date(a.date || 0).getTime() || 0)
      );
  }, [report.history, search, typeFilter, fromDate, toDate]);

  const purchaseCount = entries.filter(
    (entry) => entry.type === "purchase"
  ).length;

  const salesCount = entries.filter(
    (entry) => entry.type === "sale"
  ).length;

  const totalInward = entries
    .filter((entry) => entry.type === "purchase")
    .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);

  const totalOutward = entries
    .filter((entry) => entry.type === "sale")
    .reduce((sum, entry) => sum + Number(entry.qty || 0), 0);

  function exportCsv() {
    const headings = [
      "Date",
      "Type",
      "Order Reference",
      "Item",
      "Unit",
      "Inward Qty",
      "Outward Qty",
      "Transaction Value",
      "Stock After Transaction",
    ];

    const rows = entries.map((entry) => [
      formatDate(entry.date),
      entry.type === "purchase" ? "Purchase" : "Sale",
      entry.id || "",
      entry.itemName || "",
      entry.unit || "",
      entry.type === "purchase" ? entry.qty : "",
      entry.type === "sale" ? entry.qty : "",
      entry.value || 0,
      entry.stockAfter ?? "",
    ]);

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headings, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sudha-inventory-ledger.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-black tracking-wide">
              SUDHA CHEMICALS
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Inventory Management System
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800"
            >
              Inventory
            </Link>
            <Link
              href="/inventory-reports"
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold hover:bg-violet-700"
            >
              Inventory Reports
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-700">
              Stock Movement
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Inventory Ledger
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Review purchase receipts and dispatched or delivered sales
              calculated from your current order records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={refreshLedger}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={cardClass}>
            <p className="text-sm font-medium text-slate-500">
              Matching Transactions
            </p>
            <p className="mt-2 text-3xl font-black">{entries.length}</p>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-medium text-slate-500">
              Purchase Entries
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {purchaseCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Inward: {number(totalInward)} units
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-medium text-slate-500">
              Sales Entries
            </p>
            <p className="mt-2 text-3xl font-black text-rose-700">
              {salesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Outward: {number(totalOutward)} units
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-medium text-slate-500">
              Current Stock Value
            </p>
            <p className="mt-2 break-words text-2xl font-black">
              {money(report.totals?.stockValue)}
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Ledger data note</p>
          <p className="mt-1">
            This page displays calculated movements, not an immutable audit
            trail. Purchase entries include orders currently marked Completed;
            sales entries include orders currently marked Dispatched or
            Delivered. Editing or deleting those orders can change this
            history. Stock-after values should not be treated as a verified
            chronological balance.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold">Transaction History</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by item, order reference or transaction type.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item or order..."
                className={inputClass}
              />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All transaction types</option>
                <option value="Purchase">Purchase / Inward</option>
                <option value="Sale">Sales / Outward</option>
              </select>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  From date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  To date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  {[
                    "Date",
                    "Type",
                    "Reference",
                    "Item / Chemical",
                    "Inward",
                    "Outward",
                    "Transaction Value",
                    "Stock After",
                    "Description",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-4 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!isReady ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-500">
                      Loading ledger...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-500">
                      No matching transactions found.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, index) => {
                    const purchase = entry.type === "purchase";

                    return (
                      <tr
                        key={`${entry.type}-${entry.id}-${entry.date}-${index}`}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                              purchase
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {purchase ? "Purchase" : "Sale"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {entry.id || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold">{entry.itemName || "—"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Unit: {entry.unit || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-bold text-emerald-700">
                          {purchase
                            ? `${number(entry.qty)} ${entry.unit || ""}`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 font-bold text-rose-700">
                          {!purchase
                            ? `${number(entry.qty)} ${entry.unit || ""}`
                            : "—"}
                        </td>
                        <td className="px-4 py-4">
                          {money(entry.value)}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {entry.stockAfter == null
                            ? "—"
                            : `${number(entry.stockAfter)} ${entry.unit || ""}`}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {entry.description || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500">
            Showing {entries.length} of {report.history.length} calculated
            transactions.
          </div>
        </section>
      </div>
    </main>
  );
}
