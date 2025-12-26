import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, getDocs, query, orderBy, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// 🔐 owner email
const OWNER_EMAILS = [
  "nihalmattaparthi@gmail.com"
];

const firebaseConfig = {
  apiKey: "AIzaSyCY30pHHpBY-p9shPmR2p4-xZIhaOS2kA4",
  authDomain: "vighnahararuchulu.firebaseapp.com",
  projectId: "vighnahararuchulu",
  storageBucket: "vighnahararuchulu.firebasestorage.app",
  messagingSenderId: "142383068002",
  appId: "1:142383068002:web:6ae8b78732ce934590b23b",
  measurementId: "G-V5VXJ87M3K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allOrders = [];
let currentFilter = 'all';
let currentUser = null;

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

function formatDate(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-IN',{
    day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit'
  });
}

function getStatusClass(status){
  const s = (status || 'Pending').toLowerCase();
  if(s.startsWith('delivered')) return 'status-delivered';
  if(s.startsWith('accepted') || s === 'processing') return 'status-accepted';
  if(s.startsWith('reject') || s.startsWith('cancel')) return 'status-rejected';
  return 'status-pending';
}

function setFilter(btn){
  const status = btn.getAttribute('data-status');
  currentFilter = status;
  document.querySelectorAll('.filter-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders();
}

function renderOrders(){
  const listEl = document.getElementById('ordersList');
  const countText = document.getElementById('orderCountText');

  if(allOrders.length === 0){
    countText.textContent = 'Total orders: 0';
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No orders found.</p>
      </div>`;
    return;
  }

  let filtered = allOrders;
  if(currentFilter !== 'all'){
    filtered = allOrders.filter(o => (o.status || 'Pending') === currentFilter);
  }

  countText.textContent = `Total orders: ${filtered.length}`;

  listEl.innerHTML = filtered.map(order => {
    const itemsHtml = (order.items||[]).map(
      it => `<li>${it.name} (${it.size}) × ${it.quantity}</li>`
    ).join('');

    const statusClass = getStatusClass(order.status);

    return `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">Order ID: ${order.id}</div>
            <div class="order-time">Placed: ${formatDate(order.createdAt)}</div>
          </div>
          <span class="status-badge ${statusClass}">
            ${order.status || 'Pending'}
          </span>
        </header>

        <section>
          <div class="order-section-title">Customer</div>
          <div class="order-customer">${order.customerName || 'Unknown'}</div>
          <div class="order-contact">📞 ${order.phone || '-'} • 📧 ${order.userEmail || '-'}</div>
          <div class="order-address">📍 ${order.area || ''} — ${order.address || ''}</div>
        </section>

        <section class="order-items">
          <div class="order-section-title">Items</div>
          <ul>${itemsHtml}</ul>
        </section>

        <footer class="order-footer">
          <div class="order-total">Total: ₹${order.totalAmount || 0}</div>
          <div class="status-controls">
            <select class="status-select" id="status-${order.id}">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Accepted" ${order.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Rejected" ${order.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <button class="btn-save" onclick="saveStatus('${order.id}')">Save</button>
          </div>
        </footer>
      </article>
    `;
  }).join('');
}

async function loadOrders(){
  const listEl = document.getElementById('ordersList');
  listEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Loading orders...</p>
    </div>`;

  try{
    const qRef = query(collection(db,'orders'), orderBy('createdAt','desc'));
    const snap = await getDocs(qRef);
    allOrders = [];
    snap.forEach(docSnap => {
      allOrders.push({id:docSnap.id, ...docSnap.data()});
    });
    renderOrders();
  }catch(err){
    console.error(err);
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Unable to load orders. Please check Firestore rules/config.</p>
      </div>`;
  }
}

async function saveStatus(orderId){
  const select = document.getElementById(`status-${orderId}`);
  if(!select) return;
  const newStatus = select.value;

  try{
    const ref = doc(db,'orders',orderId);
    await updateDoc(ref,{ status:newStatus });
    const idx = allOrders.findIndex(o => o.id === orderId);
    if(idx !== -1){
      allOrders[idx].status = newStatus;
    }
    renderOrders();
    showToast('Status updated');
  }catch(err){
    console.error(err);
    alert('Unable to update status. Please check rules.');
  }
}

function logout(){
  signOut(auth).then(()=>{
    window.location.href = 'index.html';
  });
}

onAuthStateChanged(auth,(user)=>{
  if(!user){
    alert('Not logged in. Please login as owner from main site.');
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  const email = user.email || '';
  document.getElementById('ownerChip').textContent = email;

  const isOwner = OWNER_EMAILS.includes(email);
  if(!isOwner){
    alert('You do not have permission to access the owner panel.');
    window.location.href = 'index.html';
    return;
  }

  loadOrders();
});

// expose for HTML
window.setFilter = setFilter;
window.saveStatus = saveStatus;
window.logout = logout;
