const API_URL = 'https://localhost:7240'; 

function checkAuth(role = 'user') {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user && !window.location.href.includes('login') && !window.location.href.includes('cadastro')) {
        window.location.href = 'login.html';
        return null;
    }
    
    if (user && role === 'admin' && user.email !== 'admin@esfiharia.com') {
        alert('Acesso restrito. Apenas para gestores da loja.');
        window.location.href = 'index.html';
        return null;
    }
    
    return user;
}

function getUser() {
    return JSON.parse(localStorage.getItem('user'));
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// async function login() {
//     const email = document.getElementById('email').value.trim();
//     const password = document.getElementById('password').value.trim();
    
//     if(!email || !password) return alert("Por favor, preencha todos os campos.");
    
//     if(email === 'admin@esfiharia.com' && password === 'admin123') {
//         localStorage.setItem('esfiharia_user', JSON.stringify({ id: 'admin_id', name: 'Gestor da Loja', email: email }));
//         window.location.href = 'admin.html';
//         return;
//     }
    
//     try {
//         const res = await fetch(`${API_URL}/users?email=${email}&password=${password}`);
//         const users = await res.json();
        
//         if (users.length > 0) {
//             localStorage.setItem('esfiharia_user', JSON.stringify(users[0]));
//             window.location.href = 'index.html';
//         } else {
//             alert("E-mail ou senha incorretos. Tente novamente.");
//         }
//     } catch(e) {
//         alert("Erro ao conectar com o banco de dados. Verifique se o servidor está rodando.");
//     }
// }

// async function register() {
//     const name = document.getElementById('name').value.trim();
//     const email = document.getElementById('email').value.trim();
//     const phone = document.getElementById('phone').value.trim();
//     const password = document.getElementById('password').value.trim();
    
//     if(!name || !email || !phone || !password) return alert("Preencha todos os dados para criar a conta.");
    
//     try {
//         const checkRes = await fetch(`${API_URL}/api/User`);
//         const existingUser = await checkRes.json();
        
//         if(existingUser.length > 0) {
//             return alert("Este e-mail já está cadastrado! Faça login.");
//         }
        
//         const newUser = { id: Date.now().toString(), name, email, phone, password };
        
//         await fetch(`${API_URL}/users`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(newUser)
//         });
        
//         // AGORA VAI PARA O LOGIN E NÃO LOGA AUTOMÁTICO
//         alert("Conta criada com sucesso! Por favor, faça login para continuar.");
//         window.location.href = 'login.html';
//     } catch(e) {
//         alert("Ocorreu um erro ao criar a conta.");
//     }
// }

async function login(email, senha) {
    try {
        // 1. Monta o payload com as credenciais que o usuário digitou
        const loginPayload = {
            email: email,
            password: senha // Certifique-se de usar exatamente o nome do campo esperado pela sua API C# (ex: password ou senha)
        };

        // 2. Faz o disparo POST para a API de Usuários
        const response = await fetch(`https://localhost:7240/api/User/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });

        // 3. Se as credenciais estiverem erradas (ex: erro 401 ou 404), cai no bloco de erro
        if (!response.ok) {
            throw new Error('E-mail ou senha incorretos.');
        }

        const userData = await response.json();
        const userLogado = userData.user;

        // 4. Sucesso! Guardamos os dados do usuário no navegador (LocalStorage)
        // Isso é crucial para que possamos usar o "idUser: 3" dinamicamente depois!
        localStorage.setItem('user', JSON.stringify(userLogado));
        
        alert('Login realizado com sucesso! Bem-vindo(a), ' + (userLogado.name || 'Usuário'));
        
        // Redireciona para a página principal do seu site de esfihas
        window.location.href = 'index.html'; 

    } catch (error) {
        console.error('Erro no login:', error);
        alert('Falha ao autenticar: ' + error.message);
    }
}

async function register() {
    // 1. Captura dos valores digitados nos inputs HTML
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Validação básica para não enviar campos vazios à API
    if (!name || !email || !phone || !password) {
        return alert("Preencha todos os dados para criar a conta.");
    }
    
    try {
        // 2. Montagem do Payload exatamente no modelo que a API espera
        const newUserPayload = {
            idRole: 1, // Fixado em 1 para Customer
            name: name,
            email: email,
            password: password,
            phone: phone,
            cnh: "",          // Enviado vazio (campo nulo/não aplicável para Customer)
            licensePlate: ""  // Enviado vazio (campo nulo/não aplicável para Customer)
        };
        
        // 3. Disparo POST para criar o usuário no banco de dados MySQL via API
        const response = await fetch(`https://localhost:7240/api/User`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUserPayload)
        });
        
        // 4. Tratamento de erros baseado na resposta do servidor (ex: se o e-mail já existir, a API deve retornar um erro)
        if (!response.ok) {
            // Se a API retornar algum texto explicativo de erro, nós capturamos aqui
            const errorText = await response.text();
            throw new Error(errorText || "Erro ao tentar cadastrar o usuário na API.");
        }
        
        // 5. Sucesso! Redireciona o usuário para a tela de login
        alert("Conta criada com sucesso! Por favor, faça login para continuar.");
        window.location.href = 'login.html';

    } catch (e) {
        console.error("Erro no cadastro:", e);
        alert("Ocorreu um erro ao criar a conta: " + e.message);
    }
}