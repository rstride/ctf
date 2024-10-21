from flask import Flask, request, jsonify
import time
import math

app = Flask(__name__)

FLAG = 'flag{C4lculat3}'

def generate_problem():
    # Use the current time divided by 2 to get a value that changes every 2 seconds
    current_period = int(time.time() // 2)
    # Generate numbers based on the current_period
    n1 = (current_period * 17 + 3) % 100 + 1  # n1 between 1 and 100
    n2 = (current_period * 23 + 5) % 100 + 1  # n2 between 1 and 100
    n3 = (current_period * 31 + 7) % 10 + 1   # n3 between 1 and 10
    n4 = (current_period * 37 + 11) % 5 + 1   # n4 between 1 and 5

    # Create the calculation string
    calculation = f"{n1} * {n2} / {n3} ^ {n4}"
    # Compute the correct answer
    correct_answer = n1 * n2 / (n3 ** n4)
    return calculation, correct_answer

@app.route('/', methods=['GET'])
def get_problem():
    calculation, _ = generate_problem()
    return jsonify({'problem': calculation})

@app.route('/', methods=['POST'])
def submit_answer():
    user_answer = request.json.get('answer')
    _, correct_answer = generate_problem()
    try:
        user_answer = float(user_answer)
    except (TypeError, ValueError):
        return jsonify({'result': 'Invalid answer'}), 400

    # Check if the user's answer matches the correct answer within a tolerance
    if math.isclose(user_answer, correct_answer, rel_tol=1e-6):
        return jsonify({'flag': FLAG})
    else:
        return jsonify({'result': 'Incorrect answer'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
