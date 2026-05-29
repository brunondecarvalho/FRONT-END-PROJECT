let cart = [];
// Inicializa o objeto preparado para receber o padrão do banco
let storeData = { 
    isOpen: false, 
    estimatedTime: 'Carregando...', 
    pixKey: '',
    deliveryFee: 0 
};
let products = [];

// =================================================================
// FUNÇÕES AUXILIARES DE AUTENTICAÇÃO (JWT)
// =================================================================

/**
 * Retorna os headers necessários para requisições, incluindo o Token JWT se existir.
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Função para salvar os dados após o login de sucesso
 * Pode ser invocada pela sua tela de login.html ou internamente.
 */
function handleLoginSuccess(authResponse) {
    // Guarda o Token JWT e os dados do usuário fornecidos pela API
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
}

// =================================================================

async function initApp() {
    // Tenta obter os dados salvos do usuário autenticado (definido no login)
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        document.getElementById('user-info').innerHTML = `
            <span style="font-weight:600;">Olá, ${user.name ? user.name.split(' ')[0] : 'Cliente'}</span>
            <button onclick="window.location.href='historico.html'" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">Pedidos</button>
            <button onclick="window.location.href='cadastro-endereco.html'" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">Endereço</button>
            <button onclick="logout()" style="background:none; border:none; color:var(--primary-red); cursor:pointer; font-weight:bold; margin-left:15px;">Sair</button>
        `;
    }

    await fetchStoreConfig();
    await fetchProducts(); // Dispara a busca no banco C#
    setupEventListeners();
}

function setupEventListeners() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const catSelected = e.target.innerText.trim().toLowerCase();

            if (catSelected === 'todas') {
                renderProducts(products);
            } else {
                let targetId = 0;
                if (catSelected === 'salgadas') targetId = 1;
                if (catSelected === 'doces') targetId = 2;
                if (catSelected === 'bebidas') targetId = 3;

                const filtered = products.filter(p => {
                    const productIdCategory = p.idCategory !== undefined ? p.idCategory : p.IdCategory;
                    return productIdCategory === targetId;
                });

                renderProducts(filtered);
            }
        });
    });

    const orderTypeSelect = document.getElementById('order-type');
    if (orderTypeSelect) {
        orderTypeSelect.addEventListener('change', function (e) {
            document.getElementById('address-container').style.display = e.target.value === 'retirada' ? 'none' : 'block';
        });
    }
}

async function fetchStoreConfig() {
    try {
        const res = await fetch(`https://localhost:7240/api/store-settings`);
        if (!res.ok) throw new Error('Não foi possível obter as configurações da loja.');
        
        const data = await res.json();

        storeData = {
            isOpen: data.isOpen === 1 || data.isOpen === true, 
            estimatedTime: `Entregas em torno de ${data.estimatedDeliveryTimeMinutes} min`,
            pixKey: data.pixKey,
            deliveryFee: data.deliveryFee || 0
        };

        const statusDiv = document.getElementById('store-status');
        if (statusDiv) {
            if (storeData.isOpen) {
                statusDiv.innerHTML = `🟢 Aberto - Entrega em ${storeData.estimatedTime}`;
                statusDiv.className = `status-bar status-open`;
            } else {
                statusDiv.innerHTML = `🔴 Fechado no momento - Faça seu agendamento`;
                statusDiv.className = `status-bar status-closed`;
            }
        }

    } catch (error) {
        console.error("Erro ao buscar configurações da loja:", error);
        
        const statusDiv = document.getElementById('store-status');
        if (statusDiv) {
            statusDiv.innerHTML = `⚠️ Erro de conexão com o servidor`;
            statusDiv.className = `status-bar status-closed`;
        }
    }
}

