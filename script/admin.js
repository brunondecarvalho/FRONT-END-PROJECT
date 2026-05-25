// Verifica se o usuário tem permissão de administrador
checkAuth('admin');

function getStatusVisual(idStatus) {
    switch(idStatus) {
        case 3: return { color: 'var(--warning-orange)', class: 'bg-pendente', text: 'Pendente' };
        case 4: return { color: 'var(--prep-purple)', class: 'bg-preparando', text: 'Preparando' };
        case 5: return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Em Rota de Entrega' };
        case 6: return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Pronto p/ Retirar' };
        case 7: return { color: 'var(--success-green)', class: 'bg-concluido', text: 'Concluído' };
        default: return { color: '#999', class: '', text: 'Desconhecido' };
    }
}

// =================================================================
// 📦 PROCESSAMENTO E SELEÇÃO DE PEDIDOS
// =================================================================
async function loadOrders() {
    try {
        const [ordersRes, addressesRes, usersRes] = await Promise.all([
            fetch(`https://localhost:7240/api/Order`),
            fetch(`https://localhost:7240/api/Addresses`),
            fetch(`https://localhost:7240/api/User`)
        ]);

        if (!ordersRes.ok || !addressesRes.ok || !usersRes.ok) throw new Error("Erro ao buscar dados do servidor");
        
        const orders = await ordersRes.json();
        const addresses = await addressesRes.json();
        const users = await usersRes.json();
        
        const html = orders.reverse().map(o => {
            const visual = getStatusVisual(o.idStatus);
            const orderUser = users.find(u => u.id === o.idUser);
            const clientName = orderUser ? orderUser.name : `Cliente ID: ${o.idUser}`;
            const orderAddress = addresses.find(a => a.id === o.idAddress);
            
            let addressText = 'Retirada no Balcão';
            if (o.idOrderCategory === 1 && orderAddress) {
                addressText = `${orderAddress.address || orderAddress.logradouro}, Nº ${orderAddress.number || orderAddress.numero} - ${orderAddress.neighborhood || orderAddress.bairro}`;
            } else if (o.idOrderCategory === 1 && !orderAddress) {
                addressText = `Delivery (Endereço não localizado)`;
            }

            let actionBtn = '';
            if (o.idStatus === 3) {
                actionBtn = `<button class="btn btn-warning" onclick="updateOrderStatus(${o.id}, 4)">🧑‍🍳 Aceitar e Iniciar Preparo</button>`;
            } 
            else if (o.idStatus === 4) {
                if (o.idOrderCategory === 1) {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus(${o.id}, 5)">🛵 Despachar (Saiu para Entrega)</button>`;
                } else if (o.idOrderCategory === 2) {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus(${o.id}, 6)">🛍️ Pronto para Retirada no Balcão</button>`;
                }
            } 
            else if (o.idStatus === 5 && o.idOrderCategory === 1) {
                actionBtn = `<button class="btn btn-success" onclick="updateOrderStatus(${o.id}, 7)">✅ Confirmar Entrega do Motoboy</button>`;
            } 
            else if (o.idStatus === 6 && o.idOrderCategory === 2) {
                actionBtn = `<button class="btn btn-success" onclick="updateOrderStatus(${o.id}, 7)">✅ Confirmar que Cliente Retirou</button>`;
            }

            const dateFormatted = new Date(o.date).toLocaleString('pt-BR', {
                dateStyle: 'short', timeStyle: 'short'
            });

            return `
            <div class="order-card" style="border-left: 5px solid ${visual.color};">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <strong style="color:var(--text-main); font-size:1.1rem;">Pedido #${o.id} - ${clientName}</strong>
                    <span class="status-badge ${visual.class}">${visual.text}</span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; font-size:0.9rem;">
                    <p><strong>Tipo:</strong> <span style="background:#EEE; padding:2px 6px; border-radius:4px;">${o.idOrderCategory === 1 ? 'DELIVERY' : 'RETIRADA'}</span></p>
                    <p><strong>Data:</strong> ${dateFormatted}</p>
                    <p style="grid-column: span 2;"><strong>Endereço de Entrega:</strong> <br><span style="color: var(--text-muted);">${addressText}</span></p>
                </div>

                <div style="background:var(--bg-color); padding:15px; border-radius:12px; margin:15px 0;">
                    <h4 style="margin-bottom:5px; font-size:0.95rem;">Resumo das Esfihas:</h4>
                    <p style="font-size:0.9rem; color:var(--text-muted);">Este pedido contém <b>${o.itemsCount || 0}</b> item(ns) no total.</p>
                    <div style="text-align:right; margin-top:10px; font-size:1.2rem; color:var(--text-main);">
                        <strong>Total: R$ ${o.totalValue.toFixed(2)}</strong>
                    </div>
                </div>
                <div style="margin-top: 15px;">${actionBtn}</div>
            </div>`;
        }).join('');
        
        document.getElementById('orders-list').innerHTML = html || '<p style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum pedido recebido ainda.</p>';
    } catch (e) {
        console.error(e);
    }
}

