"""
HealthGuard AI - prediction script
====================================
EDUCATIONAL / DEMO MODEL ONLY. Not a medical device. Does not diagnose
disease. Always used with a "not a diagnosis" disclaimer downstream.

Usage (called by the Node backend):
    echo '{"age":45, "height":170, "weight":90, ...}' | python3 model.py

Reads one JSON object from stdin describing a health_profiles row, engineers
the same features used at training time, loads model.pkl + scaler.pkl,
and prints a single JSON result to stdout:
    {
      "risk_level": "Low" | "Moderate" | "High",
      "probability": 0-100,
      "factors": [ "..." ],
      "recommendations": [ "..." ],
      "model_version": "v1.0-demo"
    }
"""
import json
import os
import sys

import joblib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_VERSION = "v1.0-demo"

ACTIVITY_MAP = {"sedentary": 0, "light": 1, "moderate": 2, "active": 3}
SMOKING_MAP = {"never": 0, "former": 1, "current": 2}
ALCOHOL_MAP = {"none": 0, "occasional": 1, "frequent": 2}
STRESS_MAP = {"low": 0, "moderate": 1, "high": 2}


def load_artifacts():
    model = joblib.load(os.path.join(HERE, "model.pkl"))
    scaler = joblib.load(os.path.join(HERE, "scaler.pkl"))
    with open(os.path.join(HERE, "feature_order.json")) as f:
        feature_order = json.load(f)
    return model, scaler, feature_order


def parse_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in str(value).split(",") if v.strip()]


def engineer_features(payload):
    age = float(payload.get("age", 0))
    height_cm = float(payload.get("height", 170))
    weight_kg = float(payload.get("weight", 70))
    bmi = weight_kg / ((height_cm / 100) ** 2) if height_cm else 0

    bp = str(payload.get("blood_pressure", "120/80"))
    try:
        systolic, diastolic = [float(x) for x in bp.split("/")]
    except Exception:
        systolic, diastolic = 120.0, 80.0

    heart_rate = float(payload.get("heart_rate", 75))
    glucose = float(payload.get("glucose", 100))
    sleep = float(payload.get("sleep", 7))

    activity_score = ACTIVITY_MAP.get(str(payload.get("activity", "moderate")).lower(), 2)
    smoking_score = SMOKING_MAP.get(str(payload.get("smoking", "never")).lower(), 0)
    alcohol_score = ALCOHOL_MAP.get(str(payload.get("alcohol", "none")).lower(), 0)
    stress_score = STRESS_MAP.get(str(payload.get("stress", "low")).lower(), 0)

    family_history = parse_list(payload.get("family_history"))
    existing_conditions = parse_list(payload.get("existing_conditions"))

    features = {
        "age": age,
        "bmi": bmi,
        "systolic": systolic,
        "diastolic": diastolic,
        "heart_rate": heart_rate,
        "glucose": glucose,
        "sleep": sleep,
        "activity_score": activity_score,
        "smoking_score": smoking_score,
        "alcohol_score": alcohol_score,
        "stress_score": stress_score,
        "family_history_count": len(family_history),
        "existing_conditions_count": len(existing_conditions),
    }

    context = {
        "bmi": bmi, "systolic": systolic, "diastolic": diastolic,
        "heart_rate": heart_rate, "glucose": glucose, "sleep": sleep,
        "activity": str(payload.get("activity", "moderate")).lower(),
        "smoking": str(payload.get("smoking", "never")).lower(),
        "alcohol": str(payload.get("alcohol", "none")).lower(),
        "stress": str(payload.get("stress", "low")).lower(),
        "family_history": family_history,
        "existing_conditions": existing_conditions,
    }
    return features, context


def build_factors(context):
    factors = []
    if context["bmi"] >= 30:
        factors.append("BMI in the obese range")
    elif context["bmi"] >= 25:
        factors.append("BMI in the overweight range")
    if context["systolic"] >= 140 or context["diastolic"] >= 90:
        factors.append("Blood pressure in the hypertensive range")
    elif context["systolic"] >= 130:
        factors.append("Blood pressure slightly elevated")
    if context["glucose"] >= 126:
        factors.append("Fasting glucose in the diabetic range")
    elif context["glucose"] >= 100:
        factors.append("Fasting glucose in the prediabetic range")
    if context["heart_rate"] >= 100:
        factors.append("Resting heart rate higher than typical")
    if context["sleep"] < 6:
        factors.append("Insufficient sleep duration")
    if context["activity"] == "sedentary":
        factors.append("Sedentary lifestyle")
    if context["smoking"] == "current":
        factors.append("Current smoker")
    if context["alcohol"] == "frequent":
        factors.append("Frequent alcohol consumption")
    if context["stress"] == "high":
        factors.append("High self-reported stress level")
    if context["family_history"]:
        factors.append(f"Family history of: {', '.join(context['family_history'])}")
    if context["existing_conditions"]:
        factors.append(f"Existing condition(s): {', '.join(context['existing_conditions'])}")
    if not factors:
        factors.append("No major risk factors detected in the provided data")
    return factors


def build_recommendations(risk_level, context):
    recs = [
        "This is an educational screening tool, not a medical diagnosis — discuss results with a licensed clinician.",
    ]
    if context["activity"] in ("sedentary", "light"):
        recs.append("Aim for at least 150 minutes of moderate physical activity per week.")
    if context["sleep"] < 7:
        recs.append("Prioritize 7-9 hours of sleep per night for metabolic and cardiovascular health.")
    if context["smoking"] == "current":
        recs.append("Consider a structured smoking-cessation program; ask a doctor about support options.")
    if context["alcohol"] in ("occasional", "frequent"):
        recs.append("Review your alcohol intake against recommended weekly limits.")
    if context["stress"] in ("moderate", "high"):
        recs.append("Explore stress-management techniques such as mindfulness, exercise, or counseling.")
    if context["bmi"] >= 25:
        recs.append("A balanced diet and gradual weight management can reduce several risk factors at once.")
    if context["glucose"] >= 100 or context["systolic"] >= 130:
        recs.append("Schedule a check-up to monitor blood pressure and blood glucose more closely.")
    if risk_level == "High":
        recs.append("Given the combination of factors above, consider booking a comprehensive check-up soon.")
    return recs


def predict(payload):
    model, scaler, feature_order = load_artifacts()
    features, context = engineer_features(payload)

    x = np.array([[features[name] for name in feature_order]], dtype=float)
    x_scaled = scaler.transform(x)

    proba = model.predict_proba(x_scaled)[0]  # order matches classes_: 0,1,2
    class_idx = int(np.argmax(proba))
    labels = {0: "Low", 1: "Moderate", 2: "High"}
    risk_level = labels[class_idx]

    # Probability reported = confidence in the predicted class, blended with
    # a small nudge toward the "High" class probability so the number is
    # informative even when the top class is Low/Moderate.
    probability = round(float(proba[class_idx]) * 100, 2)

    result = {
        "risk_level": risk_level,
        "probability": probability,
        "class_probabilities": {
            "Low": round(float(proba[0]) * 100, 2),
            "Moderate": round(float(proba[1]) * 100, 2),
            "High": round(float(proba[2]) * 100, 2),
        },
        "factors": build_factors(context),
        "recommendations": build_recommendations(risk_level, context),
        "model_version": MODEL_VERSION,
    }
    return result


def main():
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    try:
        result = predict(payload)
        print(json.dumps(result))
    except FileNotFoundError:
        print(json.dumps({
            "error": "Model artifacts not found. Run `python3 train.py` in the ai/ folder first."
        }))
        sys.exit(1)
    except Exception as e:  # pragma: no cover
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
