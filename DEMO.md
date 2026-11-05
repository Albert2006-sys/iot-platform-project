# LumenLink Phase 2 Demo (90 seconds)

Use the configured environment variables; do not paste credentials or tokens into the terminal.

| Time | Action |
|---|---|
| 0:00-0:15 | Start MongoDB, the backend, the frontend, and `python mock_pi.py`. Open the device page and show normal telemetry. |
| 0:15-0:25 | Run `python send_fault.py overheat`. Show the temperature rising and the anomaly alert appearing. |
| 0:25-0:40 | Wait for the AI Action Center proposal. Show the diagnosis, confidence, source badge, and bounded power action. |
| 0:40-0:50 | Click **Approve**. Show the proposal moving through Approved and Executed while the command is published. |
| 0:50-1:15 | Keep the overheat fault active. Show power reduced and the temperature falling without sending `normal`. |
| 1:15-1:30 | Show the Verified status, before/after values, outcome summary, and the resolved alert. |

Expected result: one open anomaly/proposal is created, approval sends the recommended command, subsequent telemetry verifies the improvement, and the UI receives live proposal and status updates through Socket.io.
