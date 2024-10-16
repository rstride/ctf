import requests

def main():
    base_url = 'http://localhost:5001'

    # Get the challenge
    response = requests.get(f'{base_url}/challenge')
    if response.status_code != 200:
        print('Failed to get challenge:', response.json())
        return

    data = response.json()
    key = data['key']
    calculation = data['calculation']

    # Compute the answer
    try:
        answer = eval(calculation)
    except Exception as e:
        print('Error evaluating calculation:', e)
        return

    # Send the answer
    payload = {
        'key': key,
        'answer': answer
    }
    response = requests.post(f'{base_url}/solve', json=payload)
    if response.status_code == 200:
        print('Success:', response.json())
    else:
        print('Failed:', response.json())

if __name__ == '__main__':
    main()
