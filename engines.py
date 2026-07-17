import math
import copy
from typing import List, Dict, Any, Optional

# Helper: build adjacency list from configuration
def build_adjacency_list(services: List[Dict[str, Any]], dependencies: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    adj = {node["id"]: [] for node in services}
    for edge in dependencies:
        from_id = edge.get("from")
        to_id = edge.get("to")
        if from_id in adj and to_id in adj:
            adj[from_id].append(to_id)
    return adj

# 1. RULE ENGINE & VERIFICATION ENGINE
def verify_architecture(config: Dict[str, Any], constraints: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    issues = []
    services = config.get("services", [])
    dependencies = config.get("dependencies", [])
    adj = build_adjacency_list(services, dependencies)

    # Check for Single Point of Failure (SPoF)
    gateways = [s for s in services if s.get("type") == "gateway"]
    for gw in gateways:
        replicas = gw.get("replicas", 1)
        if replicas < 2:
            issues.append({
                "id": f"spof-gw-{gw['id']}",
                "severity": "critical",
                "category": "Single Point of Failure",
                "title": "API Gateway Single Point of Failure",
                "description": f"API Gateway \"{gw.get('name')}\" has {replicas} replica. If this node fails, the entire application will be inaccessible.",
                "remedy": "Increase replica count to at least 2 and place a Load Balancer in front.",
                "nodeId": gw["id"]
            })
        if not gw.get("rateLimit"):
            issues.append({
                "id": f"sec-ratelimit-{gw['id']}",
                "severity": "high",
                "category": "Security Risks",
                "title": "Missing Rate Limiting on Gateway",
                "description": f"Gateway \"{gw.get('name')}\" has no rate limiting configured, making the system highly vulnerable to DDoS attacks and brute-force abuse.",
                "remedy": "Enable a rate limiter middleware or policy with a threshold of 100-500 requests/min per IP.",
                "nodeId": gw["id"]
            })

    # Check for databases SPoF & scaling
    dbs = [s for s in services if s.get("type") == "database"]
    for db in dbs:
        replicas = db.get("replicas", 1)
        if replicas < 2:
            issues.append({
                "id": f"spof-db-{db['id']}",
                "severity": "high",
                "category": "Single Point of Failure",
                "title": "Database Has No Redundancy",
                "description": f"Database \"{db.get('name')}\" runs with only {replicas} replica. A storage or compute failure will cause permanent data unavailability or downtime.",
                "remedy": "Configure MySQL replication with at least 1 read replica or migrate to a Multi-AZ cluster.",
                "nodeId": db["id"]
            })

    # Check for Missing Cache
    has_cache = any(s.get("type") == "cache" for s in services)
    if not has_cache and len(dbs) > 0:
        main_db = dbs[0]
        issues.append({
            "id": "perf-missing-cache",
            "severity": "medium",
            "category": "Scalability Issues",
            "title": "Missing Distributed Cache",
            "description": f"All reads are hitting the relational database \"{main_db.get('name')}\" directly. This will bottleneck throughput as traffic scales.",
            "remedy": "Introduce a Redis or Memcached node to offload read-heavy query patterns.",
            "nodeId": main_db["id"]
        })

    # Check for Missing Queue
    has_queue = any(s.get("type") == "queue" for s in services)
    heavy_write_svc = [s for s in services if "order" in s.get("name", "").lower() or "payment" in s.get("name", "").lower() or "notification" in s.get("name", "").lower()]
    if not has_queue and len(heavy_write_svc) > 0:
        issues.append({
            "id": "scalability-missing-queue",
            "severity": "medium",
            "category": "Architecture Anti-patterns",
            "title": "Missing Asynchronous Queue",
            "description": "Heavy tasks or high-frequency notification dispatches are executed synchronously over HTTP/gRPC. This increases request latency and coupling.",
            "remedy": "Add an asynchronous Message Broker like RabbitMQ, Apache Kafka, or AWS SQS to buffer and process tasks in the background."
        })

    # Check for Circular Dependencies
    visited = {}
    rec_stack = {}

    def dfs_detect_cycle(u, path):
        visited[u] = True
        rec_stack[u] = True

        neighbors = adj.get(u, [])
        for v in neighbors:
            if not visited.get(v, False):
                if dfs_detect_cycle(v, path + [u]):
                    return True
            elif rec_stack.get(v, False):
                # Found cycle
                cycle_path = path[path.index(v):] if v in path else path
                cycle_str = " -> ".join(cycle_path) + f" -> {u} -> {v}"
                issues.append({
                    "id": f"arch-cycle-{u}-{v}",
                    "severity": "high",
                    "category": "Architecture Anti-patterns",
                    "title": "Circular Dependency Detected",
                    "description": f"A tight feedback loop or direct dependency loop was detected: {cycle_str}. This causes cascading timeouts and deadlock risk.",
                    "remedy": "Deconstruct the direct call chain. Refactor dependencies using events/messages or abstract the shared logic into a common library.",
                    "nodeId": u
                })
                return True
        rec_stack[u] = False
        return False

    for node_id in adj.keys():
        if not visited.get(node_id, False):
            dfs_detect_cycle(node_id, [])

    # Check for Missing Gateway
    has_gateway = any(s.get("type") == "gateway" for s in services)
    if not has_gateway and len([s for s in services if s.get("type") == "service"]) > 2:
        issues.append({
            "id": "arch-missing-gateway",
            "severity": "medium",
            "category": "Security Risks",
            "title": "Missing Central API Gateway",
            "description": "Clients are interacting with multiple backend services directly. This increases attack surface, cross-origin complexities, and centralized management overhead.",
            "remedy": "Add a central API Gateway (e.g. Kong, AWS API Gateway, NGINX) to handle global auth, rate limiting, and route forwarding."
        })

    # Check custom constraints validation
    if constraints:
        expected_users = constraints.get("expectedUsers", 0)
        config_type = config.get("type", "monolith")
        if expected_users > 100000 and config_type == "monolith":
            issues.append({
                "id": "constraint-monolith-high-traffic",
                "severity": "high",
                "category": "Scalability Issues",
                "title": "Monolithic Architecture for Extreme Scale",
                "description": f"A Modular Monolith is planned for {expected_users:,} expected users. Scaling individual modules in a monolith is costly and complex.",
                "remedy": "Upgrade to Microservices or an Event-Driven architecture to allow independent autoscaling of core workloads."
            })

        availability_target = constraints.get("availabilityTarget", 0.0)
        non_user_ext = [s for s in services if s.get("type") not in ("user", "external_api")]
        if availability_target >= 99.99 and all(s.get("replicas", 1) < 2 for s in non_user_ext):
            issues.append({
                "id": "constraint-availability-violation",
                "severity": "critical",
                "category": "Single Point of Failure",
                "title": "High Availability SLA Unachievable",
                "description": f"The SLA target is set to {availability_target}%, but multiple nodes are configured with only 1 replica. Under single-node failures, target SLA will be breached.",
                "remedy": "Ensure critical components (Gateways, DB, Core Services) have replica counts >= 2 with load balancers configured."
            })

    return issues


# 2. SCORING ENGINE
def calculate_scores(config: Dict[str, Any], issues: List[Dict[str, Any]], constraints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    scalability = 85
    security = 80
    reliability = 85
    maintainability = 85
    cost_efficiency = 80

    config_type = config.get("type")
    services = config.get("services", [])

    # Type specific baseline adjustments
    if config_type == 'monolith':
        scalability = 55
        maintainability = 70
        cost_efficiency = 90
    elif config_type == 'microservices':
        scalability = 90
        maintainability = 75
        cost_efficiency = 65
    elif config_type == 'serverless':
        scalability = 95
        maintainability = 85
        cost_efficiency = 75
        reliability = 80
    elif config_type == 'event_driven':
        scalability = 95
        reliability = 90
        maintainability = 70
        cost_efficiency = 70

    # Replica count reliability boosts
    non_user_ext = [s for s in services if s.get("type") not in ("user", "external_api")]
    if non_user_ext:
        min_replicas = min(s.get("replicas", 1) for s in non_user_ext)
    else:
        min_replicas = 1

    if min_replicas > 1:
        reliability += 10
    else:
        reliability -= 15

    # API Gateway checks
    has_gateway = any(s.get("type") == "gateway" for s in services)
    if has_gateway:
        security += 10
        gateways = [s for s in services if s.get("type") == "gateway"]
        if any(gw.get("rateLimit") for gw in gateways):
            security += 5
        if any(gw.get("loadBalanced") for gw in gateways):
            reliability += 5
    else:
        security -= 15
        reliability -= 5

    # Cache benefits
    has_cache = any(s.get("type") == "cache" for s in services)
    if has_cache:
        scalability += 10
        cost_efficiency += 5
    else:
        scalability -= 10

    # Queue benefits
    has_queue = any(s.get("type") == "queue" for s in services)
    if has_queue:
        scalability += 10
        reliability += 10

    # Deduct based on verified issues
    for issue in issues:
        severity = issue.get("severity")
        penalty = 15 if severity == 'critical' else 10 if severity == 'high' else 5 if severity == 'medium' else 2
        category = issue.get("category")
        if category == 'Single Point of Failure':
            reliability -= penalty
        elif category == 'Scalability Issues':
            scalability -= penalty
        elif category == 'Security Risks':
            security -= penalty
        elif category == 'Architecture Anti-patterns':
            maintainability -= penalty

    # Constraints fitting adjustments
    if constraints:
        computed_cost = estimate_infrastructure_cost(config, constraints.get("expectedUsers", 10000))["total"]
        budget = constraints.get("budget", 100)
        if computed_cost > budget:
            budget_exceed_ratio = computed_cost / budget
            cost_efficiency -= min(40, round((budget_exceed_ratio - 1.0) * 20))
        else:
            cost_efficiency += 10

    def clamp(val):
        return max(0, min(100, val))

    final_scalability = clamp(scalability)
    final_security = clamp(security)
    final_reliability = clamp(reliability)
    final_maintainability = clamp(maintainability)
    final_cost_efficiency = clamp(cost_efficiency)

    overall = round(
        (final_scalability * 0.25) + 
        (final_reliability * 0.25) + 
        (final_security * 0.15) + 
        (final_maintainability * 0.15) + 
        (final_cost_efficiency * 0.20)
    )

    return {
        "overall": overall,
        "scalability": final_scalability,
        "security": final_security,
        "reliability": final_reliability,
        "maintainability": final_maintainability,
        "costEfficiency": final_cost_efficiency
    }


# 3. CONSTRAINT CONFLICT DETECTOR
def detect_constraint_conflicts(constraints: Dict[str, Any]) -> List[str]:
    conflicts = []
    
    budget = constraints.get("budget", 0)
    availability_target = constraints.get("availabilityTarget", 0.0)
    expected_users = constraints.get("expectedUsers", 0)
    timeline = constraints.get("timeline", 0)
    team_size = constraints.get("teamSize", 0)
    max_latency = constraints.get("maxLatency", 0)
    db_pref = constraints.get("databasePreference", "").lower()

    if availability_target >= 99.999 and budget < 150:
        conflicts.append(
            f"Impossible High Availability Target: Setting SLA to {availability_target}% requires multi-region deployments, load balancers, clustering, and synchronous replica synchronization. This is physically impossible with a budget of ${budget}/month."
        )

    if expected_users >= 1000000 and budget < 200:
        conflicts.append(
            f"Scale-Budget Mismatch: Serving {expected_users:,} expected users on a budget under $200/month is highly risky. Database cluster hosting, high bandwidth, CDNs, and multiple application replicas easily exceed this allocation."
        )

    if timeline <= 2 and team_size <= 2:
        conflicts.append(
            f"Development Velocity Bottleneck: Building a highly optimized microservices framework within {timeline} months with only {team_size} developers will likely lead to structural compromises, technical debt, and delayed release."
        )

    if max_latency < 50 and "mysql" in db_pref and expected_users > 500000:
        conflicts.append(
            f"Sub-50ms Latency MySQL SLA: Achieving maximum latency < {max_latency}ms for {expected_users:,} users using relational database queries directly is unfeasible. This SLA requires immediate caching (Redis) and read replica offloading."
        )

    return conflicts


# 4. COST ESTIMATION ENGINE
def estimate_infrastructure_cost(config: Dict[str, Any], users: int) -> Dict[str, int]:
    scale_multiplier = max(1.0, users / 10000.0)
    
    compute_count = 0
    db_count = 0
    cache_count = 0
    queue_count = 0

    services = config.get("services", [])
    for s in services:
        reps = s.get("replicas", 1)
        stype = s.get("type")
        if stype in ('gateway', 'service'):
            compute_count += reps
        elif stype == 'database':
            db_count += reps
        elif stype == 'cache':
            cache_count += reps
        elif stype == 'queue':
            queue_count += reps

    compute_cost_per_instance = 15
    db_cost_per_instance = 25
    cache_cost_per_instance = 12
    queue_cost_per_instance = 10

    compute = round(compute_count * compute_cost_per_instance * math.log10(10 + scale_multiplier))
    database = round(db_count * db_cost_per_instance * math.log10(10 + (scale_multiplier * 0.8)))
    cache = round(cache_count * cache_cost_per_instance * math.log10(10 + (scale_multiplier * 0.5)))
    queue = round(queue_count * queue_cost_per_instance * math.log10(10 + (scale_multiplier * 0.3)))
    
    storage = round(5 * math.log10(10 + scale_multiplier * 2))
    cdn = round(8 * math.log10(10 + scale_multiplier * 5))
    network = round(10 * math.log10(10 + scale_multiplier * 4))

    total = compute + database + cache + queue + storage + cdn + network

    return {
        "compute": compute,
        "database": database,
        "cache": cache,
        "queue": queue,
        "storage": storage,
        "cdn": cdn,
        "network": network,
        "total": total
    }


# 5. SCALABILITY PREDICTOR
def predict_scalability(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    config_type = config.get("type")
    services = config.get("services", [])
    
    tiers = [
        {"label": '100', "users": 100},
        {"label": '1K', "users": 1000},
        {"label": '10K', "users": 10000},
        {"label": '100K', "users": 100000},
        {"label": '1M', "users": 1000000},
        {"label": '10M', "users": 10000000},
    ]

    max_rps_capacity = 500
    if config_type == 'microservices':
        max_rps_capacity = 5000
    elif config_type == 'serverless':
        max_rps_capacity = 20000
    elif config_type == 'event_driven':
        max_rps_capacity = 15000

    total_replicas = sum(s.get("replicas", 1) for s in services)
    max_rps_capacity += (total_replicas - len(services)) * 400

    has_cache = any(s.get("type") == "cache" for s in services)
    if has_cache:
        max_rps_capacity *= 1.8

    has_queue = any(s.get("type") == "queue" for s in services)
    if has_queue:
        max_rps_capacity *= 1.4

    results = []
    for tier in tiers:
        concurrent_rps = round(tier["users"] * 0.05)
        load_factor = concurrent_rps / max_rps_capacity

        latency_ms = 80
        state = 'stable'

        if load_factor < 0.3:
            latency_ms = 80 + (load_factor * 50)
            state = 'stable'
        elif load_factor < 0.8:
            latency_ms = 120 + (load_factor * 250)
            state = 'stable'
        elif load_factor < 1.2:
            latency_ms = 300 + (load_factor * 1000)
            state = 'saturated'
        else:
            latency_ms = 1500 + (load_factor * 5000)
            state = 'unstable'

        results.append({
            "users": tier["label"],
            "latencyMs": round(latency_ms),
            "throughputRps": round(min(concurrent_rps, max_rps_capacity * 1.1)),
            "loadFactor": min(1.5, round(load_factor, 2)),
            "state": state
        })

    return results


# 6. SIMULATION ENGINE
def run_simulations(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    config_type = config.get("type")
    services = config.get("services", [])
    
    has_queue = any(s.get("type") == "queue" for s in services)
    has_cache = any(s.get("type") == "cache" for s in services)
    dbs = [s for s in services if s.get("type") == "database"]
    has_db_replica = any(db.get("replicas", 1) > 1 for db in dbs)
    gateways = [s for s in services if s.get("type") == "gateway"]
    has_gateway_replica = any(gw.get("replicas", 1) > 1 for gw in gateways)

    scenarios = []

    # Scenario 1: Traffic Spike
    traffic_spike_status = 'passed'
    traffic_spike_score = 95
    traffic_spike_latency = 120
    traffic_spike_error_rate = 0.0
    spike_details = "System scale held up smoothly."

    if config_type == 'monolith':
        traffic_spike_status = 'degraded'
        traffic_spike_score = 60
        traffic_spike_latency = 450
        traffic_spike_error_rate = 4.2
        spike_details = "Central server CPU pegged at 95%. Threads saturated, creating queue delays."
    elif not has_cache and config_type != 'serverless':
        traffic_spike_status = 'degraded'
        traffic_spike_score = 70
        traffic_spike_latency = 350
        traffic_spike_error_rate = 1.5
        spike_details = "Database connections fully saturated. Queries queued up causing micro-timeouts."

    scenarios.append({
        "scenarioName": "Traffic Spike (10x Standard Load)",
        "status": traffic_spike_status,
        "resilienceScore": traffic_spike_score,
        "latencyMs": traffic_spike_latency,
        "errorRate": traffic_spike_error_rate,
        "throughput": 1200 if config_type == 'monolith' else 8500,
        "details": spike_details
    })

    # Scenario 2: Primary Database Failure
    db_status = 'passed'
    db_score = 99
    db_latency = 100
    db_error_rate = 0.0
    db_details = "Active read-replicas promoted instantly. Zero writes lost due to failover group."

    if not has_db_replica:
        db_status = 'failed'
        db_score = 15
        db_latency = 5000
        db_error_rate = 100.0
        db_details = "Relational database crashed. All core reads and writes completely offline."
    elif has_db_replica and dbs[0].get("replicas", 1) == 2:
        db_status = 'degraded'
        db_score = 75
        db_latency = 280
        db_error_rate = 5.0
        db_details = "Master failed. Replica promoted in 12 seconds. Short interruption in pending transactions."

    scenarios.append({
        "scenarioName": "Database Failure (Master Crash)",
        "status": db_status,
        "resilienceScore": db_score,
        "latencyMs": db_latency,
        "errorRate": db_error_rate,
        "throughput": 0 if db_status == 'failed' else 3200,
        "details": db_details
    })

    # Scenario 3: API Gateway Outage
    gw_status = 'passed'
    gw_score = 100
    gw_latency = 85
    gw_error_rate = 0.0
    gw_details = "Failover IP switched to redundant Gateway instantly via load balancer."

    if len(gateways) == 0:
        gw_status = 'failed'
        gw_score = 0
        gw_latency = 0
        gw_error_rate = 100.0
        gw_details = "No API Gateway exists to route traffic."
    elif not has_gateway_replica:
        gw_status = 'failed'
        gw_score = 8
        gw_latency = 5000
        gw_error_rate = 100.0
        gw_details = "Single gateway node crashed. Entire platform ingress is blocked."

    scenarios.append({
        "scenarioName": "API Gateway Crash",
        "status": gw_status,
        "resilienceScore": gw_score,
        "latencyMs": gw_latency,
        "errorRate": gw_error_rate,
        "throughput": 0 if gw_status == 'failed' else 4500,
        "details": gw_details
    })

    # Scenario 4: Cache Failure
    cache_status = 'passed'
    cache_score = 95
    cache_latency = 95
    cache_error_rate = 0.0
    cache_details = "Cache cluster nodes self-healed and distributed keys automatically."

    if not has_cache:
        cache_status = 'passed'
        cache_score = 100
        cache_latency = 80
        cache_error_rate = 0.0
        cache_details = "No cache integrated, unaffected by cache outages."
    elif all(c.get("replicas", 1) < 2 for c in [s for s in services if s.get("type") == "cache"]):
        cache_status = 'degraded'
        cache_score = 65
        cache_latency = 380
        cache_error_rate = 0.0
        cache_details = "Single Redis node offline. Fallback to relational DB successful but performance degraded by 4x."

    scenarios.append({
        "scenarioName": "Distributed Cache Failure",
        "status": cache_status,
        "resilienceScore": cache_score,
        "latencyMs": cache_latency,
        "errorRate": cache_error_rate,
        "throughput": 1200 if cache_status == 'degraded' else 6000,
        "details": cache_details
    })

    return scenarios


# 7. TRADEOFF ANALYZER
def analyze_tradeoffs(config: Dict[str, Any], scores: Dict[str, Any]) -> Dict[str, int]:
    config_type = config.get("type")
    services = config.get("services", [])

    cost_metric = scores.get("costEfficiency", 0)
    scalability_metric = scores.get("scalability", 0)
    reliability_metric = scores.get("reliability", 0)
    security_metric = scores.get("security", 0)
    maintainability_metric = scores.get("maintainability", 0)

    complexity_metric = 30
    if config_type == 'microservices':
        complexity_metric = 80
    elif config_type == 'event_driven':
        complexity_metric = 85
    elif config_type == 'hybrid':
        complexity_metric = 90

    complexity_metric += len(services) * 3

    return {
        "cost": cost_metric,
        "scalability": scalability_metric,
        "reliability": reliability_metric,
        "security": security_metric,
        "complexity": min(100, complexity_metric),
        "maintainability": maintainability_metric
    }


# 8. EVOLUTION ENGINE (GENERATIONAL OPTIMIZATION)
def run_optimization_generations(initial_config: Dict[str, Any], constraints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    steps = []
    current_config = copy.deepcopy(initial_config)

    init_issues = verify_architecture(current_config, constraints)
    current_scores = calculate_scores(current_config, init_issues, constraints)

    current_gen = 1

    # Step 1: Mitigate Critical API Gateway Single Point of Failure
    gateways = [s for s in current_config.get("services", []) if s.get("type") == "gateway"]
    if len(gateways) > 0 and any(g.get("replicas", 1) < 2 for g in gateways):
        for g in gateways:
            g["replicas"] = 2
            g["loadBalanced"] = True
            
        next_issues = verify_architecture(current_config, constraints)
        next_scores = calculate_scores(current_config, next_issues, constraints)
        diff = next_scores["overall"] - current_scores["overall"]
        steps.append({
            "generation": current_gen,
            "changeType": "Gateway Redundancy",
            "description": "Increased Gateway nodes to 2 replicas and configured frontend load balancer.",
            "why": "Removes critical single point of ingress failure and enables zero-downtime rolling deploys.",
            "scoreImprovement": diff,
            "newScore": next_scores["overall"]
        })
        current_gen += 1
        current_scores = next_scores

    # Step 2: Relational Database Scaling & High Availability
    databases = [s for s in current_config.get("services", []) if s.get("type") == "database"]
    if len(databases) > 0 and any(db.get("replicas", 1) < 2 for db in databases):
        for db in databases:
            db["replicas"] = 2
            
        next_issues = verify_architecture(current_config, constraints)
        next_scores = calculate_scores(current_config, next_issues, constraints)
        diff = next_scores["overall"] - current_scores["overall"]
        steps.append({
            "generation": current_gen,
            "changeType": "Database Replication",
            "description": "Provisioned 1 active primary database and 1 read replica.",
            "why": "Offloads analytic reads and ensures service recovery if primary node experiences storage failover.",
            "scoreImprovement": diff,
            "newScore": next_scores["overall"]
        })
        current_gen += 1
        current_scores = next_scores

    # Step 3: Implement Caching Layer
    has_cache = any(s.get("type") == "cache" for s in current_config.get("services", []))
    if not has_cache and len(databases) > 0:
        redis_cache = {
            "id": "node-redis-cache",
            "name": "Redis Cache",
            "type": "cache",
            "subType": "Redis",
            "replicas": 1,
            "cpu": 1,
            "memory": 2
        }
        current_config.setdefault("services", []).append(redis_cache)

        # Connect core service to Redis
        core_service = next((s for s in current_config.get("services", []) if s.get("type") == "service"), None)
        if core_service:
            current_config.setdefault("dependencies", []).append({
                "id": f"dep-{core_service['id']}-redis",
                "from": core_service["id"],
                "to": redis_cache["id"],
                "protocol": "tcp"
            })

        next_issues = verify_architecture(current_config, constraints)
        next_scores = calculate_scores(current_config, next_issues, constraints)
        diff = next_scores["overall"] - current_scores["overall"]
        steps.append({
            "generation": current_gen,
            "changeType": "Caching Infrastructure",
            "description": "Added a cluster-ready Redis Node to cache frequently retrieved datasets.",
            "why": "Saves expensive SQL transactions, reducing average API response times by up to 60%.",
            "scoreImprovement": diff,
            "newScore": next_scores["overall"]
        })
        current_gen += 1
        current_scores = next_scores

    # Step 4: Implement Ingress Security & Rate Limiting
    insecure_gateways = [s for s in current_config.get("services", []) if s.get("type") == "gateway" and not s.get("rateLimit")]
    if len(insecure_gateways) > 0:
        for g in insecure_gateways:
            g["rateLimit"] = True
            
        next_issues = verify_architecture(current_config, constraints)
        next_scores = calculate_scores(current_config, next_issues, constraints)
        diff = next_scores["overall"] - current_scores["overall"]
        steps.append({
            "generation": current_gen,
            "changeType": "Ingress Hardening",
            "description": "Configured rate limit thresholds at API Gateways.",
            "why": "Defends the backend service pool from automated bots and cascading memory resource exhaustion.",
            "scoreImprovement": diff,
            "newScore": next_scores["overall"]
        })
        current_gen += 1
        current_scores = next_scores

    return {
        "steps": steps,
        "optimizedConfig": current_config
    }
