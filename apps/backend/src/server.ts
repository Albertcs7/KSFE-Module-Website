import http, { IncomingMessage, ServerResponse } from 'http'

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ message: 'Backend is working 🚀' }))
})

const PORT = 3000

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})