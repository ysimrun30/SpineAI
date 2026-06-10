# Spine Physiotherapy — RF Model Package

## Files
| File | Purpose |
|---|---|
| clf_model.pkl | MultiOutputClassifier (exercise, surgery, risk, phase) |
| reg_model.pkl | MultiOutputRegressor  (sets, reps, hold_sec, rest_sec) |
| scaler.pkl    | StandardScaler for numerical features |
| le_features.pkl | LabelEncoders for input categoricals |
| le_targets.pkl  | LabelEncoders for output categoricals |
| metadata.json | Feature/target names + evaluation metrics |
| spine_predict.py | Ready-to-use SpinePredictor class |
| requirements.txt | Python dependencies |

## Quick Start
```bash
pip install -r requirements.txt
```

```python
from spine_predict import SpinePredictor

predictor = SpinePredictor(".")   # path to folder with .pkl files

result = predictor.predict({
    "condition": "slip_disc",
    "age": 45,
    "gender": "male",
    "bmi": 28.5,
    "pain_score": 9,
    "mobility_score": 2,
    "movement_accuracy": 35,
    "posture_score": 30,
    "session_number": 1,
    "symptom_duration_months": 6,
    "prior_therapy": 1,
    "nerve_involvement": 1,
    "mri_severity": "severe",
    "session_duration_min": 20
})

print(result)
# {
#   "recommended_exercise": "pelvic_tilt",
#   "sets": 2, "reps": 6, "hold_sec": 5, "rest_sec": 60,
#   "surgery_recommended": 1,
#   "risk_level": "high",
#   "therapy_phase": "acute"
# }
```

## Flask API example
```python
from flask import Flask, request, jsonify
from spine_predict import SpinePredictor

app = Flask(__name__)
model = SpinePredictor(".")

@app.route("/predict", methods=["POST"])
def predict():
    return jsonify(model.predict(request.json))

app.run(port=5000)
```

## Model Performance
| Target | Metric | Score |
|---|---|---|
| recommended_exercise | F1 weighted | ~0.37 |
| surgery_recommended  | F1 weighted | ~0.98 |
| risk_level           | F1 weighted | ~0.84 |
| therapy_phase        | F1 weighted | 1.00  |
| reps                 | R²          | ~0.83 |
| rest_sec             | R²          | ~0.80 |
| hold_sec             | R²          | ~0.70 |
| sets                 | R²          | ~0.46 |
