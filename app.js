let cart = [];
let storeData = { isOpen: true, estimatedTime: '...', pixKey: '' };
let products = [];

async function initApp() {
    const user = checkAuth();
    if(user) {
        document.getElementById('user-info').innerHTML = `
            <span style="font-weight:600;">Olá, ${user.name.split(' ')[0]}</span>
            <button onclick="window.location.href='historico.html'" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">Pedidos</button>
            <button onclick="logout()" style="background:none; border:none; color:var(--primary-red); cursor:pointer; font-weight:bold; margin-left:15px;">Sair</button>
        `;
    }
    
    await fetchStoreConfig();
    await fetchProducts();
    setupEventListeners();
}

function setupEventListeners() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const cat = e.target.innerText.toLowerCase();
            if(cat === 'todas') renderProducts(products);
            else renderProducts(products.filter(p => p.category === cat.replace('s', '')));
        });
    });

    const orderTypeSelect = document.getElementById('order-type');
    if(orderTypeSelect) {
        orderTypeSelect.addEventListener('change', function(e) {
            document.getElementById('address-container').style.display = e.target.value === 'retirada' ? 'none' : 'block';
        });
    }
}

async function fetchStoreConfig() {
    try {
        const res = await fetch(`${API_URL}/config`);
        storeData = await res.json();
        const statusDiv = document.getElementById('store-status');
        if(statusDiv) {
            statusDiv.innerHTML = storeData.isOpen 
                ? `🟢 Aberto - Entrega em ${storeData.estimatedTime}` 
                : `🔴 Loja Fechada`;
            statusDiv.className = `status-bar ${storeData.isOpen ? 'status-open' : 'status-closed'}`;
        }
    } catch (error) { console.error(error); }
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        products = await res.json();
        renderProducts(products);
    } catch (error) { console.error(error); }
}

function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    grid.innerHTML = items.map(p => `
        <div class="product-card">
            <img src="${p.image}" class="product-img">
            <div class="product-content">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.description}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="product-price">R$ ${p.price.toFixed(2)}</span>
                    <button class="add-btn btn" onclick='addToCart(${JSON.stringify(p)})'>+</button>
                </div>
            </div>
        </div>
    `).join('');
}

function addToCart(product) {
    if(!storeData.isOpen) return alert("Loja fechada no momento!");
    const existing = cart.find(item => item.id === product.id);
    if(existing) existing.quantity++;
    else cart.push({...product, quantity: 1});
    updateCartUI();
}

function updateCartUI() {
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const btn = document.getElementById('cart-btn');
    if(count > 0) {
        btn.style.display = 'flex';
        document.getElementById('cart-count-info').innerText = `${count} itens | R$ ${total.toFixed(2)}`;
    } else {
        btn.style.display = 'none';
    }
}

async function processOrder() {
    const orderType = document.getElementById('order-type').value;
    const address = document.getElementById('address').value.trim();
    
    if(orderType === 'entrega' && address === '') {
        alert("Preencha o endereço completo!");
        document.getElementById('address').focus();
        return;
    }
    
    const user = getUser();
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const newOrder = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        items: cart,
        total: total,
        paymentMethod: document.getElementById('pay-method').value,
        orderType: orderType,
        address: orderType === 'entrega' ? address : 'Retirada no Balcão',
        observation: document.getElementById('observation').value.trim() || 'Nenhuma',
        status: 'pendente',
        date: new Date().toLocaleString('pt-BR')
    };

    if(newOrder.paymentMethod === 'pix') {
        showPixModal(newOrder);
    } else {
        await sendOrderToDatabase(newOrder);
    }
}

function showPixModal(order) {
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('pix-modal').style.display = 'block';
    document.getElementById('pix-amount').innerText = `R$ ${order.total.toFixed(2)}`;
    document.getElementById('pix-key').innerText = storeData.pixKey;
    window.pendingOrder = order;
}

async function confirmPixPayment() {
    const order = window.pendingOrder;
    const orderId = order.id.slice(-4);
    const phone = "5511987654321"; 
    const text = encodeURIComponent(`Olá! Acabei de fazer o pedido #${orderId} no app no valor de R$ ${order.total.toFixed(2)}.\n\nSegue o meu comprovante do PIX:`);
    
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    await sendOrderToDatabase(order);
}

async function sendOrderToDatabase(order) {
    try {
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(order)
        });
        alert("Pedido concluído com sucesso!");
        cart = [];
        location.href = 'historico.html';
    } catch (e) { alert("Erro ao salvar."); }
}

function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
    if(id === 'cart-modal' && show) renderCartItems();
}

function renderCartItems() {
    document.getElementById('cart-items-list').innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding:8px 0;">
            <div><strong style="color:var(--primary-red);">${item.quantity}x</strong> ${item.name}</div>
            <div style="font-weight:600;">R$ ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
}

if(document.getElementById('product-grid')) initApp();