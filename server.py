import os
import json
import random
import string
import time
import subprocess
import urllib.request
import tempfile
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Body, Path, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sqlalchemy import create_engine, String, Text, select, delete, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

import engines

# --- Database Setup (SQLAlchemy 2.0 ORM with Native MySQL & Silent Fallback) ---

# Environment-driven database configuration.
# Priority: DATABASE_URL -> MySQL envs -> SQLite fallback.
IS_RENDER = os.environ.get("RENDER", "").lower() == "true"

MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3300"))
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASS = os.environ.get("MYSQL_PASS", "9999")
MYSQL_DB = os.environ.get("MYSQL_DB", "Local instance MySql")

default_sqlite_path = os.path.join(tempfile.gettempdir(), "projects.db") if IS_RENDER else "projects.db"
SQLITE_PATH = os.environ.get("SQLITE_PATH", default_sqlite_path)
sqlite_url = f"sqlite:///{SQLITE_PATH}"

def try_initialize_db():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        try:
            db_engine = create_engine(database_url, pool_pre_ping=True)
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Successfully connected using DATABASE_URL.")
            return db_engine
        except Exception as e:
            print(f"DATABASE_URL connection failed: {e}. Falling back.")

    # On Render without explicit MySQL env vars, skip localhost MySQL and go straight to SQLite fallback.
    mysql_env_explicit = any(os.environ.get(k) for k in ("MYSQL_HOST", "MYSQL_USER", "MYSQL_PASS", "MYSQL_DB"))
    if IS_RENDER and not mysql_env_explicit:
        print(f"Render environment detected without MySQL config. Using SQLite at {SQLITE_PATH}.")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

    mysql_base_url = URL.create(
        "mysql+pymysql",
        username=MYSQL_USER,
        password=MYSQL_PASS,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
    )
    mysql_url = URL.create(
        "mysql+pymysql",
        username=MYSQL_USER,
        password=MYSQL_PASS,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        database=MYSQL_DB,
    )
    try:
        # 1. Create engine without DB to ensure the database schema exists
        base_engine = create_engine(
            mysql_base_url,
            connect_args={"connect_timeout": 3}
        )
        with base_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}`"))
            conn.commit()
        print(f"Verified database '{MYSQL_DB}' exists or has been created.")

        # 2. Create MySQL engine and test connection with a short timeout
        test_engine = create_engine(
            mysql_url, 
            connect_args={"connect_timeout": 3},
            pool_recycle=3600
        )
        with test_engine.connect() as conn:
            pass
        print(f"Successfully connected to MySQL database: {MYSQL_DB} at {MYSQL_HOST}:{MYSQL_PORT}")
        return test_engine
    except Exception as e:
        print(f"MySQL connection failed: {e}. Falling back to SQLite silently.")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = try_initialize_db()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class ProjectModel(Base):
    __tablename__ = "projects"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    createdAt: Mapped[str] = mapped_column(String(50), nullable=False)
    inputMode: Mapped[str] = mapped_column(String(50), nullable=False)
    inputText: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized string
    candidates: Mapped[str] = mapped_column(Text, nullable=False)    # JSON-serialized string
    selectedCandidateId: Mapped[str] = mapped_column(String(50), nullable=False)
    conflictReports: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized string

class AuthUserModel(Base):
    __tablename__ = "auth_users"
    
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    createdAt: Mapped[str] = mapped_column(String(50), nullable=False)

# Initialize Database and Create Tables
Base.metadata.create_all(bind=engine)

# Helper: Migrate legacy json DB to SQLite
def migrate_legacy_db():
    db_path = "projects-db.json"
    if not os.path.exists(db_path):
        return
    
    session = SessionLocal()
    try:
        existing_count = session.query(ProjectModel).count()
        if existing_count > 0:
            return
            
        with open(db_path, 'r', encoding='utf-8') as f:
            legacy_data = json.load(f)
            
        for item in legacy_data:
            project = ProjectModel(
                id=item.get("id"),
                name=item.get("name"),
                createdAt=item.get("createdAt"),
                inputMode=item.get("inputMode"),
                inputText=item.get("inputText"),
                constraints=json.dumps(item.get("constraints", {})),
                candidates=json.dumps(item.get("candidates", {})),
                selectedCandidateId=item.get("selectedCandidateId", ""),
                conflictReports=json.dumps(item.get("conflictReports", []))
            )
            session.add(project)
        session.commit()
        print(f"Successfully migrated {len(legacy_data)} legacy projects into projects.db SQLite.")
    except Exception as e:
        print(f"Error migrating legacy database: {e}")
        session.rollback()
    finally:
        session.close()

migrate_legacy_db()

# --- Pydantic v2 validation models ---
class ConstraintsSchema(BaseModel):
    budget: int
    teamSize: int
    timeline: int
    expectedUsers: int
    language: List[str]
    databasePreference: str
    cloudProvider: str
    securityLevel: str
    scalabilityTarget: str
    availabilityTarget: float
    maxLatency: int

class IdeaRequest(BaseModel):
    idea: str
    name: Optional[str] = None

class CustomJsonRequest(BaseModel):
    architectureJson: Any
    constraintsInput: Optional[ConstraintsSchema] = None
    name: Optional[str] = None

class SelectCandidateRequest(BaseModel):
    candidateId: str

class ReAnalyzeRequest(BaseModel):
    constraints: Optional[ConstraintsSchema] = None
    candidates: Optional[Dict[str, Any]] = None
    name: Optional[str] = None

class RegisterSchema(BaseModel):
    email: str
    username: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str


# --- Core Helper functions ---

# Helper: Run the engine locally in Python
def run_engine_cli(action, payload):
    try:
        if action == 'detect_conflicts':
            constraints = payload.get("constraints")
            conflicts = engines.detect_constraint_conflicts(constraints)
            return {"success": True, "data": conflicts}

        if action == 'evaluate_candidate':
            config = payload.get("config")
            constraints = payload.get("constraints")
            
            opt_res = engines.run_optimization_generations(config, constraints)
            optimized_config = opt_res["optimizedConfig"]
            steps = opt_res["steps"]
            
            opt_issues = engines.verify_architecture(optimized_config, constraints)
            opt_score = engines.calculate_scores(optimized_config, opt_issues, constraints)
            simulations = engines.run_simulations(optimized_config)
            costs = engines.estimate_infrastructure_cost(optimized_config, constraints.get("expectedUsers", 10000))
            scalability_predictions = engines.predict_scalability(optimized_config)
            tradeoffs = engines.analyze_tradeoffs(optimized_config, opt_score)

            return {
                "success": True,
                "data": {
                    "config": optimized_config,
                    "score": opt_score,
                    "issues": opt_issues,
                    "optimizations": steps,
                    "simulations": simulations,
                    "costs": costs,
                    "scalabilityPredictions": scalability_predictions,
                    "tradeoffs": tradeoffs
                }
            }

        if action == 're_analyze_candidate':
            config = payload.get("config")
            constraints = payload.get("constraints")
            issues = engines.verify_architecture(config, constraints)
            score = engines.calculate_scores(config, issues, constraints)
            simulations = engines.run_simulations(config)
            costs = engines.estimate_infrastructure_cost(config, constraints.get("expectedUsers", 10000))
            scalability_predictions = engines.predict_scalability(config)
            tradeoffs = engines.analyze_tradeoffs(config, score)

            return {
                "success": True,
                "data": {
                    "config": config,
                    "score": score,
                    "issues": issues,
                    "simulations": simulations,
                    "costs": costs,
                    "scalabilityPredictions": scalability_predictions,
                    "tradeoffs": tradeoffs
                }
            }

        if action == 'verify_and_score':
            config = payload.get("config")
            constraints = payload.get("constraints")
            issues = engines.verify_architecture(config, constraints)
            score = engines.calculate_scores(config, issues, constraints)
            return {
                "success": True,
                "data": {
                    "issues": issues,
                    "score": score
                }
            }

        return {"success": False, "error": f"Unknown action: {action}"}

    except Exception as e:
        print(f"Error executing python engine: {e}")
        return {"success": False, "error": str(e)}

# Helper: Call Gemini API using urllib
def call_gemini_api(prompt, system_instruction=None, response_schema=None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable is not defined.")
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
    generation_config = {}
    if response_schema:
        generation_config["responseMimeType"] = "application/json"
        generation_config["responseSchema"] = response_schema
        
    if generation_config:
        payload["generationConfig"] = generation_config
        
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=25) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
        return None
    except Exception as e:
        print(f"Failed to fetch response from Gemini API: {e}")
        return None

# Helper: Generate AI Engineering Docs
def call_gemini_api_for_docs(config, constraints):
    db_pref = constraints.get('databasePreference', 'MySQL')
    avail = constraints.get('availabilityTarget', 99.9)
    users = constraints.get('expectedUsers', 100000)
    config_name = config.get('name', 'App')
    config_type = config.get('type', 'monolith')
    
    docs = {
        "restApiDesign": f"""### REST API Blueprint Specification
```yaml
openapi: 3.0.3
info:
  title: {config_name} Ingress API
  version: 1.0.0
