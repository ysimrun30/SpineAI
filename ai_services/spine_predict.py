"""
spine_predict.py — drop this into your backend alongside the .pkl files
Usage:
    from spine_predict import SpinePredictor
    predictor = SpinePredictor("path/to/model_files/")
    result = predictor.predict({
        "condition": "slip_disc", "age": 45, "gender": "male",
        "bmi": 28.5, "pain_score": 9, "mobility_score": 2,
        "movement_accuracy": 35, "posture_score": 30,
        "session_number": 1, "symptom_duration_months": 6,
        "prior_therapy": 1, "nerve_involvement": 1,
        "mri_severity": "severe", "session_duration_min": 20
    })
    print(result)
    # {
    #   "recommended_exercise": "pelvic_tilt",
    #   "sets": 2,  "reps": 6,  "hold_sec": 5,  "rest_sec": 60,
    #   "surgery_recommended": 1,
    #   "risk_level": "high",
    #   "therapy_phase": "acute"
    # }
"""

import os, json
import numpy as np
import pandas as pd
import joblib


class SpinePredictor:
    def __init__(self, model_dir: str = "."):
        self.clf_model   = joblib.load(os.path.join(model_dir, "clf_model.pkl"))
        self.reg_model   = joblib.load(os.path.join(model_dir, "reg_model.pkl"))
        self.scaler      = joblib.load(os.path.join(model_dir, "scaler.pkl"))
        self.le_features = joblib.load(os.path.join(model_dir, "le_features.pkl"))
        self.le_targets  = joblib.load(os.path.join(model_dir, "le_targets.pkl"))

        with open(os.path.join(model_dir, "metadata.json")) as f:
            self.meta = json.load(f)

    def _encode(self, patient: dict) -> pd.DataFrame:
        row = {col: patient.get(col, 0) for col in self.meta["feature_cols"]}
        for col in self.meta["cat_features"]:
            row[col] = self.le_features[col].transform([str(row[col])])[0]
        df_row = pd.DataFrame([row])
        df_row[self.meta["num_cols"]] = self.scaler.transform(
            df_row[self.meta["num_cols"]])
        return df_row

    def predict(self, patient: dict) -> dict:
        enc    = self._encode(patient)
        c_pred = self.clf_model.predict(enc)[0]
        r_pred = np.round(self.reg_model.predict(enc)[0]).astype(int)

        result = {}
        for i, col in enumerate(self.meta["clf_targets"]):
            le = self.le_targets.get(col)
            result[col] = le.inverse_transform([c_pred[i]])[0] if le else int(c_pred[i])

        for i, col in enumerate(self.meta["reg_targets"]):
            result[col] = max(0, int(r_pred[i]))

        # Clamp sensible bounds
        result["sets"]     = max(1, min(6,  result["sets"]))
        result["reps"]     = max(1, min(30, result["reps"]))
        result["hold_sec"] = max(0, min(60, result["hold_sec"]))
        result["rest_sec"] = max(10, min(120, result["rest_sec"]))
        return result

    def predict_batch(self, patients: list) -> list:
        return [self.predict(p) for p in patients]
