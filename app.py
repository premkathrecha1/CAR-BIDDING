from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

API_KEY = "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"

@app.route("/api/ai", methods=["POST"])
def ai():
    try:
        data = request.json

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": data.get("system")},
                    *data.get("messages")
                ]
            }
        )

        result = response.json()

        print("STATUS:", response.status_code)
        print("RESPONSE:", result)

        reply = result["choices"][0]["message"]["content"]

        return jsonify({
            "content": [{"text": reply}]
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)