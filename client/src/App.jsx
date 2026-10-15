import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownUp, BadgeCheck, Building2, ChevronDown, CircleUserRound,
  ClipboardList, LayoutDashboard, LogOut, Plus, Search, ShieldCheck, Star, Users,
  Eye, EyeOff, LockKeyhole, Store, X, RefreshCw
} from 'lucide-react';
import { api, clearSession, getSavedUser, getToken, json, setSession } from './api.js';

const passwordHint = '8–16 characters, at least one uppercase letter and one special character.';
const nameHint = 'Name must be 20–60 characters.';
const blankUser = { name: '', email: '', address: '', password: '', role: 'USER' };

function App() {
  const [user, setUser] = useState(getSavedUser);
  const [page, setPage] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState('');
  const [authForm, setAuthForm] = useState({ name: '', email: '', address: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [stats, setStats] = useState({ users: 0, stores: 0, ratings: 0 });
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [ownerData, setOwnerData] = useState({ stores: [], ratings: [] });
  const [storeForm, setStoreForm] = useState({ name: '', email: '', address: '', ownerId: '' });
  const [newUser, setNewUser] = useState(blankUser);
  const [storeQuery, setStoreQuery] = useState('');
  const [userFilters, setUserFilters] = useState({ search: '', role: '', sortBy: 'name', order: 'asc' });
  const [storeSort, setStoreSort] = useState({ sortBy: 'name', order: 'asc' });
  const [showPassword, setShowPassword] = useState(false);

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3500); };
  const logout = () => { clearSession(); setUser(null); setPage('dashboard'); setToast(''); };
  const signIn = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: json({ email: authForm.email, password: authForm.password }) });
      setSession(result.token, result.user); setUser(result.user); setPage('dashboard'); notify('Welcome back.');
    } catch (err) { notify(err.message); } finally { setLoading(false); }
  };
  const signUp = async (e) => {
    e.preventDefault();
    if (authForm.name.trim().length < 20 || authForm.name.trim().length > 60) return notify(nameHint);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email)) return notify('Enter a valid email address.');
    if (authForm.address.length > 400) return notify('Address must be at most 400 characters.');
    if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(authForm.password)) return notify(passwordHint);
    setLoading(true);
    try {
      await api('/auth/register', { method: 'POST', body: json(authForm) });
      setAuthMode('login'); notify('Account created. Please sign in.');
      setAuthForm({ name: '', email: authForm.email, address: '', password: '' });
    } catch (err) { notify(err.message); } finally { setLoading(false); }
  };

  const loadData = async () => {
    if (!user || !getToken()) return;
    setLoading(true);
    try {
      if (user.role === 'ADMIN') {
        const [s, u, st] = await Promise.all([
          api('/admin/stats'),
          api(`/admin/users?search=${encodeURIComponent(userFilters.search)}&role=${encodeURIComponent(userFilters.role)}&sortBy=${userFilters.sortBy}&order=${userFilters.order}&limit=100`),
          api(`/stores?search=${encodeURIComponent(storeQuery)}&sortBy=${storeSort.sortBy}&order=${storeSort.order}&limit=100`),
        ]);
        setStats(s); setUsers(u.items); setStores(st.items);
      } else if (user.role === 'OWNER') {
        const d = await api('/owner/dashboard'); setOwnerData(d);
        const s = await api(`/stores?search=${encodeURIComponent(storeQuery)}&sortBy=${storeSort.sortBy}&order=${storeSort.order}&limit=100`);
        setStores(s.items);
      } else {
        const s = await api(`/stores?search=${encodeURIComponent(storeQuery)}&sortBy=${storeSort.sortBy}&order=${storeSort.order}&limit=100`);
        setStores(s.items);
      }
    } catch (err) {
      if (/session|token|authentication/i.test(err.message)) logout();
      else notify(err.message);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [user, userFilters, storeQuery, storeSort]);
  useEffect(() => {
    if (!user) return;
    api('/auth/me').then(({ user: fresh }) => { setUser(fresh); localStorage.setItem('store-ratings-user', JSON.stringify(fresh)); }).catch(() => logout());
  }, []);

  const rate = async (storeId, score) => {
    try { await api(`/ratings/${storeId}`, { method: 'PUT', body: json({ score }) }); notify('Your rating has been saved.'); await loadData(); }
    catch (err) { notify(err.message); }
  };
  const createStore = async (e) => {
    e.preventDefault();
    try {
      await api('/stores', { method: 'POST', body: json({ ...storeForm, ownerId: storeForm.ownerId || null }) });
      setModal(''); setStoreForm({ name: '', email: '', address: '', ownerId: '' }); notify('Store created.'); await loadData();
    } catch (err) { notify(err.message); }
  };
  const createUser = async (e) => {
    e.preventDefault();
    if (newUser.name.trim().length < 20 || newUser.name.trim().length > 60) return notify(nameHint);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) return notify('Enter a valid email address.');
    if (newUser.address.length > 400) return notify('Address must be at most 400 characters.');
    if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(newUser.password)) return notify(passwordHint);
    try {
      await api('/admin/users', { method: 'POST', body: json(newUser) });
      setModal(''); setNewUser(blankUser); notify('User created.'); await loadData();
    } catch (err) { notify(err.message); }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api('/auth/password', { method: 'PATCH', body: json(passwordForm) });
      setPasswordForm({ currentPassword: '', newPassword: '' }); setModal(''); notify('Password updated.');
    } catch (err) { notify(err.message); }
  };

  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} signIn={signIn} signUp={signUp} loading={loading} toast={toast} showPassword={showPassword} setShowPassword={setShowPassword} />;

  const isAdmin = user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'stores', label: 'Stores', icon: Building2 }, { id: 'users', label: 'Users', icon: Users }] : []),
    ...(!isAdmin ? [{ id: 'stores', label: 'Browse stores', icon: Store }] : []),
    ...(isOwner ? [{ id: 'submissions', label: 'Rating activity', icon: ClipboardList }] : []),
    { id: 'settings', label: 'Settings', icon: LockKeyhole },
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Star size={20} fill="currentColor" /></div><div><strong>StoreRate</strong><small>Ratings platform</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><item.icon size={18}/><span>{item.label}</span>{page === item.id && <span className="nav-active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={19}/></div><strong>Your workspace</strong><p>One account, the right access for your role.</p></div><button className="nav-item logout" onClick={logout}><LogOut size={18}/><span>Sign out</span></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{navItems.find(n => n.id === page)?.label || 'Overview'}</strong></div><div className="top-actions"><span className="status-pill"><span/> All systems normal</span><div className="user-chip"><div className="avatar">{user.name?.charAt(0)?.toUpperCase()}</div><div className="user-chip-text"><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></div><ChevronDown size={15}/></div></div></header>
      <section className="page-content">
        {page === 'dashboard' && <Dashboard user={user} stats={stats} stores={stores} ownerData={ownerData} setPage={setPage} setModal={setModal} rate={rate}/>}
        {page === 'stores' && <StoresPage user={user} stores={stores} query={storeQuery} setQuery={setStoreQuery} sort={storeSort} setSort={setStoreSort} rate={rate} setModal={setModal} loading={loading}/>}
        {page === 'users' && <UsersPage users={users} filters={userFilters} setFilters={setUserFilters} setModal={setModal} />}
        {page === 'submissions' && <OwnerActivity data={ownerData}/>}
        {page === 'settings' && <Settings user={user} setModal={setModal}/>}
      </section>
    </main>
    {toast && <div className="toast"><BadgeCheck size={18}/>{toast}<button onClick={() => setToast('')}><X size={15}/></button></div>}
    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(''); }}><div className="modal"><div className="modal-head"><div><h2>{modal === 'store' ? 'Add a store' : modal === 'user' ? 'Create a user' : 'Update password'}</h2><p>{modal === 'store' ? 'Add a store to the platform directory.' : modal === 'user' ? 'Create an account with the appropriate role.' : 'Choose a strong password for your account.'}</p></div><button className="icon-btn" onClick={() => setModal('')}><X size={18}/></button></div>
      {modal === 'store' && <form onSubmit={createStore} className="form-grid"><Field label="Store name" required><input required maxLength="120" value={storeForm.name} onChange={e=>setStoreForm({...storeForm,name:e.target.value})}/></Field><Field label="Store email" required><input required type="email" value={storeForm.email} onChange={e=>setStoreForm({...storeForm,email:e.target.value})}/></Field><Field label="Address" required wide><textarea required maxLength="400" value={storeForm.address} onChange={e=>setStoreForm({...storeForm,address:e.target.value})}/></Field><Field label="Owner user ID (optional)" wide><input type="number" min="1" value={storeForm.ownerId} onChange={e=>setStoreForm({...storeForm,ownerId:e.target.value})} placeholder="Enter an existing OWNER user ID"/></Field><div className="modal-actions"><button type="button" className="btn btn-light" onClick={()=>setModal('')}>Cancel</button><button className="btn btn-primary"><Plus size={16}/> Create store</button></div></form>}
      {modal === 'user' && <form onSubmit={createUser} className="form-grid"><Field label="Full name" required><input required minLength="20" maxLength="60" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="20–60 characters"/></Field><Field label="Email address" required><input required type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/></Field><Field label="Address" wide><textarea maxLength="400" value={newUser.address} onChange={e=>setNewUser({...newUser,address:e.target.value})}/></Field><Field label="Temporary password" required wide><input required type="password" minLength="8" maxLength="16" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/><small className="field-hint">{passwordHint}</small></Field><Field label="Role" required wide><select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}><option value="USER">Normal User</option><option value="ADMIN">System Administrator</option><option value="OWNER">Store Owner</option></select></Field><div className="modal-actions"><button type="button" className="btn btn-light" onClick={()=>setModal('')}>Cancel</button><button className="btn btn-primary"><Plus size={16}/> Create user</button></div></form>}
      {modal === 'password' && <form onSubmit={changePassword} className="form-grid"><Field label="Current password" required wide><input required type="password" value={passwordForm.currentPassword} onChange={e=>setPasswordForm({...passwordForm,currentPassword:e.target.value})}/></Field><Field label="New password" required wide><input required type="password" minLength="8" maxLength="16" value={passwordForm.newPassword} onChange={e=>setPasswordForm({...passwordForm,newPassword:e.target.value})}/><small className="field-hint">{passwordHint}</small></Field><div className="modal-actions"><button type="button" className="btn btn-light" onClick={()=>setModal('')}>Cancel</button><button className="btn btn-primary">Save password</button></div></form>}
    </div></div>}
  </div>;
}