async function updateOrderStatus(id, newStatusId) {
    try {
        const response = await fetch(`https://localhost:7240/api/Order/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, idStatus: newStatusId })
        });
        if (!response.ok) throw new Error();
        loadOrders();
    } catch (error) {
        alert("Erro ao mudar o status do pedido.");
    }
}

// =================================================================
// 🍕 GERENCIAMENTO DE PRODUTOS (DISPONIBILIDADE E EXCLUSÃO)
// =================================================================
async function loadAdminProducts() {
    try {
        const res = await fetch(`https://localhost:7240/api/Product`);
        if (!res.ok) throw new Error();
        const products = await res.json();

        const html = products.map(p => {
            // Nota: Se sua API C# não possuir propriedade 'isActive' ou 'isAvailable', tratamos como true por padrão
            const isAvailable = p.isAvailable !== undefined ? p.isAvailable : true;

            return `
            <div class="order-card" style="display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom:10px; padding: 15px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${p.image || p.Image || '../img/default-esfiha.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;">
                    <div>
                        <strong style="color:var(--text-main);">${p.name || p.Name}</strong>
                        <p style="font-size:0.85rem; color:var(--text-muted);">R$ ${Number(p.price || p.Price).toFixed(2)}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <label style="display:flex; align-items:center; gap:5px; font-size:0.9rem; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" ${isAvailable ? 'checked' : ''} onchange="toggleProductAvailability(${p.id || p.Id}, this.checked)" style="width:18px; height:18px; accent-color: var(--success-green);">
                        Disponível
                    </label>
                    <button class="btn" style="width:auto; padding:8px 12px; background:#FEF2F2; color:var(--primary-red); border:1px solid #fca5a5;" onclick="deleteProduct(${p.id || p.Id})">🗑️</button>
                </div>
            </div>`;
        }).join('');

        document.getElementById('admin-products-list').innerHTML = html || '<p>Nenhum produto cadastrado.</p>';
    } catch (e) {
        document.getElementById('admin-products-list').innerHTML = '<p style="color:red;">Falha ao carregar produtos do cardápio.</p>';
    }
}

async function saveProduct(event) {
    event.preventDefault();
    const productPayload = {
        name: document.getElementById('prod-name').value,
        description: document.getElementById('prod-desc').value,
        price: parseFloat(document.getElementById('prod-price').value) || 0,
        idCategory: parseInt(document.getElementById('prod-category').value),
        image: document.getElementById('prod-image').value || '../img/default-esfiha.png',
        isAvailable: true // Cadastra como disponível por padrão
    };

    try {
        const response = await fetch(`https://localhost:7240/api/Product`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
        });
        if (!response.ok) throw new Error();
        alert("🎉 Produto cadastrado com sucesso!");
        document.getElementById('product-form').reset();
        loadAdminProducts();
    } catch (error) {
        alert("Erro ao salvar produto.");
    }
}

async function toggleProductAvailability(id, checkStatus) {
    try {
        // Envia o estado de disponibilidade atualizado para o endpoint parcial correspondente da sua API C#
        await fetch(`https://localhost:7240/api/Product/${id}/availability`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, isAvailable: checkStatus })
        });
    } catch (e) {
        alert("Erro ao alterar disponibilidade do item.");
    }
}

