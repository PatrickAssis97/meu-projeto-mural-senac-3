import React, { useState } from 'react';
import { SENAC_COLORS } from '../constants';
import type { User } from '../types';

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  users: User[];
}

const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const foundUser = users.find(
      user => user.username === username && user.password === password
    );

    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300 animate-fade-in-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      style={{ animationDuration: '0.3s' }}
    >
      <div 
        className="bg-[#002b4f] rounded-lg shadow-2xl p-8 w-full max-w-md m-4 border-2 border-[#f58220]/50"
        onClick={(e) => e.stopPropagation()} // Impede o fechamento ao clicar dentro do modal
      >
        <h2 id="admin-login-title" className="text-2xl font-bold text-white mb-6 text-center">
          Mural Senac
        </h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="username">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-[#f58220]"
              placeholder="seu.usuario"
              autoComplete="username"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:border-[#f58220]"
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4 text-center">{error}</p>}
          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: SENAC_COLORS.orange }}
              className="hover:opacity-90 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-opacity"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