function AuthScreen({ mode, setMode, form, setForm, signIn, signUp, loading, toast, showPassword, setShowPassword }) {
  return <div className="auth-layout"><div className="auth-visual"><div className="auth-visual-inner"><div className="brand brand-light"><div className="brand-mark"><Star size={20} fill="currentColor"/></div><div><strong>StoreRate</strong><small>Ratings platform</small></div></div><div className="auth-hero"><span className="eyebrow">INSIGHTS THAT MATTER</span><h1>Good decisions<br/>start with <em>good ratings.</em></h1><p>One clear view of your store ecosystem. Discover trusted stores, understand customer feedback, and make every rating count.</p><div className="hero-stats"><div><strong>01</strong><span>One platform</span></div><div><strong>3</strong><span>Access roles</span></div><div><strong>5★</strong><span>Rating scale</span></div></div></div><div className="auth-footnote">Thoughtful feedback. Better experiences.</div></div></div><div className="auth-panel"><div className="auth-mobile-brand"><div className="brand-mark"><Star size={20} fill="currentColor"/></div><strong>StoreRate</strong></div><div className="auth-form-wrap"><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span><h2>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Enter your details to access your workspace.' : 'Join the platform and start sharing your experience.'}</p><form onSubmit={mode === 'login' ? signIn : signUp} className="auth-form">
    {mode === 'signup' && <><Field label="Full name" required><input autoComplete="name" required minLength="20" maxLength="60" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name (20–60 chars)"/></Field><Field label="Address" required><textarea autoComplete="street-address" required maxLength="400" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Your address"/></Field></>}
    <Field label="Email address" required><input autoComplete="email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></Field>
    <Field label="Password" required><div className="password-input"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required type={showPassword ? 'text' : 'password'} minLength={mode === 'signup' ? 8 : undefined} maxLength={mode === 'signup' ? 16 : undefined} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Enter your password"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{mode === 'signup' && <small className="field-hint">{passwordHint}</small>}</Field>
    <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button>
  </form><div className="auth-switch">{mode === 'login' ? <>New to StoreRate? <button onClick={()=>setMode('signup')}>Create an account</button></> : <>Already have an account? <button onClick={()=>setMode('login')}>Sign in</button></>}</div>{toast && <div className="auth-error">{toast}</div>}<div className="auth-security"><LockKeyhole size={14}/> Your account is protected with secure authentication.</div></div><div className="auth-copyright">© 2026 StoreRate. Built for better decisions.</div></div></div>;
}

