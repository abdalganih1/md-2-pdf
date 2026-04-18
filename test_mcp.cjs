const { spawn } = require('child_process');
const path = require('path');

// Use compiled JS
const proc = spawn('node', [path.join(process.cwd(), 'dist', 'mcp', 'server.js')], {
  cwd: process.cwd(),
  stdio: ['pipe','pipe','pipe'],
  env: { ...process.env }
});

let buf = '';
let results = [];

proc.stdout.on('data', (data) => {
  const raw = data.toString();
  console.log('[RAW STDOUT] length=' + raw.length);
  buf += raw;
  
  // Content-Length framed parsing
  while (true) {
    const headerEnd = buf.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;
    const header = buf.substring(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) break;
    const len = parseInt(match[1]);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + len) break;
    const body = buf.substring(bodyStart, bodyStart + len);
    buf = buf.substring(bodyStart + len);
    try {
      const parsed = JSON.parse(body);
      results.push(parsed);
      console.log('\n=== RESPONSE id=' + parsed.id + ' ===');
      if (parsed.error) console.log('ERROR:', parsed.error.message);
      if (parsed.result) {
        if (parsed.result.serverInfo) console.log('Server:', parsed.result.serverInfo.name, 'v' + parsed.result.serverInfo.version);
        if (parsed.result.tools) console.log('Tools:', parsed.result.tools.map(t => t.name).join(', '));
        if (parsed.result.content) {
          parsed.result.content.forEach(c => {
            if (c.type === 'text') console.log('TEXT:', c.text.substring(0, 300));
            if (c.type === 'resource') console.log('RESOURCE:', c.resource.mimeType, Buffer.from(c.resource.text, 'base64').length, 'bytes');
          });
        }
      }
    } catch(e) { console.log('Parse err:', e.message); }
  }
});

proc.stderr.on('data', (d) => process.stderr.write('[STDERR] ' + d));
proc.on('error', (e) => { console.error('Spawn err:', e); process.exit(1); });

let msgIndex = 0;
const msgs = [
  {jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"test","version":"1.0"}}},
  {jsonrpc:"2.0",method:"notifications/initialized",params:{}},
  {jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"parse-markdown-metadata",arguments:{markdown:"---\ntitle: Test Doc\nauthor: Ahmed\n---\n# Hello\n\n**Bold text** here."}}},
  {jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"convert-markdown-to-pdf",arguments:{markdown:"# MCP Test\n\nConverting from MCP.\n\n- Item 1\n- Item 2",pageSize:"A4",marginTop:"20mm"}}},
];

function sendMsg(obj) {
  const msg = JSON.stringify(obj);
  const data = Buffer.from(msg, 'utf8');
  proc.stdin.write('Content-Length: ' + data.length + '\r\n\r\n' + msg);
  console.log('[SENT]', obj.method || 'notify/id:'+obj.id);
}

function sendNext() {
  if (msgIndex < msgs.length) {
    sendMsg(msgs[msgIndex]);
    msgIndex++;
    setTimeout(sendNext, 3000);
  } else {
    setTimeout(() => {
      console.log('\n========== MCP TEST RESULTS ==========');
      console.log('Responses:', results.length);
      const init = results.find(r => r.result?.serverInfo);
      const parse = results.find(r => r.id === 2);
      const convert = results.find(r => r.id === 3);
      console.log('1. Initialize:', init ? 'PASS' : 'FAIL', init ? '('+init.result.serverInfo.name+')' : '');
      console.log('2. parse-markdown-metadata:', parse && !parse.error ? 'PASS' : 'FAIL', parse?.error ? parse.error.message : '');
      console.log('3. convert-markdown-to-pdf:', convert && !convert.error ? 'PASS' : 'FAIL', convert?.error ? convert.error.message : '');
      proc.kill();
      process.exit(0);
    }, 25000);
  }
}
setTimeout(sendNext, 2000);
