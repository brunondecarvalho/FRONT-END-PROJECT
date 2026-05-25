let cart = [];
// Inicializa o objeto preparado para receber o padrão do banco
let storeData = { 
    isOpen: false, 
    estimatedTime: 'Carregando...', 
    pixKey: '',
    deliveryFee: 0 
};
let products = [];

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
                // Mapeia o texto do botão para o ID numérico correspondente da API
                let targetId = 0;
                if (catSelected === 'salgadas') targetId = 1;
                if (catSelected === 'doces') targetId = 2;
                if (catSelected === 'bebidas') targetId = 3;

                // Filtra verificando as duas possíveis grafias do ID vindas do C#
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

        // Mapeia o JSON da API para a estrutura interna do seu app.js
        storeData = {
            // Converte 1 para true e 0 para false (ou aceita booleano direto caso mude na API)
            isOpen: data.isOpen === 1 || data.isOpen === true, 
            estimatedTime: `Entregas em torno de ${data.estimatedDeliveryTimeMinutes} min`,
            pixKey: data.pixKey,
            deliveryFee: data.deliveryFee || 0
        };

        // Atualiza a barra de status visual na interface (index.html)
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
        
        // Fallback de segurança em caso de queda do servidor da API
        const statusDiv = document.getElementById('store-status');
        if (statusDiv) {
            statusDiv.innerHTML = `⚠️ Erro de conexão com o servidor`;
            statusDiv.className = `status-bar status-closed`;
        }
    }
}

// -----------------------------------------------------------------
// CORREÇÃO: Consumindo o endpoint correto da sua API C#
// -----------------------------------------------------------------
async function fetchProducts() {
    try {
        const res = await fetch(`https://localhost:7240/api/Product`);
        if (!res.ok) throw new Error('Não foi possível obter a lista de produtos da API.');

        products = await res.json();
        renderProducts(products);
    } catch (error) {
        console.error("Erro ao buscar produtos da API C#:", error);
        document.getElementById('product-grid').innerHTML = `<p style='color:red; text-align:center; padding:20px;'>Falha ao carregar o cardápio. Verifique a API C#.</p>`;
    }
}

// CORREÇÃO: Propriedades mapeadas em PascalCase para ler o JSON gerado pelo C# / Entity Framework
function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<p style='text-align:center; color:var(--text-muted); grid-column: 1/-1;'>Nenhum produto disponível nesta categoria.</p>`;
        return;
    }

    grid.innerHTML = items.map(p => {
        // Fallback de propriedades garantindo compatibilidade com PascalCase e camelCase
        const id = p.Id || p.id;
        const name = p.Name || p.name;
        const description = p.Description || p.description || '';
        const price = p.Price || p.price || 0.00;
        const image = p.Image || p.image || '../img/default-esfiha.png'; // Imagem padrão caso venha nulo

        // O objeto do produto é transformado em string JSON segura para passar no onclick
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

    // Suporta tanto id (camelCase) quanto Id (PascalCase) vindos da API
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
// FUNÇÃO NOVA: Busca endereços do usuário logado e monta o <select>
// =================================================================
async function loadAddressesToSelect() {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    // Recupera o ID real ou assume o fallback padrão 5 do seu sistema
    const userId = loggedUser ? (loggedUser.id || loggedUser.Id) : 5;
    const select = document.getElementById('address-select');

    if (!select) return;

    try {
        const res = await fetch(`https://localhost:7240/api/Addresses/user/${userId}`);
        if (!res.ok) throw new Error("Erro ao carregar endereços do banco.");

        const addresses = await res.json();

        if (addresses.length === 0) {
            select.innerHTML = '<option value="">Nenhum endereço cadastrado. Cadastre um acima!</option>';
            return;
        }

        // Preenche as opções guardando o ID no 'value' e o texto completo para exibição
        select.innerHTML = addresses.map(addr => {
            const street = addr.address || addr.Logradouro || addr.street || '';
            const num = addr.number || addr.Numero || addr.number || '';
            const neighborhood = addr.neighborhood || addr.Bairro || addr.neighborhood || '';
            const fullAddress = `${street}, Nº ${num} - ${neighborhood}`;

            return `<option value="${addr.id || addr.Id}" data-fullstring="${fullAddress}">${fullAddress}</option>`;
        }).join('');

    } catch (error) {
        console.error("Erro ao alimentar caixa de seleção:", error);
        select.innerHTML = '<option value="">Erro ao carregar seus endereços.</option>';
    }
}

async function processOrder() {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    const userId = loggedUser ? (loggedUser.id || loggedUser.Id) : 5;

    const orderType = document.getElementById('order-type').value;
    const addressSelect = document.getElementById('address-select');

    let selectedAddressId = 0;
    let addressText = "";

    // Validação e Captura se o pedido for Delivery
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

    // Montagem dinâmica baseada nas seleções reais da tela
    const orderPayload = {
        idUser: parseInt(userId),
        idOrderCategory: orderType === 'entrega' ? 1 : 2,
        idAddress: orderType === 'entrega' ? selectedAddressId : 0, // Envia o ID real selecionado (ou 0 se retirar na loja)
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

async function sendOrderToDatabase(orderPayload) {
    try {
        // 1. Envia o POST estruturado APENAS para a rota de criação de Pedidos
        console.log("[TESTE] Enviando payload para /api/Order:", orderPayload);

        const orderResponse = await fetch(`https://localhost:7240/api/Order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (!orderResponse.ok) {
            const errText = await orderResponse.text();
            throw new Error(`Erro na API C#: ${errText || orderResponse.statusText}`);
        }

        // Tenta ler a resposta da API (geralmente o objeto Order gravado com o ID gerado pelo banco)
        const orderData = await orderResponse.json();
        const createdOrderId = orderData.id || orderData.idOrder || "Gerado";

        // -----------------------------------------------------------------
        // MODO DE TESTE: Ignorando a API de Transactions / Mercado Pago
        // -----------------------------------------------------------------
        console.log(`[TESTE SUCCESS] Pedido #${createdOrderId} gravado com sucesso na tabela Order!`);

        alert(`🎉 Pedido #${createdOrderId} concluído com sucesso!\n(Modo de Teste: Pagamento fingido/aprovado automaticamente)`);

        // Limpa o carrinho no Frontend
        cart = [];
        updateCartUI();

        // Fecha eventuais modais abertos antes de mudar de página
        document.getElementById('cart-modal').style.display = 'none';
        document.getElementById('pix-modal').style.display = 'none';

        // Redireciona para o histórico de pedidos para ver se ele aparece lá
        window.location.href = 'historico.html';

    } catch (e) {
        console.error("[ERRO NO TESTE]:", e);
        alert("Erro ao tentar salvar o pedido na tabela Order: " + e.message);
    }
}

// =================================================================
// ATUALIZADO: toggleModal agora chama a carga de endereços ao abrir
// =================================================================
function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
    if (id === 'cart-modal' && show) {
        renderCartItems();
        loadAddressesToSelect(); // Chamada inserida aqui
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

function logout() {
    localStorage.removeItem('user');
    window.location.reload();
}

// Inicializa a aplicação caso o grid exista na página
if (document.getElementById('product-grid')) {
    initApp();
}