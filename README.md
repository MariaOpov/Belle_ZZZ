# Belle ZZZ

[English](#english) | [Tiếng Việt](#tiếng-việt)

---

# English

Belle ZZZ is a fan-made multi-model AI chatbot dashboard inspired by Belle from *Zenless Zone Zero*.

This project combines multiple AI models into one interactive assistant system. It includes a React frontend, a Node.js backend, MongoDB chat history, RAG knowledge retrieval, and three local AI model services.

> This is a fan-made educational project inspired by Belle from *Zenless Zone Zero*.  
> It is not affiliated with, endorsed by, sponsored by, or officially connected to HoYoverse, COGNOSPHERE, miHoYo, or *Zenless Zone Zero*.  
> All related names, trademarks, characters, and assets belong to their respective owners.  
> This project is non-commercial and created for academic purposes only.

## Features

- Multi-model chatbot dashboard
- Manual model switching
- Belle-1: RNN intent classifier
- Belle-2: GPT-2 fine-tuned chat model
- Belle-3: Qwen 1.5B + LoRA + RAG assistant
- React frontend interface
- Node.js backend
- MongoDB chat history
- RAG retrieval log
- Intent analysis panel
- Recent query history
- Local-first AI architecture

## Model Overview

| Model | Role | Description |
|---|---|---|
| Belle-1 RNN | Intent Classifier | Detects user intent such as yes/no/stop/image-related requests. |
| Belle-2 GPT-2 | Legacy Chat Model | A fine-tuned GPT-2 model for simple chatbot responses. |
| Belle-3 Qwen RAG | Main Assistant | Qwen 1.5B with Belle LoRA and retrieval-augmented generation. |

## Tech Stack

### Frontend

- React
- Vite
- Axios
- CSS dashboard UI

### Backend

- Node.js
- Express
- MongoDB
- RAG service
- Model selection

### AI Services

- FastAPI
- TensorFlow / Keras
- PyTorch
- Transformers
- PEFT LoRA
- GPT-2
- Qwen2 1.5B

## Project Structure

```txt
Belle_ZZZ/
├── ai-models/
│   ├── rnn_service.py
│   ├── gpt2_service.py
│   ├── qwen_service.py
│   ├── rnn-intent/
│   ├── transformer-chat/
│   └── belle_adapter_qwen/
│
├── backend/
│   ├── server.js
│   ├── ragService.js
│   ├── import_knowledge.js
│   └── remove_batch_from_knowledge.js
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   └── package.json
│
├── knowledge_batches/
├── .env.example
├── .gitignore
└── README.md
