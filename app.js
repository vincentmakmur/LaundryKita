const STORAGE_KEY = 'laundryKitaDB_v1';
const SESSION_KEY = 'laundryKitaSession_v1';
const STATUSES = [
  'Pesanan Diterima', 'Proses Pencucian', 'Proses Pengeringan',
  'Proses Penyetrikaan', 'Siap Diambil', 'Selesai'
];
const DEFAULT_SERVICES = [
  { id: 'SRV-01', name: 'Cuci Kering', price: 7000, unit: 'kg' },
  { id: 'SRV-02', name: 'Cuci Setrika', price: 9000, unit: 'kg' },
  { id: 'SRV-03', name: 'Setrika', price: 6000, unit: 'kg' }
];
const SEEDED_USERS = Array.isArray(window.LK_SEEDED_USERS) ? window.LK_SEEDED_USERS : [];

function initialDB() {
  const now = new Date();
  const day = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); };
  return {
    users: structuredCloneSafe(SEEDED_USERS),
    services: structuredCloneSafe(DEFAULT_SERVICES),
    orders: [
      { id: 'LDR-1001', customerId: 'USR-001', customerName: 'Andi Saputra', serviceId: 'SRV-02', serviceName: 'Cuci Setrika', weight: 3, note: 'Pisahkan pakaian putih.', total: 27000, status: 'Proses Pencucian', createdAt: day(0) },
      { id: 'LDR-1002', customerId: 'USR-001', customerName: 'Andi Saputra', serviceId: 'SRV-01', serviceName: 'Cuci Kering', weight: 2, note: '', total: 14000, status: 'Selesai', createdAt: day(3) }
    ]
  };
}
function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { const fresh = initialDB(); localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); return fresh; }
    const db = JSON.parse(raw);
    if (!db.users || !db.services || !db.orders) throw new Error('Invalid database');
    return db;
  } catch (e) { const fresh = initialDB(); localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); return fresh; }
}
let db = loadDB();
// Migrate the earlier sample customer label in browsers that already saved data.
let migratedCustomerName = false;
for (const user of db.users) {
  if (user.email === 'pelanggan@laundry.test' && user.name === 'Pelanggan Demo') {
    user.name = 'Andi Saputra';
    migratedCustomerName = true;
  }
}
for (const order of db.orders) {
  if (order.customerName === 'Pelanggan Demo') {
    order.customerName = 'Andi Saputra';
    migratedCustomerName = true;
  }
}
if (migratedCustomerName) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
let currentUser = null;
let currentPage = 'home';
let message = null;
let editingServiceId = null;

function saveDB() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function dateText(value) { return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function newId(prefix) { return prefix + '-' + Date.now().toString().slice(-7); }
function setMessage(type, text) { message = { type, text }; }
function takeMessage() { if (!message) return ''; const html = `<div class="alert ${message.type}">${escapeHTML(message.text)}</div>`; message = null; return html; }
function userRoleName(role) { return role === 'customer' ? 'Pelanggan' : role === 'admin' ? 'Admin' : 'Pemilik'; }
function ordersForCustomer() { return db.orders.filter(o => o.customerId === currentUser.id).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)); }
function statusBadge(status) { const klass = status === 'Selesai' ? 'green' : status === 'Siap Diambil' ? 'orange' : 'blue'; return `<span class="badge ${klass}">${escapeHTML(status)}</span>`; }
function serviceById(id) { return db.services.find(s => s.id === id); }
function pageLink(page, label) { return `<a href="#${page}" data-page="${page}" class="${currentPage === page ? 'active' : ''}">${label}</a>`; }

function header() {
  let nav = '';
  if (!currentUser) {
    nav = `${pageLink('home','Beranda')}${pageLink('login','Login')}<a href="#register" data-page="register" class="btn">Daftar</a>`;
  } else if (currentUser.role === 'customer') {
    nav = `${pageLink('customer','Dashboard')}${pageLink('order','Buat Pesanan')}${pageLink('tracking','Tracking')}${pageLink('history','Riwayat')}<button data-action="logout">Keluar</button>`;
  } else if (currentUser.role === 'admin') {
    nav = `${pageLink('admin','Dashboard')}${pageLink('admin-orders','Pesanan')}${pageLink('services','Layanan')}<button data-action="logout">Keluar</button>`;
  } else {
    nav = `${pageLink('owner','Dashboard Pemilik')}<button data-action="logout">Keluar</button>`;
  }
  return `<header class="topbar"><a class="brand" href="#home" data-page="home"><span class="brand-mark">LK</span><span>LaundryKita</span></a><nav class="nav">${nav}</nav></header>`;
}
function footer() { return `<footer class="footer">LaundryKita · Sistem Pengelolaan Laundry dan Tracking Pesanan</footer>`; }
function shell(content) { document.getElementById('app').innerHTML = `${header()}<main class="container">${content}</main>${footer()}`; }

