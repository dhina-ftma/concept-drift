/**
 * Concept Drift - Main Server
 * Lightweight zero-dependency HTTP and API server for Concept Drift.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { conceptCache } from './cache.js';
import { generateConceptNeighbors, getAIStatus } from './aiService.js';
import { ConceptualGraph } from './graphSearch.js';
import { getRandomDriftPair, formatConceptName, normalizeConcept } from './semanticEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const PORT = parseInt(process.env.PORT || '3000', 10);

// Session-isolated graphs: sessionId -> ConceptualGraph
const sessionGraphs = new Map();

// Periodic cleanup of stale session graphs
setInterval(() => {
  if (sessionGraphs.size > 200) {
    const firstKey = sessionGraphs.keys().next().value;
    sessionGraphs.delete(firstKey);
  }
}, 60000);

// MIME type map for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
  });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const userApiKey = req.headers['x-api-key'] || null;

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/status' && req.method === 'GET') {
        return sendJSON(res, 200, {
          status: 'online',
          ai: getAIStatus(userApiKey),
          cachedConcepts: conceptCache.size()
        });
      }

      if (pathname === '/api/random' && req.method === 'GET') {
        const pair = getRandomDriftPair();
        return sendJSON(res, 200, {
          start: pair.start,
          destination: pair.destination
        });
      }

      if (pathname === '/api/init' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const { sessionId = 'default', start, destination, apiKey } = body;
        const effectiveApiKey = apiKey || userApiKey;

        if (!start || !destination) {
          return sendJSON(res, 400, { error: 'Both start and destination concepts are required.' });
        }

        const normStart = normalizeConcept(start);
        const normDest = normalizeConcept(destination);

        if (normStart === normDest) {
          return sendJSON(res, 400, { error: 'Start and destination concepts must be different.' });
        }

        // Initialize a clean session graph for this specific expedition
        const graph = new ConceptualGraph();
        sessionGraphs.set(sessionId, graph);

        graph.addNode(start);
        graph.addNode(destination);

        // Generate choices strictly related to the start concept
        const initialData = await generateConceptNeighbors(
          start,
          destination,
          new Set([normStart]),
          effectiveApiKey
        );

        // Add edges to session graph
        for (const rel of initialData.related_concepts) {
          graph.addEdge(start, rel.name);
        }

        return sendJSON(res, 200, {
          sessionId,
          start: formatConceptName(start),
          destination: formatConceptName(destination),
          choices: initialData.related_concepts
        });
      }

      if (pathname === '/api/expand' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const { sessionId = 'default', concept, destination, visited = [], apiKey } = body;
        const effectiveApiKey = apiKey || userApiKey;

        if (!concept) {
          return sendJSON(res, 400, { error: 'Concept parameter is required.' });
        }

        let graph = sessionGraphs.get(sessionId);
        if (!graph) {
          graph = new ConceptualGraph();
          sessionGraphs.set(sessionId, graph);
        }

        const normConcept = normalizeConcept(concept);
        const visitedSet = new Set(visited.map(v => normalizeConcept(v)));

        graph.addNode(concept);
        if (destination) graph.addNode(destination);

        const neighborData = await generateConceptNeighbors(
          concept,
          destination,
          visitedSet,
          effectiveApiKey
        );

        // Add all relationships as graph edges
        for (const rel of neighborData.related_concepts) {
          graph.addEdge(concept, rel.name);
        }

        return sendJSON(res, 200, {
          concept: formatConceptName(concept),
          choices: neighborData.related_concepts
        });
      }

      if (pathname === '/api/shortest-path' && req.method === 'POST') {
        const body = await parseJSONBody(req);
        const { sessionId = 'default', start, destination, userPath = [] } = body;

        if (!start || !destination) {
          return sendJSON(res, 400, { error: 'Start and destination concepts are required.' });
        }

        const graph = sessionGraphs.get(sessionId) || new ConceptualGraph();
        
        // Compute BFS on current session graph
        const shortestResult = graph.findShortestPath(start, destination);
        
        let pathLength = userPath.length > 0 ? userPath.length - 1 : 0;
        let shortestLength = shortestResult.found ? shortestResult.steps : pathLength;

        if (!shortestResult.found || (pathLength > 0 && pathLength < shortestLength)) {
          shortestLength = pathLength;
        }

        const score = graph.calculateDriftScore(pathLength, shortestLength);

        return sendJSON(res, 200, {
          found: true,
          userPath: userPath.length > 0 ? userPath : [formatConceptName(start), formatConceptName(destination)],
          userSteps: pathLength,
          shortestPath: shortestResult.found ? shortestResult.path : userPath,
          shortestSteps: shortestLength,
          driftDistance: score.driftDistance,
          efficiency: score.efficiency,
          summary: score.summary
        });
      }

      return sendJSON(res, 404, { error: 'Endpoint not found' });
    }

    // Static Asset Serving
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    filePath = path.normalize(filePath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(fallbackPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404);
            return res.end('Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });

      fs.createReadStream(filePath).pipe(res);
    });

  } catch (err) {
    console.error('[Server Error]', err);
    sendJSON(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  CONCEPT DRIFT server listening on:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
