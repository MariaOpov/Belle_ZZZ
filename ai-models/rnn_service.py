import os
import time
import pickle
import numpy as np
import uvicorn

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RNN_DIR = os.path.join(BASE_DIR, "rnn-intent")

MODEL_PATH = os.path.join(RNN_DIR, "rnn_intent_model.h5")
TOKENIZER_PATH = os.path.join(RNN_DIR, "tokenizer.pickle")
LABEL_ENCODER_PATH = os.path.join(RNN_DIR, "label_encoder.pickle")

MAX_SEQUENCE_LENGTH = 30

print("Loading Belle-1 RNN Intent...")
start_time = time.time()

model = load_model(MODEL_PATH)

with open(TOKENIZER_PATH, "rb") as handle:
    tokenizer = pickle.load(handle)

with open(LABEL_ENCODER_PATH, "rb") as handle:
    label_encoder = pickle.load(handle)

print(f"Belle-1 RNN ready in {time.time() - start_time:.2f}s")


class IntentRequest(BaseModel):
    text: str


@app.get("/health")
async def health():
    return {
        "model": "Belle-1 RNN Intent",
        "status": "online"
    }


@app.post("/predict-intent")
async def predict_intent(request: IntentRequest):
    try:
        sequence = tokenizer.texts_to_sequences([request.text])

        padded_sequence = pad_sequences(
            sequence,
            maxlen=MAX_SEQUENCE_LENGTH
        )

        prediction = model.predict(padded_sequence, verbose=0)

        predicted_class_index = int(np.argmax(prediction))
        confidence = float(np.max(prediction))

        predicted_label = label_encoder.inverse_transform(
            [predicted_class_index]
        )[0]

        return {
            "intent": predicted_label,
            "confidence": confidence,
            "reply": f"Detected intent: {predicted_label}"
        }

    except Exception as e:
        return {
            "intent": "error",
            "confidence": 0,
            "reply": "Belle-1 RNN error.",
            "error": str(e)
        }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8101,
        reload=False
    )