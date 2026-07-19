// ====== State ======
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];

// ====== DOM refs ======
const productGrid = document.getElementById('product-grid');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const userBalance = document.getElementById('user-balance');
const userName = document.getElementById('user-name');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const navAdmin = document.getElementById('nav-admin');

// ====== API calls ======
const API = 'http://localhost:5000/api';

async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi');
  return data;
}

// ====== Auth ======
async function login(username, password) {
  const data = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('token', data.token);
  currentUser = data.user;
  updateUI();
  closeModal(loginModal);
  loadProducts();
  return data;
}

async function register(username, email, password) {
  const data = await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  localStorage.setItem('token', data.token);
  currentUser = data.user;
  updateUI();
  closeModal(registerModal);
  loadProducts();
  return data;
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  updateUI();
  loadProducts();
}

async function getMe() {
  try {
    const data = await fetchAPI('/auth/me');
    currentUser = data;
    updateUI();
  } catch {
    currentUser = null;
    updateUI();
  }
}

// ====== Products ======
async function loadProducts() {
  try {
    products = await fetchAPI('/products');
    renderProducts(products);
  } catch (err) {
    productGrid.innerHTML = `<p>Không thể tải sản phẩm: ${err.message}</p>`;
  }
}

function renderProducts(productList) {
  if (!productList.length) {
    productGrid.innerHTML = '<p>Chưa có sản phẩm nào.</p>';
    return;
  }
  productGrid.innerHTML = productList.map(p => {
    const finalPrice = p.finalPrice || p.price;
    const oldPrice = p.originalPrice || p.price;
    const discount = p.discount || 0;
    return `
      <div class="product-card" data-id="${p._id}">
        <div class="img-placeholder"><i class="fas fa-gamepad fa-2x"></i></div>
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="game">${p.game}</div>
          <div class="price">
            ${finalPrice.toLocaleString()} ₫
            ${discount > 0 ? `<span class="old-price">${oldPrice.toLocaleString()} ₫</span>` : ''}
            ${discount > 0 ? `<span class="discount">-${discount}%</span>` : ''}
          </div>
          <div class="stock">${p.stock > 0 ? `Còn ${p.stock} acc` : 'Hết hàng'}</div>
          <button class="btn btn-primary btn-buy" ${p.stock <= 0 ? 'disabled' : ''} onclick="addToCart('${p._id}')">
            <i class="fas fa-cart-plus"></i> Thêm giỏ
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ====== Cart ======
function addToCart(productId) {
  const product = products.find(p => p._id === productId);
  if (!product || product.stock <= 0) return alert('Sản phẩm này đã hết hàng!');
  const existing = cart.find(item => item.product === productId);
  if (existing) {
    if (existing.quantity >= product.stock) return alert('Không đủ hàng trong kho!');
    existing.quantity++;
  } else {
    cart.push({ product: productId, quantity: 1, price: product.finalPrice || product.price });
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product !== productId);
  saveCart();
  updateCartUI();
  renderCart();
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.product === productId);
  if (!item) return;
  const product = products.find(p => p._id === productId);
  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  if (product && newQty > product.stock) return alert('Vượt quá số lượng có sẵn!');
  item.quantity = newQty;
  saveCart();
  updateCartUI();
  renderCart();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  cartCount.textContent = count;
}

function renderCart() {
  if (!cart.length) {
    cartItems.innerHTML = '<p>Giỏ hàng trống.</p>';
    cartTotal.textContent = 'Tổng: 0 ₫';
    return;
  }
  let html = '';
  let total = 0;
  cart.forEach(item => {
    const product = products.find(p => p._id === item.product);
    if (!product) return;
    const price = item.price || product.finalPrice || product.price;
    const subtotal = price * item.quantity;
    total += subtotal;
    html += `
      <div class="cart-item">
        <div>
          <strong>${product.name}</strong> (${product.game})
          <div>
            <button onclick="updateQuantity('${item.product}', -1)">-</button>
            ${item.quantity}
            <button onclick="updateQuantity('${item.product}', 1)">+</button>
          </div>
        </div>
        <div>${subtotal.toLocaleString()} ₫ <button onclick="removeFromCart('${item.product}')" style="color:red;border:none;background:none;cursor:pointer;"><i class="fas fa-trash"></i></button></div>
      </div>
    `;
  });
  cartItems.innerHTML = html;
  cartTotal.textContent = `Tổng: ${total.toLocaleString()} ₫`;
}

// ====== Checkout ======
async function checkout() {
  if (!currentUser) {
    alert('Vui lòng đăng nhập để thanh toán.');
    openModal(loginModal);
    return;
  }
  if (!cart.length) return alert('Giỏ hàng trống.');
  try {
    const items = cart.map(i => ({ product: i.product, quantity: i.quantity }));
    const order = await fetchAPI('/orders', {
      method: 'POST',
      body: JSON.stringify({ items, paymentMethod: 'balance' }),
    });
    alert('Đặt hàng thành công! Số dư đã được trừ.');
    cart = [];
    saveCart();
    updateCartUI();
    closeModal(cartModal);
    await getMe();
    loadProducts();
  } catch (err) {
    alert('Lỗi thanh toán: ' + err.message);
  }
}

// ====== UI Helpers ======
function updateUI() {
  if (currentUser) {
    userName.textContent = currentUser.username;
    userBalance.style.display = 'inline';
    userBalance.innerHTML = `<i class="fas fa-coins"></i> ${currentUser.balance.toLocaleString()} ₫`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    if (currentUser.role === 'admin') navAdmin.style.display = 'inline';
    else navAdmin.style.display = 'none';
  } else {
    userName.textContent = '';
    userBalance.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    navAdmin.style.display = 'none';
  }
}

function openModal(modal) { modal.style.display = 'flex'; }
function closeModal(modal) { modal.style.display = 'none'; }

// ====== Event Listeners ======
document.addEventListener('DOMContentLoaded', () => {
  getMe();
  loadProducts();
  updateCartUI();

  // Login
  loginBtn.addEventListener('click', () => openModal(loginModal));
  document.querySelectorAll('.modal .close').forEach(el => {
    el.addEventListener('click', () => {
      closeModal(el.closest('.modal'));
    });
  });
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) closeModal(e.target);
  });

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try { await login(username, password); } catch (err) { alert(err.message); }
  });

  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    try { await register(username, email, password); } catch (err) { alert(err.message); }
  });

  document.getElementById('show-register').addEventListener('click', e => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(registerModal);
  });
  document.getElementById('show-login').addEventListener('click', e => {
    e.preventDefault();
    closeModal(registerModal);
    openModal(loginModal);
  });

  logoutBtn.addEventListener('click', logout);

  // Cart
  document.getElementById('cart-btn').addEventListener('click', () => {
    renderCart();
    openModal(cartModal);
  });
  document.getElementById('checkout-btn').addEventListener('click', checkout);

  // Admin nav
  navAdmin.addEventListener('click', () => {
    window.location.href = 'admin.html';
  });
});

// Expose to global for onclick
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