paths:
  /api/v1/auth/login:
    post:
      summary: Customer and Client Authentication
      responses:
        200:
          description: Session token returned
  /api/v1/core/resource:
    get:
      summary: Retrieve core business resources
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        200:
          description: List of parsed datasets
```""",
        "dbSchema": f"""-- Relational {db_pref} Relational Database Schema
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trans_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);""",
        "erDiagram": """erDiagram
    USERS ||--o{ SESSIONS : "creates"
    USERS ||--o{ TRANSACTIONS : "submits"
    USERS {\n        int id PK\n        string email UK\n        string password_hash\n    }
    SESSIONS {\n        string token PK\n        int user_id FK\n        timestamp expiry\n    }
    TRANSACTIONS {\n        int id PK\n        int user_id FK\n        decimal amount\n        string status\n    }""",
        "userFlow": f"""graph TD
    A[End User Request] --> B[API Ingress Gateway]
    B -->|Check Auth| C[Auth & Identity Service]
    C -->|Validate JWT| B
    B -->|Route Command| D[Business Core Service]
    D -->|Query/Commit| E[{db_pref} Relational DB]
    D -->|Cache Fetch| F[Redis Cluster]
    E -->|Write Sync| G[DB Read Replica]""",
        "mvpPlan": f"""### 🚀 MVP Launch Strategy & Delivery Matrix

1. **Sprint 1-2 (Foundation)**: Setup {db_pref} Cluster, provision API Gateway routing, establish initial core servers.
2. **Sprint 3-4 (Authentication)**: Build complete OAuth auth pipeline, JWT generation, secure credential storing.
3. **Sprint 5-6 (Business Core)**: Integrate database operations, write-through caching mechanics, exception monitoring.
4. **Sprint 7 (Verify & Hardening)**: Load testing simulation ({int(users / 10)} Concurrency), automated failover validation, rate limiting verification.""",
        "developmentRoadmap": """### Development Roadmap
- **Phase 1: Inception & Prototyping** (Month 1-2)
- **Phase 2: HA Cluster Scaling** (Month 3-4)
- **Phase 3: Security Compliance & Audits** (Month 5)""",
        "wireframes": """+-------------------------------------------------------------+
| [O] Autonomous Architecture Reviewer          nihith@user   |
+-------------------------------------------------------------+
| (D) Dashboard    |  [ Project: Food Delivery App  [Analyzed] ]  |
| (I) Input        |  Expected Users: 100k   SLA: 99.99%          |
| (V) Graph        +------------------------------------------+
| (R) Report       |  [ Overall Score: 72/100 ]               |
| (S) Simulations  |  [ Scalability: 78 ]  [ Security: 65 ]   |
|                  |  [ Reliability: 70 ]  [ Cost: 60 ]       |
|                  +------------------------------------------+
|                  |  [ SYSTEM VISUALIZATION GRAPH ]          |
|                  |  Users -> [API Gateway] -> Auth Service  |
+------------------+------------------------------------------+"""
    }
    
    # Try calling Gemini to enrich MVP plan
    prompt = f"""You are a Principal Software Architect. Given this system architecture config:
Name: {config_name}
Type: {config_type}
Database preference: {db_pref}
Expected users: {users}
SLA target: {avail}%

We have generated baseline blueprint docs (REST API specification, DB Schema, ER Diagram, User Flow diagram, MVP Plan, Roadmap).
Please provide a customized architectural commentary (1-2 paragraphs) that we can prepend to the MVP Plan highlighting trade-offs, tech stacks, and recommendations specific to this system."""

    try:
        commentary = call_gemini_api(prompt, "You are a professional software architect analyzer.")
        if commentary:
            docs["mvpPlan"] = f"### 💡 Architectural Commentary & Insights\n{commentary}\n\n" + docs["mvpPlan"]
    except Exception as e:
        print(f"Error enriching docs with Gemini: {e}")
        
    return docs

# Helper: Create Initial Configurations
def create_initial_config(type_name, constraints):
    is_micro = type_name in ('microservices', 'event_driven', 'hybrid')
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    services = []
    dependencies = []
    
    # Always add End Users
    services.append({
        "id": f"node-users-{suffix}",
        "name": "End Users",
        "type": "user",
        "replicas": 1
    })
    
    pref_lang = constraints.get("language", ["TypeScript"])
    sub_type_lang = pref_lang[0] if pref_lang else "NodeJS"
    db_pref = constraints.get("databasePreference", "MySQL")
    avail = constraints.get("availabilityTarget", 99.9)
    
    if type_name == 'monolith':
        services.append({
            "id": f"node-monolith-{suffix}",
            "name": "Central Application Server",
            "type": "service",
            "subType": sub_type_lang,
            "replicas": 2 if avail >= 99.9 else 1,
            "cpu": 2,
            "memory": 4
        })
        services.append({
            "id": f"node-db-{suffix}",
            "name": f"{db_pref} Database",
            "type": "database",
            "subType": db_pref,
            "replicas": 2 if avail >= 99.9 else 1,
            "cpu": 2,
            "memory": 8
        })
        dependencies.append({
            "id": f"dep-users-mono-{suffix}",
            "from": f"node-users-{suffix}",
            "to": f"node-monolith-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-mono-db-{suffix}",
            "from": f"node-monolith-{suffix}",
            "to": f"node-db-{suffix}",
            "protocol": "tcp"
        })
        
    elif is_micro:
        services.append({
            "id": f"node-gateway-{suffix}",
            "name": "API Gateway Ingress",
            "type": "gateway",
            "subType": "Kong/NGINX",
            "replicas": 2 if avail >= 99.9 else 1,
            "rateLimit": False,
            "loadBalanced": avail >= 99.9
        })
        services.append({
            "id": f"node-auth-{suffix}",
            "name": "Auth & Identity Service",
            "type": "service",
            "subType": sub_type_lang,
            "replicas": 2 if avail >= 99.9 else 1,
            "cpu": 1,
            "memory": 2
        })
        services.append({
            "id": f"node-core-{suffix}",
            "name": "Business Logic Core Service",
            "type": "service",
            "subType": sub_type_lang,
            "replicas": 2 if avail >= 99.9 else 1,
            "cpu": 1,
            "memory": 2
        })
        services.append({
            "id": f"node-notify-{suffix}",
            "name": "Notification Service",
            "type": "service",
            "subType": "NodeJS",
            "replicas": 1,
            "cpu": 1,
            "memory": 1
        })
        services.append({
            "id": f"node-db-{suffix}",
            "name": f"{db_pref} Main DB",
            "type": "database",
            "subType": db_pref,
            "replicas": 2 if avail >= 99.9 else 1,
            "cpu": 2,
            "memory": 8
        })
        
        dependencies.append({
            "id": f"dep-users-gw-{suffix}",
            "from": f"node-users-{suffix}",
            "to": f"node-gateway-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-gw-auth-{suffix}",
            "from": f"node-gateway-{suffix}",
            "to": f"node-auth-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-gw-core-{suffix}",
            "from": f"node-gateway-{suffix}",
            "to": f"node-core-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-core-notify-{suffix}",
            "from": f"node-core-{suffix}",
            "to": f"node-notify-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-core-db-{suffix}",
            "from": f"node-core-{suffix}",
            "to": f"node-db-{suffix}",
            "protocol": "tcp"
        })
        dependencies.append({
            "id": f"dep-auth-db-{suffix}",
            "from": f"node-auth-{suffix}",
            "to": f"node-db-{suffix}",
            "protocol": "tcp"
        })
        
        if type_name == 'event_driven':
            services.append({
                "id": f"node-broker-{suffix}",
                "name": "RabbitMQ Event Broker",
                "type": "queue",
                "subType": "RabbitMQ",
                "replicas": 1
            })
            # Remove direct core->notify link
            dependencies = [d for d in dependencies if not (d["from"] == f"node-core-{suffix}" and d["to"] == f"node-notify-{suffix}")]
            dependencies.append({
                "id": f"dep-core-broker-{suffix}",
                "from": f"node-core-{suffix}",
                "to": f"node-broker-{suffix}",
                "protocol": "amqp"
            })
            dependencies.append({
                "id": f"dep-broker-notify-{suffix}",
                "from": f"node-broker-{suffix}",
                "to": f"node-notify-{suffix}",
                "protocol": "amqp"
            })
    else:
        # Serverless
        services.append({
            "id": f"node-gateway-{suffix}",
            "name": "API Ingress Gateway",
            "type": "gateway",
            "subType": "AWS API Gateway",
            "replicas": 1,
            "rateLimit": False
        })
        services.append({
            "id": f"node-lambda-auth-{suffix}",
            "name": "Auth Controller (Lambda)",
            "type": "service",
            "subType": "Serverless Functions",
            "replicas": 1
        })
        services.append({
            "id": f"node-lambda-core-{suffix}",
            "name": "Business Engine (Lambda)",
            "type": "service",
            "subType": "Serverless Functions",
            "replicas": 1
        })
        services.append({
            "id": f"node-db-dynamo-{suffix}",
            "name": "DynamoDB Managed Table",
            "type": "database",
            "subType": "DynamoDB",
            "replicas": 1
        })
        
        dependencies.append({
            "id": f"dep-users-gw-{suffix}",
            "from": f"node-users-{suffix}",
            "to": f"node-gateway-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-gw-auth-{suffix}",
            "from": f"node-gateway-{suffix}",
            "to": f"node-lambda-auth-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-gw-core-{suffix}",
            "from": f"node-gateway-{suffix}",
            "to": f"node-lambda-core-{suffix}",
            "protocol": "http"
        })
        dependencies.append({
            "id": f"dep-core-db-{suffix}",
            "from": f"node-lambda-core-{suffix}",
            "to": f"node-db-dynamo-{suffix}",
            "protocol": "tcp"
        })
        
    return {
        "id": f"arch-config-{type_name}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=4))}",
        "name": f"{type_name.replace('_', ' ').title()} Architecture Blueprint",
        "type": type_name,
        "services": services,
        "dependencies": dependencies
    }


# --- FastAPI Application Setup ---
app = FastAPI(title="Autonomous Architecture Reviewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API: GET /api/projects
@app.get("/api/projects")
async def get_projects():
    session = SessionLocal()
    try:
        db_projects = session.scalars(select(ProjectModel).order_by(ProjectModel.createdAt.desc())).all()
        result = []
        for p in db_projects:
            result.append({
                "id": p.id,
                "name": p.name,
                "createdAt": p.createdAt,
                "inputMode": p.inputMode,
                "inputText": p.inputText,
                "constraints": json.loads(p.constraints),
                "candidates": json.loads(p.candidates),
                "selectedCandidateId": p.selectedCandidateId,
                "conflictReports": json.loads(p.conflictReports)
            })
        return result
    finally:
        session.close()

# API: GET /api/projects/{project_id}
@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    session = SessionLocal()
    try:
        p = session.scalar(select(ProjectModel).where(ProjectModel.id == project_id))
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
        return {
            "id": p.id,
            "name": p.name,
            "createdAt": p.createdAt,
            "inputMode": p.inputMode,
            "inputText": p.inputText,
            "constraints": json.loads(p.constraints),
            "candidates": json.loads(p.candidates),
            "selectedCandidateId": p.selectedCandidateId,
            "conflictReports": json.loads(p.conflictReports)
        }
    finally:
        session.close()

# API: DELETE /api/projects/{project_id}
@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    session = SessionLocal()
    try:
        p = session.scalar(select(ProjectModel).where(ProjectModel.id == project_id))
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
        session.delete(p)
        session.commit()
        return {"success": True}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

# API: POST /api/projects/idea
@app.post("/api/projects/idea")
async def create_project_idea(req: IdeaRequest):
    idea = req.idea
    name = req.name
    if not idea:
        raise HTTPException(status_code=400, detail="System idea description is required.")
        
    system_instruction = "You are a professional software requirements parser. Given a user's description of a system idea, extract technical constraint parameters in JSON format. Do not write markdown, code blocks, or additional explanation. Return ONLY valid JSON."
    prompt = f'Extract structured engineering constraints from this description: "{idea}"'
    
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "budget": {"type": "INTEGER"},
            "teamSize": {"type": "INTEGER"},
            "timeline": {"type": "INTEGER"},
            "expectedUsers": {"type": "INTEGER"},
            "language": {"type": "ARRAY", "items": {"type": "STRING"}},
            "databasePreference": {"type": "STRING"},
            "cloudProvider": {"type": "STRING"},
            "securityLevel": {"type": "STRING"},
            "scalabilityTarget": {"type": "STRING"},
            "availabilityTarget": {"type": "NUMBER"},
            "maxLatency": {"type": "INTEGER"}
        },
        "required": ["budget", "teamSize", "timeline", "expectedUsers", "language", "databasePreference", "cloudProvider", "securityLevel", "scalabilityTarget", "availabilityTarget", "maxLatency"]
    }
    
    gemini_res = call_gemini_api(prompt, system_instruction, response_schema)
    
    constraints = None
    if gemini_res:
        try:
            constraints = json.loads(gemini_res)
        except Exception as e:
            print(f"Failed to parse JSON extracted from Gemini: {e}")
            
    if not constraints:
        constraints = {
            "budget": 250,
            "teamSize": 4,
            "timeline": 4,
            "expectedUsers": 50000,
            "language": ["TypeScript"],
            "databasePreference": "MySQL",
            "cloudProvider": "aws",
            "securityLevel": "high",
            "scalabilityTarget": "medium",
            "availabilityTarget": 99.9,
            "maxLatency": 250
        }
        
    conflict_res = run_engine_cli("detect_conflicts", {"constraints": constraints})
    conflict_reports = conflict_res.get("data", []) if conflict_res.get("success") else []
    
    candidates = {}
    for c_type in ['monolith', 'microservices', 'event_driven', 'serverless']:
        initial_conf = create_initial_config(c_type, constraints)
        eval_res = run_engine_cli("evaluate_candidate", {"config": initial_conf, "constraints": constraints})
        if eval_res.get("success"):
            cand_data = eval_res["data"]
            docs = call_gemini_api_for_docs(cand_data["config"], constraints)
            cand_data["documents"] = docs
            candidates[c_type] = cand_data
            
    best_candidate_id = "monolith"
    max_score = -1
    for c_id, item in candidates.items():
        score = item.get("score", {}).get("overall", 0)
        if score > max_score:
            max_score = score
            best_candidate_id = c_id
            
    project_id = f"proj-{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"
    proj_name = name if name else f"Systems Architect [{constraints['expectedUsers']:,} Users]"
    
    new_project = ProjectModel(
        id=project_id,
        name=proj_name,
        createdAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        inputMode="idea",
        inputText=idea,
        constraints=json.dumps(constraints),
        candidates=json.dumps(candidates),
        selectedCandidateId=best_candidate_id,
        conflictReports=json.dumps(conflict_reports)
    )
    
    session = SessionLocal()
    try:
        session.add(new_project)
        session.commit()
        return {
            "id": project_id,
            "name": proj_name,
            "createdAt": new_project.createdAt,
            "inputMode": "idea",
            "inputText": idea,
            "constraints": constraints,
            "candidates": candidates,
            "selectedCandidateId": best_candidate_id,
            "conflictReports": conflict_reports
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

# API: POST /api/projects/json
@app.post("/api/projects/json")
async def create_project_json(req: CustomJsonRequest):
    architecture_json = req.architectureJson
    constraints_input = req.constraintsInput
    name = req.name
    
    if not architecture_json:
        raise HTTPException(status_code=400, detail="JSON Architecture data is required.")
        
    parsed_config = None
    try:
        parsed_config = json.loads(architecture_json) if isinstance(architecture_json, str) else architecture_json
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON string provided.")
        
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    services = []
    dependencies = []
    
    services.append({
        "id": f"node-users-{suffix}",
        "name": "End Users",
        "type": "user",
        "replicas": 1
    })
    
    user_db_pref = parsed_config.get("database", "MySQL") if parsed_config else "MySQL"
    
    if parsed_config and isinstance(parsed_config.get("services"), list):
        for idx, sName in enumerate(parsed_config["services"]):
            lower_s = sName.lower()
            is_gateway = "gateway" in lower_s or "ingress" in lower_s
            services.append({
                "id": f"node-svc-{idx}-{suffix}",
                "name": sName,
                "type": "gateway" if is_gateway else "service",
                "subType": "HTTP" if is_gateway else "NodeJS/Go",
                "replicas": 1,
                "rateLimit": False,
                "loadBalanced": False
            })
            
    if parsed_config and parsed_config.get("database"):
        services.append({
            "id": f"node-db-{suffix}",
            "name": f"{parsed_config['database']} Database Cluster",
            "type": "database",
            "subType": parsed_config["database"],
            "replicas": 1
        })
    if parsed_config and parsed_config.get("cache"):
        services.append({
            "id": f"node-cache-{suffix}",
            "name": f"{parsed_config['cache']} Distributed Cache",
            "type": "cache",
            "subType": parsed_config["cache"],
            "replicas": 1
        })
    if parsed_config and parsed_config.get("queue"):
        services.append({
            "id": f"node-queue-{suffix}",
            "name": f"{parsed_config['queue']} Event Broker",
            "type": "queue",
            "subType": parsed_config["queue"],
            "replicas": 1
        })
        
    gateway_node = next((s for s in services if s["type"] == "gateway"), None)
    core_services = [s for s in services if s["type"] == "service"]
    db_node = next((s for s in services if s["type"] == "database"), None)
    cache_node = next((s for s in services if s["type"] == "cache"), None)
    queue_node = next((s for s in services if s["type"] == "queue"), None)
    
    if gateway_node:
        dependencies.append({
            "id": f"dep-users-gw-{suffix}",
            "from": f"node-users-{suffix}",
            "to": gateway_node["id"],
            "protocol": "http"
        })
        for idx, cs in enumerate(core_services):
            dependencies.append({
                "id": f"dep-gw-svc-{idx}-{suffix}",
                "from": gateway_node["id"],
                "to": cs["id"],
                "protocol": "http"
            })
    else:
        for idx, cs in enumerate(core_services):
            dependencies.append({
                "id": f"dep-users-svc-{idx}-{suffix}",
                "from": f"node-users-{suffix}",
                "to": cs["id"],
                "protocol": "http"
            })
            
    for idx, cs in enumerate(core_services):
        if db_node:
            dependencies.append({
                "id": f"dep-svc-db-{idx}-{suffix}",
                "from": cs["id"],
                "to": db_node["id"],
                "protocol": "tcp"
            })
        if cache_node:
            dependencies.append({
                "id": f"dep-svc-cache-{idx}-{suffix}",
                "from": cs["id"],
                "to": cache_node["id"],
                "protocol": "tcp"
            })
        if queue_node:
            dependencies.append({
                "id": f"dep-svc-queue-{idx}-{suffix}",
                "from": cs["id"],
                "to": queue_node["id"],
                "protocol": "amqp"
            })
            
    constraints = constraints_input.model_dump() if constraints_input else {
        "budget": 300,
        "teamSize": 5,
        "timeline": 6,
        "expectedUsers": 100000,
        "language": ["Go", "TypeScript"],
        "databasePreference": user_db_pref,
        "cloudProvider": "aws",
        "securityLevel": "high",
        "scalabilityTarget": "medium",
        "availabilityTarget": 99.9,
        "maxLatency": 200
    }
    
    base_config = {
        "id": f"uploaded-config-{suffix}",
        "name": parsed_config.get("name") or "Uploaded Custom Architecture" if parsed_config else "Uploaded Custom Architecture",
        "type": "microservices" if len(core_services) > 2 else "monolith",
        "services": services,
        "dependencies": dependencies
    }
    
    base_res = run_engine_cli("re_analyze_candidate", {"config": base_config, "constraints": constraints})
    opt_res = run_engine_cli("evaluate_candidate", {"config": base_config, "constraints": constraints})
    
    if base_res.get("success") and opt_res.get("success"):
        uploaded_data = base_res["data"]
        optimized_data = opt_res["data"]
        
        docs = call_gemini_api_for_docs(optimized_data["config"], constraints)
        uploaded_data["documents"] = docs
        optimized_data["documents"] = docs
        
        candidates = {
            "uploaded": uploaded_data,
            "optimized": optimized_data
        }
        
        conflict_res = run_engine_cli("detect_conflicts", {"constraints": constraints})
        conflict_reports = conflict_res.get("data", []) if conflict_res.get("success") else []
        
        project_id = f"proj-{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"
        proj_name = name if name else (parsed_config.get("name") or "Pasted System Evaluation" if parsed_config else "Pasted System Evaluation")
        
        new_project = ProjectModel(
            id=project_id,
            name=proj_name,
            createdAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            inputMode="json",
            inputText=json.dumps(parsed_config, indent=2),
            constraints=json.dumps(constraints),
            candidates=json.dumps(candidates),
            selectedCandidateId="optimized",
            conflictReports=json.dumps(conflict_reports)
        )
        
        session = SessionLocal()
        try:
            session.add(new_project)
            session.commit()
            return {
                "id": project_id,
                "name": proj_name,
                "createdAt": new_project.createdAt,
                "inputMode": "json",
                "inputText": json.dumps(parsed_config, indent=2),
                "constraints": constraints,
                "candidates": candidates,
                "selectedCandidateId": "optimized",
                "conflictReports": conflict_reports
            }
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            session.close()
    else:
        raise HTTPException(status_code=500, detail="Failed to analyze configurations using engines.")

# API: POST /api/projects/{project_id}/select-candidate
@app.post("/api/projects/{project_id}/select-candidate")
async def select_candidate(project_id: str, req: SelectCandidateRequest):
    session = SessionLocal()
    try:
        p = session.scalar(select(ProjectModel).where(ProjectModel.id == project_id))
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
            
        candidates = json.loads(p.candidates)
        if req.candidateId not in candidates:
            raise HTTPException(status_code=400, detail="Candidate configuration does not exist.")
            
        p.selectedCandidateId = req.candidateId
        session.commit()
        return {
            "id": p.id,
            "name": p.name,
            "createdAt": p.createdAt,
            "inputMode": p.inputMode,
            "inputText": p.inputText,
            "constraints": json.loads(p.constraints),
            "candidates": candidates,
            "selectedCandidateId": p.selectedCandidateId,
            "conflictReports": json.loads(p.conflictReports)
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

# API: POST /api/projects/{project_id}/re-analyze
@app.post("/api/projects/{project_id}/re-analyze")
async def re_analyze_project(project_id: str, req: ReAnalyzeRequest):
    session = SessionLocal()
    try:
        p = session.scalar(select(ProjectModel).where(ProjectModel.id == project_id))
        if not p:
            raise HTTPException(status_code=404, detail="Project not found")
            
        constraints = req.constraints.model_dump() if req.constraints else json.loads(p.constraints)
        candidates = req.candidates if req.candidates is not None else json.loads(p.candidates)
        name = req.name if req.name is not None else p.name
        
        for c_id, item in candidates.items():
            re_res = run_engine_cli("re_analyze_candidate", {"config": item["config"], "constraints": constraints})
            if re_res.get("success"):
                re_data = re_res["data"]
                docs = item.get("documents", {})
                item.update(re_data)
                item["documents"] = docs
                
        conflict_res = run_engine_cli("detect_conflicts", {"constraints": constraints})
        conflict_reports = conflict_res.get("data", []) if conflict_res.get("success") else []
        
        p.name = name
        p.constraints = json.dumps(constraints)
        p.candidates = json.dumps(candidates)
        p.conflictReports = json.dumps(conflict_reports)
        session.commit()
        
        return {
            "id": p.id,
            "name": p.name,
            "createdAt": p.createdAt,
            "inputMode": p.inputMode,
            "inputText": p.inputText,
            "constraints": constraints,
            "candidates": candidates,
            "selectedCandidateId": p.selectedCandidateId,
            "conflictReports": conflict_reports
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# --- Authentication API Routes ---
import hashlib

@app.post("/api/auth/register")
async def register_user(payload: RegisterSchema):
    session = SessionLocal()
    try:
        # Check if email already exists
        existing_user = session.execute(
            select(AuthUserModel).where(AuthUserModel.email == payload.email)
        ).scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
            
        user_id = f"user-{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"
        password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()
        
        new_user = AuthUserModel(
            id=user_id,
            email=payload.email,
            username=payload.username,
            password_hash=password_hash,
            createdAt=time.strftime("%Y-%m-%dT%H:%M:%S")
        )
        session.add(new_user)
        session.commit()
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "email": payload.email,
                "username": payload.username
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")
    finally:
        session.close()


@app.post("/api/auth/login")
async def login_user(payload: LoginSchema):
    session = SessionLocal()
    try:
        user = session.execute(
            select(AuthUserModel).where(AuthUserModel.email == payload.email)
        ).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid email or password.")
            
        password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()
        if user.password_hash != password_hash:
            raise HTTPException(status_code=400, detail="Invalid email or password.")
            
        return {
            "success": True,
            "token": f"token-{''.join(random.choices(string.ascii_lowercase + string.digits, k=16))}",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
    finally:
        session.close()


# --- Static files serving and SPA route fallback ---
@app.get("/{path_name:path}")
async def serve_spa(path_name: str):
    dist_dir = os.path.join(os.getcwd(), 'dist')
    file_path = os.path.join(dist_dir, path_name)
    
    # Avoid serving index.html if we are looking for a file that doesn't exist under /api
    if path_name.startswith("api/"):
        raise HTTPException(status_code=404, detail="Endpoint not found")
        
    if path_name and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(dist_dir, 'index.html')
    if os.path.isfile(index_path):
        return FileResponse(index_path)
        
    raise HTTPException(status_code=404, detail="index.html not found in dist")


if __name__ == '__main__':
    import uvicorn
    print("Starting FastAPI + Uvicorn server on port 3000")
    uvicorn.run(app, host="0.0.0.0", port=3000)