async function deleteProduct(id) {
    if (!confirm("Tem certeza que deseja deletar permanentemente este produto do catálogo?")) return;
    try {
        const res = await fetch(`https://localhost:7240/api/Product/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        alert("Produto removido!");
        loadAdminProducts();
    } catch (e) {
        alert("Não foi possível excluir o produto.");
    }
}

// =================================================================
// 👥 GERENCIAMENTO DE USUÁRIOS
// =================================================================
async function loadAdminUsers() {
    try {
        const res = await fetch(`https://localhost:7240/api/User`);
        if (!res.ok) throw new Error();
        const users = await res.json();

        const html = users.map(u => {
            const roleBadge = u.idRole === 2 ? `<span style="background: #FEE2E2; color: #EF4444; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">ADMIN</span>` : `<span style="background: #E0F2FE; color: #0284C7; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">CLIENTE</span>`;
            
            return `
            <div class="order-card" style="display:flex; justify-content:space-between; align-items:center; padding:15px; margin-bottom:10px;">
                <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="color:var(--text-main); font-size:1rem;">${u.name}</strong>
                        ${roleBadge}
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-top:3px;">✉️ Email: ${u.email || 'Não informado'} | 🆔 ID Conta: ${u.id}</p>
                </div>
                <div>
                    <button class="btn" style="width:auto; padding:8px 12px; background:#FEF2F2; color:var(--primary-red); border:1px solid #fca5a5;" onclick="deleteUser(${u.id})" title="Excluir Usuário">🗑️ Deletar</button>
                </div>
            </div>`;
        }).join('');

        document.getElementById('admin-users-list').innerHTML = html || '<p>Nenhum usuário localizado.</p>';
    } catch (e) {
        document.getElementById('admin-users-list').innerHTML = '<p style="color:red;">Não foi possível carregar a lista de usuários.</p>';
    }
}

async function deleteUser(id) {
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser && localUser.id === id) {
        alert("Ação Negada: Você não pode deletar a sua própria conta de administrador em execução.");
        return;
    }

    if (!confirm("⚠️ ATENÇÃO: Deletar este usuário causará a perda de seus endereços vinculados. Confirmar exclusão?")) return;

    try {
        const res = await fetch(`https://localhost:7240/api/User/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        
        alert("Usuário excluído com sucesso!");
        loadAdminUsers();
        loadOrders(); // Recarrega os pedidos para atualizar nomes órfãos
    } catch (e) {
        alert("Falha ao excluir o usuário selecionado.");
    }
}

// =================================================================
// ⚙️ CONFIGURAÇÕES DA LOJA
// =================================================================
async function loadConfig() {
    try {
        const res = await fetch(`https://localhost:7240/api/store-settings`);
        if(res.ok) {
            const config = await res.json();
            document.getElementById('isOpen').checked = (config.isOpen === 1 || config.isOpen === true);
            document.getElementById('estimatedDeliveryTimeMinutes').value = config.estimatedDeliveryTimeMinutes || 0;
            document.getElementById('pixKey').value = config.pixKey || '';
            document.getElementById('deliveryFee').value = config.deliveryFee || 0;
            document.getElementById('minimumOrderValue').value = config.minimumOrderValue || 0;
            document.getElementById('phone').value = config.phone || '';
        }
    } catch (e) { console.warn("Erro ao carregar configurações globais."); }
}

async function saveConfig() {
    const config = {
        isOpen: document.getElementById('isOpen').checked ? 1 : 0,
        estimatedDeliveryTimeMinutes: parseInt(document.getElementById('estimatedDeliveryTimeMinutes').value) || 0,
        pixKey: document.getElementById('pixKey').value,
        deliveryFee: parseFloat(document.getElementById('deliveryFee').value) || 0,
        minimumOrderValue: parseFloat(document.getElementById('minimumOrderValue').value) || 0,
        phone: document.getElementById('phone').value,
        updateAt: new Date().toISOString()
    };

    try {
        const response = await fetch(`https://localhost:7240/api/store-settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!response.ok) throw new Error();
        alert('Configurações da loja salvas com sucesso!');
    } catch (e) {
        alert('Erro ao salvar as configurações.');
    }
}

function switchTab(event, tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Carrega dados sob demanda baseando-se na aba clicada para economizar requisições
    if (tabId === 'produtos') loadAdminProducts();
    if (tabId === 'usuarios') loadAdminUsers();
}

// Inicializadores da Aplicação
loadOrders();
loadConfig();
setInterval(loadOrders, 10000); // Pooling de pedidos em background