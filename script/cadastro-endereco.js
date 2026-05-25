// Obtém o usuário logado via auth.js
const user = checkAuth();

if (user && user.name) {
    document.getElementById('user-info').innerHTML = `<span style="font-weight:600; font-size:0.95rem; color:var(--text-main);">Olá, ${user.name.split(' ')[0]}</span>`;
}

// ==========================================
// FUNÇÃO NOVA: Carrega os endereços do Usuário
// ==========================================
async function loadUserAddresses() {
    try {
        // Consome o endpoint dinâmico usando o id do usuário logado
        const response = await fetch(`https://localhost:7240/api/Addresses/user/${user.id}`);
        if (!response.ok) throw new Error("Erro ao buscar endereços");

        const listContainer = document.getElementById('addresses-list-container');
        const addresses = await response.json();

        if (addresses.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">Você não possui nenhum endereço salvo para entrega.</p>`;
            return;
        }

        // Renderiza cada endereço aproveitando os estilos de cards e botões secundários
        listContainer.innerHTML = addresses.map(addr => `
            <div style="background: var(--bg-color); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <div style="font-size: 0.9rem; color: var(--text-main);">
                    <p><strong>${addr.address}, Nº ${addr.number}</strong></p>
                    <p style="color: var(--text-muted); font-size:0.85rem;">${addr.neighborhood} - CEP: ${addr.cep}</p>
                    ${addr.complement ? `<p style="font-size:0.8rem; color: var(--text-muted);"><b>Comp:</b> ${addr.complement}</p>` : ''}
                    ${addr.landmark ? `<p style="font-size:0.8rem; color: #D97706;"><b>Ref:</b> ${addr.landmark}</p>` : ''}
                </div>
                <div>
                    <button class="btn btn-secondary" onclick="deleteAddress(${addr.id})" style="width: auto; padding: 8px 12px; border-radius: 8px; color: var(--primary-red); border-color: #fca5a5; background: #FEF2F2;" title="Excluir Endereço">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Erro ao carregar endereços:", error);
        document.getElementById('addresses-list-container').innerHTML = `<p style="text-align:center; color:var(--primary-red); padding:10px;">Erro ao carregar lista de endereços.</p>`;
    }
}

// ==========================================
// FUNÇÃO NOVA: Exclui o endereço selecionado
// ==========================================
async function deleteAddress(addressId) {
    if (!confirm("Tem certeza que deseja remover este endereço de entrega?")) return;

    try {
        const response = await fetch(`https://localhost:7240/api/Addresses/${addressId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("Erro ao deletar o endereço do servidor.");

        alert("Endereço removido com sucesso!");
        loadUserAddresses(); // Recarrega a lista sem atualizar a página inteira

    } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        alert("Não foi possível excluir o endereço. Tente novamente.");
    }
}

// MODIFICAÇÃO: Salva o endereço e atualiza a lista em tempo real
async function saveAddress(event) {
    event.preventDefault();

    const rawCep = document.getElementById('cep').value.replace(/\D/g, '');

    const addressPayload = {
        idUser: parseInt(user.id),
        address: document.getElementById('address').value,
        number: parseInt(document.getElementById('number').value) || 0,
        neighborhood: document.getElementById('neighborhood').value,
        cep: parseInt(rawCep) || 0,
        complement: document.getElementById('complement').value || "",
        landmark: document.getElementById('landmark').value || ""
    };

    try {
        const response = await fetch('https://localhost:7240/api/Addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addressPayload)
        });

        if (!response.ok) throw new Error('Falha ao registrar o endereço.');

        alert('Endereço cadastrado com sucesso!');
        document.getElementById('address-form').reset(); // Limpa os campos do formulário
        
        loadUserAddresses(); // Atualiza a listagem dinamicamente na tela

    } catch (error) {
        console.error('Erro ao enviar endereço:', error);
        alert('Erro ao salvar o endereço.');
    }
}

// Execução automática ao entrar na tela
loadUserAddresses();