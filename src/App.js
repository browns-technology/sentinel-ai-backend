import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { AlertTriangle, Shield, Zap, TrendingUp, Activity, Eye, Brain, Sparkles, Wifi, WifiOff } from 'lucide-react';

const BACKEND_URL = 'ws://localhost:8000/ws/stream';

const FraudDetectionCommand = () => {
  const [transactions, setTransactions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [hoveredAnomaly, setHoveredAnomaly] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    blocked: 0,
    saved: 0,
    accuracy: 98.4,
    threats: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [pulseEffect, setPulseEffect] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Particle system for background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 50; i++) {
      particlesRef.current.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // WebSocket connection with improved handling
  const connectWebSocket = () => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✓ WebSocket already connected');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⏳ WebSocket already connecting...');
      return;
    }

    setConnectionStatus('connecting');
    console.log('🔌 Attempting to connect to:', BACKEND_URL);

    try {
      const ws = new WebSocket(BACKEND_URL);
      
      ws.onopen = () => {
        console.log('✓ WebSocket connected successfully!');
        setIsConnected(true);
        setConnectionStatus('connected');
        setLastMessage('Connected to backend');
        
        // Send initial ping to wake up the stream
        ws.send('ping');
      };

      ws.onmessage = (event) => {
        try {
          console.log('📨 Received message:', event.data.substring(0, 100) + '...');
          const message = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            console.log('🏓 Pong received');
            setLastMessage('Connection alive');
            return;
          }
          
          if (message.type === 'transaction') {
            const transaction = message.data;
            console.log('💳 Transaction received:', transaction.id, 'Amount:', transaction.amount);
            
            // Add to transactions
            setTransactions(prev => {
              const updated = [...prev, transaction].slice(-100);
              return updated;
            });
            
            // If anomaly, add to anomalies list
            if (transaction.is_anomaly) {
              console.log('🚨 ANOMALY DETECTED:', transaction.threat_level);
              setAnomalies(prev => [...prev, transaction].slice(-8));
              setPulseEffect(true);
              setTimeout(() => setPulseEffect(false), 300);
            }
            
            // Update stats
            setStats(prev => ({
              total: prev.total + 1,
              blocked: transaction.is_anomaly ? prev.blocked + 1 : prev.blocked,
              saved: transaction.is_anomaly ? prev.saved + transaction.amount : prev.saved,
              accuracy: 98.4 + (Math.random() - 0.5) * 0.2,
              threats: transaction.threat_level === 'CRITICAL' ? prev.threats + 1 : prev.threats
            }));
            
            setLastMessage(`Transaction ${transaction.id}`);
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
          console.error('Raw data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        setLastMessage('Connection error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setLastMessage('Disconnected');
        wsRef.current = null;
        
        // Auto-reconnect after 3 seconds if it wasn't a manual disconnect
        if (event.code !== 1000) {
          console.log('🔄 Will attempt to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setLastMessage('Failed to connect');
    }
  };

  const disconnectWebSocket = () => {
    console.log('🛑 Manually disconnecting WebSocket');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setLastMessage('Manually disconnected');
    }
  };

  // Toggle connection
  const toggleConnection = () => {
    console.log('🔘 Toggle connection clicked. Current state:', isConnected);
    if (isConnected) {
      disconnectWebSocket();
    } else {
      connectWebSocket();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Keep connection alive with periodic pings
  useEffect(() => {
    if (!isConnected || !wsRef.current) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🏓 Sending ping...');
        wsRef.current.send('ping');
      }
    }, 10000); // Ping every 10 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  const chartData = transactions.slice(-30).map((t, i) => ({
    time: i,
    risk: (t.risk_score * 100).toFixed(1),
    amount: t.amount.toFixed(0)
  }));

  const radarData = hoveredAnomaly ? [
    { metric: 'Velocity', value: hoveredAnomaly.features.velocity * 10, fullMark: 100 },
    { metric: 'Geo Risk', value: (hoveredAnomaly.features.geoDist / 50), fullMark: 100 },
    { metric: 'Device', value: hoveredAnomaly.features.deviceChange ? 85 : 20, fullMark: 100 },
    { metric: 'Time', value: hoveredAnomaly.features.unusual_time ? 90 : 15, fullMark: 100 },
    { metric: 'Amount', value: hoveredAnomaly.features.amount_spike ? 95 : 25, fullMark: 100 }
  ] : [];

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Animated Background */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-black to-purple-950/40 z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent z-0" />
      
      <div className="relative z-10 p-6 max-w-[1800px] mx-auto">
        {/* Futuristic Header */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <Shield className="w-10 h-10 text-indigo-400" />
                  <div className="absolute inset-0 blur-xl bg-indigo-500/50 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    SENTINEL AI
                  </h1>
                  <p className="text-indigo-300/70 text-sm font-mono mt-1">Neural Fraud Detection System v4.2</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 items-center">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                isConnected 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 border-yellow-500/50'
                  : 'bg-red-500/20 border-red-500/50'
              }`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-green-300 text-sm font-mono">CONNECTED</span>
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-yellow-300 text-sm font-mono">CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-sm font-mono">OFFLINE</span>
                  </>
                )}
              </div>

              <button
                onClick={toggleConnection}
                className={`relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
                  isConnected 
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className={isConnected ? 'animate-pulse' : ''} size={24} />
                  {isConnected ? 'STOP MONITORING' : 'START MONITORING'}
                </div>
              </button>
            </div>
          </div>
          
          {/* Debug info */}
          <div className="mt-2 text-xs text-slate-500 font-mono">
            Last: {lastMessage} | Transactions: {transactions.length} | WS State: {wsRef.current?.readyState ?? 'null'}
          </div>
        </div>

        {/* Connection Error Message */}
        {connectionStatus === 'error' && (
          <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-300 font-semibold">Connection Failed</p>
                <p className="text-red-400/70 text-sm">Make sure the backend is running at localhost:8000</p>
                <p className="text-red-400/70 text-sm mt-1">Check backend terminal for errors</p>
              </div>
            </div>
          </div>
        )}

        {/* Holographic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Transactions', value: stats.total.toLocaleString(), icon: Activity, color: 'blue', gradient: 'from-blue-600 to-cyan-600' },
            { label: 'Threats Blocked', value: stats.blocked, icon: Shield, color: 'emerald', gradient: 'from-emerald-600 to-teal-600', pulse: pulseEffect },
            { label: 'Money Saved', value: `$${stats.saved.toFixed(0).toLocaleString()}`, icon: TrendingUp, color: 'violet', gradient: 'from-violet-600 to-purple-600' },
            { label: 'AI Accuracy', value: `${stats.accuracy.toFixed(1)}%`, icon: Brain, color: 'pink', gradient: 'from-pink-600 to-rose-600' },
            { label: 'Critical Alerts', value: stats.threats, icon: AlertTriangle, color: 'red', gradient: 'from-red-600 to-orange-600' }
          ].map((stat, idx) => (
            <div key={idx} className={`relative group ${stat.pulse ? 'animate-pulse' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
              <div className={`relative bg-gradient-to-br ${stat.gradient} p-[2px] rounded-2xl`}>
                <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-6 h-full">
                  <div className="flex justify-between items-start mb-3">
                    <stat.icon className="w-8 h-8 text-white/90" />
                    <Sparkles className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="text-4xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Real-time Risk Stream */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-indigo-950/50 to-purple-950/50 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h3 className="text-2xl font-bold text-white">Neural Risk Analysis</h3>
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/50">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span className={`text-sm font-mono ${isConnected ? 'text-green-300' : 'text-gray-400'}`}>
                    {isConnected ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4338ca" opacity={0.1} />
                  <XAxis dataKey="time" stroke="#818cf8" />
                  <YAxis stroke="#818cf8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e1b4b', 
                      border: '1px solid #4338ca',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    fill="url(#riskGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Threat Radar */}
          <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-pink-400" />
              <h3 className="text-2xl font-bold text-white">Threat Profile</h3>
            </div>
            
            {hoveredAnomaly ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#ec4899" opacity={0.3} />
                  <PolarAngleAxis dataKey="metric" stroke="#fbbf24" />
                  <PolarRadiusAxis stroke="#a78bfa" />
                  <Radar 
                    name="Risk Factors" 
                    dataKey="value" 
                    stroke="#ec4899" 
                    fill="#ec4899" 
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                  <p className="text-purple-300/50 text-sm">Hover over anomaly to analyze</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Critical Anomalies Feed */}
        <div className="bg-gradient-to-br from-red-950/50 to-orange-950/50 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <h3 className="text-2xl font-bold text-white">Critical Threat Feed</h3>
            <div className="ml-auto text-red-300 text-sm font-mono">{anomalies.length} Active Threats</div>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {anomalies.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-20 h-20 text-emerald-400/30 mx-auto mb-4" />
                <p className="text-emerald-300/50 text-lg font-medium">All Systems Secure</p>
                <p className="text-emerald-300/30 text-sm">
                  {isConnected ? 'No threats detected' : 'Start monitoring to detect threats'}
                </p>
              </div>
            ) : (
              anomalies.slice().reverse().map(anomaly => (
                <div 
                  key={anomaly.id}
                  onMouseEnter={() => setHoveredAnomaly(anomaly)}
                  onMouseLeave={() => setHoveredAnomaly(null)}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur rounded-xl p-5 border border-red-500/30 hover:border-red-400/60 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
                          <div className="w-3 h-3 bg-red-400 rounded-full" />
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            anomaly.threat_level === 'CRITICAL' 
                              ? 'bg-red-500/30 text-red-200 border border-red-400/50' 
                              : 'bg-orange-500/30 text-orange-200 border border-orange-400/50'
                          }`}>
                            {anomaly.threat_level} THREAT
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white">${anomaly.amount.toFixed(0)}</div>
                        <div className="text-red-300 text-xs font-mono">{new Date(anomaly.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-white/50 block mb-1">Location</span>
                        <span className="text-white font-semibold">{anomaly.location}</span>
                      </div>
                      <div>
                        <span className="text-white/50 block mb-1">Device</span>
                        <span className="text-white font-semibold">{anomaly.device}</span>
                      </div>
                      <div>
                        <span className="text-white/50 block mb-1">Risk Score</span>
                        <span className="text-red-300 font-bold text-lg">{(anomaly.risk_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      {anomaly.features.deviceChange && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-200 text-xs rounded border border-yellow-500/30">Device Change</span>
                      )}
                      {anomaly.features.unusual_time && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded border border-purple-500/30">Odd Hours</span>
                      )}
                      {anomaly.features.amount_spike && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-200 text-xs rounded border border-red-500/30">Amount Spike</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ef4444, #f97316);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default FraudDetectionCommand;