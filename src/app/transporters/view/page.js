
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_transporter_shipments";

const companies = [
  "Sudha Chemicals",
  "HP",
  "Company 3",
  "Company 4",
  "Company 5",
];

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
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function ViewTransportersPage() {
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );
      setShipments(Array.isArray(saved) ? saved : []);
    } catch {
      setShipments([]);
    }
    setIsReady(true);
  }, []);

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shipments.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const searchable = [
        item.shipmentNumber,
        item.transporterCode,
        item.transporterName,
        item.mobile,
        item.vehicleNumber,
        item.fromCompany,
        item.toCompany,
        item.itemName,
        item.pickupLocation,
        item.deliveryLocation,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchable.includes(query);
    });
  }, [shipments, search, statusFilter]);

  function showNotice(message, type = "success") {
    setNotice(message);
    setNoticeType(type);
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function startEdit(item) {
    setEditing(item);
    setForm({
      ...initialForm,
      ...item,
      qty: item.qty == null ? "" : String(item.qty),
      freight: item.freight == null ? "" : String(item.freight),
    });
    setErrors({});
    setSelected(null);
    setNotice("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(initialForm);
    setErrors({});
  }

  function saveEdit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!form.transporterCode.trim()) {
      nextErrors.transporterCode = "Transporter code is required.";
    }

    if (!form.transporterName.trim()) {
      nextErrors.transporterName = "Transporter name is required.";
    }

    if (!form.contactPerson.trim()) {
      nextErrors.contactPerson = "Contact person is required.";
    }

    if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.vehicleNumber.trim()) {
      nextErrors.vehicleNumber = "Vehicle number is required.";
    }

    if (!form.fromCompany) {
      nextErrors.fromCompany = "Select the source company.";
    }

    if (!form.toCompany) {
      nextErrors.toCompany = "Select the destination company.";
    }

    if (
      form.fromCompany &&
      form.toCompany &&
      form.fromCompany === form.toCompany
    ) {
      nextErrors.toCompany = "Companies must be different.";
    }

    if (!form.pickupLocation.trim()) {
      nextErrors.pickupLocation = "Pickup location is required.";
    }

    if (!form.deliveryLocation.trim()) {
      nextErrors.deliveryLocation = "Delivery location is required.";
    }

    if (!form.itemName.trim()) {
      nextErrors.itemName = "Item name is required.";
    }

    if (form.qty === "" || !Number.isFinite(Number(form.qty)) || Number(form.qty) <= 0) {
      nextErrors.qty = "Quantity must be greater than zero.";
    }

    if (form.freight === "" || !Number.isFinite(Number(form.freight)) || Number(form.freight) < 0) {
      nextErrors.freight = "Enter a valid freight amount.";
    }

    if (
      form.dispatchDate &&
      form.expectedDelivery &&
      form.expectedDelivery < form.dispatchDate
    ) {
      nextErrors.expectedDelivery = "Delivery cannot be before dispatch.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showNotice("Please correct the highlighted fields.", "error");
      return;
    }

    try {
      const updated = shipments.map((item) =>
        item.id === editing.id
          ? {
              ...item,
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
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setShipments(updated);
      setEditing(null);
      setForm(initialForm);
      setErrors({});
      showNotice("Shipment updated successfully!");
    } catch {
      showNotice("Unable to update shipment. Please try again.", "error");
    }
  }

  function deleteShipment(id) {
    if (!window.confirm("Are you sure you want to delete this shipment?")) {
      return;
    }

    try {
      const updated = shipments.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setShipments(updated);

      if (selected?.id === id) setSelected(null);
      if (editing?.id === id) cancelEdit();

      showNotice("Shipment deleted successfully.");
    } catch {
      showNotice("Unable to delete shipment.", "error");
    }
  }

  function printShipment(item) {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      showNotice("Please allow pop-ups to print shipment details.", "error");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]);

    const rows = [
      ["Shipment Number", item.shipmentNumber],
      ["Transporter Code", item.transporterCode],
      ["Transporter Name", item.transporterName],
      ["Contact Person", item.contactPerson],
      ["Mobile Number", item.mobile],
      ["Email", item.email],
      ["Vehicle Type", item.vehicleType],
      ["Vehicle Number", item.vehicleNumber],
      ["From Company", item.fromCompany],
      ["To Company", item.toCompany],
      ["Pickup Location", item.pickupLocation],
      ["Delivery Location", item.deliveryLocation],
      ["Item / Chemical", item.itemName],
      ["Quantity", `${item.qty ?? ""} ${item.qtyUnit ?? ""}`],
      ["Freight", `₹${Number(item.freight || 0).toLocaleString("en-IN")}`],
      ["Payment Terms", item.paymentTerms],
      ["Dispatch Date", item.dispatchDate],
      ["Expected Delivery", item.expectedDelivery],
      ["Status", item.status],
      ["Remarks", item.remarks],
    ];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipment ${escapeHtml(item.shipmentNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #0f172a; }
            h1 { margin-bottom: 5px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            td:first-child { width: 35%; font-weight: bold; background: #f8fafc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>SUDHA CHEMICALS</h1>
          <p>Transporter & Shipment Details</p>
          <table>
            ${rows.map(([label, value]) =>
              `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value || "—")}</td></tr>`
            ).join("")}
          </table>
          <script>window.onload = () => window.print();<\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  const pendingCount = shipments.filter((item) => item.status === "Pending").length;
  const transitCount = shipments.filter((item) => item.status === "In Transit").length;
  const deliveredCount = shipments.filter((item) => item.status === "Delivered").length;

  function field(name, label, options = {}) {
    return (
      <div>
        <label className={labelClass} htmlFor={`edit-${name}`}>
          {label}{options.required && <span className="text-red-500"> *</span>}
        </label>

        {options.options ? (
          <select
            id={`edit-${name}`}
            name={name}
            value={form[name] ?? ""}
            onChange={updateField}
            className={inputClass}
          >
            <option value="">Select {label}</option>
            {options.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : name === "remarks" ? (
          <textarea
            id={`edit-${name}`}
            name={name}
            rows={3}
            value={form[name] ?? ""}
            onChange={updateField}
            className={inputClass}
          />
        ) : (
          <input
            id={`edit-${name}`}
            name={name}
            type={options.type || "text"}
            min={options.type === "number" ? "0" : undefined}
            step={options.type === "number" ? "any" : undefined}
            value={form[name] ?? ""}
            onChange={updateField}
            className={inputClass}
          />
        )}

        {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-black tracking-wide">SUDHA CHEMICALS</p>
            <p className="mt-1 text-sm text-slate-400">Transporter & Shipment Records</p>
          </div>
          <Link href="/transporters" className="rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-violet-700">
            + New Shipment
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-700">Logistics Dashboard</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">View Shipments</h1>
          <p className="mt-3 text-sm text-slate-500">Find transporters, follow shipment routes and review delivery status.</p>
        </div>

        {notice && (
          <div role={noticeType === "error" ? "alert" : "status"} className={`mb-5 flex items-center justify-between rounded-xl border bg-white p-4 text-sm font-semibold ${noticeType === "error" ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-800"}`}>
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Close notification" className="ml-4 text-xl">×</button>
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Shipments", value: shipments.length },
            { label: "Pending", value: pendingCount },
            { label: "In Transit", value: transitCount },
            { label: "Delivered", value: deliveredCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">All Shipment Records</h2>
              <p className="mt-1 text-sm text-slate-500">{filteredShipments.length} record(s) found</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transporter, company, item..." className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500">
                <option value="All">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  {["Shipment", "Transporter", "Vehicle", "From Company", "To Company", "Item / Qty", "Freight", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-4 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!isReady ? (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-500">Loading records...</td></tr>
                ) : filteredShipments.length === 0 ? (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-500">No shipments found. Create a shipment from the new entry page.</td></tr>
                ) : filteredShipments.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-violet-700">{item.shipmentNumber}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{item.transporterName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.transporterCode}</p>
                    </td>
                    <td className="px-4 py-4">{item.vehicleNumber}</td>
                    <td className="px-4 py-4">{item.fromCompany}</td>
                    <td className="px-4 py-4">{item.toCompany}</td>
                    <td className="px-4 py-4">
                      <p>{item.itemName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.qty} {item.qtyUnit}</p>
                    </td>
                    <td className="px-4 py-4">₹{Number(item.freight || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">{item.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setSelected(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-100">View</button>
                        <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50">Edit</button>
                        <button type="button" onClick={() => printShipment(item)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Print</button>
                        <button type="button" onClick={() => deleteShipment(item.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={cancelEdit}>
            <form onSubmit={saveEdit} noValidate className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Update shipment</p>
                  <h2 className="mt-1 text-2xl font-black">Edit {editing.shipmentNumber}</h2>
                </div>
                <button type="button" onClick={cancelEdit} className="rounded-xl bg-slate-100 px-3 py-2 text-xl" aria-label="Close edit form">×</button>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {field("transporterCode", "Transporter Code", { required: true })}
                {field("transporterName", "Transporter Name", { required: true })}
                {field("contactPerson", "Contact Person", { required: true })}
                {field("mobile", "Mobile Number", { required: true, type: "tel" })}
                {field("email", "Email ID", { type: "email" })}
                {field("vehicleType", "Vehicle Type", { options: ["Truck", "Tanker", "Trailer", "Mini Truck", "Container"] })}
                {field("vehicleNumber", "Vehicle Number", { required: true })}
                {field("fromCompany", "From Company", { required: true, options: companies })}
                {field("toCompany", "To Company", { required: true, options: companies })}
                {field("pickupLocation", "Pickup Location", { required: true })}
                {field("deliveryLocation", "Delivery Location", { required: true })}
                {field("itemName", "Item / Chemical", { required: true })}
                {field("qty", "Quantity", { required: true, type: "number" })}
                {field("qtyUnit", "Quantity Unit", { options: ["L", "KG", "MT", "BAG"] })}
                {field("freight", "Freight Amount (₹)", { required: true, type: "number" })}
                {field("paymentTerms", "Payment Terms", { options: ["Advance", "To Pay", "Credit"] })}
                {field("dispatchDate", "Dispatch Date", { type: "date" })}
                {field("expectedDelivery", "Expected Delivery", { type: "date" })}
                {field("status", "Shipment Status", { options: statuses })}
                {field("remarks", "Remarks")}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:justify-end">
                <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" className="rounded-xl bg-violet-700 px-7 py-3 text-sm font-bold text-white hover:bg-violet-800">Save Changes</button>
              </div>
            </form>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setSelected(null)}>
            <div role="dialog" aria-modal="true" aria-labelledby="shipment-modal-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Shipment Details</p>
                  <h2 id="shipment-modal-title" className="mt-2 text-2xl font-black">{selected.shipmentNumber}</h2>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-lg" aria-label="Close details">×</button>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {[
                  ["Transporter Code", selected.transporterCode],
                  ["Transporter Name", selected.transporterName],
                  ["Contact Person", selected.contactPerson],
                  ["Mobile", selected.mobile],
                  ["Email", selected.email],
                  ["Vehicle Type", selected.vehicleType],
                  ["Vehicle Number", selected.vehicleNumber],
                  ["From Company", selected.fromCompany],
                  ["To Company", selected.toCompany],
                  ["Pickup Location", selected.pickupLocation],
                  ["Delivery Location", selected.deliveryLocation],
                  ["Item / Chemical", selected.itemName],
                  ["Quantity", `${selected.qty ?? ""} ${selected.qtyUnit ?? ""}`],
                  ["Freight", `₹${Number(selected.freight || 0).toLocaleString("en-IN")}`],
                  ["Payment Terms", selected.paymentTerms],
                  ["Dispatch Date", selected.dispatchDate],
                  ["Expected Delivery", selected.expectedDelivery],
                  ["Status", selected.status],
                  ["Remarks", selected.remarks],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || "—"}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-6">
                <button type="button" onClick={() => startEdit(selected)} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800">Edit Shipment</button>
                <button type="button" onClick={() => printShipment(selected)} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Print Details</button>
                <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold hover:bg-slate-50">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