async function fetchProducts() {
    try {
        const res = await fetch(`https://localhost:7240/api/Product`);
        if (!res.ok) throw new Error('Não foi possível obter la lista de produtos da API.');

        products = await res.json();
        renderProducts(products);
    } catch (error) {
        console.error("Erro ao buscar produtos da API C#:", error);
        document.getElementById('product-grid').innerHTML = `<p style='color:red; text-align:center; padding:20px;'>Falha ao carregar o cardápio. Verifique a API C#.</p>`;
    }
}

function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<p style='text-align:center; color:var(--text-muted); grid-column: 1/-1;'>Nenhum produto disponível nesta categoria.</p>`;
        return;
    }

    grid.innerHTML = items.map(p => {
        const id = p.Id || p.id;
        const name = p.Name || p.name;
        const description = p.Description || p.description || '';
        const price = p.Price || p.price || 0.00;
        const image = p.Image || p.image || '../img/default-esfiha.png';

        const productJson = JSON.stringify({ id, name, price });

        return `
            <div class="product-card">
                <img src="${image}" class="product-img" alt="${name}">
                <div class="product-content">
                    <h3 class="product-title">${name}</h3>
                    <p class="product-desc">${description}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="product-price">R$ ${Number(price).toFixed(2)}</span>
                        <button class="add-btn btn" onclick='addToCart(${productJson})'>+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function addToCart(product) {
    if (!storeData.isOpen) return alert("Loja fechada no momento!");

    const productId = product.id || product.Id;
    const existing = cart.find(item => (item.id || item.Id) === productId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    const total = cart.reduce((acc, item) => acc + ((item.price || item.Price) * item.quantity), 0);
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const btn = document.getElementById('cart-btn');
    if (count > 0) {
        btn.style.display = 'flex';
        document.getElementById('cart-count-info').innerText = `${count} itens | R$ ${total.toFixed(2)}`;
    } else {
        btn.style.display = 'none';
    }
}

// =================================================================
// ATUALIZADO: Incluindo Headers de Autenticação JWT na rota de Endereço
// =================================================================
async function loadAddressesToSelect() {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    
    if (!loggedUser) {
        alert("Você precisa estar logado para carregar seus endereços.");
        return;
    }

    const userId = loggedUser.id || loggedUser.Id;
    const select = document.getElementById('address-select');

    if (!select) return;

    try {
        // Passando a função getAuthHeaders() para validar o Token no Backend C#
        const res = await fetch(`https://localhost:7240/api/Addresses/user/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!res.ok) {
            if (res.status === 401) throw new Error("Sessão expirada. Faça login novamente.");
            throw new Error("Erro ao carregar endereços do banco.");
        }

        const addresses = await res.json();

        if (addresses.length === 0) {
            select.innerHTML = '<option value="">Nenhum endereço cadastrado. Cadastre um acima!</option>';
            return;
        }

        select.innerHTML = addresses.map(addr => {
            const street = addr.address || addr.Logradouro || addr.street || '';
            const num = addr.number || addr.Numero || addr.number || '';
            const neighborhood = addr.neighborhood || addr.Bairro || addr.neighborhood || '';
            const fullAddress = `${street}, Nº ${num} - ${neighborhood}`;

            return `<option value="${addr.id || addr.Id}" data-fullstring="${fullAddress}">${fullAddress}</option>`;
        }).join('');

    } catch (error) {
        console.error("Erro ao alimentar caixa de seleção:", error);
        select.innerHTML = `<option value="">${error.message}</option>`;
    }
}

async function processOrder() {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    if (!loggedUser) return alert("Você precisa fazer login para finalizar o pedido!");

    const userId = loggedUser.id || loggedUser.Id;
    const orderType = document.getElementById('order-type').value;
    const addressSelect = document.getElementById('address-select');

    let selectedAddressId = 0;
    let addressText = "";

    if (orderType === 'entrega') {
        if (!addressSelect || addressSelect.value === "") {
            alert("Por favor, selecione ou cadastre um endereço válido para a entrega!");
            return;
        }

        selectedAddressId = parseInt(addressSelect.value);
        const selectedOption = addressSelect.options[addressSelect.selectedIndex];
        addressText = selectedOption.getAttribute('data-fullstring') || "";
    }

    let notaPedido = document.getElementById('observation').value.trim();
    if (orderType === 'entrega') {
        notaPedido = `[ENTREGA] Endereço: ${addressText} | Obs: ${notaPedido || 'Nenhuma'}`;
    } else {
        notaPedido = `[RETIRADA NA LOJA] | Obs: ${notaPedido || 'Nenhuma'}`;
    }

    const orderPayload = {
        idUser: parseInt(userId),
        idOrderCategory: orderType === 'entrega' ? 1 : 2,
        idAddress: orderType === 'entrega' ? selectedAddressId : 0, 
        deliveryValue: orderType === 'entrega' ? storeData.deliveryFee : 0,
        discountValue: 0,
        deliveryTime: orderType === 'entrega' ? 40 : 15,
        note: notaPedido,
        items: cart.map(item => ({
            idProduct: item.id || item.Id,
            quantity: item.quantity
        }))
    };

    const total = cart.reduce((acc, item) => acc + ((item.price || item.Price) * item.quantity), 0);
    const paymentMethod = document.getElementById('pay-method').value;

    if (paymentMethod === 'pix') {
        showPixModal({ total, payload: orderPayload });
    } else {
        await sendOrderToDatabase(orderPayload);
    }
}

function showPixModal(orderInfo) {
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('pix-modal').style.display = 'block';
    document.getElementById('pix-amount').innerText = `R$ ${orderInfo.total.toFixed(2)}`;
    document.getElementById('pix-key').innerText = storeData.pixKey;
    window.pendingOrderPayload = orderInfo.payload;
}

async function confirmPixPayment() {
    const payload = window.pendingOrderPayload;
    await sendOrderToDatabase(payload);
}

// =================================================================
// ATUALIZADO: Envio do Pedido com o Header de Autenticação Bearer Token
// =================================================================
async function sendOrderToDatabase(orderPayload) {
    try {
        console.log("[TESTE] Enviando payload para /api/Order:", orderPayload);

        const orderResponse = await fetch(`https://localhost:7240/api/Order`, {
            method: 'POST',
            // Substituído para injetar o Token JWT dinamicamente
            headers: getAuthHeaders(),
            body: JSON.stringify(orderPayload)
        });

        if (!orderResponse.ok) {
            if (orderResponse.status === 401) throw new Error("Não autorizado. Faça login novamente.");
            const errText = await orderResponse.text();
            throw new Error(`Erro na API C#: ${errText || orderResponse.statusText}`);
        }

        const orderData = await orderResponse.json();
        const createdOrderId = orderData.id || orderData.idOrder || "Gerado";

        console.log(`[TESTE SUCCESS] Pedido #${createdOrderId} gravado com sucesso!`);
        alert(`🎉 Pedido #${createdOrderId} concluído com sucesso!`);

        cart = [];
        updateCartUI();

        document.getElementById('cart-modal').style.display = 'none';
        document.getElementById('pix-modal').style.display = 'none';

        window.location.href = 'historico.html';

    } catch (e) {
        console.error("[ERRO NO TESTE]:", e);
        alert("Erro ao tentar salvar o pedido: " + e.message);
    }
}

function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
    if (id === 'cart-modal' && show) {
        renderCartItems();
        loadAddressesToSelect(); 
    }
}

function renderCartItems() {
    document.getElementById('cart-items-list').innerHTML = cart.map(item => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding:8px 0;">
            <div><strong style="color:var(--primary-red);">${item.quantity}x</strong> ${item.name}</div>
            <div style="font-weight:600;">R$ ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
}

// Limpa tanto o usuário quanto o token no logoff
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.reload();
}

if (document.getElementById('product-grid')) {
    initApp();
}