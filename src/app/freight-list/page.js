"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function FreightListPage() {
  // --- STATES ---
  const [freights, setFreights] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null); // Edit track karne ke liye state
  
  const [form, setForm] = useState({
    fromPlace: "",
    toPlace: "",
    ratePerTon: "",
    transporterName: "",
    itemName: "",
    contactNumber: "",       
    alternateNumber: "",     
  });

  // Page load hone par LocalStorage se data uthana
  useEffect(() => {
    const saved = localStorage.getItem("freightData");
    if (saved) {
      try {
        setFreights(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing data", e);
      }
    }
  }, []);

  // Form change handle karna
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Data Add ya Update karna
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fromPlace || !form.toPlace || !form.ratePerTon || !form.transporterName || !form.itemName) {
      alert("Kripya sabhi zaroori fields bharein.");
      return;
    }

    if (editingId) {
      // --- UPDATE LOGIC ---
      const updated = freights.map((item) =>
        item.id === editingId ? { ...item, ...form } : item
      );
      setFreights(updated);
      localStorage.setItem("freightData", JSON.stringify(updated));
      setEditingId(null); // Edit mode band karo
    } else {
      // --- ADD NEW LOGIC ---
      const newFreight = {
        id: Date.now().toString(),
        ...form,
      };
      const updated = [newFreight, ...freights];
      setFreights(updated);
      localStorage.setItem("freightData", JSON.stringify(updated));
    }

    // Form Reset
    resetForm();
  };

  // Edit button click karne par form me data dalna
  const handleEdit = (item) => {
    setForm({
      fromPlace: item.fromPlace,
      toPlace: item.toPlace,
      ratePerTon: item.ratePerTon,
      transporterName: item.transporterName,
      itemName: item.itemName,
      contactNumber: item.contactNumber || "",
      alternateNumber: item.alternateNumber || "",
    });
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Form tak scroll karo
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  // Form Reset function
  const resetForm = () => {
    setForm({ 
      fromPlace: "", 
      toPlace: "", 
      ratePerTon: "", 
      transporterName: "", 
      itemName: "",
      contactNumber: "",
      alternateNumber: ""
    });
  };

  // Data delete karna
  const handleDelete = (id) => {
    if (confirm("Kya aap sach me ye entry delete karna chahte hain?")) {
      const updated = freights.filter((item) => item.id !== id);
      setFreights(updated);
      localStorage.setItem("freightData", JSON.stringify(updated));
      
      // Agar delete hua item hi edit ho raha tha, to form reset kar do
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
    }
  };

  // Search filter logic
  const filteredFreights = freights.filter((item) => {
    const query = searchQuery.toLowerCase();
    const placeCombined = `${item.fromPlace} - ${item.toPlace}`.toLowerCase();
    
    const contact = (item.contactNumber || "").toLowerCase();
    const altContact = (item.alternateNumber || "").toLowerCase();

    return (
      placeCombined.includes(query) ||
      item.transporterName.toLowerCase().includes(query) ||
      item.itemName.toLowerCase().includes(query) ||
      contact.includes(query) ||
      altContact.includes(query)
    );
  });

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* HEADER */}
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black">S</div>
            <div>
              <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
              <p className="text-xs text-slate-400">Freight List</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Home</Link>
            <Link href="/delivery-order" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Delivery Order</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Freight Management</h1>
          <p className="text-slate-500 mt-2">Naya freight add karein, edit karein aur search karein.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* ✅ FORM SECTION */}
          <section className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 h-fit">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-black">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                {editingId ? "✏️" : "➕"}
              </span>
              {editingId ? "Edit Freight" : "Add Freight"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Place (From - To)</label>
                <div className="flex items-center gap-2">
                  <input
                    name="fromPlace"
                    value={form.fromPlace}
                    onChange={handleChange}
                    placeholder="From (e.g. Gwalior)"
                    className={inputClass}
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    name="toPlace"
                    value={form.toPlace}
                    onChange={handleChange}
                    placeholder="To (e.g. Jhagadia)"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Rate per Ton (₹)</label>
                <input
                  name="ratePerTon"
                  type="number"
                  value={form.ratePerTon}
                  onChange={handleChange}
                  placeholder="e.g. 2500"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Transporter Name</label>
                <input
                  name="transporterName"
                  value={form.transporterName}
                  onChange={handleChange}
                  placeholder="e.g. VINI industries"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Item Name</label>
                <input
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                  placeholder="e.g. CAUSTIC SODA FLAKES"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Contact Number</label>
                <input
                  name="contactNumber"
                  type="tel"
                  value={form.contactNumber}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Alternate Number</label>
                <input
                  name="alternateNumber"
                  type="tel"
                  value={form.alternateNumber}
                  onChange={handleChange}
                  placeholder="e.g. 9123456789"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  {editingId ? "Update Freight" : "Save Freight"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-1/3 rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* ✅ LIST & SEARCH SECTION */}
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">📋</span>
                Freight List ({filteredFreights.length})
              </h2>
              
              {/* SEARCH BAR */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search by Place, Transporter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Place (From - To)</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Rate / Ton</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Transporter</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Item Name</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Contact No.</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Alt. Number</th>
                    <th className="px-4 py-3 font-bold text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFreights.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        Koi data nahi mila.
                      </td>
                    </tr>
                  ) : (
                    filteredFreights.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.fromPlace} <span className="text-slate-400">→</span> {item.toPlace}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">₹{item.ratePerTon}</td>
                        <td className="px-4 py-3">{item.transporterName}</td>
                        <td className="px-4 py-3">{item.itemName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.contactNumber || "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.alternateNumber || "-"}</td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}