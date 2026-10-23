"use client";

import { useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_purchase_orders";
const units = ["L", "KG", "MT", "BAG"];

const initialForm = {
  manufacturerName: "",
  itemName: "",
  qty: "",
  qtyUnit: "KG",
  actualPrice: "",
  discountType: "percent",
  discount: "0",
  billingPrice: "",
  exFor: "",
  place: "",
  supplierEmail: "",
  brokerName: "",
  brokerContactNumber: "",
  brokerEmail: "",
  transportName: "",
  freight: "",
  status: "Pending",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function PurchaseOrderPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");

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

    if (!form.manufacturerName.trim()) {
      next.manufacturerName = "Manufacturer/Trader name is required.";
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
      form.actualPrice === "" ||
      !Number.isFinite(Number(form.actualPrice)) ||
      Number(form.actualPrice) < 0
    ) {
      next.actualPrice = "Enter a valid actual price.";
    }

    if (
      form.discount === "" ||
      !Number.isFinite(Number(form.discount)) ||
      Number(form.discount) < 0
    ) {
      next.discount = "Enter a valid discount.";
    }

    if (
      form.discountType === "percent" &&
      Number(form.discount) > 100
    ) {
      next.discount = "Percentage discount cannot exceed 100%.";
    }

    if (
      form.billingPrice === "" ||
      !Number.isFinite(Number(form.billingPrice)) ||
      Number(form.billingPrice) < 0
    ) {
      next.billingPrice = "Enter a valid billing price.";
    }

    if (!form.exFor) {
      next.exFor = "Please select Ex/For.";
    }

    if (!form.place.trim()) {
      next.place = "Place is required.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supplierEmail.trim())) {
      next.supplierEmail = "Enter a valid supplier email.";
    }

    if (
      form.brokerContactNumber &&
      !/^[0-9]{10}$/.test(form.brokerContactNumber.trim())
    ) {
      next.brokerContactNumber = "Enter a valid 10-digit contact number.";
    }

    if (
      form.brokerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.brokerEmail.trim())
    ) {
      next.brokerEmail = "Enter a valid broker email.";
    }

    if (!form.transportName.trim()) {
      next.transportName = "Transport name is required.";
    }

    if (
      form.freight === "" ||
      !Number.isFinite(Number(form.freight)) ||
      Number(form.freight) < 0
    ) {
      next.freight = "Enter a valid freight amount.";
    }

    if (
      !["Pending", "Approved", "Processing", "Completed", "Cancelled"].includes(
        form.status
      )
    ) {
      next.status = "Please select a valid order status.";
    }

    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setNotice("");

    if (Object.keys(nextErrors).length > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    try {
      const parsed = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      const orders = Array.isArray(parsed) ? parsed : [];

      const nextSerial =
        orders.reduce((max, order) => {
          const match = String(
            order.purchaseOrderNumber || ""
          ).match(/PO-\d{4}-(\d+)/);

          return Math.max(
            max,
            match ? Number(match[1]) : 0
          );
        }, 0) + 1;

      const now = new Date();

      const purchaseOrderNumber = `PO-${now.getFullYear()}-${String(
        nextSerial
      ).padStart(4, "0")}`;

      const newOrder = {
        ...form,
        status: form.status || "Pending",
        qty: Number(form.qty),
        actualPrice: Number(form.actualPrice),
        discount: Number(form.discount),
        billingPrice: Number(form.billingPrice),
        freight: Number(form.freight),
        serialNo: nextSerial,
        purchaseOrderNumber,
        orderDate: now.toLocaleString("en-IN"),
        id: `${now.getTime()}-${nextSerial}`,
        createdAt: now.toISOString(),
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...orders, newOrder])
      );

      setForm({ ...initialForm });
      setErrors({});
      setNoticeType("success");
      setNotice(
        `Purchase Order ${purchaseOrderNumber} saved successfully.`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch {
      setNoticeType("error");
      setNotice(
        "Unable to save the order. Please check browser storage settings and try again."
      );
    }
  }

  function resetForm() {
    setForm({ ...initialForm });
    setErrors({});
    setNotice("");
  }

  function field(name, label, placeholder, options = {}) {
    return (
      <div className={options.className || ""}>
        <label className={labelClass} htmlFor={name}>
          {label}
          {options.required && (
            <span className="text-red-500"> *</span>
          )}
        </label>

        {options.select ? (
          <select
            id={name}
            name={name}
            value={form[name]}
            onChange={updateField}
            className={`${inputClass} ${
              errors[name] ? "border-red-400" : ""
            }`}
            required={options.required}
          >
            {options.select.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={name}
            name={name}
            type={options.type || "text"}
            min={options.type === "number" ? "0" : undefined}
            step={options.type === "number" ? "any" : undefined}
            value={form[name]}
            onChange={updateField}
            placeholder={placeholder}
            className={`${inputClass} ${
              errors[name] ? "border-red-400" : ""
            }`}
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
    <main className="min-h-screen w-full overflow-x-clip bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-xl font-black shadow-lg shadow-violet-500/20">
              S
            </div>

            <div>
              <p className="text-lg font-bold tracking-wide">
                SUDHA CHEMICALS
              </p>
              <p className="text-xs text-slate-400">
                Purchase & Supplier Management
              </p>
            </div>
          </div>

          <Link
            href="/purchase-orders"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:border-violet-400 hover:bg-slate-900"
          >
            View Purchase Orders <span className="ml-2">→</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-violet-700">
            Procurement Management
          </p>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Purchase Order
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Record supplier purchases, quantity, discounts, transport
            and freight in one place.
          </p>
        </div>

        {notice && (
          <div
            role={noticeType === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mb-6 flex items-start gap-3 rounded-2xl border bg-white p-4 text-sm shadow-lg ${
              noticeType === "error"
                ? "border-red-200"
                : "border-emerald-200"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                noticeType === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {noticeType === "error" ? "!" : "✓"}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`font-bold ${
                  noticeType === "error"
                    ? "text-red-800"
                    : "text-emerald-800"
                }`}
              >
                {noticeType === "error"
                  ? "Could not save"
                  : "Purchase Order Saved"}
              </p>

              <p className="mt-1 break-words text-slate-600">
                {notice}
              </p>

              {noticeType === "success" && (
                <Link
                  href="/purchase-orders"
                  className="mt-2 inline-block font-semibold text-violet-700 underline underline-offset-2"
                >
                  View orders
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100"
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
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Purchase Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fields marked with * are required.
                </p>
              </div>

              <span className="w-fit rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">
                NEW PURCHASE ORDER
              </span>
            </div>
          </div>

          <div className="space-y-8 p-4 sm:p-6 lg:p-8">
            <section>
              <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  01
                </span>
                Supplier & Item Details
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {field(
                  "manufacturerName",
                  "Name of Manufacturer/Traders",
                  "Enter manufacturer or trader name",
                  { required: true }
                )}

                {field(
                  "itemName",
                  "Item Name",
                  "Enter chemical / product name",
                  { required: true }
                )}

                <div>
                  <label className={labelClass} htmlFor="qty">
                    QTY <span className="text-red-500">*</span>
                  </label>

                  <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-2">
                    <input
                      id="qty"
                      name="qty"
                      type="number"
                      min="0.001"
                      step="any"
                      value={form.qty}
                      onChange={updateField}
                      placeholder="e.g. 100"
                      className={`${inputClass} ${
                        errors.qty ? "border-red-400" : ""
                      }`}
                    />

                    <select
                      name="qtyUnit"
                      aria-label="Quantity unit"
                      value={form.qtyUnit}
                      onChange={updateField}
                      className={inputClass}
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

                {field(
                  "place",
                  "Place",
                  "Enter supplier / delivery place",
                  { required: true }
                )}

                {field(
                  "supplierEmail",
                  "Email ID (Supplier)",
                  "supplier@example.com",
                  { type: "email", required: true }
                )}

                {field("exFor", "Ex/For", "Select Ex/For", {
                  required: true,
                  select: [
                    { value: "", label: "Select option" },
                    { value: "Ex", label: "Ex" },
                    { value: "For", label: "For" },
                  ],
                })}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  02
                </span>
                Pricing, Discount & Status
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {field(
                  "actualPrice",
                  "Actual Price (₹)",
                  "Enter actual price",
                  { type: "number", required: true }
                )}

                <div>
                  <label className={labelClass} htmlFor="discount">
                    Discount <span className="text-red-500">*</span>
                  </label>

                  <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                    <input
                      id="discount"
                      name="discount"
                      type="number"
                      min="0"
                      step="any"
                      value={form.discount}
                      onChange={updateField}
                      placeholder="Enter discount"
                      className={`${inputClass} ${
                        errors.discount ? "border-red-400" : ""
                      }`}
                    />

                    <select
                      name="discountType"
                      aria-label="Discount type"
                      value={form.discountType}
                      onChange={updateField}
                      className={inputClass}
                    >
                      <option value="percent">Percent %</option>
                      <option value="amount">Fixed ₹</option>
                    </select>
                  </div>

                  {errors.discount && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.discount}
                    </p>
                  )}
                </div>

                {field(
                  "billingPrice",
                  "Billing Price (₹)",
                  "Enter billing price manually",
                  { type: "number", required: true }
                )}

                {field(
                  "freight",
                  "Freight (₹)",
                  "Enter freight amount",
                  { type: "number", required: true }
                )}

                {field(
                  "transportName",
                  "Transport Name",
                  "Enter transport company / name",
                  { required: true }
                )}

                {field("status", "Order Status", "", {
                  required: true,
                  select: [
                    { value: "Pending", label: "Pending" },
                    { value: "Approved", label: "Approved" },
                    { value: "Processing", label: "Processing" },
                    { value: "Completed", label: "Completed" },
                    { value: "Cancelled", label: "Cancelled" },
                  ],
                })}
              </div>

              <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Discount and Billing Price are separate fields. Billing
                Price must be entered manually and will not change
                automatically when you update the discount. New purchase
                orders start with Pending status unless you select another
                status.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h3 className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  03
                </span>
                Broker Details
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {field(
                  "brokerName",
                  "Broker Name",
                  "Enter broker name"
                )}

                {field(
                  "brokerContactNumber",
                  "Contact Number (Broker)",
                  "10-digit mobile number",
                  { type: "tel" }
                )}

                {field(
                  "brokerEmail",
                  "Email ID (Broker)",
                  "broker@example.com",
                  { type: "email" }
                )}
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Reset Form
              </button>

              <button
                type="submit"
                className="rounded-xl bg-violet-700 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-500/20"
              >
                Save Purchase Order →
              </button>
            </div>
          </div>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Sudha Chemicals · Purchase Order Management
        </p>
      </div>
    </main>
  );
}