// Verifica se o usuário tem permissão de administrador
checkAuth('admin');

// CORREÇÃO 1: Mapeamento baseado nos IDs numéricos de Status da API C#
function getStatusVisual(idStatus) {
    switch(idStatus) {
        case 3: return { color: 'var(--warning-orange)', class: 'bg-pendente', text: 'Pendente' };
        case 4: return { color: 'var(--prep-purple)', class: 'bg-preparando', text: 'Preparando' };
        case 5: return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Em Rota' };
        case 6: return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Pronto p/ Retirar' };
        case 7: return { color: 'var(--success-green)', class: 'bg-concluido', text: 'Concluído' };
        default: return { color: '#999', class: '', text: 'Desconhecido' };
    }
}

async function loadOrders() {
    try {
        // 1. Dispara as três requisições em paralelo para máxima performance
        const [ordersRes, addressesRes, usersRes] = await Promise.all([
            fetch(`https://localhost:7240/api/Order`),
            fetch(`https://localhost:7240/api/Addresses`),
            fetch(`https://localhost:7240/api/User`) // Novo endpoint adicionado
        ]);

        if (!ordersRes.ok) throw new Error("Erro ao buscar pedidos da API");
        if (!addressesRes.ok) throw new Error("Erro ao buscar endereços da API");
        if (!usersRes.ok) throw new Error("Erro ao buscar usuários da API");
        
        const orders = await ordersRes.json();
        const addresses = await addressesRes.json();
        const users = await usersRes.json(); // Nova lista de usuários decodificada
        
        // 2. Mapeia e renderiza os pedidos cruzando as informações recebidas
        const html = orders.reverse().map(o => {
            const visual = getStatusVisual(o.idStatus);
            
            // 3. ASSOCIAÇÃO DO USUÁRIO: Busca o cliente pelo idUser do pedido
            const orderUser = users.find(u => u.id === o.idUser);
            const clientName = orderUser ? orderUser.name : `Cliente ID: ${o.idUser}`;
            
            // 4. ASSOCIAÇÃO DO ENDEREÇO: Busca o endereço correspondente
            const orderAddress = addresses.find(a => a.id === o.idAddress);
            
            // Monta a string do endereço baseado na categoria
            let addressText = 'Retirada no Balcão';
            if (o.idOrderCategory === 1 && orderAddress) {
                addressText = `${orderAddress.street || orderAddress.logradouro}, Nº ${orderAddress.number || orderAddress.numero} - ${orderAddress.neighborhood || orderAddress.bairro}`;
            } else if (o.idOrderCategory === 1 && !orderAddress) {
                addressText = `Delivery (Endereço ID: ${o.idAddress} não localizado)`;
            }

            // Lógica de botões operacionais por status
            let actionBtn = '';
            if (o.idStatus === 1) {
                actionBtn = `<button class="btn btn-warning" onclick="updateOrderStatus(${o.id}, 2)">🧑‍🍳 Aceitar e Iniciar Preparo</button>`;
            } else if (o.idStatus === 2) {
                if (o.idOrderCategory === 1) {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus(${o.id}, 3)">🛵 Despachar p/ Entrega</button>`;
                } else {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus(${o.id}, 4)">🛍️ Pronto p/ Retirada</button>`;
                }
            } else if (o.idStatus === 3 || o.idStatus === 4) {
                actionBtn = `<button class="btn btn-success" onclick="updateOrderStatus(${o.id}, 5)">✅ Marcar como Concluído</button>`;
            }

            // Formatação amigável da data brasileira
            const dateFormatted = new Date(o.date).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short'
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
                    <p style="font-size:0.9rem; color:var(--text-muted);">Este pedido contém <b>${o.itemsCount}</b> item(ns) no total.</p>
                    
                    <div style="text-align:right; margin-top:10px; font-size:1.2rem; color:var(--text-main);">
                        <strong>Total: R$ ${o.totalValue.toFixed(2)}</strong>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">${actionBtn}</div>
            </div>
            `;
        }).join('');
        
        document.getElementById('orders-list').innerHTML = html || '<p style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum pedido recebido ainda.</p>';
    } catch (e) {
        console.error("Erro ao buscar pedidos, endereços ou usuários", e);
        document.getElementById('orders-list').innerHTML = '<p style="text-align:center; padding:20px; color:var(--primary-red);">Erro ao conectar com o servidor.</p>';
    }
}

// CORREÇÃO 4: Atualização de status adaptada para enviar a propriedade correta (idStatus)
async function updateOrderStatus(id, newStatusId) {
    try {
        const response = await fetch(`https://localhost:7240/api/Order/${id}/status`, {
            method: 'PUT', // Altere para PATCH se sua API C# estiver configurada com HttpPatch
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: id, 
                idStatus: newStatusId 
            })
        });

        if (!response.ok) throw new Error("Falha ao atualizar status");
        
        loadOrders(); // Recarrega a lista atualizada
    } catch (error) {
        alert("Erro ao mudar o status do pedido: " + error.message);
    }
}

// Funções de configuração mantidas conforme o escopo original
async function loadConfig() {
    try {
        const res = await fetch(`https://localhost:7240/api/store-settings`);
        if(res.ok) {
            const config = await res.json();
            document.getElementById('isOpen').checked = config.isOpen;
            document.getElementById('estimatedTime').value = config.estimatedDeliveryTimeMinutes + " minutos";
            document.getElementById('pixKey').value = config.pixKey;
        }
    } catch (e) { console.warn("Endpoint de configuração não encontrado."); }
}

async function saveConfig() {
    const config = {
        isOpen: document.getElementById('isOpen').checked,
        estimatedTime: document.getElementById('estimatedTime').value,
        pixKey: document.getElementById('pixKey').value
    };
    await fetch(`https://localhost:7240/api/store-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    alert('Configurações da loja salvas!');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

// Inicializadores da página
loadOrders();
loadConfig();
setInterval(loadOrders, 10000); // Pooling automático a cada 10 segundos