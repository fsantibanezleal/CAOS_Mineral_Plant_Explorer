# Bring geometry, tag bindings and observations

Start with identity rather than an arbitrary numeric table. The plant graph must identify equipment, directed streams, coordinate units, dimensions, material units and semantic tags. Each tag fixes tag_id, asset_id and canonical unit. New quantities need an explicit catalog/schema extension and a new graph revision. The demonstration's16 benchmark channels are not a universal plant instrument list.

For geometry, use glTF2.0 with a unique extras.assetId on each mapped equipment node. Geometry is in metres with Y vertical. The browser accepts at most 10MB, 5000 nodes and two million accessor elements, refuses remote resources and invalid transforms, and checks every mapped identity. Labels and pipes follow actual imported world transforms. The process diagram remains the reference graph; imported geometry alone does not create new equipment or validate a survey.

For actual source observations, configure the read-only gateway with a local tag map. It must match the graph's tag/asset/canonical-unit tuple. Source_unit may differ only within a supported dimension, such as kg/s to t/h. Every binding explicitly selects source-change or server-confirmation freshness. The returned record retains both times and receipt sequence; rejected values remain null with bad quality.

The browser connection accepts HTTPS, or explicit loopback HTTP for a local test. Its token remains in memory and clears on disconnect. It checks graph revision, semantic binding, units, timezone, sequence and freshness, and stores at most 180 local history snapshots. Unavailable sources create gaps. Replay-trained numerical detectors are not silently applied to site instruments.

Site measurements, credentials, node maps and private certificates are not public sample data. A new site requires its own authorized mapping, dimensional/time checks and owner validation. See [gateway setup](04_run-the-api.md) and the [contract catalog](../contracts/catalog.md).
