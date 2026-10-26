
import os
from flask import Flask, request, jsonify
from model import predict

app = Flask(__name__)

@app.get("/")
def home():
    return jsonify({"status": "ok", "service": "HealthGuard AI ML"})


@app.post("/api/predict")
@app.post("/predict")

def predict_risk():
    if not request.is_json:
        return jsonify({"error": "JSON input required"}), 400

    api_key = os.environ.get("ML_API_KEY")
    if not api_key:
        return jsonify({"error": "Server configuration error"}), 500

    if request.headers.get("X-API-Key") != api_key:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid JSON object"}), 400

    try:
        result = predict(payload)
        return jsonify(result)
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "Prediction failed"}), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )
