"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export default function CausticSodaLyePage() {
  const pdfRef = useRef(null);

  const [form, setForm] = useState({
    toAddress: "SHRIRAM ALKALI & CHEMICALS, GIDC JHAGADIA, JHAGADIA", // NAYA FIELD
    itemName: "CAUSTIC SODA LYE",
    date: "10/10/2026",
    qty: "41",
    transportName: "OWN",
    truckNo: "MP13ZY 3399",
    contractNo: "4001057199",
    consignee: "339874 VINI industries",
    signatureDate: "", 
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, '0');
    const tzHours = pad(tzOffset / 60);
    const tzMins = pad(tzOffset % 60);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds} ${diff}${tzHours}'${tzMins}'`;
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;

    const currentDateTime = getCurrentDateTimeString();
    setForm((prev) => ({ ...prev, signatureDate: currentDateTime }));
    await new Promise((resolve) => setTimeout(resolve, 150));

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Delivery_Order_Lye_${form.contractNo}.pdf`);
  };

  return (
    <main style={{ background: "#f0f0f0", minHeight: "100vh", padding: 20 }}>
      {/* ================= FORM ================= */}
      <div style={styles.formBox}>
        <h2 style={{ textAlign: "center", marginTop: 0 }}>
          Item Base – Delivery Order
        </h2>

        {/* NAYA INPUT: TO Address */}
        <label style={styles.label}>TO (Address)</label>
        <input style={styles.input} name="toAddress" value={form.toAddress} onChange={handleChange} />

        <label style={styles.label}>Item Name</label>
        <input style={styles.input} name="itemName" value={form.itemName} onChange={handleChange} />

        <label style={styles.label}>Date (dd/mm/yyyy)</label>
        <input style={styles.input} name="date" value={form.date} onChange={handleChange} />

        <label style={styles.label}>Quantity (MT)</label>
        <input style={styles.input} name="qty" value={form.qty} onChange={handleChange} />

        <label style={styles.label}>Transport Name</label>
        <input style={styles.input} name="transportName" value={form.transportName} onChange={handleChange} />

        <label style={styles.label}>Truck No.</label>
        <input style={styles.input} name="truckNo" value={form.truckNo} onChange={handleChange} />

        <label style={styles.label}>Contract No.</label>
        <input style={styles.input} name="contractNo" value={form.contractNo} onChange={handleChange} />

        <label style={styles.label}>Consignee (Party Code + Name)</label>
        <input style={styles.input} name="consignee" value={form.consignee} onChange={handleChange} />

        <button style={styles.button} onClick={generatePDF}>
          Download PDF
        </button>
      </div>

      {/* ================= PDF LAYOUT ================= */}
      <div ref={pdfRef} style={styles.pdfPage}>
        
        {/* ===== HEADER (LOGO LEFT + ADDRESS RIGHT) ===== */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          
          {/* LOGO (LEFT) */}
          <div style={{ width: "40%" }}>
            <Image src="/Sudha Chemical Company Logo.png" alt="Company Logo" width={300} height={120} style={{ objectFit: "contain", }} priority unoptimized />
          </div>

          {/* ADDRESS (RIGHT) */}
          <div style={{ ...styles.addressBlock, width: "55%" }}>
            <div style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
              SUDHA CHEMICAL COMPANY
            </div>
            <div>Sukh-Swaroop Sadan, Danaoli</div>
            <div>Lashkar, Gwalior - 474 001 (M.P.)</div>
            <div>Phone : 0751-4926338, 4041862</div>
            <div>E-mail : sudhachemical@rediffmail.com</div>
          </div>
        </div>

        <hr style={styles.hr} />

        {/* ===== NAYA "TO" SECTION (Subject ke upar) ===== */}
        <div style={styles.toSection}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>TO,</div>
          <div style={{ textTransform: "uppercase", fontWeight: "bold" }}>
            {form.toAddress}
          </div>
        </div>

        {/* ===== SUBJECT & BODY ===== */}
        <div style={styles.subject}>
          <b>Subject:</b> - Regarding the Delivery order of{" "}
          <span style={styles.underline}>{form.itemName}</span>
        </div>

        <p style={styles.para}><b>Dear Sir,</b></p>

        <p style={styles.para}>
          We are sharing the details of the vehicle which is going to take the
          load of{" "}
          <span style={styles.underline}>{form.itemName}</span> from Jhagdia
          plant. We are informing you that the vehicles are in jhagdia only and
          request you to kindly provide them the Delivery order for the loading
          of the material. The details are as follows: -
        </p>

        {/* FIXED CONSIGNEE NAME */}
        <div style={styles.fixedConsignee}>
          <b>CONSIGNEE NAME:</b> SUDHA CHEMICAL COMPANY
        </div>

        {/* ===== TABLE ===== */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>QTY</th>
              <th style={styles.th}>TRANSPORT NAME</th>
              <th style={styles.th}>TRUCK NO.</th>
              <th style={styles.th}>CONTRACT NO.</th>
              <th style={styles.th}>CONSIGNEE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>{form.date}</td>
              <td style={styles.td}>{form.qty} mt.</td>
              <td style={styles.td}>{form.transportName}</td>
              <td style={styles.td}>{form.truckNo}</td>
              <td style={styles.td}>{form.contractNo}</td>
              <td style={styles.td}>{form.consignee}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== SIGNATURE (IMAGE + TEXT + CURRENT DATE) ===== */}
        <div style={styles.signatureBlock}>
          
          {/* Sign Image */}
          <Image
            src="/signature.png" 
            alt="Digital Signature"
            width={200}
            height={90}
            style={{ objectFit: "contain", marginBottom: 0 }}
            unoptimized
          />

          {/* Current Date & Time (Wapas Original Format Me) */}
          <div style={{ fontSize: 12, color: "#333", marginTop: 5, fontWeight: "bold" }}>
            Date: {form.signatureDate || "Generating..."}
          </div>
          
          {/* Authorized Signatory */}
          <div style={styles.signatureLine}>Authorized Signatory</div>

          {/* Divider Line */}
          <hr style={{ width: "250px", border: "none", borderTop: "1px dashed #999", margin: "10px 0" }} />
          
          {/* Thank You Text (Attractive) */}
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#222" }}>
            <span style={{ fontWeight: "bold", fontSize: 14 }}>Thank You,</span><br />
            With Regards<br />
            <span style={{ fontWeight: "bold", color: "#0f766e" }}>Neha Pandey</span><br />
            <span style={{ fontSize: 12, color: "#555" }}>Sudha Chemical Company<br />
            Gwalior</span>
          </div>
          
        </div>
      </div>
    </main>
  );
}

