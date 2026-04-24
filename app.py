import re, joblib
from flask import Flask, request, jsonify, render_template, send_from_directory
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS as SKL_STOP

app = Flask(__name__)

# ── Load artefacts ─────────────────────────────────────────────────────────────
model      = joblib.load("model_v2.pkl")
vectorizer = joblib.load("vectorizer_v2.pkl")

#  DEBUG START
print("DEBUG START 🔥")
print("Vectorizer type:", type(vectorizer))
print("Has IDF:", hasattr(vectorizer, "idf_"))
print("Vocabulary size:", len(vectorizer.vocabulary_) if hasattr(vectorizer, "vocabulary_") else "No vocab")
print("DEBUG END 🔥")
#  DEBUG END

STOP_WORDS = set(SKL_STOP)

# ── Lazy-load spaCy once ───────────────────────────────────────────────────────
_nlp = None
def get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        try:
            _nlp = spacy.load("en_core_web_sm")
        except:
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            _nlp = spacy.load("en_core_web_sm")
    return _nlp

# ── Text preprocessing (mirrors training pipeline) ────────────────────────────
def clean_tweet(text: str) -> str:
    if not isinstance(text, str):
        return ""
    nlp  = get_nlp()
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#(\w+)", r"\1", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    doc  = nlp(text)
    tokens = [
        t.lemma_ for t in doc
        if t.lemma_ not in STOP_WORDS and len(t.lemma_) > 1
    ]
    return " ".join(tokens)

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# @app.route("/static/images/<path:filename>")
# def serve_image(filename):
#     return send_from_directory(".", filename)

@app.route("/predict", methods=["POST"])
def predict():
    data       = request.get_json(force=True)
    raw_text   = data.get("text", "").strip()
    if not raw_text:
        return jsonify({"error": "No text provided"}), 400

    cleaned    = clean_tweet(raw_text)
    vec        = vectorizer.transform([cleaned])
    pred       = int(model.predict(vec)[0])
    proba      = model.predict_proba(vec)[0]
    confidence = round(float(proba[pred]) * 100, 1)

    return jsonify({
        "prediction": pred,
        "confidence": confidence,
        "cleaned":    cleaned,
        "label":      "REAL DISASTER" if pred == 1 else "NOT A DISASTER"
    })

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)