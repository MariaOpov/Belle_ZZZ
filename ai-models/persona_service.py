from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""

app = FastAPI(title="Belle Persona Evaluator Service")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "belle_persona_evaluator_v1")

device = "cpu"

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
model.to(device)
model.eval()


class PersonaRequest(BaseModel):
    userMessage: str
    response: str


@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "Belle Persona Evaluator",
        "model": "DistilBERT Persona Evaluator v1",
        "device": device
    }


@app.post("/persona/evaluate")
def evaluate_persona(req: PersonaRequest):
    text = f"User: {req.userMessage}\nResponse: {req.response}"

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=192
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1)[0]

    not_belle_score = probs[0].item()
    belle_score = probs[1].item()

    label = "belle_style" if belle_score >= 0.5 else "not_belle_style"

    if belle_score >= 0.85:
        decision = "accept"
    elif belle_score >= 0.50:
        decision = "weak_persona"
    else:
        decision = "rewrite_needed"

    return {
        "label": label,
        "belle_score": round(belle_score, 4),
        "not_belle_score": round(not_belle_score, 4),
        "decision": decision
    }