function Dashboard({ user, stats, stores, ownerData, setPage, setModal, rate }) {
  if (user.role === 'ADMIN') return <><PageHeading eyebrow="ADMINISTRATOR" title="Workspace overview" subtitle="A clear snapshot of your store ratings platform." action={<button className="btn btn-primary" onClick={()=>setModal('store')}><Plus size={16}/> Add store</button>}/><div className="stats-grid"><Stat icon={Users} label="Total users" value={stats.users} note="Registered accounts" tint="purple"/><Stat icon={Building2} label="Total stores" value={stats.stores} note="Stores on the platform" tint="blue"/><Stat icon={Star} label="Ratings submitted" value={stats.ratings} note="Customer feedback entries" tint="amber"/></div><div className="section-head"><div><h2>Store directory</h2><p>Latest view of stores registered on the platform.</p></div><button className="text-button" onClick={()=>setPage('stores')}>View all stores →</button></div><StoreTable stores={stores.slice(0,5)} admin/><div className="bottom-insight"><div className="insight-icon"><Activity size={20}/></div><div><strong>Platform health at a glance</strong><p>Ratings are linked to individual users and stores, so each user can maintain one rating per store.</p></div></div></>;
  if (user.role === 'OWNER') return <><PageHeading eyebrow="STORE OWNER" title={`Welcome, ${firstName(user.name)}`} subtitle="See how customers are rating your store."/><div className="stats-grid"><Stat icon={Building2} label="Your stores" value={ownerData.stores.length} note="Stores assigned to you" tint="blue"/><Stat icon={Star} label="Average rating" value={ownerData.stores.length ? average(ownerData.stores.map(s=>Number(s.avg_rating)||0)) : '—'} note="Across your stores" tint="amber"/><Stat icon={ClipboardList} label="Ratings received" value={ownerData.ratings.length} note="Customer submissions" tint="purple"/></div><div className="section-head"><div><h2>Your store performance</h2><p>Average rating and total customer feedback by store.</p></div><button className="text-button" onClick={()=>setPage('submissions')}>View rating activity →</button></div><StoreTable stores={ownerData.stores.map(s=>({...s, rating_count:s.rating_count}))} owner/><div className="section-head"><div><h2>Recent ratings</h2><p>Latest customer feedback for your stores.</p></div></div><OwnerRatingTable ratings={ownerData.ratings.slice(0,5)}/></>;
  return <><PageHeading eyebrow="CUSTOMER WORKSPACE" title={`Good to see you, ${firstName(user.name)}`} subtitle="Find a store, share your experience, and help others choose well." action={<button className="btn btn-primary" onClick={()=>setPage('stores')}><Search size={16}/> Explore stores</button>}/><div className="welcome-card"><div className="welcome-copy"><span className="eyebrow">YOUR VOICE MATTERS</span><h2>Every rating helps<br/>someone choose better.</h2><p>Browse stores, compare overall ratings, and keep your feedback up to date.</p><button className="btn btn-white" onClick={()=>setPage('stores')}>Browse stores <span>→</span></button></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="rating-float"><div className="rating-star"><Star fill="currentColor" size={23}/></div><div><strong>Make it count</strong><span>Rate from 1 to 5 stars</span></div></div><div className="mini-bars"><i/><i/><i/><i/><i/></div></div></div><div className="section-head"><div><h2>Discover stores</h2><p>Explore the directory and add your rating.</p></div><button className="text-button" onClick={()=>setPage('stores')}>See all stores →</button></div><StoreTable stores={stores.slice(0,4)} rate={rate}/></>;
}

