"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  contractNumber: "",
  vehicleNumber: "",
  materialCode: "",
  bagWeight: "50",
  totalBags: "",
  quantity: "",
  quantityUnit: "MT",
};

const HARDCODED_DATA = {
  deliverToCompany: "SHRIRAM ALKALI & CHEMICALS",
  deliverToAddress: "GIDC JHAGADIA, JHAGADIA",
  driverMobile: "",
  customerName: "SUDHA CORE CHEM",
  soldToPartyCode: "365253",
  transporter: "SELF",
};

export default function DeliveryOrderPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef(null);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const next = {};
    if (!form.date) next.date = "Date is required.";
    if (!form.contractNumber.trim()) next.contractNumber = "Contract Number is required.";
    if (!form.vehicleNumber.trim()) next.vehicleNumber = "Vehicle Number is required.";
    if (!form.materialCode.trim()) next.materialCode = "Material Code is required.";
    if (!form.quantity || Number(form.quantity) <= 0) next.quantity = "Quantity is required.";
    if (!form.totalBags || Number(form.totalBags) <= 0) next.totalBags = "Total Bags is required.";
    return next;
  }

  // ✅ 1. PDF DOWNLOAD LOGIC
  async function handleDownloadPDF() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const element = printRef.current;
    if (!element) return;

    setIsDownloading(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const opt = {
        margin: 0,
        filename: `DO_${form.contractNumber || form.date}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          scrollY: 0,
          windowWidth: 794,
          windowHeight: 1123,
          letterRendering: true, 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };

      const clone = element.cloneNode(true);
      clone.style.transform = "none"; 
      clone.style.width = "210mm";
      clone.style.minHeight = "297mm";
      
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.appendChild(clone);
      document.body.appendChild(container);

      await html2pdf().set(opt).from(clone).save();
      
      document.body.removeChild(container);

    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF generate karne me error aayi. Kripya Print button use karein.");
    } finally {
      setIsDownloading(false);
    }
  }

  // ✅ 2. PRINT LOGIC
  function handleSubmit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTimeout(() => handlePrint(), 100);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      alert("Please allow pop-ups to print the delivery order.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Delivery Order ${form.contractNumber || ""}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body {
              font-family: "Times New Roman", Times, serif;
              color: #000;
              background: #fff;
              padding: 0;
              margin: 0;
              font-size: 14px;
              line-height: 1.6;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #fff;
              position: relative;
              display: flex;
              flex-direction: column;
            }
            
            /* LEFT TEAL STRIP */
            .left-strip {
              position: absolute;
              left: 0; top: 0;
              width: 8mm;
              height: 100%;
              background-color: #3ba59e;
              z-index: 1;
            }
            .left-inner-strip {
              position: absolute;
              left: 8mm; top: 0;
              width: 1px;
              height: 100%;
              background-color: #cbd5e1;
              z-index: 1;
            }

            /* MAIN CONTENT WRAPPER */
            .main-wrapper {
              margin-left: 8mm;
              padding: 15mm 15mm 0 15mm;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              z-index: 2;
              position: relative;
            }

            /* HEADER */
            .header {
              display: flex;
              align-items: center;
              border: 1px solid #0d9488;
              padding: 8px 12px;
              margin-bottom: 30px;
              position: relative;
            }
            .header-logo {
              height: 50px;
              object-fit: contain;
            }
            .header-title-box {
              flex-grow: 1;
              text-align: center;
              display: flex;
              justify-content: center;
              padding-right: 50px;
            }
            .header-title-inner {
              border: 1px solid #64748b;
              padding: 5px 25px;
              font-size: 22px;
              font-weight: bold;
              color: #0f766e;
            }

            /* CONTENT BODY */
            .content { flex-grow: 1; }
            .date-line { margin: 0 0 20px 0; font-size: 14px; font-weight: bold; }
            h1.title { text-align: center; font-size: 20px; font-weight: bold; margin: 0 0 40px 0; letter-spacing: 1px; text-transform: uppercase; }
            .to-block { margin: 0 0 30px 0; font-size: 14px; line-height: 1.8; text-transform: uppercase; }
            .dear-block { margin: 0 0 30px 0; font-size: 14px; line-height: 1.7; text-transform: uppercase; }
            .info-line { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; }
            .info-line strong { font-weight: bold; }
            .inline-group { display: flex; justify-content: space-between; margin-bottom: 10px; text-transform: uppercase; font-size: 14px; }
            .inline-group div { flex: 1; }
            .material-wrapper { display: flex; justify-content: space-between; margin-bottom: 10px; text-transform: uppercase; font-size: 14px; }
            
            /* SIGNATURE AREA */
            .signature-area { display: flex; justify-content: flex-end; margin-top: 20px; margin-bottom: 30px; }
            .signature-box { text-align: center; font-size: 14px; }
            .signature-image { font-family: "Brush Script MT", "Comic Sans MS", cursive; font-size: 24px; color: #1e3a8a; margin-bottom: 5px; transform: rotate(-5deg); }
            
            /* FOOTER */
            .footer {
              margin-top: auto;
              background: #3ba59e;
              color: #000;
              padding: 12px 20px;
              font-size: 13px;
              font-weight: bold;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-transform: capitalize;
              letter-spacing: normal;
              font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { width: 100%; min-height: 100vh; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="left-strip"></div>
            <div class="left-inner-strip"></div>

            <div class="main-wrapper">
              <!-- HEADER -->
              <div class="header">
                <img src="/logo.png" alt="Logo" class="header-logo" />
                <div class="header-title-box">
                  <div class="header-title-inner">Sudha Core Chemical Pvt. Ltd.</div>
                </div>
              </div>

              <!-- CONTENT -->
              <div class="content">
                <p class="date-line">Date - ${escapeHtml(formatDate(form.date))}</p>
                <h1 class="title">DELIVERY ORDER</h1>

                <div class="to-block">
                  TO,<br/>
                  ${escapeHtml(HARDCODED_DATA.deliverToCompany)}<br/>
                  ${escapeHtml(HARDCODED_DATA.deliverToAddress)}
                </div>

                <div class="dear-block">
                  DEAR SIR,<br/>
                  REQUEST YOU TO DELIVER THE MATERIAL AS PER THE BELOW DETAILS :
                </div>

                <div class="inline-group">
                  <div><strong>CONTRACT NUMBER:</strong> ${escapeHtml(form.contractNumber)}</div>
                  ${form.quantity ? `<div><strong>QUANTITY:</strong> ${escapeHtml(form.quantity)} mt.</div>` : ""}
                </div>

                ${form.vehicleNumber ? `
                <div class="inline-group">
                  <div><strong>VEHICLE NUMBER:</strong> ${escapeHtml(form.vehicleNumber)}</div>
                </div>
                ` : ""}

                <div class="inline-group">
                  <div><strong>DRIVER MOBILE NUMBER:</strong> ${escapeHtml(HARDCODED_DATA.driverMobile)}</div>
                </div>

                <div class="inline-group">
                  <div><strong>CUSTOME NAME:</strong> ${escapeHtml(HARDCODED_DATA.customerName)}</div>
                </div>

                <div class="inline-group">
                  <div><strong>SOLD TO PARTY CODE:</strong> ${escapeHtml(HARDCODED_DATA.soldToPartyCode)}</div>
                </div>

                <div class="info-line">
                  <strong>TRANSPORTER :</strong> ${escapeHtml(HARDCODED_DATA.transporter)}
                </div>

                <div class="material-wrapper">
                  <div><strong>MATERIAL CODE:</strong> ${escapeHtml(form.materialCode)}</div>
                  <div>(${escapeHtml(form.bagWeight)} kg. each bag ${escapeHtml(form.totalBags)} bag)</div>
                </div>

                <div class="signature-area">
                   <div class="signature-box">
                      <div class="signature-image">Paras Jain</div>
                      <div style="font-size: 10px; color: #64748b;">Digitally signed by Paras Jain</div>
                      <div style="font-size: 10px; color: #64748b;">Date: ${formatDate(form.date)}</div>
                   </div>
                </div>

                <div class="info-line" style="margin-top: 20px;">
                  <strong>QUANTITY REQUESTED : <span style="text-decoration: underline;">${escapeHtml(form.quantity)}${escapeHtml(form.quantityUnit)}</span>.</strong>
                </div>
              </div>

              <!-- FOOTER -->
              <div class="footer">
                <div style="margin-bottom: 6px;">✉️Email: sudhacorechemical@gmail.com</div>
                <div style="margin-bottom: 6px;">📞Phone: 9109140922</div>
                <div>🏢Address: Di Dana Oli, Nai Sadak, Gwalior</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black">S</div>
            <div>
              <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
              <p className="text-xs text-slate-400">Delivery Order Generator</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/inventory" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Inventory</Link>
            <Link href="/sales-orders" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Sales Orders</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Delivery Documents</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Create Delivery Order</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ✅ FORM */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6 h-fit">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">📝</span>
              Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="date">Date <span className="text-red-500">*</span></label>
                  <input id="date" name="date" type="date" value={form.date} onChange={updateField} className={inputClass} />
                  {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="contractNumber">Contract Number <span className="text-red-500">*</span></label>
                  <input id="contractNumber" name="contractNumber" value={form.contractNumber} onChange={updateField} placeholder="e.g. 4001057032" className={inputClass} />
                  {errors.contractNumber && <p className="mt-1 text-xs text-red-600">{errors.contractNumber}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="vehicleNumber">Vehicle Number <span className="text-red-500">*</span></label>
                  <input id="vehicleNumber" name="vehicleNumber" value={form.vehicleNumber} onChange={updateField} placeholder="e.g. GJ16AY 4688" className={inputClass} />
                  {errors.vehicleNumber && <p className="mt-1 text-xs text-red-600">{errors.vehicleNumber}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="materialCode">Material Code <span className="text-red-500">*</span></label>
                  <input id="materialCode" name="materialCode" value={form.materialCode} onChange={updateField} placeholder="e.g. CAUSTIC SODA FLAKES" className={inputClass} />
                  {errors.materialCode && <p className="mt-1 text-xs text-red-600">{errors.materialCode}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="quantity">Quantity <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input id="quantity" name="quantity" type="number" min="0.001" step="any" value={form.quantity} onChange={updateField} placeholder="e.g. 35" className={inputClass} />
                    <select name="quantityUnit" value={form.quantityUnit} onChange={updateField} className={inputClass + " max-w-24"}>
                      <option value="MT">MT</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                      <option value="BAG">BAG</option>
                    </select>
                  </div>
                  {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
                </div>

                <div>
                  <label className={labelClass} htmlFor="totalBags">Total Bags <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-bold text-slate-500 whitespace-nowrap">50 kg. each bag</span>
                    <input id="totalBags" name="totalBags" type="number" min="1" step="any" value={form.totalBags} onChange={updateField} placeholder="e.g. 700" className={inputClass} />
                    <span className="text-sm font-bold text-slate-500">bag</span>
                  </div>
                  {errors.totalBags && <p className="mt-1 text-xs text-red-600">{errors.totalBags}</p>}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                <button type="button" onClick={() => { setForm(initialForm); setErrors({}); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Reset</button>
                <button type="button" onClick={handlePrint} className="rounded-xl border border-slate-800 bg-white text-slate-800 px-5 py-3 text-sm font-bold hover:bg-slate-50">🖨 Print</button>
                <button 
                  type="button" 
                  onClick={handleDownloadPDF} 
                  disabled={isDownloading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isDownloading ? "⏳ Downloading..." : "📥 Download PDF"}
                </button>
              </div>
            </form>
          </section>

          {/* ✅ LIVE PREVIEW */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">👁</span>
                Live Preview
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden" style={{ height: "800px", overflowY: "auto" }}>
              <div style={{ transform: "scale(0.65)", transformOrigin: "top left", width: "154%", height: "154%" }}>
                <div
                  ref={printRef}
                  style={{
                    fontFamily: '"Times New Roman", Times, serif', color: "#000", background: "#fff",
                    width: "210mm", minHeight: "297mm", margin: "0 auto", position: "relative",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* LEFT STRIPS */}
                  <div style={{ position: "absolute", left: 0, top: 0, width: "8mm", height: "100%", backgroundColor: "#3ba59e", zIndex: 1 }}></div>
                  <div style={{ position: "absolute", left: "8mm", top: 0, width: "1px", height: "100%", backgroundColor: "#cbd5e1", zIndex: 1 }}></div>

                  <div style={{ marginLeft: "8mm", padding: "15mm 15mm 0 15mm", flexGrow: 1, display: "flex", flexDirection: "column", zIndex: 2, position: "relative" }}>
                    
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #0d9488", padding: "8px 12px", marginBottom: "30px", position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="Logo" style={{ height: "50px", objectFit: "contain" }} />
                      <div style={{ flexGrow: 1, textAlign: "center", display: "flex", justifyContent: "center", paddingRight: "50px" }}>
                        <div style={{ border: "1px solid #64748b", padding: "5px 25px", fontSize: "22px", fontWeight: "bold", color: "#0f766e" }}>
                          Sudha Core Chemical Pvt. Ltd.
                        </div>
                      </div>
                    </div>

                    <div style={{ flexGrow: 1 }}>
                      <p style={{ margin: "0 0 20px 0", fontSize: "14px", fontWeight: "bold" }}>Date - {formatDate(form.date)}</p>
                      <h1 style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold", margin: "0 0 40px 0", letterSpacing: "1px", textTransform: "uppercase" }}>DELIVERY ORDER</h1>
                      
                      <div style={{ margin: "0 0 30px 0", fontSize: "14px", lineHeight: 1.8, textTransform: "uppercase" }}>
                        TO,<br />{HARDCODED_DATA.deliverToCompany}<br />{HARDCODED_DATA.deliverToAddress}
                      </div>
                      
                      <div style={{ margin: "0 0 30px 0", fontSize: "14px", lineHeight: 1.7, textTransform: "uppercase" }}>
                        DEAR SIR,<br />REQUEST YOU TO DELIVER THE MATERIAL AS PER THE BELOW DETAILS :
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                        <div><strong>CONTRACT NUMBER:</strong> {form.contractNumber || "____"}</div>
                        {form.quantity && <div><strong>QUANTITY:</strong> {form.quantity} mt.</div>}
                      </div>

                      {form.vehicleNumber && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                          <div><strong>VEHICLE NUMBER:</strong> {form.vehicleNumber}</div>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                        <div><strong>DRIVER MOBILE NUMBER:</strong> {HARDCODED_DATA.driverMobile}</div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                        <div><strong>CUSTOME NAME:</strong> {HARDCODED_DATA.customerName}</div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                        <div><strong>SOLD TO PARTY CODE:</strong> {HARDCODED_DATA.soldToPartyCode}</div>
                      </div>

                      <div style={{ margin: "0 0 10px 0", fontSize: "14px", textTransform: "uppercase" }}>
                        <strong>TRANSPORTER :</strong> {HARDCODED_DATA.transporter}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", textTransform: "uppercase", fontSize: "14px" }}>
                        <div><strong>MATERIAL CODE:</strong> {form.materialCode || "____"}</div>
                        <div>({form.bagWeight || "50"} kg. each bag {form.totalBags || "____"} bag)</div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", marginBottom: "30px" }}>
                        <div style={{ textAlign: "center", fontSize: "14px" }}>
                            <div style={{ fontFamily: '"Brush Script MT", "Comic Sans MS", cursive', fontSize: "24px", color: "#1e3a8a", marginBottom: "5px", transform: "rotate(-5deg)" }}>Paras Jain</div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>Digitally signed by Paras Jain</div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>Date: {formatDate(form.date)}</div>
                        </div>
                      </div>

                      <div style={{ margin: "20px 0 0 0", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase" }}>
                        <strong>QUANTITY REQUESTED : <span style={{ textDecoration: "underline", fontWeight: "bold" }}>{form.quantity || "____"}{form.quantityUnit || "MT"}</span>.</strong>
                      </div>
                    </div>

                    {/* FOOTER - Emoji + No Space Fix */}
                    <div style={{ marginTop: "auto", background: "#3ba59e", color: "#000", padding: "12px 20px", fontSize: "13px", fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textTransform: "capitalize", letterSpacing: "normal", fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial, sans-serif' }}>
                      <div style={{ marginBottom: "6px" }}>✉️Email: sudhacorechemical@gmail.com</div>
                      <div style={{ marginBottom: "6px" }}>📞Phone: 9109140922</div>
                      <div>🏢Address: Di Dana Oli, Nai Sadak, Gwalior</div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function formatDate(iso) {
  if (!iso) return "____/____/________";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}