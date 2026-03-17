from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ..LLMHandler.chat_gpt_handler import ChatGptHandler

app = Flask(__name__)
CORS(app)

chat_handler = ChatGptHandler("gpt-3.5-turbo-1106")


@app.route('/api/rag/search', methods=['GET'])
def query_search():
    # message_prompt = request.json['prompt']
    message_prompt = 'Say \"Hello there friend, I hope you are doing good\" in 2 different languages'
    try:
        return Response(chat_handler.chat_gpt_response(message_prompt, stream=True))
    except:
        return jsonify("Error occurred"), 500

if __name__ == '__main__':
    app.run(debug=True)
