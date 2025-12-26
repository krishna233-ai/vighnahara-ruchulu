import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

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
const googleProvider = new GoogleAuthProvider();

// 🔐 Owner email
const OWNER_EMAIL = "nihalmattaparthi@gmail.com";

let cart = [];
let authMode = 'login';
let currentUser = null;

function goToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Cart functions
function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const bottomNav = document.getElementById('bottomNav');

  const isOpening = !drawer.classList.contains('active');

  drawer.classList.toggle('active');
  overlay.classList.toggle('active');

  // Hide bottom navigation when cart is open on mobile
  if (bottomNav && window.innerWidth <= 768) {
    bottomNav.style.display = isOpening ? 'none' : 'flex';
  }
}

function addToCart(name, size, price) {
  const existing = cart.find(i => i.name === name && i.size === size);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name, size, price, quantity: 1 });
  }
  renderCart();
  showToast(`${name} (${size}) added to cart!`);
}

function updateQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  renderCart();
  showToast('Item removed from cart');
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCart() {
  const cartBody = document.getElementById('cartBody');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = '₹' + getCartTotal();
  
  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <p>Your cart is empty</p>
      </div>
    `;
    return;
  }
  
  cartBody.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.size} • ₹${item.price} each</div>
      </div>
      <div class="cart-item-controls">
        <div class="quantity-controls">
          <button class="qty-btn" onclick="updateQty(${index}, -1)">−</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
        </div>
        <div class="cart-item-price">₹${item.price * item.quantity}</div>
        <button class="remove-item" onclick="removeItem(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

/* ---------- AUTH MODAL HELPERS ---------- */
function openLogin() {
  document.getElementById('loginOverlay').classList.add('active');
}

function closeLogin() {
  document.getElementById('loginOverlay').classList.remove('active');
}

// handler for top Login button
function handleAuthButton() {
  if (currentUser) {
    signOut(auth);
  } else {
    openLogin();
  }
}

function closeLoginIfClickOutside(e) {
  if (e.target === document.getElementById('loginOverlay')) {
    closeLogin();
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const modalTitle = document.getElementById('modalTitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  
  if (mode === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    modalTitle.textContent = 'Login';
    submitBtn.textContent = 'Login';
  } else {
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
    modalTitle.textContent = 'Create Account';
    submitBtn.textContent = 'Sign Up';
  }
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  try {
    if (authMode === 'login') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      showToast('Login successful!');
      
      // ✅ If owner -> go to owner.html
      if (user.email === OWNER_EMAIL) {
        window.location.href = 'owner.html';
        return;
      }
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast('Account created successfully!');
    }
    document.getElementById('authPassword').value = '';
    closeLogin();
  } catch (err) {
    alert(err.message || 'Authentication error');
  }
}

async function googleLogin() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    showToast('Logged in with Google!');
    if (user.email === OWNER_EMAIL) {
      window.location.href = 'owner.html';
      return;
    }
    closeLogin();
  } catch (err) {
    alert(err.message || 'Google sign-in error');
  }
}

// Update UI on login/logout + redirect owner
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const userInfo = document.getElementById('userInfo');
  const authBtn = document.getElementById('authBtn');
  const callBtn = document.getElementById('callBtn');
  const navMenu = document.getElementById('navMenu');
  const myOrdersLink = document.getElementById('myOrdersLink');
  const bottomMyOrdersBtn = document.getElementById('bottomMyOrdersBtn');
  
  if (user) {
    const email = user.email || 'User';

    // if owner hits index, redirect to owner panel
    if (email === OWNER_EMAIL) {
      const path = window.location.pathname;
      if (path.endsWith('index.html') || path === '/' || path === '') {
        window.location.href = 'owner.html';
        return;
      }
    }

    userInfo.textContent = email;
    userInfo.style.display = 'inline-flex';
    authBtn.style.display = 'none';
    callBtn.style.display = 'inline-flex';

    // show top nav only on desktop
    if (window.innerWidth > 768) {
      navMenu.style.display = 'flex';
    } else {
      navMenu.style.display = 'none';
    }

    myOrdersLink.style.display = 'inline-block';
    bottomMyOrdersBtn.style.display = 'flex';
  } else {
    userInfo.style.display = 'none';
    authBtn.style.display = 'inline-flex';
    authBtn.textContent = 'Login';
    callBtn.style.display = 'none';
    navMenu.style.display = 'none';
    myOrdersLink.style.display = 'none';
    bottomMyOrdersBtn.style.display = 'none';
  }
});

async function placeOrder() {
  if (!currentUser) {
    alert('Please login to place an order');
    openLogin();
    return;
  }
  
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const area = document.getElementById('custArea').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  
  if (!name || !phone || !area || !address) {
    alert('Please fill all fields');
    return;
  }
  
  const orderData = {
    userId: currentUser.uid,
    userEmail: currentUser.email || '',
    customerName: name,
    phone,
    area,
    address,
    items: cart,
    totalAmount: getCartTotal(),
    status: 'Pending',
    createdAt: Date.now()
  };
  
  try {
    await addDoc(collection(db, 'orders'), orderData);
    alert('Order placed successfully! We will contact you shortly.');
    cart = [];
    renderCart();
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custArea').value = '';
    document.getElementById('custAddress').value = '';
    toggleCart();
    showToast('Order placed successfully!');
  } catch (err) {
    console.error(err);
    alert('Error placing order. Please check Firebase rules/config.');
  }
}

// Expose to window for inline handlers
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.setAuthMode = setAuthMode;
window.submitAuth = submitAuth;
window.googleLogin = googleLogin;
window.placeOrder = placeOrder;
window.closeLoginIfClickOutside = closeLoginIfClickOutside;
window.handleAuthButton = handleAuthButton;
window.closeLogin = closeLogin;
window.goToSection = goToSection;

renderCart();
