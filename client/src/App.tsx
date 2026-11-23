import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, Heart, ArrowRight, ArrowUpRight, SlidersHorizontal, Bell, UserRound, Menu, X, Check, Tag, ShieldCheck, TrendingDown, Sparkles, Laptop, Smartphone, Headphones, Watch, Home as HomeIcon, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
const API = "http://localhost:4000/api";type Product = {id:number;name:string;brand:string;category:string;description:string;image:string;lowestPrice:number;prices?:Price[];specs?:Record<string,string>};
type Price = {id:number;retailer:string;amount:number;availability:string;searchUrl:string;isDemo:boolean};
type User = {id:number;name:string;email:string;role:string};
const money = (n:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const categories = ["All","Smartphones","Laptops","Electronics","Fashion","Home Appliances","Audio"];
const categoryIcons = [ShoppingBag,Smartphone,Laptop,Headphones,Watch,HomeIcon];
const fallbackProducts:Product[] = [
 {id:1,name:"iPhone 15 Pro (128GB)",brand:"Apple",category:"Smartphones",description:"Premium smartphone with A17 Pro chip, titanium design and advanced camera system.",image:"/product-images/iphone-15-pro.png",lowestPrice:108999},
 {id:2,name:"Galaxy S24 (256GB)",brand:"Samsung",category:"Smartphones",description:"Flagship Android smartphone with a bright display and versatile cameras.",image:"https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85",lowestPrice:64999},
 {id:3,name:"MacBook Air M3 (13-inch)",brand:"Apple",category:"Laptops",description:"Lightweight laptop with Apple silicon, long battery life and a vivid display.",image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",lowestPrice:99900},
 {id:4,name:"Sony WH-1000XM5",brand:"Sony",category:"Audio",description:"Wireless noise-cancelling headphones with immersive sound.",image:"https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=85",lowestPrice:24999}
];
const demoHistory = [{month:"Jun",price:119900},{month:"Jul",price:116500},{month:"Aug",price:114900},{month:"Sep",price:112490},{month:"Oct",price:110500},{month:"Nov",price:108999}];

export default function App(){
 const [products,setProducts]=useState<Product[]>([]);
 const [query,setQuery]=useState(""); const [category,setCategory]=useState("All"); const [sort,setSort]=useState("low");
 const [selected,setSelected]=useState<Product|null>(null); const [user,setUser]=useState<User|null>(null);
 const [token,setToken]=useState(localStorage.getItem("bw_token")||""); const [wishlist,setWishlist]=useState<number[]>([]);
 const [alerts,setAlerts]=useState<any[]>([]); const [modal,setModal]=useState<"login"|"register"|"alert"|"wishlist"|"alerts"|"admin"|null>(null);
 const [target,setTarget]=useState(""); const [toast,setToast]=useState(""); const [busy,setBusy]=useState(false); const [mobileMenu,setMobileMenu]=useState(false);
 const [authEmail,setAuthEmail]=useState(""); const [authPassword,setAuthPassword]=useState(""); const [authName,setAuthName]=useState("");
 const [notice,setNotice]=useState("All retailer prices shown in this starter are demonstration data, not live offers.");
 const headers=()=>({ "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) });
 const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(""),2600)};
 async function loadProducts(){
   try {const p=await fetch(`${API}/products?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category==="All"?"":category)}&sort=${sort}`).then(r=>r.json()); if(Array.isArray(p))setProducts(p);}
   catch {setProducts(fallbackProducts);}
 }
 async function loadAccount(){
   if(!token)return;
   try {
     const [me,w,a]=await Promise.all([fetch(`${API}/auth/me`,{headers:headers()}),fetch(`${API}/wishlist`,{headers:headers()}),fetch(`${API}/alerts`,{headers:headers()})]);
     if(!me.ok){setToken("");localStorage.removeItem("bw_token");return;}
     setUser(await me.json()); setWishlist((await w.json()).map((x:Product)=>x.id)); setAlerts(await a.json());
   }catch{}
 }
 useEffect(()=>{loadProducts();},[query,category,sort]);
 useEffect(()=>{loadAccount();},[token]);
 useEffect(() => {
  const handlePopState = () => {
    setSelected(null);
  };

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);
useEffect(() => {
  window.history.replaceState({ view: "home" }, "");
}, []);
 async function openProduct(p:Product){
  window.scrollTo({ top: 0, behavior: "instant" });
  window.history.pushState({ view: "product", productId: p.id }, "");

  try {
    const detail = await fetch(`${API}/products/${p.id}`)
      .then(r => r.json());
    setSelected(detail.detail || p);
  } catch {
    setSelected(p);
  }
}
 async function authSubmit(e:React.FormEvent){
   e.preventDefault();setBusy(true);
   try{
    const endpoint=modal==="register"?"register":"login";
    const r=await fetch(`${API}/auth/${endpoint}`,{method:"POST",headers:headers(),body:JSON.stringify({name:authName,email:authEmail,password:authPassword})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not sign in.");
    localStorage.setItem("bw_token",d.token);setToken(d.token);setUser(d.user);setModal(null);notify("Welcome to BuyWise!");
   }catch(e:any){notify(e.message);}finally{setBusy(false);}
 }
 async function toggleWishlist(id:number){
   if(!token){setModal("login");return;}
   const exists=wishlist.includes(id);
   try{await fetch(`${API}/wishlist/${id}`,{method:exists?"DELETE":"POST",headers:headers()});setWishlist(old=>exists?old.filter(x=>x!==id):[...old,id]);notify(exists?"Removed from wishlist":"Saved to your wishlist");}catch{notify("Could not update wishlist.");}
 }
 async function createAlert(e:React.FormEvent){
   e.preventDefault();if(!selected)return;if(!token){setModal("login");return;}
   try{const r=await fetch(`${API}/alerts`,{method:"POST",headers:headers(),body:JSON.stringify({productId:selected.id,targetPrice:Number(target)})});const d=await r.json();if(!r.ok)throw new Error(d.error);await loadAccount();setModal(null);setTarget("");notify("Price alert saved. Monitoring requires a live price feed.");}catch(e:any){notify(e.message||"Could not save alert.");}
 }
 async function deleteAlert(id:number){await fetch(`${API}/alerts/${id}`,{method:"DELETE",headers:headers()});await loadAccount();notify("Alert deleted.");}
const visible = useMemo(
  () => products.filter(p => category === "All" || p.category === category),
  [products, category]
); const lowest=(p:Product)=>p.prices?.length?Math.min(...p.prices.map(x=>x.amount)):p.lowestPrice;
 const logout=()=>{localStorage.removeItem("bw_token");setToken("");setUser(null);setWishlist([]);setAlerts([]);notify("Signed out.");};
const goHome = () => {
  if (window.history.state?.view === "product") {
    window.history.back();
  } else {
    setSelected(null);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}; return <div className="app">
  <div className="topline">Smarter shopping starts here <span>•</span> Compare before you buy</div>
  
<header className="store-header">
  <div className="store-header-main wrap">
    <button className="brand" onClick={goHome}>
      <span className="brand-icon">
        <ShoppingBag size={21} />
      </span>
      <span>
        Buy<span className="blue">Wise</span>
        <small>SHOP SMART. SPEND WISE.</small>
      </span>
    </button>

    <div className="store-search">
      <Search size={19} />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search phones, laptops, headphones..."
      />
      <button onClick={() => {
        setSelected(null);
        document.getElementById("explore")?.scrollIntoView({
          behavior: "smooth"
        });
      }}>
        Search
      </button>
    </div>

    <div className="store-actions">
      <button onClick={() => setModal("wishlist")}>
        <Heart size={19} />
        <span>Wishlist</span>
      </button>

      <button onClick={() => user ? setModal("alerts") : setModal("login")}>
        <UserRound size={19} />
        <span>{user ? user.name.split(" ")[0] : "Account"}</span>
      </button>

      <button className="primary small" onClick={() => setModal("register")}>
        Join now <ArrowRight size={15} />
      </button>

      <button className="hamb" onClick={() => setMobileMenu(!mobileMenu)}>
        {mobileMenu ? <X /> : <Menu />}
      </button>
    </div>
  </div>

  <div className="store-category-bar">
    <div className="wrap store-category-inner">
      <button onClick={goHome}>Home</button>
      {categories.slice(1).map(c => (
        <button key={c} onClick={() => {
            setQuery("");

          setCategory(c);
          setSelected(null);
          document.querySelector(".products-section")?.scrollIntoView({
            behavior: "smooth"
          });
        }}>
          {c}
        </button>
      ))}
      <button onClick={() => setModal("alerts")}>Price Alerts</button>
    </div>
  </div>
</header>


  {!selected?<main>
   


<section className="hero hero-redesign">
  <div className="wrap hero-redesign-inner">

    <div className="hero-redesign-content">

      <div className="eyebrow">
        <Sparkles size={16} />
        SMARTER SHOPPING STARTS HERE
      </div>

      <h1>
        Stop Overpaying.
        <br />
        <span>Start Shopping Smarter.</span>
      </h1>

      <p>
        Discover the best products, compare prices across retailers
        and find the right deal before you buy.
      </p>

      <div className="hero-search-box">
        <Search size={21} />

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              setSelected(null);
              document.querySelector(".products-section")?.scrollIntoView({
                behavior: "smooth"
              });
            }
          }}
          placeholder="Search smartphones, laptops, headphones..."
        />

        <button
          className="primary"
          onClick={() => {
            setSelected(null);
            document.querySelector(".products-section")?.scrollIntoView({
              behavior: "smooth"
            });
          }}
        >
          Compare prices <ArrowRight size={17} />
        </button>
      </div>

      <div className="hero-redesign-trust">
        <span><ShieldCheck size={17} /> Shop with confidence</span>
        <span><TrendingDown size={17} /> Compare retailer prices</span>
        <span><Heart size={17} /> Save your favourites</span>
      </div>

    </div>
  </div>
</section>

<section className="featured-comparison">
  <div className="comparison-glow"></div>

  <div className="featured-comparison-card">
    <div className="comparison-topline">
      <span className="comparison-heading">PRICE COMPARISON</span>
      <span className="sample-badge">SAMPLE DATA</span>
    </div>

    <div className="price-dropped-badge">
      <span></span>
      Price dropped today
    </div>

    <div className="comparison-product">
      <div className="comparison-product-image">
        <img
          src="/product-images/iphone-15-pro.png"
          alt="Apple iPhone 15 Pro"
        />
      </div>

      <div className="comparison-product-info">
        <span className="comparison-brand">APPLE</span>
        <h2>Apple iPhone 15 Pro (128GB)</h2>
        <div className="comparison-main-price">
          <strong>₹1,08,999</strong>
          <del>₹1,29,900</del>
        </div>
      </div>
    </div>

    <div className="comparison-retailers">
      {[
        {
          name: "Amazon India",
          initial: "A",
          price: 108999,
          color: "amazon",
          url: "https://www.amazon.in/s?k=Apple+iPhone+15+Pro+128GB",
          lowest: true
        },
        {
          name: "Flipkart",
          initial: "F",
          price: 112490,
          color: "flipkart",
          url: "https://www.flipkart.com/search?q=Apple+iPhone+15+Pro+128GB",
          lowest: false
        },
        {
          name: "Reliance Digital",
          initial: "R",
          price: 116500,
          color: "reliance",
          url: "https://www.reliancedigital.in/search?q=iPhone%2015%20Pro",
          lowest: false
        },
        {
          name: "Croma",
          initial: "C",
          price: 119900,
          color: "croma",
          url: "https://www.croma.com/searchB?q=iPhone%2015%20Pro",
          lowest: false
        }
      ].map(retailer => (
        <div
          className={`comparison-retailer-row ${retailer.lowest ? "lowest-retailer" : ""}`}
          key={retailer.name}
        >
          <div className={`retailer-initial ${retailer.color}`}>
            {retailer.initial}
          </div>

          <div className="retailer-details">
            <div className="retailer-name-line">
              <span>{retailer.name}</span>
              {retailer.lowest && (
                <span className="lowest-badge">LOWEST</span>
              )}
            </div>
            <strong>{money(retailer.price)}</strong>
          </div>

          <a
            className={`retailer-search-link ${retailer.lowest ? "best-link" : ""}`}
            href={retailer.url}
            target="_blank"
            rel="noreferrer"
          >
            Search on {retailer.name === "Amazon India" ? "Amazon" : retailer.name}
            <ArrowUpRight size={16} />
          </a>
        </div>
      ))}
    </div>

    <div className="comparison-savings">
      <div>
        <span>POTENTIAL SAVINGS</span>
        <strong className="savings-value">₹10,901</strong>
      </div>

      <div className="spread-value">
        <span>PRICE SPREAD</span>
        <strong>₹1,08,999 – ₹1,19,900</strong>
      </div>
    </div>

    <p className="comparison-disclaimer">
      <ShieldCheck size={15} />
      SAMPLE DATA — These are demonstration prices, not live retailer feeds.
      Links open retailer search results and may not show an exact listing.
    </p>
  </div>
</section>
<section className="premium-categories" id="explore">
  <div className="wrap">
    <div className="premium-category-heading">
      <div>
        <span className="premium-kicker">THE BUYWISE COLLECTION</span>
        <h2>Explore technology<span>.</span></h2>
        <p>Discover the devices and gadgets that make everyday better.</p>
      </div>
      <span className="collection-note">CURATED FOR SMARTER SHOPPING</span>
    </div>

    <div className="premium-category-grid">
      {[
        {
          name: "Smartphones",
          subtitle: "Technology in your hands",
          image: "/product-images/iphone-15-pro.png",
          tone: "phone"
        },
        {
          name: "Laptops",
          subtitle: "Power your possibilities",
          image: fallbackProducts[2].image,
          tone: "laptop"
        },
        {
          name: "Audio",
          subtitle: "Hear every detail",
          image: fallbackProducts[3].image,
          tone: "audio"
        },
        {
          name: "Electronics",
          subtitle: "Explore the essentials",
          image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700",
          tone: "electronics"
        },
        {
          name: "Fashion",
          subtitle: "Everyday style",
          image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700",
          tone: "fashion"
        },
        {
          name: "Home Appliances",
          subtitle: "Make life easier",
          image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=700",
          tone: "home"
        }
      ].map(item => (
        <button
          className={`premium-category-card ${item.tone}`}
          key={item.name}
          onClick={() => {
              setQuery("");
setCategory(item.name);            setSelected(null);
            document.querySelector(".products-section")?.scrollIntoView({
              behavior: "smooth"
            });
          }}
        >
          <div className="premium-category-image">
            <img src={item.image} alt={item.name} />
          </div>

          <div className="premium-category-info">
            <div>
              <h3>{item.name}</h3>
              <p>{item.subtitle}</p>
            </div>
            <span className="premium-category-arrow">↗</span>
          </div>
        </button>
      ))}
    </div>
  </div>
</section>


   <section className="wrap products-section" id="products">
    <div className="sectionhead"><div><div className="eyebrow blue-text">CURATED FOR YOU</div><h2>{query?`Results for “${query}”`:category==="All"?"Popular right now":category}</h2><p>Compare offers and choose what works for you.</p></div><div className="sort"><SlidersHorizontal size={16}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="low">Lowest price</option><option value="high">Highest price</option><option value="name">Name A–Z</option></select></div></div>
    <div className="productgrid">{visible.map(p=><article className="productcard" key={p.id}>
     <div className="productimage" onClick={()=>openProduct(p)}><img src={p.image} alt={p.name}/><span className="demo">DEMO DATA</span><button className={wishlist.includes(p.id)?"heart saved":"heart"} onClick={e=>{e.stopPropagation();toggleWishlist(p.id);}}><Heart size={17} fill={wishlist.includes(p.id)?"currentColor":"none"}/></button></div>
     <div className="productbody"><span className="muted tiny">{p.brand} · {p.category}</span><h3 onClick={()=>openProduct(p)}>{p.name}</h3><div className="pricefrom">Lowest listed price</div><div className="price">{money(lowest(p))}</div><button className="outline full" onClick={()=>openProduct(p)}>Compare prices <ArrowUpRight size={16}/></button></div>
    </article>)}</div>
    {visible.length===0&&<div className="empty"><Search size={28}/><h3>No products found</h3><p>Try another search or choose a different category.</p><button className="outline" onClick={()=>{setQuery("");setCategory("All");}}>Clear filters</button></div>}
   </section>
   <section className="how" id="how-it-works"><div className="wrap"><div className="sectionhead centered"><div><div className="eyebrow blue-text">SIMPLE BY DESIGN</div><h2>Better buying in three steps</h2><p>A clearer way to compare before you checkout.</p></div></div><div className="steps"><div><span>01</span><Search/><h3>Search</h3><p>Find the product you want from our catalogue.</p></div><div><span>02</span><SlidersHorizontal/><h3>Compare</h3><p>Review sample retailer listings side by side.</p></div><div><span>03</span><TrendingDown/><h3>Save</h3><p>Choose the offer that suits your budget.</p></div></div></div></section>
  </main>:<main className="wrap detail">
   <button className="back" onClick={goHome}>← Back to products</button>
   <div className="detailgrid"><div className="detailphoto"><img src={selected.image} alt={selected.name}/><span className="demo">DEMO DATA</span></div>
    <div className="detailinfo"><div className="eyebrow blue-text">{selected.brand} · {selected.category}</div><h1>{selected.name}</h1><p>{selected.description}</p><div className="detailprice-label">Lowest listed demonstration price</div><div className="detailprice">{money(lowest(selected))}</div><div className="buttonrow"><button className="primary" onClick={()=>setModal("alert")}><Bell size={17}/> Set price alert</button><button className="outline" onClick={()=>toggleWishlist(selected.id)}><Heart size={17} fill={wishlist.includes(selected.id)?"currentColor":"none"}/>{wishlist.includes(selected.id)?"Saved":"Wishlist"}</button></div>
    <div className="specs"><h3>Specifications</h3>{Object.entries(selected.specs||{}).map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div></div></div>
   <section className="comparison"><div className="sectionhead"><div><div className="eyebrow blue-text">PRICE COMPARISON</div><h2>Compare retailer offers</h2><p>Retailer prices below are sample data, not live offers.</p></div></div>
    {(selected.prices||[]).slice().sort((a,b)=>a.amount-b.amount).map((p,i)=><div className="retailer" key={p.id}><div><b>{p.retailer}</b><small>{p.availability} · Demo price</small></div><div className="retailerprice">{money(p.amount)}{i===0&&<em>LOWEST</em>}</div><a className="outline deal" href={p.searchUrl} target="_blank" rel="noreferrer">Search retailer <ArrowUpRight size={15}/></a></div>)}
   </section>
   <section className="history"><div className="sectionhead"><div><div className="eyebrow blue-text">PRICE TRENDS</div><h2>Example price history</h2><p>Illustrative chart, not historical retailer data.</p></div></div><div className="chart"><ResponsiveContainer width="100%" height={230}><AreaChart data={demoHistory}><defs><linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2f65e8" stopOpacity={.22}/><stop offset="100%" stopColor="#2f65e8" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis hide domain={["dataMin - 3000","dataMax + 3000"]}/><Tooltip formatter={(v:any)=>money(Number(v))}/><Area type="monotone" dataKey="price" stroke="#2f65e8" strokeWidth={3} fill="url(#fillPrice)"/></AreaChart></ResponsiveContainer></div></section>
  </main>}

<footer className="buywise-footer">
  <div className="wrap footer-main">
    <div className="footer-about">
      <button className="brand" onClick={goHome}>
        <span className="brand-icon">
          <ShoppingBag size={20} />
        </span>
        <span>
          Buy<span className="blue">Wise</span>
          <small>SHOP SMART. SPEND WISE.</small>
        </span>
      </button>
      <p>Compare clearly. Shop confidently. Find smarter deals with BuyWise.</p>
    </div>

    <div className="footer-column">
      <h3>Quick Links</h3>
      <a href="#explore">Explore Categories</a>
      <a href="#products">Popular Products</a>
      <a href="#how-it-works">How It Works</a>
      <button onClick={() => setModal("alerts")}>Price Alerts</button>
    </div>

    <div className="footer-column">
      <h3>Categories</h3>
      {["Smartphones", "Laptops", "Audio", "Electronics", "Fashion", "Home Appliances"].map(item => (
        <button
          key={item}
          onClick={() => {
            setCategory(item);
            setSelected(null);
            document.querySelector(".products-section")?.scrollIntoView({
              behavior: "smooth"
            });
          }}
        >
          {item}
        </button>
      ))}
    </div>

    <div className="footer-column">
      <h3>About BuyWise</h3>
      <p>Helping shoppers compare products and make informed buying decisions.</p>
      <span className="footer-tag">SMARTER SHOPPING STARTS HERE</span>
    </div>
  </div>

  <div className="wrap footer-bottom">
    <span>© 2026 BuyWise · Demonstration project</span>
    <span>Made for smarter shopping 💙</span>
  </div>

  <div className="wrap disclaimer">
    Prices and retailer listings are demonstration data, not live retailer feeds.
    Automatic price tracking is not currently active.
  </div>
</footer>


  {modal&&<div className="overlay" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
   <button className="modalclose" onClick={()=>setModal(null)}><X size={19}/></button>
   {modal==="login"||modal==="register"?<><div className="eyebrow blue-text">YOUR BUYWISE ACCOUNT</div><h2>{modal==="login"?"Welcome back":"Create your account"}</h2><p>Save products and manage your price alerts.</p><form onSubmit={authSubmit}>{modal==="register"&&<label>Full name<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={8} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="primary full" disabled={busy}>{busy?"Please wait...":modal==="login"?"Sign in":"Create account"}</button></form><p className="switch">{modal==="login"?"New to BuyWise?":"Already registered?"} <button onClick={()=>setModal(modal==="login"?"register":"login")}>{modal==="login"?"Create an account":"Sign in"}</button></p></>:null}
   {modal==="alert"&&<><div className="eyebrow blue-text">PRICE WATCH</div><h2>Set a price alert</h2><p>{selected?.name} · Current sample price {money(selected?lowest(selected):0)}</p><form onSubmit={createAlert}><label>Your target price (₹)<input required type="number" min="1" value={target} onChange={e=>setTarget(e.target.value)} placeholder="e.g. 95000"/></label><button className="primary full">Save price alert</button></form><small className="fine">This saves your target in the database. Automatic notifications require a future live price-monitoring service.</small></>}
   {modal==="wishlist"&&<><div className="eyebrow blue-text">SAVED PRODUCTS</div><h2>My Wishlist</h2>{!user?<p>Sign in to view your saved products.</p>:wishlist.length===0?<p>Your wishlist is empty. Save products while browsing.</p>:products.filter(p=>wishlist.includes(p.id)).map(p=><div className="minirow" key={p.id}><img src={p.image}/><div><b>{p.name}</b><small>{money(lowest(p))}</small></div><button onClick={()=>toggleWishlist(p.id)}><Trash2 size={17}/></button></div>)}</>}
   {modal==="alerts"&&<><div className="eyebrow blue-text">PRICE WATCH</div><h2>My Price Alerts</h2>{!user?<p>Sign in to manage your alerts.</p>:alerts.length===0?<p>You haven't created any alerts yet.</p>:alerts.map(a=><div className="minirow" key={a.id}><img src={a.image}/><div><b>{a.productName}</b><small>Target {money(a.target_price)} · {a.status}</small></div><button onClick={()=>deleteAlert(a.id)}><Trash2 size={17}/></button></div>)}</>}
   {modal==="admin"&&<><h2>Admin</h2><p>Use the seeded demo admin account to manage products and prices through the API.</p></>}
  </div></div>}
  {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
 </div>;
}
