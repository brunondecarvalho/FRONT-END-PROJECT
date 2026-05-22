// let cart = [];
// let storeData = { isOpen: true, estimatedTime: '...', pixKey: '' };
// let products = [];

// async function initApp() {
//     const user = checkAuth();
//     if(user) {
//         document.getElementById('user-info').innerHTML = `
//             <span style="font-weight:600;">Olá, ${user.name.split(' ')[0]}</span>
//             <button onclick="window.location.href='historico.html'" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">Pedidos</button>
//             <button onclick="logout()" style="background:none; border:none; color:var(--primary-red); cursor:pointer; font-weight:bold; margin-left:15px;">Sair</button>
//         `;
//     }
    
//     await fetchStoreConfig();
//     await fetchProducts();
//     setupEventListeners();
// }

// function setupEventListeners() {
//     document.querySelectorAll('.category-btn').forEach(btn => {
//         btn.addEventListener('click', (e) => {
//             document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
//             e.target.classList.add('active');
//             const cat = e.target.innerText.toLowerCase();
//             if(cat === 'todas') renderProducts(products);
//             else renderProducts(products.filter(p => p.category === cat.replace('s', '')));
//         });
//     });

//     const orderTypeSelect = document.getElementById('order-type');
//     if(orderTypeSelect) {
//         orderTypeSelect.addEventListener('change', function(e) {
//             document.getElementById('address-container').style.display = e.target.value === 'retirada' ? 'none' : 'block';
//         });
//     }
// }

// async function fetchStoreConfig() {
//     try {
//         const res = await fetch(`${API_URL}/config`);
//         storeData = await res.json();
//         const statusDiv = document.getElementById('store-status');
//         if(statusDiv) {
//             statusDiv.innerHTML = storeData.isOpen 
//                 ? `🟢 Aberto - Entrega em ${storeData.estimatedTime}` 
//                 : `🔴 Loja Fechada`;
//             statusDiv.className = `status-bar ${storeData.isOpen ? 'status-open' : 'status-closed'}`;
//         }
//     } catch (error) { console.error(error); }
// }

// async function fetchProducts() {
//     try {
//         const res = await fetch(`${API_URL}/products`);
//         products = await res.json();
//         renderProducts(products);
//     } catch (error) { console.error(error); }
// }

// function renderProducts(items) {
//     const grid = document.getElementById('product-grid');
//     if(!grid) return;
//     grid.innerHTML = items.map(p => `
//         <div class="product-card">
//             <img src="${p.image}" class="product-img">
//             <div class="product-content">
//                 <h3 class="product-title">${p.name}</h3>
//                 <p class="product-desc">${p.description}</p>
//                 <div style="display:flex; justify-content:space-between; align-items:center;">
//                     <span class="product-price">R$ ${p.price.toFixed(2)}</span>
//                     <button class="add-btn btn" onclick='addToCart(${JSON.stringify(p)})'>+</button>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }

// function addToCart(product) {
//     if(!storeData.isOpen) return alert("Loja fechada no momento!");
//     const existing = cart.find(item => item.id === product.id);
//     if(existing) existing.quantity++;
//     else cart.push({...product, quantity: 1});
//     updateCartUI();
// }

// function updateCartUI() {
//     const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
//     const count = cart.reduce((acc, item) => acc + item.quantity, 0);
//     const btn = document.getElementById('cart-btn');
//     if(count > 0) {
//         btn.style.display = 'flex';
//         document.getElementById('cart-count-info').innerText = `${count} itens | R$ ${total.toFixed(2)}`;
//     } else {
//         btn.style.display = 'none';
//     }
// }

// async function processOrder() {
//     const orderType = document.getElementById('order-type').value;
//     const address = document.getElementById('address').value.trim();
    
//     if(orderType === 'entrega' && address === '') {
//         alert("Preencha o endereço completo!");
//         document.getElementById('address').focus();
//         return;
//     }
    
//     const user = getUser();
//     const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
//     const newOrder = {
//         id: Date.now().toString(),
//         userId: user.id,
//         userName: user.name,
//         items: cart,
//         total: total,
//         paymentMethod: document.getElementById('pay-method').value,
//         orderType: orderType,
//         address: orderType === 'entrega' ? address : 'Retirada no Balcão',
//         observation: document.getElementById('observation').value.trim() || 'Nenhuma',
//         status: 'pendente',
//         date: new Date().toLocaleString('pt-BR')
//     };

//     if(newOrder.paymentMethod === 'pix') {
//         showPixModal(newOrder);
//     } else {
//         await sendOrderToDatabase(newOrder);
//     }
// }

// function showPixModal(order) {
//     document.getElementById('cart-modal').style.display = 'none';
//     document.getElementById('pix-modal').style.display = 'block';
//     document.getElementById('pix-amount').innerText = `R$ ${order.total.toFixed(2)}`;
//     document.getElementById('pix-key').innerText = storeData.pixKey;
//     window.pendingOrder = order;
// }

