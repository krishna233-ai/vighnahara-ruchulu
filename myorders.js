import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, getDocs, query, where, doc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// same config as index.js
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

let currentUser = null;

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function formatDate(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-IN',{
    day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit'
  });
}

async function loadOrders(){
  if(!currentUser) return;
  const listEl = document.getElementById('ordersList');
  listEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Loading your orders...</p>
    </div>`;

  try{
    const qRef = query(
      collection(db,'orders'),
      where('userId','==',currentUser.uid)
    );
    const snap = await getDocs(qRef);
    const orders = [];
    snap.forEach(docSnap=>orders.push({id:docSnap.id,...docSnap.data()}));
    orders.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

    if(orders.length===0){
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>You have not placed any orders yet.</p>
        </div>`;
      return;
    }

    const now = Date.now();
    const ONE_DAY = 24*60*60*1000;

    listEl.innerHTML = orders.map(order=>{
      const canCancel =
        order.status !== 'Cancelled by customer' &&
        order.status !== 'Rejected' &&
        order.status !== 'Delivered' &&
        order.createdAt &&
        (now - order.createdAt) <= ONE_DAY;

      let statusClass = 'status-pending';
      const s = (order.status || 'Pending').toLowerCase();
      if(s.startsWith('accepted') || s==='processing') statusClass='status-accepted';
      if(s.startsWith('reject') || s.startsWith('cancel')) statusClass='status-cancelled';
      if(s.startsWith('delivered')) statusClass='status-delivered';

      const itemsHtml = (order.items||[]).map(
        it=>`<li>${it.name} (${it.size}) × ${it.quantity}</li>`
      ).join('');

      return `
        <article class="order-card">
          <header class="order-header">
            <div>
              <div class="order-id">Order ID: ${order.id}</div>
              <div class="order-meta">Placed on ${formatDate(order.createdAt)}</div>
            </div>
            <span class="order-status-pill ${statusClass}">
              ${order.status || 'Pending'}
            </span>
          </header>
          <section class="order-items">
            <strong>Items:</strong>
            <ul>${itemsHtml}</ul>
          </section>
          <footer class="order-footer">
            <div class="order-total">Total: ₹${order.totalAmount || 0}</div>
            <button class="btn-cancel"
              ${canCancel ? `onclick="cancelOrder('${order.id}', ${order.createdAt})"` : 'disabled'}>
              ${canCancel ? 'Cancel Order' : 'Cannot cancel'}
            </button>
          </footer>
        </article>
      `;
    }).join('');
  }catch(err){
    console.error('Error loading orders:', err);
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Unable to load your orders. Please try again later.</p>
      </div>`;
  }
}

async function cancelOrder(orderId, createdAt){
  const ONE_DAY = 24*60*60*1000;
  const now = Date.now();
  if((now-createdAt)>ONE_DAY){
    alert('You can cancel an order only within 24 hours of placing it.');
    return;
  }
  if(!confirm('Are you sure you want to cancel this order?')) return;
  try{
    const ref = doc(db,'orders',orderId);
    await updateDoc(ref,{
      status:'Cancelled by customer',
      cancelledAt:now
    });
    showToast('Order cancelled');
    loadOrders();
  }catch(err){
    console.error(err);
    alert('Unable to cancel order. Please check Firebase rules/config.');
  }
}

function logout(){
  signOut(auth).then(()=>{
    window.location.href='index.html';
  });
}

// auth listener
onAuthStateChanged(auth,(user)=>{
  if(!user){
    window.location.href='index.html';
    return;
  }
  currentUser = user;
  document.getElementById('userChip').textContent = user.email || 'User';
  loadOrders();
});

// expose for onclick
window.cancelOrder = cancelOrder;
window.logout = logout;