function StoresPage({ user, stores, query, setQuery, sort, setSort, rate, setModal, loading }) {
  const isAdmin = user.role === 'ADMIN';
  return <><PageHeading eyebrow={isAdmin ? 'DIRECTORY MANAGEMENT' : 'STORE DIRECTORY'} title={isAdmin ? 'Stores' : 'Find your next favorite'} subtitle={isAdmin ? 'Manage registered stores and review their ratings.' : 'Search by store name or address, then share your experience.'} action={isAdmin && <button className="btn btn-primary" onClick={()=>setModal('store')}><Plus size={16}/> Add store</button>}/><div className="toolbar"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by store name or address…"/>{query && <button onClick={()=>setQuery('')}><X size={15}/></button>}</div><div className="toolbar-right"><span className="result-count">{stores.length} stores</span><SortSelect value={sort.sortBy} onChange={v=>setSort({...sort,sortBy:v})} options={[['name','Store name'],['address','Address'],['rating','Rating'],['email','Email']]}/><button className="icon-btn" title="Toggle sort direction" onClick={()=>setSort({...sort,order:sort.order==='asc'?'desc':'asc'})}><ArrowDownUp size={17}/><span className="sort-label">{sort.order}</span></button></div></div><div className="panel"><StoreTable stores={stores} admin={isAdmin} rate={!isAdmin && user.role === 'USER' ? rate : undefined} loading={loading}/></div></>;
}

