# =============================================================
#  AI SERVICE — FINAL STABLE VERSION (NO FEATURE ERROR)
# =============================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

# ==============================
# INIT
# ==============================
app = Flask(__name__)
CORS(app)

# ==============================
# LOAD MODEL FILES
# ==============================
clf_model = joblib.load("clf_model.pkl")
scaler = joblib.load("scaler.pkl")
le_features = joblib.load("le_features.pkl")
le_targets = joblib.load("le_targets.pkl")

print("✅ Model loaded")

# ==============================
# CONFIG
# ==============================
cat_features = ['condition', 'gender', 'mri_severity']

num_cols = [
    'age','bmi','pain_score','mobility_score',
    'movement_accuracy','posture_score','session_number',
    'symptom_duration_months','session_duration_min'
]

target_cols = [
    'recommended_exercise',
    'surgery_recommended',
    'risk_level',
    'therapy_phase'
]

# exact order from your model
FEATURE_ORDER = list(clf_model.feature_names_in_)

print("📌 Feature order:", FEATURE_ORDER)

# ==============================
# ROUTES
# ==============================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        top_k = int(data.get("top_k", request.args.get("top_k", 3)))
        top_k = max(1, min(top_k, 10))

        # ----------------------
        # CREATE DATAFRAME
        # ----------------------
        df = pd.DataFrame([data])

        # 🔥 FORCE EXACT ORDER
        df = df[FEATURE_ORDER]

        # ----------------------
        # ENCODE CATEGORICAL
        # ----------------------
        for col in cat_features:
            le = le_features[col]

            if data[col] not in le.classes_:
                return jsonify({
                    "success": False,
                    "error": f"Invalid value '{data[col]}' for {col}"
                })

            df[col] = le.transform(df[col])

        # ----------------------
        # SCALE ONLY NUMERIC (KEEP DF)
        # ----------------------
        df[num_cols] = scaler.transform(df[num_cols])

        # ----------------------
        # 🔥 CONVERT TO NUMPY ONLY HERE
        # ----------------------
        X = df.to_numpy()

        # ----------------------
        # PREDICT
        # ----------------------
        pred = clf_model.predict(X)[0]

        # ----------------------
        # DECODE OUTPUT
        # ----------------------
        result = {}

        for i, col in enumerate(target_cols):
            le = le_targets.get(col)

            if le:
                result[col] = le.inverse_transform([pred[i]])[0]
            else:
                result[col] = int(pred[i])

        # Add top-k exercise recommendations when probabilities are available
        try:
            proba = clf_model.predict_proba(X)
            rec_probs = proba[0][0]
            rec_classes = clf_model.estimators_[0].classes_
            rec_labels = le_targets['recommended_exercise'].inverse_transform(rec_classes)

            top_idx = rec_probs.argsort()[::-1][:top_k]
            result["recommended_exercises"] = [
                {"name": rec_labels[i], "score": float(rec_probs[i])}
                for i in top_idx
            ]
            result["recommended_exercise"] = result["recommended_exercises"][0]["name"]
        except Exception:
            pass

        return jsonify({
            "success": True,
            "prediction": result
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })
# ==============================
# RUN SERVER
# ==============================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)