@echo off
REM Ashenholm — Local LLM Server (Mistral 7B)
REM Place at: C:\AI\llama.cpp\start_llm.bat
REM Run as Administrator or via Task Scheduler

echo Starting Mistral 7B LLM Server...
echo Listening on port 11434

"C:\AI\llama.cpp\llama-server.exe" ^
  --model "C:\AI\models\mistral-7b-instruct-v0.2.Q4_K_M.gguf" ^
  --host 0.0.0.0 ^
  --port 11434 ^
  --ctx-size 8192 ^
  --n-predict 4096 ^
  --threads 30 ^
  --cont-batching ^
  --log-disable

REM NOTE: --host 0.0.0.0 makes it reachable on the network (not just localhost)
REM      since you have a static IP and Hostinger PHP needs to reach it.
REM      The Windows Firewall rule below restricts who can connect.