// async function confirmPixPayment() {
//     const order = window.pendingOrder;
//     const orderId = order.id.slice(-4);
//     const phone = "5511987654321"; 
//     const text = encodeURIComponent(`Olá! Acabei de fazer o pedido #${orderId} no app no valor de R$ ${order.total.toFixed(2)}.\n\nSegue o meu comprovante do PIX:`);
    
//     window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
//     await sendOrderToDatabase(order);
// }

// async function sendOrderToDatabase(order) {
//     try {
//         await fetch(`${API_URL}/orders`, {
//             method: 'POST',
//             headers: {'Content-Type': 'application/json'},
//             body: JSON.stringify(order)
//         });
//         alert("Pedido concluído com sucesso!");
//         cart = [];
//         location.href = 'historico.html';
//     } catch (e) { alert("Erro ao salvar."); }
// }

// function toggleModal(id, show) {
//     document.getElementById(id).style.display = show ? 'block' : 'none';
//     if(id === 'cart-modal' && show) renderCartItems();
// }

// function renderCartItems() {
//     document.getElementById('cart-items-list').innerHTML = cart.map(item => `
//         <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding:8px 0;">
//             <div><strong style="color:var(--primary-red);">${item.quantity}x</strong> ${item.name}</div>
//             <div style="font-weight:600;">R$ ${(item.price * item.quantity).toFixed(2)}</div>
//         </div>
//     `).join('');
// }

// if(document.getElementById('product-grid')) initApp();

// URL Base da sua API C# definida globalmente
const API_URL = 'https://localhost:7240';

let cart = [];
let storeData = { isOpen: true, estimatedTime: '30-40 min', pixKey: 'esfiharia@pix.com' };
let products = [];

async function initApp() {
    // Tenta obter os dados salvos do usuário autenticado (definido no login)
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
        document.getElementById('user-info').innerHTML = `
            <span style="font-weight:600;">Olá, ${user.name ? user.name.split(' ')[0] : 'Cliente'}</span>
            <button onclick="window.location.href='historico.html'" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-weight:bold; margin-left:15px; text-decoration:underline;">Pedidos</button>
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
                if (catSelected === 'doces')    targetId = 2;
                if (catSelected === 'bebidas')  targetId = 3;

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
        orderTypeSelect.addEventListener('change', function(e) {
            document.getElementById('address-container').style.display = e.target.value === 'retirada' ? 'none' : 'block';
        });
    }
}

async function fetchStoreConfig() {
    // Simulação ou chamada opcional para o status da loja
    const statusDiv = document.getElementById('store-status');
    if (statusDiv) {
        statusDiv.innerHTML = `🟢 Aberto - Entrega em ${storeData.estimatedTime}`;
        statusDiv.className = `status-bar status-open`;
    }
}

// -----------------------------------------------------------------
// CORREÇÃO: Consumindo o endpoint correto da sua API C#
// -----------------------------------------------------------------
async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}/api/Product`);
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

async function processOrder() {
    const orderType = document.getElementById('order-type').value;
    const address = document.getElementById('address').value.trim();
    
    // Validação de segurança: se for entrega, exige o texto do endereço
    if (orderType === 'entrega' && address === '') {
        alert("Preencha o endereço completo para a entrega!");
        document.getElementById('address').focus();
        return;
    }
    
    // Se o usuário for retirar, podemos adicionar o aviso nas observações do payload
    let notaPedido = document.getElementById('observation').value.trim();
    if (orderType === 'entrega') {
        notaPedido = `[ENTREGA] Endereço: ${address} | Obs: ${notaPedido || 'Nenhuma'}`;
    } else {
        notaPedido = `[RETIRADA NA LOJA] | Obs: ${notaPedido || 'Nenhuma'}`;
    }

    // -----------------------------------------------------------------
    // MAPEAMENTO REQUISITADO PARA O ENDPOINT /api/Order
    // -----------------------------------------------------------------
    const orderPayload = {
        idUser: 5,                                         // Regra: IdUser deverá ser 5
        idOrderCategory: orderType === 'entrega' ? 1 : 2,  // Regra: 1 para delivery, 2 para retirada
        idAddress: 2,                                      // Regra: IdAddress deverá ser 5
        deliveryValue: orderType === 'entrega' ? 5.00 : 0, // Taxa simbólica se for entrega
        discountValue: 0,
        deliveryTime: orderType === 'entrega' ? 40 : 15,
        note: notaPedido,
        items: cart.map(item => ({
            idProduct: item.id || item.Id,                 // Regra: Captura o ID real do produto no carrinho
            quantity: item.quantity                        // Quantidade selecionada
        }))
    };

    const total = cart.reduce((acc, item) => acc + ((item.price || item.Price) * item.quantity), 0);
    const paymentMethod = document.getElementById('pay-method').value;

    if (paymentMethod === 'pix') {
        // Abre o fluxo do PIX passando o payload calibrado
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
        
        const orderResponse = await fetch(`${API_URL}/api/Order`, {
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

function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
    if (id === 'cart-modal' && show) renderCartItems();
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