import asyncio
import websockets

async def main():
    async with websockets.connect("ws://localhost:8000/ws/telemetry") as ws:
        print(await ws.recv())
        print(await ws.recv())

asyncio.run(main())
