all: build

up:
	docker compose up -d

build:
	docker compose up -d --build

migrate:
	python3 manage.py migrate

down:
	docker compose down

clean: down
	# Remove all images except base images (python, nginx, etc.)
	docker rmi -f $(docker images -f "dangling=true" -q)

fclean: down
	# Remove everything (containers, volumes, networks)
	docker system prune -a -f --volumes

re: fclean all

r: down up

# New Targets

# Rebuild a Specific Service
rebuild-%:
	docker compose up -d --build $*

# Restart a Specific Service
restart-%:
	docker compose restart $*

# Stop and Remove a Specific Service
down-%:
	docker compose stop $* && docker compose rm -f $*

re-%: down-% rebuild-%

PHONY: all up build migrate down clean fclean re r rebuild-% restart-% down-% re-%
