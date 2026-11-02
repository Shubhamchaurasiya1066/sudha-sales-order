"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

const STORAGE_KEY = "sudha_customers";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const initialForm = {
  customerName: "",
  customerType: "Manufacturer",
  storeContact: "",
  purchaseContact: "",
  accountsContact: "",
  factoryAddress: "",
  officeAddress: "",
  contactPerson: "",
  contactNumber: "",
  alternateNumber: "",
  emailId: "",
  state: "",
  city: "",
  month: MONTHS[new Date().getMonth()],
  items: [{ itemName: "", qty: "", unit: "KG" }],
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

function SearchableSelect({ options, value, onChange, placeholder = "Search..." }) {
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
        className={inputClass + " cursor-pointer flex justify-between items-center bg-white"}
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
              placeholder="Search item..."
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [search, setSearch] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setCustomers(Array.isArray(saved) ? saved : []);
    } catch {
      setCustomers([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: value,
      ...(name === "customerType" && value === "Trader" 
          ? { 
              factoryAddress: "", 
              // ✅ Trader select karne par teeno contacts clear ho jayenge
              storeContact: "",
              purchaseContact: "",
              accountsContact: "",
              items: prev.items.map(it => ({ ...it, qty: "" })) 
            } 
          : {})
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function handleItemChange(index, field, value) {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
    setErrors((prev) => {
       const newErrs = { ...prev };
       delete newErrs[`items[${index}].${field}`];
       return newErrs;
    });
  }

  function addItemRow() {
    setForm({ ...form, items: [...form.items, { itemName: "", qty: "", unit: "KG" }] });
  }

  function removeItemRow(index) {
    if (form.items.length === 1) return;
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  }

  function validate() {
    const next = {};
    if (!form.customerName.trim()) next.customerName = "Customer Name is required.";
    if (!form.officeAddress.trim()) next.officeAddress = "Office Address is required.";
    
    if (form.customerType === "Manufacturer" && !form.factoryAddress.trim()) {
      next.factoryAddress = "Factory Address is required for Manufacturer.";
    }
    
    if (!form.contactPerson.trim()) next.contactPerson = "Contact Person is required.";
    if (!/^[0-9]{10}$/.test(form.contactNumber.trim())) next.contactNumber = "Enter a valid 10-digit number.";
    
    if (form.alternateNumber && !/^[0-9]{10}$/.test(form.alternateNumber.trim())) {
      next.alternateNumber = "Enter a valid 10-digit number.";
    }

    // Teeno department numbers ki validation (sirf Manufacturer ke liye)
    if (form.customerType === "Manufacturer") {
      if (form.storeContact && !/^[0-9]{10}$/.test(form.storeContact.trim())) {
        next.storeContact = "Enter a valid 10-digit number.";
      }
      if (form.purchaseContact && !/^[0-9]{10}$/.test(form.purchaseContact.trim())) {
        next.purchaseContact = "Enter a valid 10-digit number.";
      }
      if (form.accountsContact && !/^[0-9]{10}$/.test(form.accountsContact.trim())) {
        next.accountsContact = "Enter a valid 10-digit number.";
      }
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailId.trim())) {
      next.emailId = "Enter a valid email address.";
    }
    
    if (!form.state.trim()) next.state = "State is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.month) next.month = "Month is required.";

    let itemErrors = false;
    form.items.forEach((item, idx) => {
      if (!item.itemName) {
        next[`items[${idx}].itemName`] = "Item required";
        itemErrors = true;
      }
      if (form.customerType === "Manufacturer" && (!item.qty || Number(item.qty) <= 0)) {
        next[`items[${idx}].qty`] = "Qty required";
        itemErrors = true;
      }
    });
    if (itemErrors) next.items = "Please fill all item details correctly.";

    return next;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      let updated;
      const finalItems = form.items.map(item => ({
        ...item,
        qty: form.customerType === "Manufacturer" ? item.qty : ""
      }));

      if (editingId) {
        updated = customers.map((c) => 
          c.id === editingId ? { ...c, ...form, items: finalItems, updatedAt: new Date().toISOString() } : c
        );
        setNotice("Customer updated successfully!");
      } else {
        const newCustomer = {
          ...form,
          items: finalItems,
          id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString(),
        };
        updated = [newCustomer, ...customers];
        setNotice("Customer added successfully!");
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomers(updated);
      closeForm();
    } catch {
      setErrors({ form: "Unable to save data. Please check browser storage." });
    }
  }

  function openForm(customer = null) {
    if (customer) {
      setForm({
        ...customer,
        items: customer.items || [{ itemName: "", qty: "", unit: "KG" }]
      });
      setEditingId(customer.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setErrors({});
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setErrors({});
  }

  function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      const updated = customers.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCustomers(updated);
      setNotice("Customer deleted.");
    } catch {
      setNotice("Failed to delete.");
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    
    const hasItemMatch = c.items?.some((item) => 
      item.itemName.toLowerCase().includes(q)
    );

    const hasMonthMatch = c.month?.toLowerCase().includes(q);
    
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q) ||
      c.contactNumber.includes(q) ||
      hasItemMatch || 
      hasMonthMatch
    );
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl font-black">S</div>
            <div>
              <p className="text-lg font-bold tracking-wide">SUDHA CHEMICALS</p>
              <p className="text-xs text-slate-400">Customer Master & Requirements</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/inventory" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-slate-900">Inventory</Link>
            <button onClick={() => openForm()} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
              + Add Customer
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {notice && (
          <div className="fixed right-4 top-4 z-[100] rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-2xl">
            {notice}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-black tracking-tight">Customer Directory</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search name, city, month, or item..."
            className={inputClass + " max-w-lg"}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          {!isReady ? (
            <div className="p-12 text-center text-slate-500">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-bold text-slate-800">No customers found</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search term or add a new customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Customer Name</th>
                    <th className="px-5 py-4 font-bold">Contact / City</th>
                    <th className="px-5 py-4 font-bold">Department Contacts</th>
                    <th className="px-5 py-4 font-bold">Monthly Requirement</th>
                    <th className="px-5 py-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">{c.customerName}</p>
                        <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.customerType === 'Manufacturer' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                          {c.customerType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700 font-semibold">{c.contactPerson}</p>
                        <p className="text-xs text-slate-500">{c.contactNumber}</p>
                        <p className="text-xs text-slate-400 mt-1">{c.city}, {c.state}</p>
                      </td>
                      
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          {c.storeContact && (
                            <div className="flex justify-between gap-4 border-b border-slate-100 pb-1">
                              <span className="font-semibold text-slate-600">Store:</span>
                              <span className="font-bold text-slate-800">{c.storeContact}</span>
                            </div>
                          )}
                          {c.purchaseContact && (
                            <div className="flex justify-between gap-4 border-b border-slate-100 pb-1">
                              <span className="font-semibold text-slate-600">Purchase:</span>
                              <span className="font-bold text-slate-800">{c.purchaseContact}</span>
                            </div>
                          )}
                          {c.accountsContact && (
                            <div className="flex justify-between gap-4">
                              <span className="font-semibold text-slate-600">Accounts:</span>
                              <span className="font-bold text-slate-800">{c.accountsContact}</span>
                            </div>
                          )}
                          {!c.storeContact && !c.purchaseContact && !c.accountsContact && (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="rounded-lg bg-amber-50 border border-amber-100 p-2">
                          <p className="text-xs font-bold text-amber-800 border-b border-amber-200 pb-1 mb-1">
                            {c.month || "Current"} Requirements
                          </p>
                          <ul className="list-disc pl-4 text-xs text-amber-900 space-y-0.5">
                            {c.items?.map((item, i) => (
                              <li key={i}>
                                {item.itemName} 
                                {item.qty && c.customerType === "Manufacturer" && (
                                  <> - <strong>{item.qty} {item.unit}</strong></>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openForm(c)} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Edit</button>
                          <button onClick={() => handleDelete(c.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Delete</button>
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

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <h2 className="text-xl font-black">{editingId ? "Edit Customer Details" : "Add New Customer"}</h2>
              <button onClick={closeForm} className="rounded-xl px-3 py-2 text-xl text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-emerald-700">1. Basic Details</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Customer Name <span className="text-red-500">*</span></label>
                  <input name="customerName" value={form.customerName} onChange={updateField} className={inputClass} placeholder="e.g. SHRIRAM ALKALI" />
                  {errors.customerName && <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>}
                </div>

                <div>
                  <label className={labelClass}>Trader / Manufacturer <span className="text-red-500">*</span></label>
                  <select name="customerType" value={form.customerType} onChange={updateField} className={inputClass}>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Trader">Trader</option>
                  </select>
                </div>

                {/* ✅ DEPARTMENT SECTION: SIRF MANUFACTURER KE LIYE DIKHEGA */}
                {form.customerType !== "Trader" && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Department Contact Numbers (Optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>Store Contact No.</label>
                        <input name="storeContact" type="tel" maxLength={10} value={form.storeContact} onChange={updateField} className={inputClass} placeholder="10-digit" />
                        {errors.storeContact && <p className="text-xs text-red-600 mt-1">{errors.storeContact}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Purchase Contact No.</label>
                        <input name="purchaseContact" type="tel" maxLength={10} value={form.purchaseContact} onChange={updateField} className={inputClass} placeholder="10-digit" />
                        {errors.purchaseContact && <p className="text-xs text-red-600 mt-1">{errors.purchaseContact}</p>}
                      </div>
                      <div>
                        <label className={labelClass}>Accounts Contact No.</label>
                        <input name="accountsContact" type="tel" maxLength={10} value={form.accountsContact} onChange={updateField} className={inputClass} placeholder="10-digit" />
                        {errors.accountsContact && <p className="text-xs text-red-600 mt-1">{errors.accountsContact}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Contact Person <span className="text-red-500">*</span></label>
                  <input name="contactPerson" value={form.contactPerson} onChange={updateField} className={inputClass} placeholder="e.g. Ramesh Kumar" />
                  {errors.contactPerson && <p className="text-xs text-red-600 mt-1">{errors.contactPerson}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Contact No. <span className="text-red-500">*</span></label>
                    <input name="contactNumber" type="tel" maxLength={10} value={form.contactNumber} onChange={updateField} className={inputClass} placeholder="10-digit" />
                    {errors.contactNumber && <p className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Alt. Number</label>
                    <input name="alternateNumber" type="tel" maxLength={10} value={form.alternateNumber} onChange={updateField} className={inputClass} placeholder="10-digit" />
                    {errors.alternateNumber && <p className="text-xs text-red-600 mt-1">{errors.alternateNumber}</p>}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Email ID <span className="text-red-500">*</span></label>
                  <input name="emailId" type="email" value={form.emailId} onChange={updateField} className={inputClass} placeholder="e.g. contact@company.com" />
                  {errors.emailId && <p className="text-xs text-red-600 mt-1">{errors.emailId}</p>}
                </div>
              </div>

              <h3 className="mb-4 mt-8 text-sm font-bold uppercase tracking-wider text-emerald-700 border-t border-slate-100 pt-6">2. Address Details</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>State <span className="text-red-500">*</span></label>
                  <input name="state" value={form.state} onChange={updateField} className={inputClass} placeholder="e.g. Madhya Pradesh" />
                  {errors.state && <p className="text-xs text-red-600 mt-1">{errors.state}</p>}
                </div>
                <div>
                  <label className={labelClass}>City <span className="text-red-500">*</span></label>
                  <input name="city" value={form.city} onChange={updateField} className={inputClass} placeholder="e.g. Gwalior" />
                  {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
                </div>

                {form.customerType === "Manufacturer" && (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Factory Address <span className="text-red-500">*</span></label>
                    <textarea name="factoryAddress" value={form.factoryAddress} onChange={updateField} rows={2} className={inputClass} placeholder="Enter factory address..." />
                    {errors.factoryAddress && <p className="text-xs text-red-600 mt-1">{errors.factoryAddress}</p>}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className={labelClass}>Office Address <span className="text-red-500">*</span></label>
                  <textarea name="officeAddress" value={form.officeAddress} onChange={updateField} rows={2} className={inputClass} placeholder="Enter office address..." />
                  {errors.officeAddress && <p className="text-xs text-red-600 mt-1">{errors.officeAddress}</p>}
                </div>
              </div>

              <div className="mb-4 mt-8 flex flex-col justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">3. Monthly Items & Requirements</h3>
                  <p className="text-xs text-slate-500 mt-1">Add all the products this customer will buy this month.</p>
                </div>
                <div className="w-full sm:w-48">
                  <label className={labelClass}>Month <span className="text-red-500">*</span></label>
                  <select name="month" value={form.month} onChange={updateField} className={inputClass}>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {errors.items && <p className="mb-3 text-sm font-bold text-red-600 bg-red-50 p-2 rounded">{errors.items}</p>}

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    
                    <div className={form.customerType === "Trader" ? "w-[450px]" : "w-full sm:w-[750px]"}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Item / Material</label>
                      <SearchableSelect 
                        options={ITEM_OPTIONS}
                        value={item.itemName}
                        onChange={(val) => handleItemChange(index, 'itemName', val)}
                        placeholder="Search item..."
                      />
                      {errors[`items[${index}].itemName`] && <p className="text-[10px] text-red-600 mt-1">{errors[`items[${index}].itemName`]}</p>}
                    </div>

                    {form.customerType === "Manufacturer" && (
                      <div className="w-full sm:w-[320px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Qty</label>
                        <div className="flex gap-1">
                          <input 
                            type="number" 
                            value={item.qty} 
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)} 
                            className={inputClass + " bg-white text-right"} 
                            placeholder="0" 
                          />
                          <select 
                            value={item.unit} 
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)} 
                            className={inputClass + " bg-white w-24 px-2 text-sm"}
                          >
                            <option value="KG">KG</option>
                            <option value="MT">MT</option>
                            <option value="L">L</option>
                            <option value="BAG">BAG</option>
                          </select>
                        </div>
                        {errors[`items[${index}].qty`] && <p className="text-[10px] text-red-600 mt-1">{errors[`items[${index}].qty`]}</p>}
                      </div>
                    )}

                    <div className="pt-5">
                      <button 
                        type="button" 
                        onClick={() => removeItemRow(index)} 
                        disabled={form.items.length === 1}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                onClick={addItemRow} 
                className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 w-full"
              >
                + Add Another Item
              </button>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                  {editingId ? "Save Changes" : "Add Customer"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}