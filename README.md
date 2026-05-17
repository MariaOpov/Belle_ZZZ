# Belle ZZZ

Belle ZZZ is a fan-made multi-model AI chatbot dashboard inspired by Belle from *Zenless Zone Zero*.

This project combines multiple AI models into one interactive assistant system. It includes a React frontend, a Node.js backend, MongoDB chat history, RAG knowledge retrieval, and three local AI model services.

> This is a fan-made educational project inspired by Belle from *Zenless Zone Zero*.  
> It is not affiliated with, endorsed by, sponsored by, or officially connected to HoYoverse, COGNOSPHERE, miHoYo, or *Zenless Zone Zero*.  
> All related names, trademarks, characters, and assets belong to their respective owners.  
> This project is non-commercial and created for academic purposes only.

---

## Features

- Multi-model chatbot dashboard
- Manual model switching
- Belle-1: RNN intent classifier
- Belle-2: GPT-2 fine-tuned chat model
- Belle-3: Qwen 1.5B + LoRA + RAG assistant
- React frontend interface
- Node.js backend model router
- MongoDB chat history
- RAG retrieval log
- Intent analysis panel
- Recent query history
- Local-first AI architecture

---

## Model Overview

| Model | Role | Description |
|---|---|---|
| Belle-1 RNN | Intent Classifier | Detects user intent such as yes/no/stop/image-related requests. |
| Belle-2 GPT-2 | Legacy Chat Model | A fine-tuned GPT-2 model for simple chatbot responses. |
| Belle-3 Qwen RAG | Main Assistant | Qwen 1.5B with Belle LoRA and retrieval-augmented generation. |

# Belle ZZZ

Belle ZZZ là một hệ thống chatbot AI đa mô hình, được xây dựng dưới dạng đồ án học tập và lấy cảm hứng từ nhân vật Belle trong *Zenless Zone Zero*.

Dự án kết hợp nhiều mô hình AI vào một hệ thống trợ lý tương tác, bao gồm giao diện React, backend Node.js, cơ sở dữ liệu MongoDB, cơ chế truy xuất tri thức RAG và ba AI service chạy cục bộ.

> Đây là một dự án fan-made phục vụ mục đích học tập, lấy cảm hứng từ Belle trong *Zenless Zone Zero*.  
> Dự án không có liên kết, không được tài trợ, không được xác nhận hoặc đại diện bởi HoYoverse, COGNOSPHERE, miHoYo hay *Zenless Zone Zero*.  
> Tất cả tên gọi, thương hiệu, nhân vật và tài sản liên quan thuộc về chủ sở hữu tương ứng.  
> Dự án này phi thương mại và chỉ được tạo ra cho mục đích học tập, nghiên cứu.

---

## Chức năng chính

- Dashboard chatbot đa mô hình
- Chuyển đổi mô hình thủ công
- Belle-1: mô hình RNN phân loại intent
- Belle-2: mô hình GPT-2 fine-tuned cho hội thoại
- Belle-3: mô hình Qwen 1.5B + LoRA + RAG
- Giao diện frontend bằng React
- Backend bằng Node.js
- Lưu lịch sử hội thoại bằng MongoDB
- Hiển thị RAG retrieval log
- Hiển thị intent analysis
- Hiển thị recent queries
- Kiến trúc AI chạy cục bộ

---

## Tổng quan mô hình

| Mô hình | Vai trò | Mô tả |
|---|---|---|
| Belle-1 RNN | Phân loại intent | Phát hiện ý định người dùng như đồng ý, từ chối, dừng thao tác hoặc yêu cầu liên quan đến hình ảnh. |
| Belle-2 GPT-2 | Mô hình hội thoại cũ | Mô hình GPT-2 đã được fine-tune để trả lời các câu hội thoại đơn giản. |
| Belle-3 Qwen RAG | Assistant chính | Qwen 1.5B kết hợp Belle LoRA và Retrieval-Augmented Generation để trả lời câu hỏi có tri thức. |

---

## Công nghệ sử dụng

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

---

## Cấu trúc dự án

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
