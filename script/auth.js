const API_URL = 'https://localhost:7240/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    return JSON.parse(localStorage.getItem('user'));
}

function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.href = 'login.html';
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    const decoded = parseJwt(token);

    if (!decoded || !decoded.exp)
        return true;

    return decoded.exp * 1000 < Date.now();
}

function getUserRole() {
    const token = getToken();

    if (!token)
        return null;

    const decoded = parseJwt(token);

    return decoded[
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ];
}

function checkAuth(role = null) {
    const token = getToken();
    const user = getUser();

    const isLoginPage = window.location.href.includes('login.html');

    // CORREÇÃO: Verifica se é EXATAMENTE a página de cadastro de usuário (ex: cadastro.html) 
    // e ignora se for a tela de cadastro-endereco.html
    const isRegisterPage = window.location.href.includes('cadastro.html') && 
                          !window.location.href.includes('cadastro-endereco.html');

    // ... restante do código permanece igual ...

    // NÃO LOGADO

    if (!token || !user || isTokenExpired(token)) {

        logout();

        if (!isLoginPage && !isRegisterPage) {
            window.location.href = 'login.html';
        }

        return null;
    }

    // LOGADO tentando acessar login/cadastro

    if (user && (isLoginPage || isRegisterPage)) {
        window.location.href = '../index.html';
        return null;
    }

    const userRole = getUserRole();

    // ADMIN ONLY

    if (role === 'admin' && userRole !== 'Admin') {
        alert('Acesso negado.');

        window.location.href = '../index.html';

        return null;
    }

    return user;
}

async function authFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
    }

    return response;
}

async function login(email, password) {
    try {

        const response = await fetch(
            `${API_URL}/auth/login`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                'E-mail ou senha inválidos.'
            );
        }

        const data = await response.json();

        saveAuth(
            data.token,
            data.user
        );

        const role = getUserRole();

        if (role === 'Admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = '../index.html';
        }

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}

async function register() {

    const name =
        document.getElementById('name').value.trim();

    const email =
        document.getElementById('email').value.trim();

    const phone =
        document.getElementById('phone').value.trim();

    const password =
        document.getElementById('password').value.trim();

    if (!name || !email || !phone || !password) {
        return alert('Preencha todos os campos.');
    }

    try {

        const response = await fetch(
            `${API_URL}/auth/register`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password
                })
            }
        );

        if (!response.ok) {

            const error =
                await response.text();

            throw new Error(error);
        }

        alert('Conta criada com sucesso.');

        window.location.href = 'login.html';

    } catch (error) {

        console.error(error);

        alert(error.message);
    }
}