function UsersPage({ users, filters, setFilters, setModal }) {
  return <><PageHeading eyebrow="ACCOUNT MANAGEMENT" title="Users & access" subtitle="Review platform accounts and manage role-based access." action={<button className="btn btn-primary" onClick={()=>setModal('user')}><Plus size={16}/> Add user</button>}/><div className="toolbar"><div className="searchbox"><Search size={18}/><input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="Search name, email, address…"/></div><div className="toolbar-right"><select className="filter-select" value={filters.role} onChange={e=>setFilters({...filters,role:e.target.value})}><option value="">All roles</option><option value="ADMIN">Administrator</option><option value="USER">Normal user</option><option value="OWNER">Store owner</option></select><SortSelect value={filters.sortBy} onChange={v=>setFilters({...filters,sortBy:v})} options={[['name','Name'],['email','Email'],['address','Address'],['role','Role']]}/><button className="icon-btn" onClick={()=>setFilters({...filters,order:filters.order==='asc'?'desc':'asc'})}><ArrowDownUp size={17}/><span className="sort-label">{filters.order}</span></button></div></div><div className="panel"><div className="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Address</th><th>Role</th><th>Owner rating</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><div className="table-person"><div className="avatar avatar-small">{u.name.charAt(0).toUpperCase()}</div><strong>{u.name}</strong></div></td><td>{u.email}</td><td className="address-cell">{u.address || '—'}</td><td><RolePill role={u.role}/></td><td>{u.role==='OWNER' ? <span className="rating-value"><Star size={14} fill="currentColor"/>{u.rating ?? '—'}</span> : '—'}</td></tr>)}</tbody></table>{!users.length && <Empty icon={Users} title="No users found" text="Try changing the search or filters."/>}</div><div className="table-footer">Showing <strong>{users.length}</strong> users <span>·</span> Sorted by {filters.sortBy} ({filters.order})</div></div></>;
}

