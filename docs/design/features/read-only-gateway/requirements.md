# Read-only observation gateway

The site-local gateway accepts no browser-supplied node IDs. A configured allow-list maps each source to plant identity and canonical units. Unconfigured access is a declared unavailable state.

| ID | statement | gate |
|---|---|---|
| GW-101 | WHEN observations are requested the gateway SHALL require a configured bearer token and read only configured source nodes. | `tests/test_gateway.py` |
| GW-102 | WHEN remote OPC transport lacks signing and encryption the gateway SHALL refuse configuration. | `tests/test_gateway.py` |
| GW-103 | WHEN source values are stale, invalid or have bad quality the gateway SHALL return an explicit absent value. | `tests/test_gateway.py` |
| GW-104 | The gateway SHALL expose no write route or arbitrary filesystem artifact access. | `tests/test_gateway.py` |

