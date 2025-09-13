async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div class="user-msg">${message}</div>`;
  input.value = "";

  try {
    // Try real backend first
    const res = await fetch(`/query/${encodeURIComponent(message)}`);
    if (!res.ok) throw new Error("Backend not available");
    const reply = await res.text();
    chatBox.innerHTML += `<div class="bot-msg">${reply}</div>`;
  } catch (err) {
    // If backend fails → use mock responses
    const mockRes = await fetch("mock_resp.json");
    const mockData = await mockRes.json();
    const reply = mockData[message] || "🤖 I don’t understand that command (demo mode).";
    chatBox.innerHTML += `<div class="bot-msg">${reply}</div>`;
  }

  chatBox.scrollTop = chatBox.scrollHeight;
}
