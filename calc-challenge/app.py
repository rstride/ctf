from flask import Flask, request, jsonify
import random
import time
import threading

app = Flask(__name__)

n1 = None
n2 = None
challenges = {}

def update_numbers():
    global n1, n2
    while True:
        n1 = random.randint(1, 100)
        n2 = random.randint(1, 100)
        time.sleep(3)

def cleanup_challenges():
    while True:
        current_time = time.time()
        expired_keys = [k for k, v in challenges.items() if current_time - v['timestamp'] > 3]
        for k in expired_keys:
            del challenges[k]
        time.sleep(1)

@app.route('/challenge', methods=['GET'])
def challenge():
    if n1 is None or n2 is None:
        return jsonify({'error': 'Server is initializing, please try again later.'}), 503
    key = str(random.randint(1000000, 9999999))
    timestamp = time.time()
    challenges[key] = {
        'n1': n1,
        'n2': n2,
        'timestamp': timestamp
    }
    calculation = f"2 * {n1} + 98 * {n2}"
    return jsonify({'key': key, 'calculation': calculation})

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json
    key = data.get('key')
    answer = data.get('answer')

    if not key or answer is None:
        return jsonify({'error': 'Key and answer are required.'}), 400

    if key not in challenges:
        return jsonify({'error': 'Invalid or expired challenge.'}), 400

    challenge = challenges[key]
    if time.time() - challenge['timestamp'] > 3:
        del challenges[key]
        return jsonify({'error': 'Challenge expired.'}), 400

    correct_answer = 2 * challenge['n1'] + 98 * challenge['n2']

    try:
        answer = int(answer)
    except ValueError:
        return jsonify({'error': 'Invalid answer format.'}), 400

    if answer == correct_answer:
        del challenges[key]
        return jsonify({'flag': 'FLAG{congratulations_you_solved_it}'})
    else:
        return jsonify({'error': 'Incorrect answer.'}), 400

if __name__ == '__main__':
    threading.Thread(target=update_numbers, daemon=True).start()
    threading.Thread(target=cleanup_challenges, daemon=True).start()
    app.run(host='0.0.0.0', port=5002)
