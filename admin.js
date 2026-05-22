checkAuth('admin');

function getStatusVisual(status) {
    switch(status) {
        case 'pendente': return { color: 'var(--warning-orange)', class: 'bg-pendente', text: 'Pendente' };
        case 'preparando': return { color: 'var(--prep-purple)', class: 'bg-preparando', text: 'Preparando' };
        case 'em_rota': return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Em Rota' };
        case 'pronto': return { color: 'var(--info-blue)', class: 'bg-rota', text: 'Pronto p/ Retirar' };
        case 'concluido': return { color: 'var(--success-green)', class: 'bg-concluido', text: 'Concluído' };
        default: return { color: '#999', class: '', text: status };
    }
}

async function loadOrders() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        const orders = await res.json();
        
        const html = orders.reverse().map(o => {
            const visual = getStatusVisual(o.status);
            
            let actionBtn = '';
            if (o.status === 'pendente') {
                actionBtn = `<button class="btn btn-warning" onclick="updateOrderStatus('${o.id}', 'preparando')">🧑‍🍳 Aceitar e Iniciar Preparo</button>`;
            } else if (o.status === 'preparando') {
                if (o.orderType === 'entrega') {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus('${o.id}', 'em_rota')">🛵 Despachar p/ Entrega</button>`;
                } else {
                    actionBtn = `<button class="btn btn-info" onclick="updateOrderStatus('${o.id}', 'pronto')">🛍️ Pronto p/ Retirada</button>`;
                }
            } else if (o.status === 'em_rota' || o.status === 'pronto') {
                actionBtn = `<button class="btn btn-success" onclick="updateOrderStatus('${o.id}', 'concluido')">✅ Marcar como Entregue</button>`;
            }

            return `
            <div class="order-card" style="border-left: 5px solid ${visual.color};">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <strong style="color:var(--text-main); font-size:1.1rem;">Pedido #${o.id.slice(-4)} - ${o.userName}</strong>
                    <span class="status-badge ${visual.class}">${visual.text}</span>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; font-size:0.9rem;">
                    <p><strong>Tipo:</strong> <span style="background:#EEE; padding:2px 6px; border-radius:4px;">${o.orderType.toUpperCase()}</span></p>
                    <p><strong>Pagamento:</strong> ${o.paymentMethod.toUpperCase()}</p>
                    <p style="grid-column: span 2;"><strong>Endereço:</strong> ${o.address}</p>
                    <p style="grid-column: span 2; color:#D97706; background:#FEF3C7; padding:8px; border-radius:8px;"><strong>Obs:</strong> ${o.observation}</p>
                </div>

                <div style="background:var(--bg-color); padding:15px; border-radius:12px; margin:15px 0;">
                    <h4 style="margin-bottom:10px; font-size:0.95rem;">Itens do Pedido:</h4>
                    ${o.items.map(i => `
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #E5E7EB; padding:5px 0;">
                            <span><b>${i.quantity}x</b> ${i.name}</span>
                            <span>R$ ${(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div style="text-align:right; margin-top:10px; font-size:1.2rem; color:var(--text-main);">
                        <strong>Total: R$ ${o.total.toFixed(2)}</strong>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">${actionBtn}</div>
            </div>
            `;
        }).join('');
        
        document.getElementById('orders-list').innerHTML = html || '<p style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum pedido recebido ainda.</p>';
    } catch (e) {
        console.error("Erro ao buscar pedidos", e);
    }
}

async function updateOrderStatus(id, newStatus) {
    await fetch(`${API_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    loadOrders();
}

async function loadConfig() {
    const res = await fetch(`${API_URL}/config`);
    const config = await res.json();
    document.getElementById('isOpen').checked = config.isOpen;
    document.getElementById('estimatedTime').value = config.estimatedTime;
    document.getElementById('pixKey').value = config.pixKey;
}

async function saveConfig() {
    const config = {
        isOpen: document.getElementById('isOpen').checked,
        estimatedTime: document.getElementById('estimatedTime').value,
        pixKey: document.getElementById('pixKey').value
    };
    await fetch(`${API_URL}/config`, {
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

loadOrders();
loadConfig();
setInterval(loadOrders, 10000);