function renderHome() {
  const services = db.services.map(s => `<article class="card"><div class="service-icon">▤</div><h3>${escapeHTML(s.name)}</h3><p class="muted small">Layanan laundry berdasarkan berat cucian.</p><div class="price">${money(s.price)} <span class="muted small">/ ${escapeHTML(s.unit)}</span></div></article>`).join('');
  shell(`${takeMessage()}<section class="hero"><div><div class="eyebrow">Layanan laundry lebih teratur</div><h1>Pesan laundry dan pantau status cucian dengan mudah.</h1><p>LaundryKita membantu pelanggan membuat pesanan, melihat perkiraan biaya, dan memantau tahapan pengerjaan melalui satu website.</p><button class="btn" data-page="${currentUser ? 'order' : 'login'}">Mulai Pesan</button></div><div class="hero-visual"><div class="symbol">▤</div><h3>Informasi Pesanan dalam Satu Tempat</h3><p class="muted small">Pemesanan · Status Cucian · Riwayat</p></div></section><div class="section-head"><div><h2>Layanan dan Harga</h2><p>Pilih layanan sesuai kebutuhan cucian.</p></div></div><section class="grid grid-3">${services}</section><div class="notice" style="margin-top:20px">Informasi harga dapat berubah mengikuti pengaturan layanan.</div>`);
}
function renderLogin() {
  shell(`<div class="auth-wrap"><div class="auth-head"><div class="brand-mark">LK</div><h2>Login Pengguna</h2><p class="muted">Masuk menggunakan akun yang sudah terdaftar.</p></div><div class="card">${takeMessage()}<form id="login-form"><div class="field"><label for="login-email">Email</label><input id="login-email" name="email" type="email" required placeholder="nama@email.com"></div><div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" required placeholder="Masukkan password"></div><button class="btn" style="width:100%" type="submit">Masuk</button></form><p class="small muted" style="text-align:center;margin:14px 0 0">Belum memiliki akun? <a href="#register" data-page="register" style="color:var(--blue)">Registrasi</a></p></div></div>`);
}
function renderRegister() {
  shell(`<div class="auth-wrap"><div class="auth-head"><div class="brand-mark">LK</div><h2>Registrasi Pelanggan</h2><p class="muted">Buat akun untuk menggunakan layanan laundry.</p></div><div class="card">${takeMessage()}<form id="register-form"><div class="field"><label>Nama Lengkap</label><input name="name" required minlength="3" placeholder="Nama pelanggan"></div><div class="field"><label>Email</label><input name="email" required type="email" placeholder="nama@email.com"></div><div class="field"><label>Password</label><input name="password" required type="password" minlength="6" placeholder="Minimal 6 karakter"></div><button class="btn" style="width:100%" type="submit">Buat Akun</button></form><p class="small muted" style="text-align:center;margin:14px 0 0">Sudah memiliki akun? <a href="#login" data-page="login" style="color:var(--blue)">Login</a></p></div></div>`);
}
function renderCustomer() {
  const orders = ordersForCustomer();
  const active = orders.filter(o => o.status !== 'Selesai').length;
  const done = orders.filter(o => o.status === 'Selesai').length;
  const rows = orders.slice(0,5).map(o => `<tr><td><b>${escapeHTML(o.id)}</b></td><td>${escapeHTML(o.serviceName)}</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}</td><td><button class="btn btn-outline btn-small" data-page="tracking">Lihat</button></td></tr>`).join('') || `<tr><td colspan="5" class="empty">Belum ada pesanan. Silakan buat pesanan pertama.</td></tr>`;
  shell(`<div class="page-title"><div class="eyebrow">Area pelanggan</div><h2>Selamat datang, ${escapeHTML(currentUser.name)}</h2><p>Berikut ringkasan pesanan laundry kamu.</p></div>${takeMessage()}<section class="grid grid-3"><div class="card stat"><div><div class="muted small">Pesanan Aktif</div><strong>${active}</strong></div><span class="stat-icon">◷</span></div><div class="card stat"><div><div class="muted small">Pesanan Selesai</div><strong>${done}</strong></div><span class="stat-icon">✓</span></div><div class="card stat"><div><div class="muted small">Total Pesanan</div><strong>${orders.length}</strong></div><span class="stat-icon">▤</span></div></section><div class="section-head"><div><h2>Pesanan Terbaru</h2><p>Periksa perkembangan pesanan terakhir.</p></div><button class="btn" data-page="order">+ Buat Pesanan</button></div><div class="card table-wrap"><table><thead><tr><th>Nomor Pesanan</th><th>Layanan</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
function renderOrder() {
  const options = db.services.map(s => `<option value="${s.id}">${escapeHTML(s.name)} - ${money(s.price)}/${escapeHTML(s.unit)}</option>`).join('');
  shell(`<div class="page-title"><div class="eyebrow">Pelanggan</div><h2>Buat Pesanan Laundry</h2><p>Isi data cucian untuk melihat perkiraan biaya sebelum pesanan dikirim.</p></div><div class="card form-card">${takeMessage()}<form id="order-form"><div class="field"><label>Jenis Layanan</label><select name="serviceId" id="order-service" required><option value="">Pilih layanan</option>${options}</select></div><div class="field"><label>Berat Cucian (kg)</label><input name="weight" id="order-weight" type="number" min="0.1" step="0.1" required placeholder="Contoh: 3"></div><div class="field"><label>Catatan (opsional)</label><textarea name="note" placeholder="Catatan khusus untuk pesanan"></textarea></div><div class="notice" style="margin-bottom:15px">Perkiraan harga: <b id="price-estimate">Rp0</b><br><span class="small">Perhitungan: tarif layanan × berat cucian.</span></div><button class="btn" type="submit">Kirim Pesanan</button></form></div>`);
}
function renderTracking() {
  const orders = ordersForCustomer();
  const cards = orders.map(o => {
    const active = STATUSES.indexOf(o.status);
    const progress = STATUSES.map((s,i) => `<div class="progress-step ${i < active ? 'done' : i === active ? 'current' : ''}"><div class="progress-dot"></div><span>${escapeHTML(s.replace(' ', '\n'))}</span></div>`).join('');
    return `<article class="card" style="margin-bottom:15px"><div class="toolbar"><div><b>${escapeHTML(o.id)}</b><div class="muted small">${escapeHTML(o.serviceName)} · ${o.weight} kg · ${dateText(o.createdAt)}</div></div>${statusBadge(o.status)}</div><div class="progress">${progress}</div><div class="small muted" style="margin-top:12px">Total pesanan: <b>${money(o.total)}</b>${o.note ? ` · Catatan: ${escapeHTML(o.note)}` : ''}</div></article>`;
  }).join('') || `<div class="card empty">Belum ada pesanan yang dapat dilacak.</div>`;
  shell(`<div class="page-title"><div class="eyebrow">Pelanggan</div><h2>Tracking Pesanan</h2><p>Status pengerjaan diperbarui oleh admin laundry.</p></div>${takeMessage()}${cards}`);
}
function renderHistory() {
  const rows = ordersForCustomer().map(o => `<tr><td><b>${escapeHTML(o.id)}</b></td><td>${dateText(o.createdAt)}</td><td>${escapeHTML(o.serviceName)}</td><td>${o.weight} kg</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">Belum ada riwayat pesanan.</td></tr>`;
  shell(`<div class="page-title"><div class="eyebrow">Pelanggan</div><h2>Riwayat Pesanan</h2><p>Daftar pesanan yang pernah dibuat melalui website.</p></div><div class="card table-wrap"><table><thead><tr><th>Nomor Pesanan</th><th>Tanggal</th><th>Layanan</th><th>Berat</th><th>Total Harga</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
function renderAdmin() {
  const counts = [db.orders.length, db.orders.filter(o=>o.status!=='Selesai').length, db.orders.filter(o=>o.status==='Selesai').length];
  shell(`<div class="page-title"><div class="eyebrow">Area admin</div><h2>Dashboard Admin</h2><p>Ringkasan pesanan dan akses cepat untuk pengelolaan laundry.</p></div><section class="grid grid-3"><div class="card stat"><div><div class="muted small">Total Pesanan</div><strong>${counts[0]}</strong></div><span class="stat-icon">▤</span></div><div class="card stat"><div><div class="muted small">Sedang Diproses</div><strong>${counts[1]}</strong></div><span class="stat-icon">◷</span></div><div class="card stat"><div><div class="muted small">Selesai</div><strong>${counts[2]}</strong></div><span class="stat-icon">✓</span></div></section><div class="section-head"><div><h2>Menu Pengelolaan</h2><p>Pilih aktivitas yang ingin dilakukan.</p></div></div><section class="grid grid-2"><div class="card"><h3>Data Pesanan</h3><p class="muted">Lihat detail pesanan dan perbarui status pengerjaan.</p><button class="btn btn-outline" data-page="admin-orders">Buka Pesanan</button></div><div class="card"><h3>Pengelolaan Layanan</h3><p class="muted">Atur nama layanan dan harga laundry.</p><button class="btn btn-outline" data-page="services">Buka Layanan</button></div></section>`);
}
function renderAdminOrders() {
  const rows = db.orders.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o => `<tr><td><b>${escapeHTML(o.id)}</b></td><td>${escapeHTML(o.customerName)}</td><td>${escapeHTML(o.serviceName)}</td><td>${o.weight} kg</td><td>${money(o.total)}</td><td><select class="inline-select" id="status-${o.id}">${STATUSES.map(s=>`<option ${s===o.status?'selected':''}>${escapeHTML(s)}</option>`).join('')}</select></td><td><button class="btn btn-small" data-action="save-status" data-id="${o.id}">Simpan</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">Belum ada pesanan.</td></tr>`;
  shell(`<div class="page-title"><div class="eyebrow">Admin laundry</div><h2>Pengelolaan Pesanan</h2><p>Periksa data pesanan dan ubah status sesuai tahapan pengerjaan.</p></div>${takeMessage()}<div class="card table-wrap"><table><thead><tr><th>No. Pesanan</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
function renderServices() {
  const editing = editingServiceId ? serviceById(editingServiceId) : null;
  const rows = db.services.map(s=>`<tr><td>${escapeHTML(s.name)}</td><td>${money(s.price)} / ${escapeHTML(s.unit)}</td><td><button class="btn btn-outline btn-small" data-action="edit-service" data-id="${s.id}">Edit</button> <button class="btn btn-danger btn-small" data-action="delete-service" data-id="${s.id}">Hapus</button></td></tr>`).join('');
  shell(`<div class="page-title"><div class="eyebrow">Admin laundry</div><h2>Pengelolaan Layanan</h2><p>Tambah atau ubah pilihan layanan dan tarif yang ditampilkan kepada pelanggan.</p></div>${takeMessage()}<div class="grid grid-2"><div class="card"><h3>${editing ? 'Ubah Layanan' : 'Tambah Layanan'}</h3><form id="service-form"><input type="hidden" name="id" value="${editing ? editing.id : ''}"><div class="field"><label>Nama Layanan</label><input name="name" required minlength="3" value="${editing ? escapeHTML(editing.name) : ''}" placeholder="Contoh: Cuci Kering"></div><div class="field"><label>Harga per kg (Rp)</label><input name="price" type="number" required min="1" step="1" value="${editing ? editing.price : ''}" placeholder="Contoh: 7000"></div><div class="field"><label>Satuan</label><select name="unit"><option value="kg" ${!editing || editing.unit==='kg'?'selected':''}>kg</option></select></div><button class="btn" type="submit">${editing ? 'Simpan Perubahan' : 'Tambah Layanan'}</button>${editing ? ' <button class="btn btn-outline" type="button" data-action="cancel-edit">Batal</button>' : ''}</form></div><div class="card"><h3>Daftar Layanan</h3><div class="table-wrap"><table style="min-width:300px"><thead><tr><th>Nama Layanan</th><th>Harga</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`);
}
function renderOwner() {
  const total = db.orders.reduce((sum,o)=>sum+Number(o.total||0),0);
  const completed = db.orders.filter(o=>o.status==='Selesai');
  const rows = db.orders.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o=>`<tr><td>${escapeHTML(o.id)}</td><td>${escapeHTML(o.customerName)}</td><td>${escapeHTML(o.serviceName)}</td><td>${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">Belum ada data pesanan.</td></tr>`;
  shell(`<div class="page-title"><div class="eyebrow">Area pemilik</div><h2>Ringkasan Laundry</h2><p>Informasi umum untuk memantau aktivitas pesanan dan transaksi.</p></div><section class="grid grid-3"><div class="card stat"><div><div class="muted small">Total Pesanan</div><strong>${db.orders.length}</strong></div><span class="stat-icon">▤</span></div><div class="card stat"><div><div class="muted small">Pesanan Selesai</div><strong>${completed.length}</strong></div><span class="stat-icon">✓</span></div><div class="card stat"><div><div class="muted small">Total Nilai Pesanan</div><strong style="font-size:19px">${money(total)}</strong></div><span class="stat-icon">Rp</span></div></section><div class="section-head"><div><h2>Ringkasan Pesanan</h2><p>Data berikut merupakan ringkasan pesanan yang tercatat pada sistem.</p></div></div><div class="card table-wrap"><table><thead><tr><th>No. Pesanan</th><th>Pelanggan</th><th>Layanan</th><th>Nilai Pesanan</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><div class="notice" style="margin-top:15px">Ringkasan ini hanya menampilkan nilai pesanan yang tercatat dan bukan laporan keuangan usaha secara menyeluruh.</div>`);
}
function render() {
  if (currentUser) {
    const allowed = currentUser.role === 'customer' ? ['customer','order','tracking','history'] : currentUser.role === 'admin' ? ['admin','admin-orders','services'] : ['owner'];
    if (!allowed.includes(currentPage) && currentPage !== 'home') currentPage = currentUser.role === 'customer' ? 'customer' : currentUser.role === 'admin' ? 'admin' : 'owner';
  } else if (!['home','login','register'].includes(currentPage)) currentPage = 'home';
  const pages = { home:renderHome, login:renderLogin, register:renderRegister, customer:renderCustomer, order:renderOrder, tracking:renderTracking, history:renderHistory, admin:renderAdmin, 'admin-orders':renderAdminOrders, services:renderServices, owner:renderOwner };
  (pages[currentPage] || renderHome)();
}

async function hashPassword(password) {
  if (!window.crypto || !window.crypto.subtle) throw new Error('Fitur hash password tidak tersedia. Jalankan website melalui localhost, misalnya menggunakan Live Server.');
  const bytes = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function go(page) { currentPage = page; editingServiceId = null; render(); window.scrollTo(0,0); }
window.addEventListener('hashchange', () => { currentPage = (location.hash || '#home').slice(1); render(); });

const app = document.getElementById('app');
app.addEventListener('click', async (event) => {
  const pageTarget = event.target.closest('[data-page]');
  if (pageTarget) { event.preventDefault(); go(pageTarget.dataset.page); return; }
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;
  if (action === 'logout') { currentUser = null; sessionStorage.removeItem(SESSION_KEY); setMessage('success','Kamu sudah keluar dari akun.'); go('home'); }
  if (action === 'save-status') {
    const id = actionTarget.dataset.id; const order = db.orders.find(o=>o.id===id); const select = document.getElementById(`status-${id}`);
    if (!order || !select) return;
    order.status = select.value; saveDB(); setMessage('success',`Status pesanan ${id} berhasil diperbarui.`); renderAdminOrders();
  }
  if (action === 'edit-service') { editingServiceId = actionTarget.dataset.id; renderServices(); }
  if (action === 'cancel-edit') { editingServiceId = null; renderServices(); }
  if (action === 'delete-service') {
    const id = actionTarget.dataset.id;
    if (db.orders.some(o=>o.serviceId===id)) { setMessage('error','Layanan tidak dapat dihapus karena sudah digunakan pada pesanan.'); renderServices(); return; }
    db.services = db.services.filter(s=>s.id!==id); saveDB(); setMessage('success','Layanan berhasil dihapus.'); renderServices();
  }
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'order-service' || event.target.id === 'order-weight') updateEstimate();
});
app.addEventListener('change', (event) => {
  if (event.target.id === 'order-service' || event.target.id === 'order-weight') updateEstimate();
});
function updateEstimate() {
  const serviceEl = document.getElementById('order-service'); const weightEl = document.getElementById('order-weight'); const output = document.getElementById('price-estimate');
  if (!serviceEl || !weightEl || !output) return;
  const service = serviceById(serviceEl.value); const weight = Number(weightEl.value);
  output.textContent = service && weight > 0 ? money(service.price * weight) : 'Rp0';
}

app.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target; const formId = form.getAttribute('id'); const data = new FormData(form);
  if (formId === 'login-form') {
    try {
      const email = String(data.get('email')).trim().toLowerCase(); const password = String(data.get('password'));
      const user = db.users.find(u=>u.email.toLowerCase()===email);
      if (!user || user.passwordHash !== await hashPassword(password)) { setMessage('error','Email atau password tidak sesuai.'); renderLogin(); return; }
      currentUser = { id:user.id, name:user.name, email:user.email, role:user.role }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      go(user.role === 'customer' ? 'customer' : user.role === 'admin' ? 'admin' : 'owner');
    } catch (err) { setMessage('error',err.message || 'Login gagal.'); renderLogin(); }
  }
  if (formId === 'register-form') {
    try {
      const name = String(data.get('name')).trim(); const email = String(data.get('email')).trim().toLowerCase(); const password = String(data.get('password'));
      if (name.length < 3) { setMessage('error','Nama minimal terdiri dari 3 karakter.'); renderRegister(); return; }
      if (password.length < 6) { setMessage('error','Password minimal terdiri dari 6 karakter.'); renderRegister(); return; }
      if (db.users.some(u=>u.email.toLowerCase()===email)) { setMessage('error','Email sudah terdaftar. Gunakan email lain.'); renderRegister(); return; }
      const hash = await hashPassword(password);
      const user = { id:newId('USR'), name, email, role:'customer', passwordHash:hash };
      db.users.push(user); saveDB(); currentUser = { id:user.id, name:user.name, email:user.email, role:user.role }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); go('customer');
    } catch (err) { setMessage('error',err.message || 'Registrasi gagal.'); renderRegister(); }
  }
  if (formId === 'order-form') {
    const service = serviceById(String(data.get('serviceId'))); const weight = Number(data.get('weight'));
    if (!service) { setMessage('error','Pilih jenis layanan terlebih dahulu.'); renderOrder(); return; }
    if (!Number.isFinite(weight) || weight <= 0) { setMessage('error','Berat cucian harus lebih besar dari 0 kg.'); renderOrder(); return; }
    const order = { id:newId('LDR'), customerId:currentUser.id, customerName:currentUser.name, serviceId:service.id, serviceName:service.name, weight, note:String(data.get('note')||'').trim(), total:Math.round(service.price*weight), status:STATUSES[0], createdAt:new Date().toISOString() };
    db.orders.push(order); saveDB(); setMessage('success',`Pesanan ${order.id} berhasil dibuat.`); go('tracking');
  }
  if (formId === 'service-form') {
    const id = String(data.get('id')||''); const name = String(data.get('name')).trim(); const price = Number(data.get('price')); const unit = String(data.get('unit')||'kg');
    if (name.length < 3 || !Number.isFinite(price) || price <= 0) { setMessage('error','Nama layanan minimal 3 karakter dan harga harus lebih besar dari 0.'); renderServices(); return; }
    if (id) {
      const service = serviceById(id); if (service) { service.name = name; service.price = price; service.unit = unit; db.orders.filter(o=>o.serviceId===id).forEach(o=>{ o.serviceName=name; }); }
      editingServiceId = null; setMessage('success','Layanan berhasil diperbarui.');
    } else {
      db.services.push({ id:newId('SRV'), name, price, unit }); setMessage('success','Layanan baru berhasil ditambahkan.');
    }
    saveDB(); renderServices();
  }
});

try {
  const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  if (saved && db.users.some(u=>u.id===saved.id)) currentUser = saved;
} catch (_) { currentUser = null; }
if (currentUser) currentPage = currentUser.role === 'customer' ? 'customer' : currentUser.role === 'admin' ? 'admin' : 'owner';
render();
