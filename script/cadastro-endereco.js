// Obtém o usuário logado via auth.js ou direto do localStorage
const user = checkAuth();
const token = localStorage.getItem('token');

if (user && user.name) {
    document.getElementById('user-info').innerHTML = `<span style="font-weight:600; font-size:0.95rem; color:var(--text-main);">Olá, ${user.name.split(' ')[0]}</span>`;
}

// =================================================================
// FUNÇÃO AUXILIAR: Gera os cabeçalhos incluindo o Token JWT
// =================================================================
function getAuthHeaders(extraHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// =================================================================
// ATUALIZADO: Carrega os endereços do Usuário com Bearer Token
// =================================================================
async function loadUserAddresses() {
    // Validação preventiva de autenticação
    if (!user || (!user.id && !user.Id) || !token) {
        const listContainer = document.getElementById('addresses-list-container');
        if (listContainer) {
            listContainer.innerHTML = `<p style="text-align:center; color:var(--primary-red); padding:20px;">Você precisa estar autenticado para ver seus endereços.</p>`;
        }
        return;
    }

    const userId = user.id || user.Id;

    try {
        // Consome o endpoint dinâmico injetando o cabeçalho JWT de autenticação
        const response = await fetch(`https://localhost:7240/api/Addresses/user/${userId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Sessão expirada ou não autorizada. Faça login novamente.");
            }
            throw new Error("Erro ao buscar endereços");
        }

        const listContainer = document.getElementById('addresses-list-container');
        const addresses = await response.json();

        if (addresses.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">Você não possui nenhum endereço salvo para entrega.</p>`;
            return;
        }

        // Renderiza cada endereço aproveitando os estilos de cards e botões secundários
        listContainer.innerHTML = addresses.map(addr => {
            const addressId = addr.id || addr.Id;
            const street = addr.address || addr.Logradouro || addr.street || '';
            const num = addr.number || addr.Numero || addr.number || 0;
            const neighborhood = addr.neighborhood || addr.Bairro || addr.neighborhood || '';
            const cep = addr.cep || addr.Cep || '';
            const complement = addr.complement || addr.Complemento || '';
            const landmark = addr.landmark || addr.PontoReferencia || '';

            return `
                <div style="background: var(--bg-color); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div style="font-size: 0.9rem; color: var(--text-main);">
                        <p><strong>${street}, Nº ${num}</strong></p>
                        <p style="color: var(--text-muted); font-size:0.85rem;">${neighborhood} - CEP: ${cep}</p>
                        ${complement ? `<p style="font-size:0.8rem; color: var(--text-muted);"><b>Comp:</b> ${complement}</p>` : ''}
                        ${landmark ? `<p style="font-size:0.8rem; color: #D97706;"><b>Ref:</b> ${landmark}</p>` : ''}
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="deleteAddress(${addressId})" style="width: auto; padding: 8px 12px; border-radius: 8px; color: var(--primary-red); border-color: #fca5a5; background: #FEF2F2;" title="Excluir Endereço">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Erro ao carregar endereços:", error);
        document.getElementById('addresses-list-container').innerHTML = `<p style="text-align:center; color:var(--primary-red); padding:10px;">${error.message}</p>`;
    }
}

// =================================================================
// ATUALIZADO: Exclui o endereço selecionado usando Bearer Token
// =================================================================
async function deleteAddress(addressId) {
    if (!token) return alert("Sessão inválida. Por favor, faça login novamente.");
    if (!confirm("Tem certeza que deseja remover este endereço de entrega?")) return;

    try {
        const response = await fetch(`https://localhost:7240/api/Addresses/${addressId}`, {
            method: 'DELETE',
            headers: getAuthHeaders() // Injeção do token JWT no DELETE
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Você não possui permissão para deletar este registro.");
            }
            throw new Error("Erro ao deletar o endereço do servidor.");
        }

        alert("Endereço removido com sucesso!");
        loadUserAddresses(); // Recarrega a lista sem atualizar a página inteira

    } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        alert(error.message);
    }
}

// =================================================================
// ATUALIZADO: Salva o endereço em tempo real usando Bearer Token
// =================================================================
async function saveAddress(event) {
    event.preventDefault();

    if (!token) {
        alert("Você precisa estar logado para salvar um endereço.");
        return;
    }

    const userId = user.id || user.Id;
    const rawCep = document.getElementById('cep').value.replace(/\D/g, '');

    const addressPayload = {
        idUser: parseInt(userId),
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
            headers: getAuthHeaders(), // Injeção do token JWT no POST estruturado
            body: JSON.stringify(addressPayload)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("A sua sessão expirou. Reconecte-se para salvar novos dados.");
            }
            throw new Error('Falha ao registrar o endereço.');
        }

        alert('Endereço cadastrado com sucesso!');
        document.getElementById('address-form').reset(); // Limpa os campos do formulário
        
        loadUserAddresses(); // Atualiza a listagem dinamicamente na tela

    } catch (error) {
        console.error('Erro ao enviar endereço:', error);
        alert(error.message);
    }
}

// Execução automática ao entrar na tela
loadUserAddresses();