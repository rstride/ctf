import requests
import time

def main():
    url = 'http://challenge.rstride.fr:6002/'  # Update if the server runs on a different host or port

    # Get the problem
    response = requests.get(url)
    if response.status_code != 200:
        print('Failed to get problem')
        return
    data = response.json()
    problem = data['problem']
    print(f"Received problem: {problem}")

    # Parse and solve the problem
    try:
        # Evaluate the calculation safely
        allowed_operations = {'__builtins__': None, 'pow': pow}
        answer = eval(problem.replace('^', '**'), allowed_operations)
    except Exception as e:
        print(f"Error solving problem: {e}")
        return

    print(f"Calculated answer: {answer}")

    # Submit the answer
    response = requests.post(url, json={'answer': answer})
    if response.status_code == 200:
        data = response.json()
        if 'flag' in data:
            print(f"Received flag: {data['flag']}")
        else:
            print('Flag not found in response.')
    else:
        print(f"Incorrect answer or error: {response.text}")

if __name__ == '__main__':
    main()
