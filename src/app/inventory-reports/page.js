
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

const quantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

export default function InventoryReportsPage() {
  const [report, setReport] = useState({
    inventory: [],
    history: [],
    totals: {},
  });
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("All");
  const [isReady, setIsReady] = useState(false);

  function refreshReports() {
    try {
      setReport(getInventoryReport());
    } catch (error) {
      console.error("Unable to load inventory report:", error);
      setReport({ inventory: [], history: [], totals: {} });
    }
    setIsReady(true);
  }

  useEffect(() => {
    refreshReports();

    function onStorageChange() {
      refreshReports();
    }

    window.addEventListener("storage", onStorageChange);

    return () => {
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return report.inventory.filter((item) => {
      const matchesSearch = [
        item.itemName,
        item.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesStock =
        stockFilter === "All" ||
        (stockFilter === "Available" && item.availableQty > 0) ||
        (stockFilter === "Low" &&
          item.stockQty > 0 &&
          item.availableQty <= 10) ||
        (stockFilter === "Out" && item.availableQty <= 0);

      return matchesSearch && matchesStock;
    });
  }, [report.inventory, search, stockFilter]);

  const totalItems = report.inventory.length;

  const lowStockCount = report.inventory.filter(
    (item) => item.stockQty > 0 && item.availableQty <= 10
  ).length;

  const outOfStockCount = report.inventory.filter(
    (item) => item.availableQty <= 0
  ).length;

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  const statCard = (title, value, subtitle, accent = "text-slate-950") => (
    <div className={cardClass}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-3 break-words text-2xl font-black sm:text-3xl ${accent}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );

  function exportCsv() {
    const headings = [
      "Item",
      "Unit",
      "Purchased Quantity",
      "Sold Quantity",
      "Reserved Quantity",
      "Physical Stock",
      "Available Stock",
      "Average Cost",
      "Stock Value",
      "Sales Value",
      "Cost of Goods Sold",
      "Gross Profit",
    ];

    const rows = filteredInventory.map((item) => [
      item.itemName,
      item.unit,
      item.purchasedQty,
      item.soldQty,
      item.reservedQty,
      item.stockQty,
      item.availableQty,
      item.averageCost,
      item.stockValue,
      item.salesValue,
      item.costOfGoodsSold,
      item.grossProfit,
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
    link.download = "sudha-inventory-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white print:bg-white print:text-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-black tracking-wide">
              SUDHA CHEMICALS
            </p>
            <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
              Inventory Analytics & Reports
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <Link
              href="/inventory"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800"
            >
              Inventory
            </Link>
            <Link
              href="/inventory-ledger"
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold hover:bg-slate-800"
            >
              Transaction Ledger
            </Link>
            <button
              type="button"
              onClick={refreshReports}
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold hover:bg-violet-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-violet-700">
              Business Intelligence
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Inventory Reports
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">
              Monitor stock quantities, purchase and sales values, estimated
              gross profit and recorded freight expenses.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 print:hidden">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={printReport}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold hover:bg-slate-50"
            >
              Print Report
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-bold">How these figures are calculated</p>
          <p className="mt-1">
            Figures come from the current purchase, sales and shipment records
            through your existing inventory utility. Only Completed purchase
            orders add stock, and Dispatched or Delivered sales orders issue
            stock. Gross profit is sales value minus estimated cost of goods
            sold. These are current calculated figures, not an immutable
            financial audit or a date-specific historical report.
          </p>
        </div>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCard(
            "Purchase Value",
            money(report.totals?.purchaseValue),
            "Completed purchase orders",
            "text-blue-700"
          )}
          {statCard(
            "Sales Value",
            money(report.totals?.salesValue),
            "Dispatched and delivered orders",
            "text-violet-700"
          )}
          {statCard(
            "Current Stock Value",
            money(report.totals?.stockValue),
            "Estimated value of physical stock",
            "text-emerald-700"
          )}
          {statCard(
            "Estimated Gross Profit",
            money(report.totals?.grossProfit),
            "Sales value minus estimated stock cost",
            Number(report.totals?.grossProfit) >= 0
              ? "text-emerald-700"
              : "text-rose-700"
          )}
          {statCard(
            "Unique Item / Unit Types",
            quantity(totalItems),
            "Separate item and unit combinations"
          )}
          {statCard(
            "Reserved Quantity",
            quantity(report.totals?.reservedQty),
            "Active sales orders, in their respective units",
            "text-amber-700"
          )}
          {statCard(
            "Low Stock Items",
            quantity(lowStockCount),
            "Positive physical stock with 10 or fewer available units",
            "text-amber-700"
          )}
          {statCard(
            "Out of Stock",
            quantity(outOfStockCount),
            "Items with no available quantity",
            "text-rose-700"
          )}
        </div>

        <section className="mb-7 grid gap-4 lg:grid-cols-2">
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Cost of Goods Sold
                </p>
                <p className="mt-2 text-2xl font-black">
                  {money(
                    filteredInventory.reduce(
                      (sum, item) => sum + Number(item.costOfGoodsSold || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <span className="text-2xl" aria-hidden="true">↗</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Estimated cost assigned to stock issued for recorded sales.
            </p>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Recorded Freight Expense
                </p>
                <p className="mt-2 text-2xl font-black">
                  {money(report.totals?.freightExpense)}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <span className="text-2xl" aria-hidden="true">₹</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Freight from non-cancelled transporter shipment records. This
              amount is reported separately and is not deducted from gross
              profit in the current calculation.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Item-wise Stock Report</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredInventory.length} item/unit record(s)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item or unit..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500"
              />

              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="All">All stock levels</option>
                <option value="Available">Available stock</option>
                <option value="Low">Low stock (10 or less)</option>
                <option value="Out">No available stock</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  {[
                    "Item / Chemical",
                    "Unit",
                    "Purchased",
                    "Sold",
                    "Reserved",
                    "Physical Stock",
                    "Available",
                    "Average Cost",
                    "Stock Value",
                    "Sales Value",
                    "COGS",
                    "Gross Profit",
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
                    <td colSpan={12} className="p-10 text-center text-slate-500">
                      Loading inventory reports...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-500">
                      No inventory records found. Complete a purchase order to
                      start building stock.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr
                      key={`${item.itemName}-${item.unit}`}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-bold">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-4">{item.unit}</td>
                      <td className="px-4 py-4 text-emerald-700">
                        {quantity(item.purchasedQty)}
                      </td>
                      <td className="px-4 py-4 text-rose-700">
                        {quantity(item.soldQty)}
                      </td>
                      <td className="px-4 py-4 text-amber-700">
                        {quantity(item.reservedQty)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {quantity(item.stockQty)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            item.availableQty > 10
                              ? "bg-emerald-100 text-emerald-800"
                              : item.availableQty > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {quantity(item.availableQty)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {money(item.averageCost)}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {money(item.stockValue)}
                      </td>
                      <td className="px-4 py-4">
                        {money(item.salesValue)}
                      </td>
                      <td className="px-4 py-4">
                        {money(item.costOfGoodsSold)}
                      </td>
                      <td
                        className={`px-4 py-4 font-bold ${
                          item.grossProfit >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {money(item.grossProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {filteredInventory.length > 0 && (
                <tfoot className="bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={8} className="px-4 py-4">
                      Filtered Totals
                    </td>
                    <td className="px-4 py-4">
                      {money(
                        filteredInventory.reduce(
                          (sum, item) => sum + Number(item.stockValue || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {money(
                        filteredInventory.reduce(
                          (sum, item) => sum + Number(item.salesValue || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {money(
                        filteredInventory.reduce(
                          (sum, item) =>
                            sum + Number(item.costOfGoodsSold || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {money(
                        filteredInventory.reduce(
                          (sum, item) => sum + Number(item.grossProfit || 0),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2 print:hidden">
          <Link
            href="/purchase-orders"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
          >
            <p className="font-bold">Purchase Orders →</p>
            <p className="mt-1 text-sm text-slate-500">
              Review purchase records and completion status.
            </p>
          </Link>

          <Link
            href="/sales-orders"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
          >
            <p className="font-bold">Sales Orders →</p>
            <p className="mt-1 text-sm text-slate-500">
              Review sales orders and dispatch status.
            </p>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          main {
            background: white !important;
          }

          button,
          input,
          select,
          a {
            print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          table {
            font-size: 9px;
          }

          th,
          td {
            padding: 6px !important;
          }

          section {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