function StoreTable({ stores, admin = false, owner = false, rate, loading }) {
  if (loading && !stores.length) return <div className="loading-state"><RefreshCw className="spin" size={20}/> Loading stores…</div>;
  if (!stores.length) return <Empty icon={Building2} title="No stores yet" text="Stores will appear here once they are registered."/>;
  return <div className="table-wrap"><table><thead><tr><th>Store</th><th>Address</th>{admin && <th>Email</th>}<th>Overall rating</th>{!admin && !owner && <th>Your rating</th>}{owner && <th>Submissions</th>}{rate && <th>Rate this store</th>}</tr></thead><tbody>{stores.map(s=><tr key={s.id}><td><div className="store-cell"><div className="store-icon"><Store size={18}/></div><div><strong>{s.name}</strong><small>Store #{s.id}</small></div></div></td><td className="address-cell">{s.address}</td>{admin && <td>{s.email}</td>}<td><div className="rating-cell"><span className="rating-number"><Star size={14} fill="currentColor"/>{s.avg_rating ?? '—'}</span><small>{s.rating_count || 0} ratings</small></div></td>{!admin && !owner && <td>{s.user_rating ? <span className="your-rating"><Star size={13} fill="currentColor"/>{s.user_rating} / 5</span> : <span className="muted">Not rated</span>}</td>}{owner && <td>{s.rating_count || 0}</td>}{rate && <td><RatingPicker value={s.user_rating} onRate={score=>rate(s.id,score)}/></td>}</tr>)}</tbody></table></div>;
}

function RatingPicker({ value, onRate }) {
  const [selected,setSelected] = useState(value || 0);
  useEffect(()=>setSelected(value||0),[value]);
  return <div className="rating-picker" aria-label="Rate this store from one to five">{[1,2,3,4,5].map(n=><button type="button" title={`Rate ${n} out of 5`} key={n} className={n<=selected?'selected':''} onClick={()=>{setSelected(n);onRate(n);}}><Star size={16} fill={n<=selected?'currentColor':'none'}/></button>)}</div>;
}
function OwnerActivity({ data }) { return <><PageHeading eyebrow="CUSTOMER FEEDBACK" title="Rating activity" subtitle="See who rated your store and how customers are responding."/><div className="stats-grid"><Stat icon={Building2} label="Stores" value={data.stores.length} note="Assigned to your account" tint="blue"/><Stat icon={Star} label="Average rating" value={data.stores.length?average(data.stores.map(s=>Number(s.avg_rating)||0)):'—'} note="Across your stores" tint="amber"/><Stat icon={ClipboardList} label="Total ratings" value={data.ratings.length} note="All customer submissions" tint="purple"/></div><div className="panel"><div className="panel-title"><div><h2>Customer submissions</h2><p>Ratings are listed with the latest update first.</p></div></div><OwnerRatingTable ratings={data.ratings}/></div></>; }
function OwnerRatingTable({ ratings }) { return <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Store</th><th>Rating</th><th>Last updated</th></tr></thead><tbody>{ratings.map(r=><tr key={r.id}><td><div className="table-person"><div className="avatar avatar-small">{r.user_name?.charAt(0)?.toUpperCase()}</div><strong>{r.user_name}</strong></div></td><td>{r.user_email}</td><td>{r.store_name}</td><td><span className="rating-value"><Star size={14} fill="currentColor"/>{r.score} / 5</span></td><td>{new Date(r.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!ratings.length&&<Empty icon={ClipboardList} title="No ratings received" text="Customer submissions will show here."/ >}</div>; }
function Settings({ user, setModal }) { return <><PageHeading eyebrow="ACCOUNT PREFERENCES" title="Settings" subtitle="Manage your account security and sign-in details."/><div className="settings-card"><div className="settings-icon"><LockKeyhole size={22}/></div><div className="settings-copy"><h2>Password & security</h2><p>Update your password regularly. Use a unique password with an uppercase letter and a special character.</p><span className="settings-meta"><ShieldCheck size={14}/> Signed in as {user.email}</span></div><button className="btn btn-light" onClick={()=>setModal('password')}>Change password</button></div><div className="settings-card"><div className="settings-icon"><CircleUserRound size={22}/></div><div className="settings-copy"><h2>Account role</h2><p>Your access is determined by your assigned role. Contact a system administrator if this needs to change.</p><RolePill role={user.role}/></div></div></>; }
function AuthFieldDummy() { return null; }
function Field({label,required,wide,children}) { return <label className={`field ${wide?'field-wide':''}`}><span>{label}{required&&<i> *</i>}</span>{children}</label>; }
function PageHeading({eyebrow,title,subtitle,action}) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Stat({icon:Icon,label,value,note,tint}) { return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={20}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>; }
function RolePill({role}) { const map={ADMIN:['Administrator','role-admin'],USER:['Normal user','role-user'],OWNER:['Store owner','role-owner']}; const [label,cls]=map[role]||[role,'']; return <span className={`role-pill ${cls}`}>{label}</span>; }
function SortSelect({value,onChange,options}) { return <select className="filter-select sort-select" value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option value={v} key={v}>Sort: {l}</option>)}</select>; }
function Empty({icon:Icon,title,text}) { return <div className="empty-state"><div className="empty-icon"><Icon size={22}/></div><strong>{title}</strong><p>{text}</p></div>; }
function roleLabel(role) { return ({ADMIN:'System Administrator',USER:'Normal User',OWNER:'Store Owner'})[role] || role; }
function firstName(name='there') { return name.trim().split(/\s+/)[0] || 'there'; }
function average(values) { const v=values.filter(x=>x>0); return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(2) : '—'; }

export default App;
