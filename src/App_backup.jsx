import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";
const blank = { name:"", category:"Grocery", sku:"", stock:"", unit:"units", expiry:"", demand:"", cost:"" };

function riskOf(p) {
  const days = Math.ceil((new Date(p.expiry + "T00:00:00").getTime() - new Date().setHours(0,0,0,0)) / 86400000);
  const leftover = Math.max(0, Number(p.stock) - Number(p.demand || 0) * Math.max(0, days)) / Math.max(1, Number(p.stock));
  if (days <= 2 || leftover >= .55) return "High";
  if (days <= 5 || leftover >= .3) return "Medium";
  return "Low";
}

export default function App() {
  const [items,setItems] = useState([]);
  const [page,setPage] = useState("Dashboard");
  const [form,setForm] = useState(blank);
  const [show,setShow] = useState(false);
  const [editId,setEditId] = useState(null);
  const [search,setSearch] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [loading,setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/products`);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setItems(await r.json());
    } catch(e) {
      setError("Cannot connect to backend. Start FastAPI at http://127.0.0.1:8000.");
      console.error(e);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(s) { setNotice(s); window.setTimeout(() => setNotice(""),2800); }

  async function save(e) {
    e.preventDefault();
    const body = {...form, stock:Number(form.stock), demand:Number(form.demand||0), cost:Number(form.cost||0)};
    try {
      const r = await fetch(`${API}/products${editId ? `/${editId}` : ""}`, {
        method:editId ? "PUT" : "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Could not save product");
      await load(); setForm(blank); setEditId(null); setShow(false); flash("Product saved to database.");
    } catch(e) { flash(e.message); }
  }
  async function remove(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      const r = await fetch(`${API}/products/${id}`,{method:"DELETE"});
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Delete failed");
      await load(); flash("Product deleted.");
    } catch(e) { flash(e.message); }
  }
  function edit(p) {
    setForm({name:p.name,category:p.category,sku:p.sku,stock:String(p.stock),unit:p.unit,expiry:p.expiry,demand:String(p.demand??0),cost:String(p.cost??0)});
    setEditId(p.id); setShow(true); setPage("Inventory");
  }
  function csv() {
    const cols=["name","category","sku","stock","unit","expiry","demand","cost"];
    const data=[cols.join(","),...items.map(p=>cols.map(k=>JSON.stringify(p[k]??"")).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([data],{type:"text/csv"}));
    const a=document.createElement("a"); a.href=url; a.download="freshstock-inventory.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const filtered=useMemo(()=>items.filter(p=>`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())),[items,search]);
  const units=items.reduce((n,p)=>n+Number(p.stock||0),0);
  const high=items.filter(p=>riskOf(p)==="High").length;
  const low=items.filter(p=>Number(p.stock)<30).length;
  const nav=["Dashboard","Inventory","Waste Risk","Reports"];

  return <div className="layout">
    <aside className="sidebar">
      <div className="brand"><span>✦</span><div><b>FreshStock <i>AI</i></b><small>SMART INVENTORY</small></div></div>
      <div className="store">🌱 &nbsp; FreshMart Demo Store</div><p className="nav-caption">WORKSPACE</p>
      {nav.map(n=><button key={n} onClick={()=>setPage(n)} className={`nav ${page===n?"selected":""}`}>{({Dashboard:"▦",Inventory:"▣","Waste Risk":"⚠",Reports:"▤"})[n]} &nbsp; {n}</button>)}
      <div className="side-foot">Inventory management<br/><b>FreshStock AI prototype</b></div>
    </aside>
    <main className="main">
      <header className="topbar">Workspace / <b>{page}</b><span>{new Date().toLocaleDateString("en-IN")}</span></header>
      <div className="heading"><div><small>FRESHSTOCK AI</small><h1>{page==="Dashboard"?"Inventory dashboard":page}</h1><p>Manage and monitor your grocery and medical inventory.</p></div><button className="btn light" onClick={csv}>↓ Export CSV</button></div>
      {error && <div className="error">{error} <button onClick={load}>Retry</button></div>}
      {page==="Dashboard" && <>
        <div className="stats">{[["Total products",items.length],["Units in stock",units],["High waste risk",high],["Low stock items",low]].map(([k,v])=><div className="stat" key={k}><span>{k}</span><b>{v}</b><small>Live database summary</small></div>)}</div>
        <section className="panel"><h2>Recent inventory</h2><p className="muted">Products saved in your database</p>{loading?<p>Loading…</p>:<Table items={items.slice(0,6)} edit={edit} remove={remove}/>}</section>
      </>}
      {page==="Inventory" && <>
        <div className="toolbar"><input placeholder="Search products, SKU or category…" value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn" onClick={()=>{setForm(blank);setEditId(null);setShow(true)}}>＋ Add product</button></div>
        {show && <form className="panel form" onSubmit={save}><div className="panel-head"><h2>{editId?"Edit product":"Add inventory item"}</h2><button type="button" className="link" onClick={()=>setShow(false)}>Close ✕</button></div>
          <div className="fields">
            <label>Product name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
            <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Grocery","Dairy","Bakery","Fruits","Vegetables","Medicines","Medical Supplies"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>SKU / product code<input required value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
            <label>Current stock<input required min="0" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
            <label>Unit<input required value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></label>
            <label>Expiry date<input required type="date" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})}/></label>
            <label>Estimated daily demand<input min="0" type="number" value={form.demand} onChange={e=>setForm({...form,demand:e.target.value})}/></label>
            <label>Unit cost (₹)<input min="0" step=".01" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label>
          </div><div className="actions"><button className="btn">Save product</button><button type="button" className="btn light" onClick={()=>setShow(false)}>Cancel</button></div>
        </form>}
        <section className="panel"><div className="panel-head"><div><h2>All products</h2><p className="muted">{filtered.length} product(s)</p></div><button className="link" onClick={load}>↻ Refresh</button></div>{loading?<p>Loading products…</p>:<Table items={filtered} edit={edit} remove={remove}/>}</section>
      </>}
      {page==="Waste Risk" && <section className="panel"><h2>Waste risk analysis</h2><p className="muted">Rule-based estimates using stock, expiry and entered daily demand.</p><Table items={[...items].sort((a,b)=>["High","Medium","Low"].indexOf(riskOf(a))-["High","Medium","Low"].indexOf(riskOf(b)))} edit={edit} remove={remove}/></section>}
      {page==="Reports" && <section className="panel"><h2>Inventory report</h2><p>{items.length} products · {units} units · {high} high-risk products</p><button className="btn" onClick={csv}>Download CSV</button></section>}
      <footer>© 2026 FreshStock AI · Inventory management prototype</footer>
    </main>{notice&&<div className="toast">{notice}</div>}
  </div>;
}

function Table({items,edit,remove}) {
  if(!items.length)return <p className="empty">No products found. Add your first product.</p>;
  return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>STOCK</th><th>EXPIRY</th><th>WASTE RISK</th><th>ACTIONS</th></tr></thead><tbody>
    {items.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.sku}</small></td><td>{p.category}</td><td>{p.stock} {p.unit}</td><td>{p.expiry}</td><td><span className={`risk ${riskOf(p).toLowerCase()}`}>{riskOf(p)}</span></td><td><button className="action" onClick={()=>edit(p)}>Edit</button><button className="action red" onClick={()=>remove(p.id)}>Delete</button></td></tr>)}
  </tbody></table></div>;
}
