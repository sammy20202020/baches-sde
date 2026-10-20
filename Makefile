# Atajos del proyecto. Todo pasa por Docker para que los 3 miembros del equipo
# trabajen con las mismas versiones (seccion "consistencia de entornos").
COMPOSE = docker compose -f infra/docker-compose.yml

.PHONY: ayuda up down logs ps migrar revision seed test test-backend typecheck \
        build-ia api web mobile limpiar

ayuda:
	@echo "make up          Levanta base de datos, Redis, almacenamiento, API y worker"
	@echo "make down        Detiene todo"
	@echo "make logs        Sigue los logs de la API"
	@echo "make migrar      Aplica las migraciones de base de datos"
	@echo "make revision m='mensaje'  Genera una migracion nueva"
	@echo "make seed        Crea las 4 rutas y los usuarios de desarrollo"
	@echo "make test        Pruebas del backend + typecheck de movil y web"
	@echo "make mobile      Abre Expo (requiere development build para video)"
	@echo "make web         Abre el panel de revision en http://localhost:5173"
	@echo "make build-ia    Construye la imagen del worker de vision (pesa ~3 GB)"

up:
	@test -f backend/.env || (cp backend/.env.example backend/.env && echo "backend/.env creado desde el ejemplo")
	$(COMPOSE) up -d --build db redis storage api worker
	@echo "API:            http://localhost:8000/docs"
	@echo "Almacenamiento: http://localhost:9333"

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f api worker

migrar:
	$(COMPOSE) exec api alembic upgrade head

revision:
	$(COMPOSE) exec api alembic revision --autogenerate -m "$(m)"

seed:
	$(COMPOSE) exec api python scripts_seed.py

test: test-backend typecheck

test-backend:
	cd backend && .venv/bin/pytest -q

typecheck:
	cd mobile && ./node_modules/.bin/tsc --noEmit
	cd web && ./node_modules/.bin/tsc --noEmit

build-ia:
	$(COMPOSE) --profile ia build worker-ia

api:
	cd backend && .venv/bin/uvicorn app.main:app --reload

web:
	cd web && npm run dev

mobile:
	cd mobile && npm start

limpiar:
	$(COMPOSE) down -v
