"""
WebSocket endpoint for interactive VPS terminal.

Provides bidirectional terminal communication using WebSocket.
"""
import json
import asyncio
import threading
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.logging import logger
from app.core.security import decode_token
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.hosting.repository import VPSSubscriptionRepository
from app.modules.hosting.services import DockerManagementService
from app.core.exceptions import NotFoundException


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """Get user from JWT token."""
    payload = decode_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    repo = UserRepository(db)
    return await repo.get_by_id(user_id)


async def websocket_terminal_endpoint(
    websocket: WebSocket,
    subscription_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for interactive terminal session.
    
    Query params:
    - token: JWT authentication token
    
    Messages:
    - Client -> Server: {"type": "input", "data": "keystroke"}
    - Server -> Client: {"type": "output", "data": "output text"}
    """
    await websocket.accept()
    
    try:
        # Get token from query params
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        # Verify user
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Get subscription and verify ownership
        repo = VPSSubscriptionRepository(db)
        subscription = await repo.get_by_id(subscription_id)
        
        if not subscription:
            await websocket.close(code=1008, reason="Subscription not found")
            return
        
        if subscription.customer_id != user.id:
            await websocket.close(code=1008, reason="Access denied")
            return
        
        if not subscription.container:
            await websocket.close(code=1008, reason="Container not found")
            return
        
        docker_service = DockerManagementService(db)
        container_id = subscription.container.container_id
        
        if not docker_service.docker_available:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Docker not available"
            }))
            await websocket.close()
            return
        
        # Get container and create exec instance
        container = docker_service.client.containers.get(container_id)
        
        # Create interactive shell session
        exec_id = container.exec_create(
            cmd="/bin/bash -i",
            tty=True,
            stdin=True,
            stdout=True,
            stderr=True,
            user="root"
        )
        
        # Start exec with socket for bidirectional communication
        exec_socket = container.exec_start(
            exec_id,
            tty=True,
            stream=True,
            socket=True
        )
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "output",
            "data": "\r\n\x1b[32mConnected to VPS Terminal\x1b[0m\r\n"
        }))
        
        # Queues for communication
        input_queue = asyncio.Queue()
        output_queue = asyncio.Queue()
        stop_event = threading.Event()
        
        # Thread to read from Docker exec
        def read_from_docker():
            try:
                for chunk in exec_socket:
                    if chunk:
                        asyncio.run_coroutine_threadsafe(
                            output_queue.put(chunk),
                            asyncio.get_event_loop()
                        )
            except Exception as e:
                logger.error(f"Error reading from Docker: {e}")
            finally:
                asyncio.run_coroutine_threadsafe(
                    output_queue.put(None),  # Signal end
                    asyncio.get_event_loop()
                )
        
        # Thread to write to Docker exec
        def write_to_docker():
            try:
                while not stop_event.is_set():
                    try:
                        data = input_queue.get(timeout=0.1)
                        if data is None:
                            break
                        exec_socket._sock.send(data)
                    except:
                        continue
            except Exception as e:
                logger.error(f"Error writing to Docker: {e}")
        
        # Start threads
        read_thread = threading.Thread(target=read_from_docker, daemon=True)
        write_thread = threading.Thread(target=write_to_docker, daemon=True)
        read_thread.start()
        write_thread.start()
        
        # Handle output from Docker
        async def handle_output():
            while True:
                chunk = await output_queue.get()
                if chunk is None:
                    break
                try:
                    text = chunk.decode('utf-8', errors='replace')
                    await websocket.send_text(json.dumps({
                        "type": "output",
                        "data": text
                    }))
                except Exception as e:
                    logger.error(f"Error sending output: {e}")
                    break
        
        output_task = asyncio.create_task(handle_output())
        
        # Handle WebSocket messages
        try:
            while True:
                message = await websocket.receive_text()
                try:
                    data = json.loads(message)
                    
                    if data.get("type") == "input":
                        # Send input to Docker
                        input_data = data.get("data", "").encode('utf-8')
                        await input_queue.put(input_data)
                    elif data.get("type") == "resize":
                        # Handle terminal resize (optional)
                        pass
                except json.JSONDecodeError:
                    # If not JSON, treat as raw input
                    await input_queue.put(message.encode('utf-8'))
                    
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for subscription {subscription_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}", exc_info=True)
        finally:
            # Cleanup
            stop_event.set()
            await input_queue.put(None)
            output_task.cancel()
            try:
                await output_task
            except asyncio.CancelledError:
                pass
            
            try:
                await websocket.close()
            except:
                pass
    
    except Exception as e:
        logger.error(f"Terminal WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass

