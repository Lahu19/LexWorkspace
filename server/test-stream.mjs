const res = await fetch("http://localhost:3001/api/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agent: "research",
    messages: [{ role: "user", content: "Tell me a short joke." }]
  })
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
while(true) {
  const {done, value} = await reader.read();
  if (done) break;
  console.log("CHUNK:", JSON.stringify(decoder.decode(value)));
}
