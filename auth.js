const API_URL = 'http://localhost:3000'; 

function checkAuth(role = 'user') {
    const user = JSON.parse(localStorage.getItem('esfiharia_user'));
    
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
    return JSON.parse(localStorage.getItem('esfiharia_user'));
}

function logout() {
    localStorage.removeItem('esfiharia_user');
    window.location.href = 'login.html';
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if(!email || !password) return alert("Por favor, preencha todos os campos.");
    
    if(email === 'admin@esfiharia.com' && password === 'admin123') {
        localStorage.setItem('esfiharia_user', JSON.stringify({ id: 'admin_id', name: 'Gestor da Loja', email: email }));
        window.location.href = 'admin.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/users?email=${email}&password=${password}`);
        const users = await res.json();
        
        if (users.length > 0) {
            localStorage.setItem('esfiharia_user', JSON.stringify(users[0]));
            window.location.href = 'index.html';
        } else {
            alert("E-mail ou senha incorretos. Tente novamente.");
        }
    } catch(e) {
        alert("Erro ao conectar com o banco de dados. Verifique se o servidor está rodando.");
    }
}

async function register() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if(!name || !email || !phone || !password) return alert("Preencha todos os dados para criar a conta.");
    
    try {
        const checkRes = await fetch(`${API_URL}/users?email=${email}`);
        const existingUser = await checkRes.json();
        
        if(existingUser.length > 0) {
            return alert("Este e-mail já está cadastrado! Faça login.");
        }
        
        const newUser = { id: Date.now().toString(), name, email, phone, password };
        
        await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        
        // AGORA VAI PARA O LOGIN E NÃO LOGA AUTOMÁTICO
        alert("Conta criada com sucesso! Por favor, faça login para continuar.");
        window.location.href = 'login.html';
    } catch(e) {
        alert("Ocorreu um erro ao criar a conta.");
    }
}