"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, Save, Pencil, Trash2, Printer, Plus, Search } from "lucide-react";

const KEY = "sudha_delivery_orders_v1";
const DEFAULTS_KEY = "sudha_do_consignee_defaults_v1";
const chemicals = ["Nitric Acid", "Caustic Soda Lye", "Sulphuric Acid (98%)", "Hydrochloric Acid (30-33%)", "Hydrogen Peroxide (50%)", "Hydrogen Peroxide (60%)", "Phosphoric Acid", "Acetic Acid", "Weak Nitric Acid (60%)", "Methylene Dichloride (MDC)", "Poly Aluminium Chloride (PAC)", "Chloroform", "Soda Ash", "Ethyl Acetate", "Caustic Soda Flakes", "Citric Acid", "Oleum (23%)"];
const initial = {
  referenceNo: "", date: new Date().toISOString().slice(0, 10),
  itemName: "Nitric Acid", tankerNo: "GJ12CT0624", tankerCapacity: "40.00 MT",
  driverName: "VAHID ALI", driverMobile: "7318241057", dispatchMode: "By Road",
  transporterName: "Shree Shiv Transport", transporterCode: "",
  consigneeName: "Sudha Chemical Company", consigneeAddress: "Sukh-Swaroop Sadan, Danaoli, Lashkar, Gwalior, Madhya Pradesh", consigneeCode: "", consigneeGST: "23AEMFS7085R1Z0",
  closingName: "", signatureDate: "",
};
const fields = [
  ["referenceNo", "Reference No."], ["date", "Date", "date"],
  ["itemName", "Chemical / Product", "select"], ["tankerNo", "Tanker No."],
  ["tankerCapacity", "Tanker Capacity"], ["driverName", "Driver Name"],
  ["driverMobile", "Driver Mobile"], ["dispatchMode", "Mode of Dispatch"],
  ["transporterName", "Transporter Name"], ["transporterCode", "Transporter Code (optional)"],
  ["consigneeName", "Consignee Name"], ["consigneeAddress", "Consignee Address", "textarea"],
  ["consigneeCode", "Consignee Code (optional)"], ["consigneeGST", "GST No."],
  ["closingName", "Signatory Name (optional)"],
];
function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}
function nextReference(orders) {
  const now = new Date();
  const y = now.getFullYear();
  const fy = now.getMonth() >= 3 ? y : y - 1;
  const fyCode = `${String(fy).slice(-2)}${String(fy + 1).slice(-2)}`;
  const prefix = `CCFL/SC/${fyCode}-`;
  const nums = orders.map((o) => o.referenceNo?.startsWith(prefix) ? Number(o.referenceNo.slice(prefix.length)) : 0).filter(Number.isFinite);
  return `${prefix}${Math.max(0, ...nums) + 1}`;
}
function safeFileName(s) { return String(s || "delivery-order").replace(/[^a-zA-Z0-9_-]+/g, "_"); }

