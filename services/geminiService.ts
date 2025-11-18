import { GoogleGenAI } from "@google/genai";

// Conforme as diretrizes, inicialize o cliente de IA diretamente usando a
// variável de ambiente. Presume-se que `process.env.API_KEY` esteja sempre
// disponível no contexto de execução.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Exporte o cliente inicializado para uso em outras partes da aplicação.
// Isso evita um aviso de "variável não utilizada" e torna a instância acessível.
export { ai };
