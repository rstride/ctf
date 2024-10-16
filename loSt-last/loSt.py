from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import argparse
import os
import shlex
import logging
import sys
import threading
import socket
import docker
from threading import Lock

logging.getLogger("werkzeug").setLevel(logging.ERROR)

__version__ = "0.5.0.2"

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"

socketio = SocketIO(app)

# Docker client
docker_client = docker.from_env()

# Client data storage
client_data = {}
client_data_lock = Lock()

# Tilemap data storage
tilemap_data = {}
tilemap_data_lock = Lock()

@app.route("/")
def hello():
    return render_template('Machine.html', titre="TIM2024")

@app.route("/platformer")
def platformer():
    return render_template('platformer.html', titre="platformer")

@app.route("/term")
def index():
    return render_template("index.html")

@socketio.on("pty-input", namespace="/pty")
def pty_input(data):
    sid = request.sid
    with client_data_lock:
        if sid in client_data:
            socket_stream = client_data[sid]['socket_stream']
            try:
                socket_stream._sock.send(data["input"].encode())
            except Exception as e:
                logging.error(f"Error sending input to container: {e}")
        else:
            logging.warning(f"No client data for sid {sid}")

@socketio.on("resize", namespace="/pty")
def resize(data):
    sid = request.sid
    with client_data_lock:
        if sid in client_data:
            exec_id = client_data[sid]['exec_id']
            try:
                docker_client.api.exec_resize(exec_id, height=data["rows"], width=data["cols"])
            except Exception as e:
                logging.error(f"Error resizing exec: {e}")
        else:
            logging.warning(f"No client data for sid {sid}")

@socketio.on("connect", namespace="/pty")
def connect(auth=None):
    logging.info("New client connected")
    sid = request.sid

    try:
        # Create a new container for this user
        container = docker_client.containers.run(
            'python:3.8-slim',  # Replace with your Docker image
            '/bin/sh',           # Changed to '/bin/sh' for better compatibility
            detach=True,
            tty=True,
            stdin_open=True,
        )
        logging.info(f"Container {container.id} created successfully for client {sid}")
    except docker.errors.ImageNotFound as e:
        logging.error(f"Docker image not found: {e}")
        emit("error", {"message": "Docker image not found"}, namespace="/pty")
        return
    except docker.errors.APIError as e:
        logging.error(f"Error creating Docker container: {e}")
        emit("error", {"message": "Error creating Docker container"}, namespace="/pty")
        return

    # Proceed with the rest of the code if container is successfully created
    try:
        # Create an exec instance inside the container
        exec_id = docker_client.api.exec_create(
            container.id,
            cmd='sh -i',  # Changed to 'sh -i' to ensure interactive shell
            tty=True,
            stdin=True,
        )['Id']

        # Start the exec instance and get a socket-like object
        socket_stream = docker_client.api.exec_start(
            exec_id,
            detach=False,
            tty=True,
            stdin=True,
            socket=True,
        )

        # Store the data in client_data
        with client_data_lock:
            client_data[sid] = {
                'container': container,
                'exec_id': exec_id,
                'socket_stream': socket_stream,
            }

        # Start a background task to read from the socket and emit to the client
        socketio.start_background_task(target=read_and_forward_pty_output, sid=sid)

    except Exception as e:
        logging.error(f"Error setting up the exec instance: {e}")
        emit("error", {"message": "Error setting up the exec instance"}, namespace="/pty")
        return


@socketio.on('disconnect', namespace='/pty')
def disconnect():
    sid = request.sid
    logging.info(f"Client {sid} disconnected")
    with client_data_lock:
        if sid in client_data:
            container = client_data[sid]['container']
            try:
                container.stop()
                container.remove()
                logging.info(f"Container for client {sid} stopped and removed")
            except Exception as e:
                logging.error(f"Error stopping/removing container: {e}")
            del client_data[sid]
        else:
            logging.warning(f"No client data for sid {sid}")

def read_and_forward_pty_output(sid):
    with client_data_lock:
        if sid not in client_data:
            logging.warning(f"No client data for sid {sid}")
            return
        socket_stream = client_data[sid]['socket_stream']

    max_read_bytes = 1024 * 20
    while True:
        socketio.sleep(0.01)
        try:
            output = socket_stream._sock.recv(max_read_bytes).decode(errors='ignore')
            if output:
                socketio.emit("pty-output", {"output": output}, namespace="/pty", room=sid)
            else:
                # No data, possibly the process has ended
                break
        except Exception as e:
            logging.error(f"Error reading from socket: {e}")
            break

    # Clean up
    with client_data_lock:
        if sid in client_data:
            container = client_data[sid]['container']
            try:
                container.stop()
                container.remove()
                logging.info(f"Container for client {sid} stopped and removed")
            except Exception as e:
                logging.error(f"Error stopping/removing container: {e}")
            del client_data[sid]

def udp_server():
    UDP_IP = "0.0.0.0"
    UDP_PORT = 5005

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))

    logging.info(f"UDP server listening on {UDP_IP}:{UDP_PORT}")

    while True:
        data, addr = sock.recvfrom(1024)
        message = data.decode()
        logging.info(f"Received UDP message from {addr}: {message}")

        # Process the received data
        try:
            tile_data = json.loads(message)
            with tilemap_data_lock:
                tilemap_data.update(tile_data)
        except json.JSONDecodeError as e:
            logging.error(f"Error decoding UDP message: {e}")

        # Emit this data to clients connected via SocketIO
        socketio.emit('tilemap-update', tile_data, namespace='/pty')

def start_udp_background_task():
    socketio.start_background_task(target=udp_server)

def check_tilemap_updates():
    last_tilemap_data = {}
    while True:
        socketio.sleep(1)  # Adjust the interval as needed
        with tilemap_data_lock:
            if tilemap_data != last_tilemap_data:
                # Tilemap data has changed, emit update to clients
                socketio.emit('tilemap-update', tilemap_data, namespace='/pty')
                last_tilemap_data = tilemap_data.copy()

def main():
    parser = argparse.ArgumentParser(
        description="A fully functional terminal in your browser with tilemap updates.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("-p", "--port", default=5002, help="port to run server on", type=int)
    parser.add_argument("--host", default="0.0.0.0", help="host to run server on")
    parser.add_argument("--debug", action="store_true", help="debug the server")
    parser.add_argument("--version", action="store_true", help="print version and exit")
    parser.add_argument("--command", default="bash", help="Command to run in the terminal")
    parser.add_argument("--cmd-args", default="", help="arguments to pass to command")

    args = parser.parse_args()
    if args.version:
        print(__version__)
        exit(0)

    app.config["cmd"] = [args.command] + shlex.split(args.cmd_args)

    log_format = "\033[92mpyxtermjs >\033[0m %(levelname)s (%(funcName)s:%(lineno)d) %(message)s"
    logging.basicConfig(
        format=log_format,
        stream=sys.stdout,
        level=logging.DEBUG if args.debug else logging.INFO,
    )
    logging.info(f"serving on http://{args.host}:{args.port}")

    # Start the UDP server background task
    start_udp_background_task()

    # Start the tilemap updates checker background task
    socketio.start_background_task(target=check_tilemap_updates)

    # Start the SocketIO server
    socketio.run(app, debug=args.debug, port=args.port, host=args.host, allow_unsafe_werkzeug=True)

if __name__ == "__main__":
    main()