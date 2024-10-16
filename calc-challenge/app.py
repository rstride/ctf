from flask import Flask, request, jsonify
import random
import time
import threading

app = Flask(__name__)
challenges = {}

def cleanup_challenges():
    while True:
        current_time = time.time()
        expired_keys = [k for k, v in challenges.items() if current_time - v['timestamp'] > 5]
        for k in expired_keys:
            del challenges[k]
        time.sleep(1)

@app.route('/challenge', methods=['GET'])
def challenge():
    number = random.randint(1000000, 9999999)
    key = str(random.randint(1000000, 9999999))
    challenges[key] = {
        'number': number,
        'timestamp': time.time()
    }
    return jsonify({'key': key, 'number': number})

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    key = data.get('key')
    answer = data.get('answer')

    challenge = challenges.get(key)
    if not challenge:
        return jsonify({'error': 'Invalid or expired challenge.'}), 400

    if time.time() - challenge['timestamp'] > 5:
        del challenges[key]
        return jsonify({'error': 'Challenge expired.'}), 400

    if answer == challenge['number'] * 2:
        del challenges[key]
        return jsonify({'flag': 'FLAG{congratulations_you_solved_it}'})
    else:
        return jsonify({'error': 'Incorrect answer.'}), 400

if __name__ == '__main__':
    threading.Thread(target=cleanup_challenges, daemon=True).start()
    app.run(host='0.0.0.0', port=5002)
