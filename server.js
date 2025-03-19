const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const https = require('https'); // Adicione isso

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', './views');

const N8N_WEBHOOK_URL = "https://n8n.cindacta1.intraer/webhook/9205b0dd-2cc2-490b-abd5-f3608756e2fd/chat";

// Agente HTTPS para ignorar validação de certificado
const agent = new https.Agent({
    rejectUnauthorized: false
});

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/chat', async (req, res) => {
    const user_message = req.body.message;
    const session_id = uuidv4();

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatInput: user_message,
                sessionId: session_id
            }),
            agent: agent // Use o agente HTTPS aqui
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const n8n_data = await response.json();
        console.log("Resposta completa do n8n:", n8n_data);

        let n8n_response;
        if (user_message.toLowerCase() === "manual") {
            n8n_response = n8n_data.text || '⚠️ O n8n não retornou uma resposta válida.';
        } else {
            n8n_response = n8n_data.output || '⚠️ O n8n não retornou uma resposta válida.';
        }

        res.json({ response: n8n_response });

    } catch (error) {
        console.error(`Erro ao conectar com o n8n: ${error}`);
        res.status(500).json({ response: `Erro ao conectar com o servidor: ${error}` });
    }
});

app.post('/save_feedback_txt', (req, res) => {
    const { feedback, context } = req.body;
    const timestamp = new Date().toISOString();

    const dataToWrite = `Feedback: ${feedback}\nContexto: ${context}\nTimestamp: ${timestamp}\n\n`;

    fs.appendFile('feedback.txt', dataToWrite, (err) => {
        if (err) {
            console.error("Erro ao salvar feedback:", err);
            return res.status(500).json({ status: "error", message: "Erro ao salvar feedback" });
        }
        res.json({ status: "success", message: "Feedback salvo com sucesso!" });
    });
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT} em modo ${app.get('env')}`);
    });
}