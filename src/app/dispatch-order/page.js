"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_dispatch_orders";

const ITEM_OPTIONS = [
  "Sulphuric Acid (98%)",
  "Hydrochloric Acid (30-33%)",
  "Nitric Acid",
  "Phosphoric Acid",
  "Acetic Acid",
  "Caustic Soda Lye",
  "Soda Ash",
  "Caustic Soda Flakes",
  "Citric Acid",
  "Oleum(23%)",
];

const GODOWN_LOCATIONS = ["Main Godown", "Factory Godown", "Warehouse A", "Warehouse B"];
const GST_OPTIONS = ["0", "5", "12", "18", "28"];

// ✅ Searchable Dropdown Component
function SearchableSelect({ options, value, onChange, placeholder = "Search item..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="w-full cursor-pointer flex justify-between items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm("");
        }}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-xl">
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No items found</li>
            ) : (
              filteredOptions.map((opt) => (
                <li
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  godownLocation: GODOWN_LOCATIONS[0],
  customerName: "",
  place: "",
  itemName: "",
  rate: "",
  gst: "18",
  qty: "",
  qtyUnit: "KG",
  transportName: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function DispatchOrderPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [orders, setOrders] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setOrders(Array.isArray(saved) ? saved : []);
    } catch {
      setOrders([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const next = {};
    if (!form.date) next.date = "Date is required.";
    if (!form.customerName.trim()) next.customerName = "Customer Name is required.";
    if (!form.place.trim()) next.place = "Place is required.";
    if (!form.itemName) next.itemName = "Item is required.";
    if (!form.rate || Number(form.rate) <= 0) next.rate = "Enter a valid rate.";
    if (!form.qty || Number(form.qty) <= 0) next.qty = "Enter a valid quantity.";
    if (!form.transportName.trim()) next.transportName = "Transport Name is required.";
    return next;
  }

  // ✅ Save Order to LocalStorage
  function saveOrder() {
    const baseAmount = Number(form.qty) * Number(form.rate);
    const gstAmount = (baseAmount * Number(form.gst)) / 100;
    const totalAmount = baseAmount + gstAmount;

    const newOrder = {
      ...form,
      id: Date.now().toString(),
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    const updated = [newOrder, ...orders];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setOrders(updated);
    
    setForm(initialForm);
    setErrors({});
  }

  // ✅ FIXED PDF DOWNLOAD LOGIC (Using Iframe)
  async function generatePDF(orderData) {
    setIsDownloading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const baseAmount = Number(orderData.qty) * Number(orderData.rate);
      const gstAmount = (baseAmount * Number(orderData.gst)) / 100;
      const totalAmount = baseAmount + gstAmount;

      // PDF HTML String
      const htmlContent = `
        <div style="font-family: 'Times New Roman', Times, serif; padding: 15mm; color: #000; background: #fff; width: 210mm; box-sizing: border-box;">
          <div style="text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px; color: #0f766e; text-transform: uppercase;">SUDHA CHEMICALS</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">Dispatch Order / Delivery Challan</p>
          </div>
          
          <div style="text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; text-decoration: underline;">DISPATCH ORDER</div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div style="width: 48%;">
              <div style="display: flex; margin-bottom: 8px;"><div style="font-weight: bold; width: 120px;">Customer Name:</div><div style="flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px;">${escapeHtml(orderData.customerName)}</div></div>
              <div style="display: flex; margin-bottom: 8px;"><div style="font-weight: bold; width: 120px;">Place:</div><div style="flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px;">${escapeHtml(orderData.place)}</div></div>
              <div style="display: flex; margin-bottom: 8px;"><div style="font-weight: bold; width: 120px;">Godown:</div><div style="flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px;">${escapeHtml(orderData.godownLocation)}</div></div>
            </div>
            <div style="width: 48%;">
              <div style="display: flex; margin-bottom: 8px;"><div style="font-weight: bold; width: 120px;">Date:</div><div style="flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px;">${formatDate(orderData.date)}</div></div>
              <div style="display: flex; margin-bottom: 8px;"><div style="font-weight: bold; width: 120px;">Transport:</div><div style="flex: 1; border-bottom: 1px dotted #ccc; padding-left: 5px;">${escapeHtml(orderData.transportName)}</div></div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: center; width: 5%;">S.No.</th>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: left; width: 35%;">Item Description</th>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: center; width: 15%;">Qty</th>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: right; width: 15%;">Rate (₹)</th>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: center; width: 10%;">GST (%)</th>
                <th style="border: 1px solid #000; padding: 8px; background: #f1f5f9; text-align: right; width: 20%;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">1</td>
                <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(orderData.itemName)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${escapeHtml(orderData.qty)} ${escapeHtml(orderData.qtyUnit)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${Number(orderData.rate).toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${escapeHtml(orderData.gst)}%</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${baseAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end;">
            <table style="width: 50%; border: none;">
              <tr>
                <td style="padding: 5px 8px; font-weight: bold; text-align: right;">Base Amount:</td>
                <td style="padding: 5px 8px; text-align: right;">₹ ${baseAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 8px; font-weight: bold; text-align: right;">GST (${orderData.gst}%):</td>
                <td style="padding: 5px 8px; text-align: right;">₹ ${gstAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; text-align: right; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 16px;">Grand Total:</td>
                <td style="padding: 8px; text-align: right; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 16px; font-weight: bold;">₹ ${totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 60px;">
            <div style="text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">Receiver's Signature</div>
            <div style="text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">Authorized Signatory</div>
          </div>
        </div>
      `;

      // ✅ IFRAME TRICK: Create temporary iframe to ensure browser renders the HTML fully before capturing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '210mm';
      iframe.style.height = '297mm';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait a moment for images/fonts (if any) to load
      await new Promise(resolve => setTimeout(resolve, 300));

      const opt = {
        margin: 0,
        filename: `Dispatch_Order_${orderData.customerName}_${orderData.date}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate PDF from the iframe's body
      await html2pdf().set(opt).from(iframeDoc.body).save();

      // Cleanup
      document.body.removeChild(iframe);

      return true;

    } catch (err) {
      console.error("PDF error:", err);
      alert("Error generating PDF. Please try again.");
      return false;
    } finally {
      setIsDownloading(false);
    }
  }

  // ✅ Form Submit Handler
  async function handleSubmit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // 1. Pehle PDF Generate karo
    const success = await generatePDF(form);
    
    // 2. Agar PDF ban gayi, to Save karo
    if (success) {
      saveOrder();
    }
  }

  // ✅ Download from History
  async function handleDownloadFromHistory(orderData) {
    await generatePDF(orderData);
  }

  function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this dispatch record?")) return;
    const updated = orders.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setOrders(updated);
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black">S</div>
            <div>
              <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
              <p className="text-xs text-slate-400">Dispatch Management</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/inventory" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Inventory</Link>
            <Link href="/sales-orders" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Sales Orders</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">Create Dispatch Order</h1>
          <p className="mt-2 text-sm text-slate-500">Fill the details, download the PDF, and it will automatically save to your records.</p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 mb-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                <input name="date" type="date" value={form.date} onChange={updateField} className={inputClass} />
                {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className={labelClass}>Godown Location <span className="text-red-500">*</span></label>
                <select name="godownLocation" value={form.godownLocation} onChange={updateField} className={inputClass}>
                  {GODOWN_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Customer Name <span className="text-red-500">*</span></label>
                <input name="customerName" value={form.customerName} onChange={updateField} className={inputClass} placeholder="e.g. SHRIRAM ALKALI" />
                {errors.customerName && <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>}
              </div>
              <div>
                <label className={labelClass}>Place <span className="text-red-500">*</span></label>
                <input name="place" value={form.place} onChange={updateField} className={inputClass} placeholder="e.g. Gwalior" />
                {errors.place && <p className="text-xs text-red-600 mt-1">{errors.place}</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Item / Material <span className="text-red-500">*</span></label>
              <SearchableSelect 
                options={ITEM_OPTIONS}
                value={form.itemName}
                onChange={(val) => {
                  setForm(prev => ({ ...prev, itemName: val }));
                  setErrors(prev => ({ ...prev, itemName: "" }));
                }}
                placeholder="Search item..."
              />
              {errors.itemName && <p className="text-xs text-red-600 mt-1">{errors.itemName}</p>}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label>
                <input name="rate" type="number" min="0" step="0.01" value={form.rate} onChange={updateField} className={inputClass} placeholder="e.g. 1500" />
                {errors.rate && <p className="text-xs text-red-600 mt-1">{errors.rate}</p>}
              </div>
              <div>
                <label className={labelClass}>GST (%) <span className="text-red-500">*</span></label>
                <select name="gst" value={form.gst} onChange={updateField} className={inputClass}>
                  {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Qty <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input name="qty" type="number" min="0.001" step="any" value={form.qty} onChange={updateField} className={inputClass} placeholder="e.g. 100" />
                  <select name="qtyUnit" value={form.qtyUnit} onChange={updateField} className={inputClass + " max-w-[90px]"}>
                    <option value="KG">KG</option>
                    <option value="MT">MT</option>
                    <option value="L">L</option>
                    <option value="BAG">BAG</option>
                    <option value="CAN">CAN</option>
                    <option value="CARBO">CARBO</option>
                  </select>
                </div>
                {errors.qty && <p className="text-xs text-red-600 mt-1">{errors.qty}</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Transport Name <span className="text-red-500">*</span></label>
              <input name="transportName" value={form.transportName} onChange={updateField} className={inputClass} placeholder="e.g. VRL Logistics" />
              {errors.transportName && <p className="text-xs text-red-600 mt-1">{errors.transportName}</p>}
            </div>

            {/* Live Calculation Preview */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 mt-6">
              <p className="text-sm font-bold text-slate-700 mb-2">Amount Calculation:</p>
              <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                <span className="text-slate-600">Base Amount:</span>
                <span className="font-semibold">₹ {((Number(form.qty) || 0) * (Number(form.rate) || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                <span className="text-slate-600">GST ({form.gst}%):</span>
                <span className="font-semibold">₹ {(((Number(form.qty) || 0) * (Number(form.rate) || 0) * Number(form.gst)) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-emerald-700 pt-2">
                <span>Grand Total:</span>
                <span>₹ {(((Number(form.qty) || 0) * (Number(form.rate) || 0)) + (((Number(form.qty) || 0) * (Number(form.rate) || 0) * Number(form.gst)) / 100)).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => { setForm(initialForm); setErrors({}); }} 
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
              <button 
                type="submit" 
                disabled={isDownloading}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isDownloading ? "⏳ Generating..." : "📥 Download PDF & Save"}
              </button>
            </div>
          </form>
        </section>

        {/* RECORDS SECTION */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-black text-slate-800">Dispatch Register</h2>
            <p className="text-sm text-slate-500 mt-1">History of all dispatched orders.</p>
          </div>

          {!isReady ? (
            <div className="p-12 text-center text-slate-500">Loading records...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-bold text-slate-800">No dispatches yet</p>
              <p className="text-sm text-slate-500 mt-1">Generate a PDF to see it here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Date</th>
                    <th className="px-5 py-4 font-bold">Customer / Place</th>
                    <th className="px-5 py-4 font-bold">Item</th>
                    <th className="px-5 py-4 font-bold">Qty</th>
                    <th className="px-5 py-4 font-bold">Total Amount</th>
                    <th className="px-5 py-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">{formatDate(o.date)}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{o.customerName}</p>
                        <p className="text-xs text-slate-500">{o.place}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{o.itemName}</td>
                      <td className="px-5 py-4 font-bold text-slate-700">{o.qty} {o.qtyUnit}</td>
                      <td className="px-5 py-4 font-bold text-emerald-700">₹ {Number(o.totalAmount).toFixed(2)}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleDownloadFromHistory(o)}
                            disabled={isDownloading}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            📥 PDF
                          </button>
                          <button 
                            onClick={() => handleDelete(o.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
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
        </section>
      </div>
    </main>
  );
}

function formatDate(iso) {
  if (!iso) return "____/____/________";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}