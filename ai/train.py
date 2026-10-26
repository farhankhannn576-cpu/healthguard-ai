"""
HealthGuard AI - training script
=================================
EDUCATIONAL / DEMO MODEL ONLY. This is NOT a clinically validated model and
must never be used for real medical decisions.

Generates a synthetic-but-plausible dataset of lifestyle/vital-sign features
labelled with a rule-based "ground truth" risk score (with noise), then
trains a scikit-learn LogisticRegression classifier on it and saves:
  - model.pkl      (trained classifier)
  - scaler.pkl      (StandardScaler fitted on the training features)
  - feature_order.json (the exact feature order the model expects)

Run:  python3 train.py
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

RNG = np.random.default_rng(42)
N_SAMPLES = 6000

FEATURE_ORDER = [
    "age", "bmi", "systolic", "diastolic", "heart_rate", "glucose",
    "sleep", "activity_score", "smoking_score", "alcohol_score",
    "stress_score", "family_history_count", "existing_conditions_count",
]


def synthesize_dataset(n=N_SAMPLES):
    age = RNG.integers(18, 85, n)
    height_cm = RNG.normal(168, 9, n).clip(140, 205)
    weight_kg = RNG.normal(72, 15, n).clip(40, 160)
    bmi = weight_kg / ((height_cm / 100) ** 2)

    systolic = RNG.normal(122, 15, n).clip(85, 200)
    diastolic = RNG.normal(80, 10, n).clip(55, 130)
    heart_rate = RNG.normal(75, 12, n).clip(45, 140)
    glucose = RNG.normal(100, 25, n).clip(60, 260)
    sleep = RNG.normal(6.8, 1.4, n).clip(2, 11)

    # 0=sedentary,1=light,2=moderate,3=active -> lower is worse
    activity_score = RNG.integers(0, 4, n)
    # 0=never,1=former,2=current -> higher is worse
    smoking_score = RNG.choice([0, 1, 2], n, p=[0.6, 0.2, 0.2])
    # 0=none,1=occasional,2=frequent
    alcohol_score = RNG.choice([0, 1, 2], n, p=[0.5, 0.35, 0.15])
    # 0=low,1=moderate,2=high
    stress_score = RNG.choice([0, 1, 2], n, p=[0.4, 0.4, 0.2])

    family_history_count = RNG.integers(0, 4, n)
    existing_conditions_count = RNG.integers(0, 3, n)

    # Rule-based latent risk score used only to LABEL the synthetic data.
    z = (
        0.035 * (age - 45)
        + 0.09 * (bmi - 25)
        + 0.04 * (systolic - 120)
        + 0.03 * (diastolic - 80)
        + 0.02 * (heart_rate - 70)
        + 0.045 * (glucose - 100)
        - 0.35 * (sleep - 7)
        - 0.5 * activity_score
        + 0.7 * smoking_score
        + 0.35 * alcohol_score
        + 0.5 * stress_score
        + 0.6 * family_history_count
        + 0.8 * existing_conditions_count
    )
    z = z + RNG.normal(0, 1.5, n)  # noise so it's not perfectly separable
    prob = 1 / (1 + np.exp(-0.12 * z))

    # 3-class label using quantile cut-points on the latent score so the
    # synthetic dataset has a realistic, non-degenerate class balance
    # (roughly 30% Low / 45% Moderate / 25% High).
    q_low, q_high = np.quantile(z, [0.30, 0.75])
    label = np.where(z < q_low, 0, np.where(z < q_high, 1, 2))

    df = pd.DataFrame({
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
        "family_history_count": family_history_count,
        "existing_conditions_count": existing_conditions_count,
        "label": label,
    })
    return df


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    df = synthesize_dataset()

    X = df[FEATURE_ORDER].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train_scaled, y_train)

    print("=== HealthGuard AI demo model evaluation (synthetic data) ===")
    print(classification_report(
        y_test, model.predict(X_test_scaled),
        target_names=["Low", "Moderate", "High"]
    ))

    joblib.dump(model, os.path.join(here, "model.pkl"))
    joblib.dump(scaler, os.path.join(here, "scaler.pkl"))
    with open(os.path.join(here, "feature_order.json"), "w") as f:
        json.dump(FEATURE_ORDER, f, indent=2)

    print(f"Saved model.pkl, scaler.pkl, feature_order.json to {here}")


if __name__ == "__main__":
    main()
