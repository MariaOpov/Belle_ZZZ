import os
import re
import torch
import uvicorn

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "transformer-chat")

print(f"Loading Belle-2 GPT-2 from: {MODEL_PATH}")

tokenizer = AutoTokenizer.from_pretrained("gpt2")
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    local_files_only=True
)

device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
model.eval()

print("Belle-2 GPT-2 service ready!")


class ChatRequest(BaseModel):
    text: str
    mode: str = "transformer"


@app.get("/health")
async def health():
    return {
        "model": "Belle-2 GPT-2",
        "status": "online"
    }


@app.post("/predict")
async def predict_chat(request: ChatRequest):
    try:
        prompt = f"""
Belle is an AI assistant from Zenless Zone Zero.
Belle was created by Phat.
Belle never changes identity.

User: Hello
Belle: Hi! I am Belle.

User: What is your name?
Belle: My name is Belle.

User: Who made you?
Belle: I was created by Phat.

User: {request.text}
Belle:
"""

        inputs = tokenizer(
            prompt,
            return_tensors="pt"
        )

        inputs = {
            k: v.to(device)
            for k, v in inputs.items()
        }

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=50,
                do_sample=True,
                temperature=0.35,
                top_p=0.9,
                top_k=40,
                repetition_penalty=1.15,
                no_repeat_ngram_size=3,
                pad_token_id=tokenizer.eos_token_id
            )

        input_length = inputs["input_ids"].shape[1]
        generated_tokens = outputs[0][input_length:]

        reply = tokenizer.decode(
            generated_tokens,
            skip_special_tokens=True
        ).strip()

        reply = re.split(r"User:|Belle:", reply)[0].strip()
        reply = reply.split("\n")[0].strip()

        lower_input = request.text.lower()

        creator_keywords = [
            "who made you",
            "creator",
            "who created you",
            "your father",
            "your author"
        ]

        identity_keywords = [
            "who are you",
            "your name",
            "what is your name",
            "what's your name",
            "what are you",
            "identify yourself"
        ]

        banned_words = [
            "Marie",
            "Antoinette",
            "ZZ Top",
            "Napoleon",
            "another assistant",
            "[ edit ]",
            "user 1",
            "user 2"
        ]

        if any(kw in lower_input for kw in creator_keywords):
            reply = "I was proudly created by Phat."

        elif any(kw in lower_input for kw in identity_keywords):
            reply = "My name is Belle. I am an AI assistant from Zenless Zone Zero."

        elif any(word.lower() in reply.lower() for word in banned_words):
            reply = "I am Belle from Zenless Zone Zero."

        if len(reply) < 2:
            reply = "I am Belle. How can I help you today?"

        return {
            "reply": reply,
            "intent": "gpt2_chat"
        }

    except Exception as e:
        return {
            "reply": f"Belle-2 GPT-2 error: {str(e)}",
            "intent": "error"
        }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8102,
        reload=False
    )