export default function DeliveryOrderPage() {
  const pdfRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      const saved = Array.isArray(parsed) ? parsed : [];
      setOrders(saved);
      const defaults = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || "{}");
      setForm({ ...initial, consigneeAddress: defaults.consigneeAddress || initial.consigneeAddress, consigneeGST: defaults.consigneeGST || "23AEMFS7085R1Z0", referenceNo: nextReference(saved) });
    } catch {
      setOrders([]);
      setForm({ ...initial, referenceNo: nextReference([]) });
    }
    setReady(true);
  }, []);

  const change = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const persist = (next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setOrders(next);
      return true;
    } catch {
      setMessage("Storage full or unavailable. Order could not be saved.");
      return false;
    }
  };
  const reset = (list = orders) => {
    setEditingId(null);
    let defaults = {};
    try { defaults = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || "{}"); } catch { }
    setForm({ ...initial, consigneeAddress: defaults.consigneeAddress || initial.consigneeAddress, consigneeGST: defaults.consigneeGST || "23AEMFS7085R1Z0", date: new Date().toISOString().slice(0, 10), referenceNo: nextReference(list) });
  };
  const save = () => {
    if (!form.referenceNo.trim() || !form.itemName.trim() || !form.tankerNo.trim()) {
      setMessage("Reference number, product and tanker number are required.");
      return;
    }
    if (orders.some((o) => o.referenceNo.trim().toLowerCase() === form.referenceNo.trim().toLowerCase() && o.id !== editingId)) {
      setMessage("This reference number already exists. Please enter a unique reference.");
      return;
    }
    const id = editingId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    const record = { ...form, id, updatedAt: new Date().toISOString() };
    const next = editingId ? orders.map((o) => o.id === editingId ? record : o) : [record, ...orders];
    if (persist(next)) {
      try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ consigneeAddress: form.consigneeAddress, consigneeGST: form.consigneeGST })); } catch { }
      reset(next);
      setMessage(editingId ? "Delivery order updated." : "Delivery order saved.");
    }
  };
  const edit = (o) => {
    setForm({ ...initial, ...o });
    setEditingId(o.id);
    setMessage("Editing selected delivery order.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (o) => {
    if (!window.confirm(`Delete delivery order ${o.referenceNo}?`)) return;
    const next = orders.filter((x) => x.id !== o.id);
    if (persist(next)) {
      if (editingId === o.id) reset(next);
      setMessage("Delivery order deleted.");
    }
  };
  const download = async () => {
    if (!pdfRef.current || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await document.fonts.ready;
      const images = Array.from(pdfRef.current.querySelectorAll("img"));
      await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.addEventListener("load", resolve, { once: true }); img.addEventListener("error", resolve, { once: true }); })));
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 1200 });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * w) / canvas.width;
      if (imgH > h + 0.5) {
        setMessage("Preview exceeds one A4 page. Shorten the entered text before downloading.");
        return;
      }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, imgH);
      pdf.save(`Delivery_Order_${safeFileName(form.referenceNo)}.pdf`);
    } catch (err) {
      console.error(err);
      setMessage("PDF generation failed. Check the logo/signature images and try again.");
    } finally { setBusy(false); }
  };
  const print = () => window.print();
  const filtered = orders.filter((o) => [o.referenceNo, o.itemName, o.tankerNo, o.driverName, o.transporterName, o.consigneeGST].some((v) => String(v || "").toLowerCase().includes(search.toLowerCase())));

  return (
    <main className="do-app">
      <style jsx global>{`
        .do-app{min-height:100vh;background:#edf1f5;color:#172334;padding:28px 16px;font-family:Arial,Helvetica,sans-serif}
        .do-container{max-width:1180px;margin:0 auto}
        .do-panel{background:#fff;border:1px solid #dce3eb;border-radius:14px;padding:24px;margin-bottom:22px;box-shadow:0 6px 24px #1a2b4010}
        .do-heading{font-size:25px;font-weight:800;margin:0 0 8px}.do-sub{color:#617083;margin:0 0 22px;font-size:14px}
        .do-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
        .do-field label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#334155}
        .do-field input,.do-field select,.do-field textarea{display:block;width:100%;border:1px solid #cbd5e1;border-radius:7px;padding:10px 11px;background:white;color:#172334;font-size:14px;box-sizing:border-box}
        .do-field textarea{min-height:75px;resize:vertical}.do-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
        .do-btn{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:8px;padding:11px 16px;font-size:14px;font-weight:700;cursor:pointer;background:#e5eaf0;color:#172334}
        .do-btn.primary{background:#0f766e;color:white}.do-btn.blue{background:#1d4ed8;color:white}.do-btn:disabled{opacity:.55;cursor:wait}
        .do-note{margin:15px 0 0;color:#0f766e;font-size:14px}.do-preview-wrap{overflow-x:auto;padding:12px 0 20px}
        .do-paper{width:210mm;min-height:297mm;box-sizing:border-box;padding:15mm 16mm;background:#fff;color:#111;margin:0 auto;box-shadow:0 6px 28px #0002;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5}
        .do-letterhead{display:flex;justify-content:space-between;align-items:center;gap:20px}.do-logo{width:40%;height:auto;object-fit:contain}
        .do-address{text-align:right;font-size:11px;line-height:1.45}.do-address strong{font-size:14px}
        .do-rule{border:0;border-top:2px solid #222;margin:10px 0 24px}
        .do-ref{display:flex;justify-content:space-between;margin-bottom:28px;font-weight:700}
        .do-to{margin-bottom:22px;white-space:pre-line}.do-subject{margin:20px 0;font-weight:700;}
        .do-paragraph{margin:16px 0;text-align:justify}.do-detail{display:grid;grid-template-columns:190px 1fr;gap:7px 12px;margin:22px 0}
        .do-detail .value{font-weight:700;overflow-wrap:anywhere}.do-sign{margin-top:55px}.do-sign-image{width:150px;height:65px;object-fit:contain;object-position:left center}
        .do-table{width:100%;border-collapse:collapse}.do-table th,.do-table td{padding:11px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13px}
        .do-small{font-size:12px;color:#64748b}.do-iconbtn{border:0;background:#eaf0f6;padding:8px;border-radius:7px;cursor:pointer;margin-right:6px}
        @media(max-width:700px){.do-grid{grid-template-columns:1fr}.do-panel{padding:16px}.do-heading{font-size:21px}.do-app{padding:14px 8px}.do-preview-wrap .do-paper{margin-left:0}}
        @media print{body{background:white!important}.do-app{padding:0;background:white}.do-no-print{display:none!important}.do-container{max-width:none}.do-preview-wrap{padding:0;overflow:visible}.do-paper{box-shadow:none;margin:0;width:210mm;min-height:297mm;page-break-after:avoid}@page{size:A4;margin:0}}
      `}</style>
      <div className="do-container">
        <section className="do-panel do-no-print">
          <h1 className="do-heading">Sudha Chemical Company — Delivery Order</h1>
          <p className="do-sub">Create, preview, save, edit and download delivery orders in one page.</p>
          <div className="do-grid">
            {fields.map(([name, label, type]) => (
              <div className="do-field" key={name}>
                <label htmlFor={`do-${name}`}>{label}</label>
                {type === "select" ? <select id={`do-${name}`} name={name} value={form[name]} onChange={change}>{chemicals.map((x) => <option key={x}>{x}</option>)}</select>
                  : type === "textarea" ? <textarea id={`do-${name}`} name={name} value={form[name]} onChange={change} />
                    : <input id={`do-${name}`} type={type === "date" ? "date" : "text"} name={name} value={form[name]} onChange={change} />}
              </div>
            ))}
          </div>
          <div className="do-actions">
            <button className="do-btn primary" onClick={save}><Save size={17} />{editingId ? "Update Order" : "Save Order"}</button>
            <button className="do-btn" onClick={() => { reset(); setMessage(""); }}><Plus size={17} />New Order</button>
            <button className="do-btn blue" onClick={download} disabled={busy}><Download size={17} />{busy ? "Generating PDF..." : "Download PDF"}</button>
            <button className="do-btn" onClick={print}><Printer size={17} />Print</button>
          </div>
          {message && <p role="status" className="do-note">{message}</p>}
        </section>

        <section className="do-no-print">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Live A4 Preview</h2>
        </section>
        <div className="do-preview-wrap">
          <article className="do-paper" ref={pdfRef}>
            <header className="do-letterhead">
              <Image className="do-logo" src="/Sudha Chemical Company Logo.png" alt="Sudha Chemical Company Logo" width={310} height={125} priority unoptimized />
              <div className="do-address">
                <strong>SUDHA CHEMICAL COMPANY</strong><div>Sukh-Swaroop Sadan, Danaoli</div>
                <div>Lashkar, Gwalior - 474 001 (M.P.)</div><div>Phone: 0751-4926338, 4041862</div>
                <div>E-mail: sudhachemical@rediffmail.com</div>
              </div>
            </header>
            <hr className="do-rule" />
            <div className="do-ref"><span>Ref: {form.referenceNo}</span><span>Date: {formatDate(form.date)}</span></div>
            <div className="do-to">To,<br />Mr Suman kumar Singh<br />Marketing Manager<br />Chambal Fertilizers and Chemical Ltd<br />Distt. Kota - 325208</div>
            <div className="do-subject">Sub: Delivery Order of Lifting of {form.itemName}</div>
            <p className="do-paragraph">Dear Sir,</p>
            <p className="do-paragraph">Kindly arrange to deliver the Nitric Acid as per following details:</p>
            <div className="do-detail">
              {[
                ["Tanker No.", form.tankerNo], ["Tanker Capacity", form.tankerCapacity],
                ["Name of Driver", form.driverName], ["Driver Mobile Number", form.driverMobile],
                ["Mode of Dispatch", form.dispatchMode], ["Name of Transporter", form.transporterName],
                ["Transporter Code", form.transporterCode], ["Consignee Name", form.consigneeName],
                ["Consignee Address", form.consigneeAddress], ["Consignee Code", form.consigneeCode],
                ["GST No.", form.consigneeGST],
              ].map(([label, value]) => <div key={label} style={{ display: "contents" }}><div>{label}</div><div className="value">: {value || ""}</div></div>)}
            </div>
            {/* ===== COMPANY STAMP & SIGNATURE ===== */}
            <div
              style={{
                marginTop: 35,
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "flex-start",
              }}
            >
              <Image
                src="/sudha-stamp.png"
                alt="Sudha Chemical Company Authorized Stamp and Signature"
                width={330}
                height={180}
                unoptimized
                style={{
                  width: "330px",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
          </article>
        </div>

        <section className="do-panel do-no-print" style={{ marginTop: 20 }}>
          <h2 className="do-heading" style={{ fontSize: 20 }}>Saved Delivery Orders ({orders.length})</h2>
          <div className="do-field" style={{ maxWidth: 420, margin: "14px 0" }}><label htmlFor="do-search"><Search size={14} style={{ display: "inline" }} /> Search orders</label><input id="do-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Reference, product, tanker or driver" /></div>
          <div style={{ overflowX: "auto" }}>
            <table className="do-table"><thead><tr><th>Reference</th><th>Date</th><th>Product</th><th>Tanker</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map((o) => <tr key={o.id}><td>{o.referenceNo}</td><td>{formatDate(o.date)}</td><td>{o.itemName}</td><td>{o.tankerNo}</td><td style={{ whiteSpace: "nowrap" }}><button className="do-iconbtn" title="Edit" aria-label={`Edit ${o.referenceNo}`} onClick={() => edit(o)}><Pencil size={16} /></button><button className="do-iconbtn" title="Delete" aria-label={`Delete ${o.referenceNo}`} onClick={() => remove(o)}><Trash2 size={16} /></button></td></tr>)}
                {ready && filtered.length === 0 && <tr><td colSpan={5} className="do-small">No saved delivery orders found.</td></tr>}
              </tbody></table>
          </div>
          <p className="do-small" style={{ marginTop: 15 }}>Saved locally in this browser only. For shared company use, connect a secure backend and database.</p>
        </section>
      </div>
    </main>
  );
}