/* ================= STYLES ================= */
const styles = {
  formBox: {
    maxWidth: 700,
    margin: "0 auto 20px auto",
    background: "#fff",
    padding: "20px 25px",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  label: {
    display: "block",
    marginTop: 12,
    fontWeight: "bold",
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: 8,
    marginTop: 4,
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: 14,
  },
  button: {
    marginTop: 18,
    width: "100%",
    padding: 12,
    background: "#1a5fb4",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 16,
    cursor: "pointer",
  },
  pdfPage: {
    width: "210mm",
    minHeight: "297mm",
    background: "#fff",
    margin: "0 auto",
    padding: "15mm 16mm",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 14,
    color: "#000",
    position: "relative",
  },
  addressBlock: {
    textAlign: "right",
    lineHeight: "1.4",
    color: "#444",
  },
  hr: {
    border: "none",
    borderTop: "2px solid #000",
    margin: "8px 0 18px 0",
  },
  /* NAYA STYLE: TO Section */
  toSection: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 1.5,
  },
  subject: {
    marginBottom: 18,
    fontSize: 15,
  },
  para: {
    lineHeight: 1.7,
    margin: "10px 0",
    textAlign: "justify",
  },
  underline: {
    textDecoration: "underline",
    fontWeight: "bold",
  },
  fixedConsignee: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 5,
    fontSize: 12,
  },
  th: {
    border: "1px solid #000",
    padding: "8px 6px",
    background: "#f2f2f2",
    fontWeight: "bold",
    textAlign: "left",
  },
  td: {
    border: "1px solid #000",
    padding: "8px 6px",
    textAlign: "left",
  },
  
  /* ===== SIGNATURE STYLES ===== */
  signatureBlock: {
    marginTop: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    paddingLeft: 20, 
  },
  signatureLine: {
    fontWeight: "bold",
    fontSize: 13,
    marginTop: -5,
    paddingTop: 12,
  },
};