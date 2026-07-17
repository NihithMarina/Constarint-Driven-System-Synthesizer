import { useState, useEffect } from 'react';
import TopologyGraph from './components/TopologyGraph';
import AuthPage from './components/AuthPage';
import { 
  Terminal, 
  Cpu, 
  Database, 
  Activity, 
  Clock, 
  Coins, 
  TrendingUp, 
  GitMerge, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  Play, 
  Layout, 
  FileText, 
  RefreshCw, 
  Copy, 
  PlusCircle, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  Layers, 
  Network, 
  ExternalLink, 
  Code,
  FileJson,
  Zap,
  Shield,
  HelpCircle,
  Pencil,
  Check,
  LogOut,
  Download
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    const storedUser = localStorage.getItem('user');
    if (storedAuth === 'true' && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user state:', e);
      }
    }
    setCheckingAuth(false);
  }, []);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  

  // Creation States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState('idea');
  const [projectName, setProjectName] = useState('');
  const [projectIdea, setProjectIdea] = useState('');
  const [projectJson, setProjectJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Simulation Running State
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([]);

  // Selected sub-candidate ID inside the selected project
  const [activeCandidateId, setActiveCandidateId] = useState('');

  // Editing constraints states
  const [isEditingConstraints, setIsEditingConstraints] = useState(false);
  const [editBudget, setEditBudget] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [editUsers, setEditUsers] = useState('');
  const [editDatabasePref, setEditDatabasePref] = useState('');
  const [editSecurityLevel, setEditSecurityLevel] = useState('');
  const [editTimeline, setEditTimeline] = useState('');
  const [editTeamSize, setEditTeamSize] = useState('');

  // Loaded active project
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const activeCandidate = activeProject?.candidates[activeCandidateId || activeProject.selectedCandidateId];

  // Load all projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Update active candidate when project changes
  useEffect(() => {
    if (activeProject) {
      setActiveCandidateId(activeProject.selectedCandidateId);
    }
  }, [selectedProjectId]);

  const fetchProjects = async (selectId) => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      if (data.length > 0) {
        if (selectId) {
          setSelectedProjectId(selectId);
        } else if (!selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching projects', e);
    }
  };

  // Log simulation updates
  const runSimulationScenario = (scenarioName, durationMs = 1500) => {
    setActiveSimulation(scenarioName);
    setSimulationLogs([`[INFO] Booting Sandbox Telemetry for simulation: "${scenarioName}"`]);
    
    const logs = [
      `[INFO] Injecting synthetic failure triggers into active nodes...`,
      `[WARN] Target nodes detected abnormal performance spikes.`,
      `[INFO] Analyzing auto-failover mechanics & recovery latency...`,
      `[SUCCESS] Simulation completed. Aggregating system resilience results.`
    ];

    logs.forEach((log, i) => {
      setTimeout(() => {
        setSimulationLogs(prev => [...prev, log]);
      }, (i + 1) * (durationMs / 4));
    });

    setTimeout(() => {
      setActiveSimulation(null);
    }, durationMs + 200);
  };

  const handleCreateProject = async () => {
    if (creationMode === 'idea' && !projectIdea.trim()) return;
    if (creationMode === 'json' && !projectJson.trim()) return;

    setIsProcessing(true);
    setTerminalLogs([`[CDSS Engine] Initiating constraint analysis ...`]);

    const logSequence = [
      `[CDSS Engine] Parsing system dependencies and extraction rules ...`,
      `[CDSS Engine] Running rule-based architecture verification scan ...`,
      `[CDSS Engine] Executing deterministic SLA & multi-generation scorer ...`,
      `[AI Service] Contacting Gemini API for explainable reports & documentation generation ...`,
      `[CDSS Engine] Synthesizing final candidate trade-offs and plans ...`,
      `[CDSS Engine] System Blueprint stored to MySQL persistence cluster successfully!`
    ];

    logSequence.forEach((log, idx) => {
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, log]);
      }, (idx + 1) * 800);
    });

    try {
      const body = creationMode === 'idea' 
        ? { idea: projectIdea, name: projectName }
        : { architectureJson: projectJson, name: projectName };

      const endpoint = creationMode === 'idea' ? '/api/projects/idea' : '/api/projects/json';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.error) {
        setTerminalLogs(prev => [...prev, `[ERROR] ${data.error}`]);
        setIsProcessing(false);
        return;
      }

      setTimeout(() => {
        fetchProjects(data.id);
        setIsProcessing(false);
        setShowCreateModal(false);
        setProjectName('');
        setProjectIdea('');
        setProjectJson('');
      }, 5500);

    } catch (e) {
      setTerminalLogs(prev => [...prev, `[CRITICAL ERROR] Failed during system synthesis: ${e.message}`]);
      setIsProcessing(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this synthesis project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      const nextProjects = projects.filter(p => p.id !== id);
      setProjects(nextProjects);
      if (nextProjects.length > 0) {
        setSelectedProjectId(nextProjects[0].id);
      } else {
        setSelectedProjectId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCandidate = async (candidateId) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/select-candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      });
      const data = await res.json();
      setActiveCandidateId(candidateId);
      fetchProjects(activeProject.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReanalyze = async () => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/re-analyze`, { method: 'POST' });
      const data = await res.json();
      fetchProjects(activeProject.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Interactive addition of elements dynamically modifies target active candidate!
  const addInteractiveNode = async (type) => {
    if (!activeProject || !activeCandidate) return;
    
    // Create new node object
    const idSuffix = Math.random().toString(36).substring(2, 6);
    let addedNode;

    if (type === 'database') {
      addedNode = {
        id: `node-db-${idSuffix}`,
        name: `Replicated MySQL DB`,
        type: 'database',
        subType: 'MySQL',
        replicas: 2
      };
    } else if (type === 'cache') {
      addedNode = {
        id: `node-cache-${idSuffix}`,
        name: `Redis In-Memory Cache`,
        type: 'cache',
        subType: 'Redis',
        replicas: 1
      };
    } else if (type === 'queue') {
      addedNode = {
        id: `node-queue-${idSuffix}`,
        name: `RabbitMQ Queue Broker`,
        type: 'queue',
        subType: 'RabbitMQ',
        replicas: 1
      };
    } else if (type === 'external_api') {
      addedNode = {
        id: `node-ext-${idSuffix}`,
        name: `Payment Gateway External API`,
        type: 'external_api',
        subType: 'HTTP',
        replicas: 1
      };
    } else {
      addedNode = {
        id: `node-svc-${idSuffix}`,
        name: `Auth/Business Service`,
        type: 'service',
        subType: 'Go/TS',
        replicas: 2
      };
    }

    // Deep copy and push node
    const updatedCandidate = JSON.parse(JSON.stringify(activeCandidate));
    updatedCandidate.config.services.push(addedNode);

    // Create edge from gateway or core to added node
    const firstSvc = updatedCandidate.config.services.find((s) => s.type === 'service' || s.type === 'gateway');
    if (firstSvc) {
      updatedCandidate.config.dependencies.push({
        id: `dep-inter-${idSuffix}`,
        from: firstSvc.id,
        to: addedNode.id,
        protocol: type === 'queue' ? 'amqp' : 'tcp'
      });
    }

    // Send payload to save dynamically
    try {
      const updatedProject = { ...activeProject };
      updatedProject.candidates[activeCandidateId] = updatedCandidate;
      
      // Post updated candidate config back to re-analyze immediately
      const res = await fetch(`/api/projects/${activeProject.id}/re-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      fetchProjects(activeProject.id);
    } catch (e) {
      console.error('Error adding interactive node', e);
    }
  };

  const removeInteractiveNode = async (nodeId) => {
    if (!activeProject || !activeCandidate) return;
    
    // Deep copy
    const updatedCandidate = JSON.parse(JSON.stringify(activeCandidate));
    
    // Filter out the node
    updatedCandidate.config.services = updatedCandidate.config.services.filter((s) => s.id !== nodeId);
    
    // Filter out dependencies attached to this node
    updatedCandidate.config.dependencies = updatedCandidate.config.dependencies.filter(
      (d) => d.from !== nodeId && d.to !== nodeId
    );

    // Send payload to save dynamically
    try {
      const updatedProject = { ...activeProject };
      updatedProject.candidates[activeCandidateId || activeProject.selectedCandidateId] = updatedCandidate;
      
      const res = await fetch(`/api/projects/${activeProject.id}/re-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      fetchProjects(activeProject.id);
    } catch (e) {
      console.error('Error removing interactive node', e);
    }
  };

  const startEditingConstraints = () => {
    if (!activeProject) return;
    setEditBudget(activeProject.constraints.budget.toString());
    setEditAvailability(activeProject.constraints.availabilityTarget.toString());
    setEditUsers(activeProject.constraints.expectedUsers.toString());
    setEditDatabasePref(activeProject.constraints.databasePreference || 'MySQL');
    setEditSecurityLevel(activeProject.constraints.securityLevel || 'high');
    setEditTimeline(activeProject.constraints.timeline?.toString() || '6');
    setEditTeamSize(activeProject.constraints.teamSize?.toString() || '5');
    setIsEditingConstraints(true);
  };

  const handleSaveConstraints = async () => {
    if (!activeProject) return;
    try {
      const updatedConstraints = {
        ...activeProject.constraints,
        budget: parseFloat(editBudget) || 200,
        availabilityTarget: parseFloat(editAvailability) || 99.9,
        expectedUsers: parseInt(editUsers) || 100000,
        databasePreference: editDatabasePref,
        securityLevel: editSecurityLevel,
        timeline: parseInt(editTimeline) || 6,
        teamSize: parseInt(editTeamSize) || 5,
      };

      const updatedProject = {
        ...activeProject,
        constraints: updatedConstraints
      };

      const res = await fetch(`/api/projects/${activeProject.id}/re-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });
      const data = await res.json();
      fetchProjects(activeProject.id);
      setIsEditingConstraints(false);
    } catch (e) {
      console.error('Error saving constraints', e);
    }
  };

  const loadPresetIdea = (preset) => {
    if (preset === 'food') {
      setProjectName('Food Delivery Architecture');
      setProjectIdea('Build a food delivery application for 5 million expected users using Docker, MySQL, a budget under $200/month, and high availability.');
    } else if (preset === 'chat') {
      setProjectName('Global Real-time Chat Engine');
      setProjectIdea('Build a secure instant messaging system for 10 million concurrent channels with WebSockets, sub-50ms latency, and end-to-end encryption.');
    } else {
      setProjectName('Financial Billing Service');
      setProjectIdea('A financial reporting transaction compiler. Budget $500/month, 99.999% availability, standard audit trails with secure military level key encryption.');
    }
  };

  const loadPresetJson = () => {
    setProjectName('Food Delivery JSON Base');
    setProjectJson(JSON.stringify({
      "name": "Food Delivery Backend",
      "services": [
        "API Gateway",
        "Order Service",
        "Payment Service"
      ],
      "database": "MySQL",
      "cache": "Redis",
      "queue": "RabbitMQ",
      "deployment": "Docker"
    }, null, 2));
  };

  const sanitizeFileName = (value) => {
    return (value || 'project')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);
  };

  const triggerDownload = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const escapeXml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const buildTopologySvg = (services = [], dependencies = [], title = 'Architecture Topology') => {
    const width = 1200;
    const height = 720;
    const nodeWidth = 190;
    const nodeHeight = 74;
    const radius = 12;

    const layers = {
      user: [],
      gateway: [],
      service: [],
      infra: []
    };

    services.forEach((node) => {
      if (node.type === 'user') layers.user.push(node);
      else if (node.type === 'gateway') layers.gateway.push(node);
      else if (['database', 'cache', 'queue'].includes(node.type)) layers.infra.push(node);
      else layers.service.push(node);
    });

    const coords = {};
    const layerY = {
      user: 120,
      gateway: 260,
      service: 400,
      infra: 560
    };

    Object.entries(layers).forEach(([layerKey, nodes]) => {
      const count = nodes.length;
      const y = layerY[layerKey];
      nodes.forEach((node, index) => {
        let x = width / 2;
        if (count > 1) {
          const margin = 130;
          const step = (width - margin * 2) / (count - 1);
          x = margin + index * step;
        }
        coords[node.id] = { x, y };
      });
    });

    const linkSvg = dependencies
      .map((dep) => {
        const from = coords[dep.from];
        const to = coords[dep.to];
        if (!from || !to) return '';

        const startX = from.x;
        const startY = from.y + nodeHeight / 2;
        const endX = to.x;
        const endY = to.y - nodeHeight / 2;
        const controlY1 = startY + (endY - startY) * 0.45;
        const controlY2 = startY + (endY - startY) * 0.55;
        const color = dep.protocol === 'tcp' ? '#10b981' : dep.protocol === 'http' ? '#3b82f6' : '#64748b';
        const pathD = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
        return `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.2" marker-end="url(#arrow)" />`;
      })
      .join('');

    const nodePalette = {
      user: { fill: '#0f172a', stroke: '#334155' },
      gateway: { fill: '#172554', stroke: '#1d4ed8' },
      service: { fill: '#111827', stroke: '#4f46e5' },
      database: { fill: '#052e2b', stroke: '#10b981' },
      cache: { fill: '#3f1d09', stroke: '#f97316' },
      queue: { fill: '#2e1065', stroke: '#a855f7' },
      external_api: { fill: '#1f2937', stroke: '#64748b' }
    };

    const nodeSvg = services
      .map((node) => {
        const point = coords[node.id];
        if (!point) return '';
        const palette = nodePalette[node.type] || nodePalette.service;
        const x = point.x - nodeWidth / 2;
        const y = point.y - nodeHeight / 2;
        const name = escapeXml(node.name || node.id);
        const subtype = escapeXml(node.subType || node.type || 'service');
        const replicas = escapeXml((node.replicas || 1).toString());

        return `
          <g>
            <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="${radius}" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="1.5" />
            <text x="${x + 12}" y="${y + 28}" fill="#f8fafc" font-size="14" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${name}</text>
            <text x="${x + 12}" y="${y + 49}" fill="#cbd5e1" font-size="11" font-family="Consolas, monospace">${subtype}</text>
            <text x="${x + nodeWidth - 68}" y="${y + 49}" fill="#93c5fd" font-size="11" font-family="Consolas, monospace">${replicas} Rep</text>
          </g>
        `;
      })
      .join('');

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="#020617" />
  <text x="32" y="44" fill="#e2e8f0" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${escapeXml(title)}</text>
  <text x="32" y="66" fill="#94a3b8" font-size="12" font-family="Consolas, monospace">Generated ${escapeXml(new Date().toISOString())}</text>
  ${linkSvg}
  ${nodeSvg}
</svg>
    `.trim();
  };

  const handleDownloadProjectReport = () => {
    if (!activeProject || !activeCandidate) return;

    const candidateId = activeCandidateId || activeProject.selectedCandidateId;
    const constraints = activeProject.constraints || {};
    const issues = activeCandidate.issues || [];
    const documents = activeCandidate.documents || {};
    const timestamp = new Date().toISOString();

    const report = [
      'Constraint Driven System Synthesizer - Project Review Report',
      '===========================================================',
      `Generated At: ${timestamp}`,
      `Project Name: ${activeProject.name || 'Untitled Project'}`,
      `Project ID: ${activeProject.id}`,
      `Input Mode: ${activeProject.inputMode}`,
      `Selected Candidate: ${candidateId}`,
      '',
      'Constraints',
      '-----------',
      JSON.stringify(constraints, null, 2),
      '',
      'Score Summary',
      '-------------',
      JSON.stringify(activeCandidate.score || {}, null, 2),
      '',
      'Detected Issues',
      '---------------',
      issues.length
        ? issues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.title}\n   ${issue.description}\n   Remedy: ${issue.remedy}`).join('\n\n')
        : 'No structural issues detected.',
      '',
      'REST API Blueprint',
      '------------------',
      documents.restApiDesign || 'N/A',
      '',
      'Relational DB Schema',
      '--------------------',
      documents.dbSchema || 'N/A',
      '',
      'ER Diagram',
      '----------',
      documents.erDiagram || 'N/A',
      '',
      'Wireframes',
      '----------',
      documents.wireframes || 'N/A',
      '',
      'MVP Plan',
      '--------',
      documents.mvpPlan || 'N/A',
      '',
      'Architecture Snapshot',
      '---------------------',
      JSON.stringify(activeCandidate.config || {}, null, 2)
    ].join('\n');

    const safeName = sanitizeFileName(activeProject.name || activeProject.id);
    triggerDownload(report, `${safeName}_review_report.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadArchitecture = () => {
    if (!activeProject || !activeCandidate) return;

    const safeName = sanitizeFileName(activeProject.name || activeProject.id);

    const architecture = activeCandidate.config || {};
    const services = architecture.services || [];
    const dependencies = architecture.dependencies || [];
    const svg = buildTopologySvg(
      services,
      dependencies,
      `${activeProject.name || 'Project'} - Topology Diagram`
    );
    triggerDownload(svg, `${safeName}_architecture_diagram.svg`, 'image/svg+xml;charset=utf-8');
  };

  const handleDownloadArchitectureJson = () => {
    if (!activeProject || !activeCandidate) return;

    const payload = {
      projectId: activeProject.id,
      projectName: activeProject.name,
      selectedCandidateId: activeCandidateId || activeProject.selectedCandidateId,
      exportedAt: new Date().toISOString(),
      architecture: activeCandidate.config || {},
      constraints: activeProject.constraints || {},
      score: activeCandidate.score || {}
    };

    const safeName = sanitizeFileName(activeProject.name || activeProject.id);
    triggerDownload(JSON.stringify(payload, null, 2), `${safeName}_architecture.json`, 'application/json;charset=utf-8');
  };

  if (checkingAuth) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-400">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <span className="text-xs font-semibold uppercase tracking-wider">Syncing environment context...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
      
      {/* SIDEBAR NAVIGATION & QUICK ACTIONS */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Logo Heading */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4">
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded font-bold text-white tracking-tighter">CDSS</div>
            <div>
              <h1 className="font-display font-bold text-sm text-white leading-tight">Constraint Driven</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">System Synthesizer</p>
            </div>
          </div>

          {activeProject && (
            <div className="mb-4">
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="w-full text-left p-2.5 rounded bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition-colors"
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Concept</div>
                <div className="text-xs text-slate-200 truncate leading-snug font-medium">
                  {activeProject.inputMode === 'idea' ? activeProject.name : 'JSON Base Schema'}
                </div>
              </button>
            </div>
          )}

          {/* Primary Navigation Tabs */}
          <nav className="space-y-0.5 mb-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layout },
              { id: 'report', label: 'Review Report', icon: FileText, badge: activeCandidate?.issues?.length },
              { id: 'graph', label: 'Topology Graph', icon: Network },
              { id: 'recommendations', label: 'Evolution Log', icon: CheckCircle2 },
              { id: 'alternatives', label: 'Alternatives', icon: Layers },
              { id: 'history', label: 'Project History', icon: Clock }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    isActive 
                      ? 'bg-slate-800 text-blue-400 border-l-2 border-blue-500 shadow-sm' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge ? (
                    <span className="ml-auto bg-red-950/40 text-red-400 border border-red-900/60 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Dynamic Engineering Constraints panel */}
          {activeProject && (
            <div className="px-1 py-3 border-t border-slate-800/60 my-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic font-serif">Eng. Constraints</div>
                {!isEditingConstraints ? (
                  <button 
                    onClick={startEditingConstraints}
                    className="text-slate-400 hover:text-blue-400 transition-colors text-[10px] flex items-center gap-1 font-mono font-bold cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={handleSaveConstraints}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors text-[10px] flex items-center gap-0.5 font-mono font-bold cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Save</span>
                    </button>
                    <button 
                      onClick={() => setIsEditingConstraints(false)}
                      className="text-red-400 hover:text-red-300 transition-colors text-[10px] flex items-center gap-0.5 font-mono font-bold cursor-pointer"
                      title="Cancel"
                    >
                      <XCircle className="w-2.5 h-2.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditingConstraints ? (
                <ul className="space-y-2.5">
                  <li className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">Cost Budget</span>
                      <span className="text-slate-200 font-mono">${activeProject.constraints.budget}/mo</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, ((activeCandidate?.costs?.total || 100) / activeProject.constraints.budget) * 100)}%` }}></div>
                    </div>
                  </li>
                  <li className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">SLA Availability</span>
                      <span className="text-slate-200 font-mono">{activeProject.constraints.availabilityTarget}%</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${activeProject.constraints.availabilityTarget > 99 ? 99 : 85}%` }}></div>
                    </div>
                  </li>
                  <li className="flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Load Scale</span>
                      <span className="text-slate-200 font-mono">{(activeProject.constraints.expectedUsers / 1000).toFixed(0)}k Concurrent</span>
                    </div>
                  </li>
                  {activeProject.constraints.databasePreference && (
                    <li className="flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-mono">Database Pref</span>
                        <span className="text-slate-200 font-mono truncate max-w-[100px]">{activeProject.constraints.databasePreference}</span>
                      </div>
                    </li>
                  )}
                  {activeProject.constraints.securityLevel && (
                    <li className="flex flex-col gap-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-mono">Security Level</span>
                        <span className="text-slate-200 font-mono uppercase text-[9px] bg-slate-950 border border-slate-800 px-1 py-0.2 rounded">{activeProject.constraints.securityLevel}</span>
                      </div>
                    </li>
                  )}
                </ul>
              ) : (
                <div className="space-y-2 bg-slate-950/80 p-2.5 rounded border border-slate-800">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono">Cost Budget ($/mo)</label>
                    <input 
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-xs text-white rounded font-mono w-full focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono">SLA Availability (%)</label>
                    <input 
                      type="text"
                      value={editAvailability}
                      onChange={(e) => setEditAvailability(e.target.value)}
                      className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-xs text-white rounded font-mono w-full focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono">Concurrent Users</label>
                    <input 
                      type="number"
                      value={editUsers}
                      onChange={(e) => setEditUsers(e.target.value)}
                      className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-xs text-white rounded font-mono w-full focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono">DB Preference</label>
                    <select
                      value={editDatabasePref}
                      onChange={(e) => setEditDatabasePref(e.target.value)}
                      className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-xs text-white rounded font-mono w-full focus:outline-none focus:border-blue-500"
                    >
                      <option value="MySQL">MySQL</option>
                      <option value="PostgreSQL">PostgreSQL</option>
                      <option value="MongoDB">MongoDB</option>
                      <option value="DynamoDB">DynamoDB</option>
                      <option value="Cassandra">Cassandra</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono">Security Level</label>
                    <select
                      value={editSecurityLevel}
                      onChange={(e) => setEditSecurityLevel(e.target.value)}
                      className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-xs text-white rounded font-mono w-full focus:outline-none focus:border-blue-500"
                    >
                      <option value="basic">Basic</option>
                      <option value="high">High</option>
                      <option value="military">Military</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUICK INTERACTIVE ACTIONS */}
          <div className="border-t border-slate-800/60 pt-4 mt-auto">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Topology Injectors</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                onClick={() => addInteractiveNode('service')}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-all"
              >
                <Plus className="w-3 h-3 text-blue-500" />
                <span>Service</span>
              </button>
              <button 
                onClick={() => addInteractiveNode('database')}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-all"
              >
                <Plus className="w-3 h-3 text-emerald-500" />
                <span>Database</span>
              </button>
              <button 
                onClick={() => addInteractiveNode('cache')}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-all"
              >
                <Plus className="w-3 h-3 text-orange-500" />
                <span>Cache</span>
              </button>
              <button 
                onClick={() => addInteractiveNode('queue')}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-all"
              >
                <Plus className="w-3 h-3 text-purple-500" />
                <span>Queue</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 uppercase">
              {currentUser.username ? currentUser.username[0] : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-200 truncate leading-tight">
                {currentUser.username || 'User'}
              </p>
              <p className="text-[8px] text-slate-500 font-mono truncate leading-none mt-0.5">
                {currentUser.email || 'user@domain.com'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              setCurrentUser(null);
            }}
            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800/40 transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        {/* HEADER */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 shrink-0">
          <div className="flex items-center gap-4">
            {/* Project Switcher */}
            {projects.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Target:</span>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded uppercase">
                  {activeProject?.inputMode === 'idea' ? 'NL IDEATION' : 'JSON SCHEMA'}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No active systems initialized</span>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">System Integrity</span>
              <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">
                {activeSimulation ? 'SIMULATION RUNNING' : 'Optimal State Reached'}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2.5">
              <div className="text-right leading-none">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Overall Score</div>
                <div className="text-base font-bold font-mono text-blue-400">
                  {activeCandidate?.score.overall || '94.8'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/10">
                <div className={`w-1.5 h-1.5 bg-blue-500 rounded-full ${activeSimulation ? 'animate-ping' : 'animate-pulse'}`}></div>
              </div>
            </div>
            
            <div className="h-8 w-px bg-slate-800"></div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Synthesize New System</span>
              </button>
              {activeProject && (
                <>
                  <button 
                    onClick={handleReanalyze}
                    className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-analyze</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(activeProject.id)}
                    className="bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 text-red-400 p-1.5 rounded transition-all"
                    title="Delete current system"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT CHANGER VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Fallback Empty State */}
          {!activeProject && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-4">
              <div className="bg-blue-500/10 p-4 rounded-full border border-blue-500/20 mb-2">
                <Cpu className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-white font-display">Constraint Driven System Synthesizer</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Provide either a high-level natural language description of your application requirements, or parse an existing architecture JSON configuration to get automated verifications, genetic optimizations, failure simulations, and complete documentation.
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white px-4 py-2 rounded inline-flex items-center gap-2 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Project</span>
              </button>
            </div>
          )}

          {activeProject && activeCandidate && (
            <>
              {/* Evolution Blueprint Timeline & Project Header */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    {activeProject.name}
                    <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded uppercase">
                      ACTIVE SYSTEM
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">
                    SLA Target: <strong className="text-slate-200">{activeProject.constraints.availabilityTarget}%</strong> • Expected Capacity: <strong className="text-slate-200">{activeProject.constraints.expectedUsers.toLocaleString()}</strong> concurrent • Created: {new Date(activeProject.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Candidate Selector Tabs / Timeline */}
                <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
                  <div className="text-[9px] uppercase text-slate-500 font-bold tracking-widest leading-none">Evolution Blueprint</div>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
                    {Object.keys(activeProject.candidates).map((cid, i) => {
                      const isCurrent = activeCandidateId === cid;
                      let label = cid.toUpperCase();
                      if (cid === 'c1') label = "Draft Base";
                      else if (cid === 'c2') label = "Optimized Tier";
                      else if (cid === 'c3') label = "High Availability";

                      return (
                        <button
                          key={cid}
                          onClick={() => handleSelectCandidate(cid)}
                          className={`text-[10px] px-2.5 py-1 rounded font-mono font-bold transition-all ${
                            isCurrent 
                              ? 'bg-blue-600 text-white shadow' 
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  
                  {/* Scorecard row & Issues Summary block */}
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                    
                    {/* Scorecard panel */}
                    <div className="xl:col-span-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Architecture Scorecard</h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Gauge 1: Overall Score */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-blue-500" strokeWidth="2.5" strokeDasharray={`${activeCandidate.score.overall}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.overall}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Overall Score</span>
                        </div>

                        {/* Gauge 2: Scalability */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-emerald-500" strokeWidth="2" strokeDasharray={`${activeCandidate.score.scalability}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.scalability}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Scalability</span>
                        </div>

                        {/* Gauge 3: Security */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-yellow-500" strokeWidth="2" strokeDasharray={`${activeCandidate.score.security}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.security}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Security</span>
                        </div>

                        {/* Gauge 4: Reliability */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-indigo-500" strokeWidth="2" strokeDasharray={`${activeCandidate.score.reliability}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.reliability}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Reliability</span>
                        </div>

                        {/* Gauge 5: Maintainability */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-purple-500" strokeWidth="2" strokeDasharray={`${activeCandidate.score.maintainability}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.maintainability}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Maintainability</span>
                        </div>

                        {/* Gauge 6: Cost Efficiency */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="relative w-12 h-12 mb-1.5">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path className="text-slate-800" strokeWidth="2" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-pink-500" strokeWidth="2" strokeDasharray={`${activeCandidate.score.costEfficiency}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold font-mono text-xs">
                              {activeCandidate.score.costEfficiency}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">Cost Efficiency</span>
                        </div>
                      </div>
                    </div>

                    {/* Issues summary list count card */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Issues Summary</h3>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-xs font-semibold text-red-500">Critical Issues</span>
                          <span className="bg-red-950 text-red-400 border border-red-900/60 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activeCandidate.issues.filter((i) => i.severity === 'critical').length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-xs font-semibold text-orange-500">High Issues</span>
                          <span className="bg-orange-950 text-orange-400 border border-orange-900/60 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activeCandidate.issues.filter((i) => i.severity === 'high').length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-xs font-semibold text-yellow-500">Medium Issues</span>
                          <span className="bg-yellow-950 text-yellow-400 border border-yellow-900/60 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activeCandidate.issues.filter((i) => i.severity === 'medium').length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800/80">
                          <span className="text-xs font-semibold text-blue-500">Low Issues</span>
                          <span className="bg-blue-950 text-blue-400 border border-blue-900/60 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {activeCandidate.issues.filter((i) => i.severity === 'low').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top conflict alert if any */}
                  {activeProject.conflictReports && activeProject.conflictReports.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">Architecture Constraint Conflict Detected</h4>
                        <ul className="list-disc pl-5 text-xs text-amber-300 mt-2 space-y-1">
                          {activeProject.conflictReports.map((conflict, i) => (
                            <li key={i}>{conflict}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* System Architecture Graph Panel */}
                  <TopologyGraph 
                    services={activeCandidate.config.services} 
                    dependencies={activeCandidate.config.dependencies} 
                  />

                  {/* Issues, Recommendations & Simulator Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Top Issues list & remedies */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-3">Verification Faults Detected</h3>
                      
                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {activeCandidate.issues.map((issue) => (
                          <div 
                            key={issue.id} 
                            className={`p-3 rounded border ${issue.severity === 'critical' ? 'bg-red-950/10 border-red-900/30' : issue.severity === 'high' ? 'bg-orange-950/10 border-orange-900/30' : 'bg-yellow-950/10 border-yellow-900/30'}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-600 text-white' : issue.severity === 'high' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white'}`}>
                                {issue.severity}
                              </span>
                              <h4 className="text-[11px] font-bold text-white">{issue.title}</h4>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal mb-1.5">{issue.description}</p>
                            <div className="bg-slate-950 p-2 rounded text-[10px] font-mono border border-slate-850 text-slate-300 leading-normal">
                              <span className="font-semibold text-blue-400">Remedy: </span>{issue.remedy}
                            </div>
                          </div>
                        ))}
                        {activeCandidate.issues.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-xs">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            No structural design vulnerabilities detected. Satisfies SLA!
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simulation Environment panel */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">Fault-Injection Simulator</h3>
                        <span className="text-[9px] font-mono bg-blue-950 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded">
                          Reactive Sandbox
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {activeCandidate.simulations.map((sim) => (
                            <button
                              key={sim.scenarioName}
                              disabled={activeSimulation !== null}
                              onClick={() => runSimulationScenario(sim.scenarioName)}
                              className="bg-slate-950 hover:bg-slate-800/40 border border-slate-800 p-2.5 rounded text-left transition-all disabled:opacity-50"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-white truncate max-w-[80%]">{sim.scenarioName}</span>
                                <span className={`w-2 h-2 rounded-full ${sim.status === 'passed' ? 'bg-emerald-500' : sim.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                Latency: {sim.latencyMs}ms • Error: {sim.errorRate}%
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Interactive simulation terminal */}
                        <div className="bg-slate-950 border border-slate-800 rounded p-3 font-mono text-[10px] h-[130px] overflow-y-auto space-y-0.5 text-slate-400">
                          <div className="text-slate-500">--- Simulation Live Telemetry Stream ---</div>
                          {simulationLogs.map((log, i) => (
                            <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400' : log.includes('WARN') ? 'text-yellow-400' : 'text-slate-400'}>
                              {log}
                            </div>
                          ))}
                          {activeSimulation && (
                            <div className="flex items-center gap-1.5 text-blue-400 animate-pulse pt-2">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Simulating crash-vectors on cluster...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* REPORT & BLUEPRINT TAB */}
              {activeTab === 'report' && (
                <div className="space-y-5">
                  {/* Detailed Analysis with Specs & Documents generated by AI */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">
                        AI Generated Engineering Blueprints & Technical Documentation
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadProjectReport}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800/70 hover:bg-slate-700/70 text-[10px] font-semibold text-slate-100 transition-colors"
                          title="Download project review report"
                        >
                          <Download className="w-3 h-3" />
                          Download Report
                        </button>
                        <button
                          onClick={handleDownloadArchitecture}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-blue-900/50 bg-blue-950/35 hover:bg-blue-900/35 text-[10px] font-semibold text-blue-200 transition-colors"
                          title="Download selected candidate architecture diagram"
                        >
                          <Download className="w-3 h-3" />
                          Download Diagram
                        </button>
                        <button
                          onClick={handleDownloadArchitectureJson}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-indigo-900/50 bg-indigo-950/35 hover:bg-indigo-900/35 text-[10px] font-semibold text-indigo-200 transition-colors"
                          title="Download selected candidate architecture as JSON"
                        >
                          <FileJson className="w-3 h-3" />
                          Download JSON
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                      
                      {/* Left side documentation blocks */}
                      <div className="xl:col-span-2 space-y-5">
                        {/* REST API Design */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
                            <Code className="w-3.5 h-3.5 text-blue-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">REST API Blueprint (OpenAPI Layout)</h4>
                          </div>
                          <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto bg-slate-950 p-3 rounded border border-slate-800/80 leading-normal">
                            {activeCandidate.documents.restApiDesign}
                          </pre>
                        </div>

                        {/* Relational DB Schema */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Relational MySQL Schema (DDL)</h4>
                          </div>
                          <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto bg-slate-950 p-3 rounded border border-slate-800/80 leading-normal">
                            {activeCandidate.documents.dbSchema}
                          </pre>
                        </div>

                        {/* MVP & Roadmap */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
                            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">MVP Deployment Schedule & Roadmap</h4>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-normal space-y-2 whitespace-pre-wrap font-sans">
                            {activeCandidate.documents.mvpPlan}
                          </div>
                        </div>
                      </div>

                      {/* Right side specifications details */}
                      <div className="space-y-5">
                        
                        {/* ER Diagram Code */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">ER Diagram Specifications</h4>
                          </div>
                          <pre className="text-[9px] font-mono text-indigo-300 overflow-x-auto leading-normal bg-slate-950 p-2.5 rounded border border-slate-800/80">
                            {activeCandidate.documents.erDiagram}
                          </pre>
                        </div>

                        {/* Interactive Mock Wireframes block */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
                          <div className="flex items-center gap-2 mb-2.5 border-b border-slate-800 pb-2">
                            <Layout className="w-3.5 h-3.5 text-purple-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Low-Fidelity Interactive Wireframes</h4>
                          </div>
                          <pre className="text-[9px] font-mono text-purple-300 overflow-x-auto leading-normal bg-slate-950 p-2.5 rounded border border-slate-800/80">
                            {activeCandidate.documents.wireframes}
                          </pre>
                        </div>

                        {/* AI Explainability Decisions */}
                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-2">
                            <Info className="w-3.5 h-3.5 text-yellow-400" />
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Explainable Decisions Insights</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">
                            The optimizations was synthesized through the evolutionary engine. Primary single points of ingress failures was completely alleviated. Ingress security rules applied on endpoints are verified.
                          </p>
                        </div>

                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* GRAPH VIEW TAB */}
              {activeTab === 'graph' && (
                <div className="space-y-5">
                  {/* Comprehensive Graph view with Interactive addition parameters */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-4">Architecture Nodes & Topology Dependencies Map</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                      
                      {/* Node list controls */}
                      <div className="space-y-4">
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-2.5">Nodes Registry</h4>
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {activeCandidate.config.services.map((node) => (
                              <div key={node.id} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800/60">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="text-[11px] font-bold text-white truncate">{node.name}</div>
                                  <div className="text-[9px] text-slate-400 font-mono uppercase truncate">{node.type} • {node.subType}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] font-mono bg-blue-950/60 text-blue-400 border border-blue-900/40 px-1.5 py-0.5 rounded">
                                    {node.replicas || 1} Rep
                                  </span>
                                  {node.type !== 'user' && (
                                    <button
                                      onClick={() => removeInteractiveNode(node.id)}
                                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/20 transition-colors cursor-pointer"
                                      title="Delete node from topology"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Main diagram display panel */}
                      <div className="lg:col-span-3">
                        <TopologyGraph 
                          services={activeCandidate.config.services} 
                          dependencies={activeCandidate.config.dependencies} 
                          onNodeDelete={removeInteractiveNode}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* RECOMMENDATIONS TAB */}
              {activeTab === 'recommendations' && (
                <div className="space-y-5">
                  
                  {/* Optimization & Evolution Generations timeline panel */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-4">Generational Evolutionary Optimization Log</h3>
                    
                    <div className="relative border-l border-slate-800 ml-2 space-y-6">
                      {activeCandidate.optimizations.map((opt, index) => (
                        <div key={index} className="relative pl-5">
                          {/* Timeline dot */}
                          <div className="absolute -left-1 top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-slate-950" />
                          
                          <div className="bg-slate-950 border border-slate-850 p-3.5 rounded max-w-2xl">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold font-mono text-blue-400">Generation {opt.generation}</span>
                              <span className="text-[9px] font-semibold font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                                Score Delta: +{opt.scoreImprovement} (New: {opt.newScore})
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mb-0.5">{opt.changeType}</h4>
                            <p className="text-[11px] text-slate-350 mb-2 leading-normal">{opt.description}</p>
                            <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 border border-slate-800/80 leading-normal">
                              <span className="font-semibold text-orange-400">Reason: </span>{opt.why}
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeCandidate.optimizations.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-xs font-mono">
                          This configuration represents a stable target schema. No generational enhancements are required.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scalability curves table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Cost Estimation breakdown panel */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-3">Monthly Infrastructure Hosting Cost Estimate</h3>
                      <div className="space-y-3">
                        <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px]">
                              <tr>
                                <th className="p-2.5">Resource Type</th>
                                <th className="p-2.5 text-right">Cost (USD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Compute Instances (Gateways & Services)</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.compute}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Relational Database Clusters</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.database}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">In-Memory Cache Nodes</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.cache}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Asynchronous Message Brokers</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.queue}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Static Storage & Blob Buckets</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.storage}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Content Delivery Network (CDN) & Data Out</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.cdn}/mo</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-sans text-slate-300">Internal Cloud VPC Networking</td>
                                <td className="p-2.5 text-right text-white">${activeCandidate.costs.network}/mo</td>
                              </tr>
                              <tr className="bg-slate-900 font-bold text-white text-xs">
                                <td className="p-2.5 font-sans text-white">Aggregate Monthly cloud budget</td>
                                <td className="p-2.5 text-right text-blue-400">${activeCandidate.costs.total}/mo</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Scalability prediction curves */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                      <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-3">Scalability Prediction SLA Matrix</h3>
                      <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px]">
                            <tr>
                              <th className="p-2.5">Concurrent Users</th>
                              <th className="p-2.5">Average Latency</th>
                              <th className="p-2.5">Load Factor</th>
                              <th className="p-2.5">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                            {activeCandidate.scalabilityPredictions.map((row) => (
                              <tr key={row.users}>
                                <td className="p-2.5 font-sans font-bold text-slate-300">{row.users} users</td>
                                <td className="p-2.5 text-blue-400">{row.latencyMs} ms</td>
                                <td className="p-2.5 text-slate-300">{row.loadFactor}x</td>
                                <td className="p-2.5">
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${row.state === 'stable' ? 'bg-emerald-950 text-emerald-400' : row.state === 'saturated' ? 'bg-yellow-950 text-yellow-400' : 'bg-red-950 text-red-400'}`}>
                                    {row.state}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ALTERNATIVES COMPARISON TAB */}
              {activeTab === 'alternatives' && (
                <div className="space-y-5">
                  {/* Side by side trade off comparison block */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-4">Multi-Architecture Trade-Off Comparisons</h3>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[9px]">
                          <tr>
                            <th className="p-3">Candidate Model</th>
                            <th className="p-3 text-center">Cost Efficiency</th>
                            <th className="p-3 text-center">Scalability</th>
                            <th className="p-3 text-center">Reliability</th>
                            <th className="p-3 text-center">Security</th>
                            <th className="p-3 text-center">Operational Complexity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-slate-300">
                          {Object.keys(activeProject.candidates).map(cid => {
                            const item = activeProject.candidates[cid];
                            return (
                              <tr key={cid} className={activeCandidateId === cid ? 'bg-blue-950/20' : ''}>
                                <td className="p-3 font-bold text-white">
                                  <div className="flex items-center gap-1.5">
                                    <span>{cid.toUpperCase()} Blueprint</span>
                                    {activeCandidateId === cid && (
                                      <span className="bg-blue-600 text-[8px] uppercase font-bold text-white px-1.5 py-0.5 rounded">Active</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-center font-mono text-pink-400">{item.tradeoffs.cost}/100</td>
                                <td className="p-3 text-center font-mono text-emerald-400">{item.tradeoffs.scalability}/100</td>
                                <td className="p-3 text-center font-mono text-indigo-400">{item.tradeoffs.reliability}/100</td>
                                <td className="p-3 text-center font-mono text-yellow-400">{item.tradeoffs.security}/100</td>
                                <td className="p-3 text-center font-mono text-purple-400">{item.tradeoffs.complexity}/100</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="space-y-5">
                  {/* Detailed historical logs on actions taken */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider mb-3">Synthesis Audits History</h3>
                    <div className="space-y-2">
                      {projects.map((p) => (
                        <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white">{p.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">SLA Target: {p.constraints.availabilityTarget}% • Expected Capacity: {p.constraints.expectedUsers.toLocaleString()} Users</p>
                          </div>
                          <button 
                            onClick={() => setSelectedProjectId(p.id)}
                            className="bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 text-xs font-semibold rounded border border-slate-700 transition-all"
                          >
                            Load
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </main>

      {/* CREATE MODAL DIALOG */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-2xl rounded-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider">Create System Architect Project</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Selector Tabs for Path A vs Path B */}
              <div className="flex bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  onClick={() => setCreationMode('idea')}
                  className={`flex-1 text-[10px] py-1.5 rounded font-bold transition-all uppercase tracking-wider ${creationMode === 'idea' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Path A: Project Idea (Natural Language)
                </button>
                <button
                  onClick={() => setCreationMode('json')}
                  className={`flex-1 text-[10px] py-1.5 rounded font-bold transition-all uppercase tracking-wider ${creationMode === 'json' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Path B: Paste Architecture JSON
                </button>
              </div>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g., Food Delivery App, Financial Ledger API..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Path A Fields */}
              {creationMode === 'idea' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</span>
                    <button 
                      onClick={() => loadPresetIdea('food')}
                      className="text-[9px] font-bold bg-slate-800 hover:bg-slate-750 text-blue-400 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      Food Delivery App
                    </button>
                    <button 
                      onClick={() => loadPresetIdea('chat')}
                      className="text-[9px] font-bold bg-slate-800 hover:bg-slate-750 text-emerald-400 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      Real-time Chat
                    </button>
                    <button 
                      onClick={() => loadPresetIdea('financial')}
                      className="text-[9px] font-bold bg-slate-800 hover:bg-slate-750 text-purple-400 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      Financial Ledger
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Describe Application Requirements</label>
                    <textarea 
                      rows={4}
                      placeholder="Specify users load count, budget, SLA availability, programming languages, DB preferences, caching requirements..."
                      value={projectIdea}
                      onChange={(e) => setProjectIdea(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-sans focus:outline-none focus:border-blue-500 leading-normal"
                    />
                  </div>
                </div>
              )}

              {/* Path B Fields */}
              {creationMode === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paste Architecture Schema JSON</label>
                    <button 
                      onClick={loadPresetJson}
                      className="text-[9px] font-bold bg-slate-800 hover:bg-slate-750 text-blue-400 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      Load Sample Schema
                    </button>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder={`{ "services": ["Order Service", "Payment Service"], "database": "MySQL" }`}
                    value={projectJson}
                    onChange={(e) => setProjectJson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* In-Progress Synthesis Terminal console */}
              {isProcessing && (
                <div className="bg-slate-950 border border-slate-800 p-3 rounded font-mono text-[10px] text-slate-400 space-y-1 h-[110px] overflow-y-auto">
                  <div className="text-blue-400 animate-pulse font-bold uppercase tracking-wider">Running Constraint-Driven Synthesis...</div>
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={log.includes('SUCCESS') || log.includes('successfully') ? 'text-emerald-400' : 'text-slate-400'}>
                      {log}
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2.5 bg-slate-950">
              <button 
                onClick={() => setShowCreateModal(false)}
                disabled={isProcessing}
                className="bg-slate-800 border border-slate-700 hover:bg-slate-750 px-3.5 py-1.5 text-xs font-bold text-slate-300 rounded transition-all uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-750 px-4 py-1.5 text-xs font-bold text-white rounded flex items-center gap-1.5 transition-all uppercase tracking-wider"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-white" />
                    <span>Synthesize Architecture</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}


    </div>
  );
}
