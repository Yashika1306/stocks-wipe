"""Kafka producer for swipe events."""
import json

from aiokafka import AIOKafkaProducer
from api.config import settings

_producer = None


async def _get_producer() -> AIOKafkaProducer:
    global _producer
    if _producer is None:
        _producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap)
        await _producer.start()
    return _producer


async def emit_swipe_event(event: dict) -> None:
    producer = await _get_producer()
    await producer.send_and_wait(
        "swipe-events",
        json.dumps(event).encode(),
    )
