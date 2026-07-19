// ====== Admin JS ======
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

// ====== Check auth & role ======
async function checkAdmin() {
  try {
    const user = await fetchAPI('/auth/me');
    if (user.role !== 'admin') {
      alert('Bạn không có quyền admin!');
      window.location.href = 'index.html';
    }
    document.getElementById('admin-user').textContent = user.username;
    return user;
  } catch {
    alert('Vui lòng đăng nhập!');
    window.location.href = 'index.html';
  }
}

// ====== Stats ======
async function loadStats() {
  try {
    const stats = await fetchAPI('/admin/stats');
    document.getElementById('stat-users').textContent = stats.totalUsers;
    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-orders').textContent = stats.totalOrders;
    document.getElementById('stat-revenue').textContent = stats.totalRevenue.toLocaleString() + ' ₫';
  } catch (err) { console.error(err); }
}

// ====== Products ======
async function loadProducts() {
  try {
    const products = await fetchAPI('/products');
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.game}</td>
        <td>${p.price.toLocaleString()} ₫</td>
        <td>${p.discount || 0}%</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="editProduct('${p._id}')">Sửa</button>
          <button class="btn btn-secondary btn-sm" onclick="deleteProduct('${p._id}')">Xóa</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { alert('Lỗi tải sản phẩm: ' + err.message); }
}

async function deleteProduct(id) {
  if (!confirm('Bạn có chắc muốn xóa?')) return;
  try {
    await fetchAPI(`/products/${id}`, { method: 'DELETE' });
    loadProducts();
  } catch (err) { alert(err.message); }
}

function editProduct(id) {
  document.getElementById('edit-product-id').value = id;
  document.getElementById('form-title').textContent = 'Sửa sản phẩm';
  document.getElementById('product-form-container').style.display = 'block';
  // Load dữ liệu sản phẩm lên form (gọi API)
  fetchAPI(`/products/${id}`).then(p => {
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-game').value = p.game;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-original').value = p.originalPrice || '';
    document.getElementById('p-discount').value = p.discount || 0;
    document.getElementById('p-stock').value = p.stock;
    document.getElementById('p-desc').value = p.description || '';
  }).catch(err => alert(err.message));
}

document.getElementById('add-product-btn').addEventListener('click', () => {
  document.getElementById('edit-product-id').value = '';
  document.getElementById('form-title').textContent = 'Thêm sản phẩm';
  document.getElementById('product-form').reset();
  document.getElementById('product-form-container').style.display = 'block';
});

document.getElementById('cancel-product-form').addEventListener('click', () => {
  document.getElementById('product-form-container').style.display = 'none';
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-product-id').value;
  const data = {
    name: document.getElementById('p-name').value,
    game: document.getElementById('p-game').value,
    price: Number(document.getElementById('p-price').value),
    originalPrice: Number(document.getElementById('p-original').value) || undefined,
    discount: Number(document.getElementById('p-discount').value) || 0,
    stock: Number(document.getElementById('p-stock').value) || 0,
    description: document.getElementById('p-desc').value,
  };
  try {
    if (id) {
      await fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) });
    }
    document.getElementById('product-form-container').style.display = 'none';
    loadProducts();
  } catch (err) { alert(err.message); }
});

// ====== Orders ======
async function loadOrders() {
  try {
    const orders = await fetchAPI('/orders/all');
    const tbody = document.getElementById('order-table-body');
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>${o._id.slice(-6)}</td>
        <td>${o.user?.username || 'N/A'}</td>
        <td>${o.totalAmount.toLocaleString()} ₫</td>
        <td>${o.status}</td>
        <td>${o.paymentStatus}</td>
        <td>
          <select onchange="updateOrderStatus('${o._id}', this.value)">
            <option value="pending" ${o.status==='pending'?'selected':''}>Pending</option>
            <option value="paid" ${o.status==='paid'?'selected':''}>Paid</option>
            <option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option>
            <option value="completed" ${o.status==='completed'?'selected':''}>Completed</option>
            <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) { alert('Lỗi tải đơn hàng: ' + err.message); }
}

async function updateOrderStatus(id, status) {
  try {
    await fetchAPI(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    loadOrders();
  } catch (err) { alert(err.message); }
}

// ====== Users ======
async function loadUsers() {
  try {
    const users = await fetchAPI('/admin/users');
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.balance.toLocaleString()} ₫</td>
        <td>
          <input type="number" id="topup-${u._id}" placeholder="Số tiền" />
          <button class="btn btn-primary btn-sm" onclick="topupUser('${u._id}')">Nạp</button>
        </td>
        <td>
          <select onchange="changeRole('${u._id}', this.value)">
            <option value="user" ${u.role==='user'?'selected':''}>User</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) { alert('Lỗi tải user: ' + err.message); }
}

async function topupUser(id) {
  const amount = Number(document.getElementById(`topup-${id}`).value);
  if (!amount || amount <= 0) return alert('Nhập số tiền hợp lệ');
  try {
    await fetchAPI(`/admin/users/${id}/topup`, { method: 'POST', body: JSON.stringify({ amount }) });
    loadUsers();
  } catch (err) { alert(err.message); }
}

async function changeRole(id, role) {
  try {
    await fetchAPI(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
    loadUsers();
  } catch (err) { alert(err.message); }
}

// ====== Tabs ======
document.querySelectorAll('.admin-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(btn.dataset.tab).classList.add('active');
    // Reload data
    if (btn.dataset.tab === 'tab-products') loadProducts();
    else if (btn.dataset.tab === 'tab-orders') loadOrders();
    else if (btn.dataset.tab === 'tab-users') loadUsers();
  });
});

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdmin();
  loadStats();
  loadProducts();
  // Mặc định tab products
  document.querySelector('[data-tab="tab-products"]').classList.add('active');
  document.getElementById('tab-products').classList.add('active');

  document.getElementById('admin-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
});

// Expose functions to global
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.topupUser = topupUser;
window.changeRole = changeRole;
