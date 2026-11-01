# Consuming CAOS engines without copying them

There are two real integration paths. Released Python engines are imported through their public APIs at exact PyPI versions. App-specific engines whose public interface is a versioned result artifact are consumed by an immutable source commit, JSON schema identity, byte count and SHA-256. The raw download cache lives outside the repository. A changed byte, missing metric path, non-finite value or unsupported schema fails the import.

Four packages are executed: `minehaulsim==0.12.1`, `bedblend==0.7.3`, `milldem==0.3.1` and `oreblocks==0.6.6`. The first produces a constrained-network haulage shift; BedBlend builds a truck-dumped stockpile and exports terrain heights; MillDEM resolves a short, reduced-resolution two-dimensional charge transient; OreBlocks solves an authored porphyry ultimate-pit case. The actual elapsed time, seed, input configuration, package version and result digest accompany every output. The MillDEM run is qualitative charge context, not a validated industrial power prediction.

Ten companion applications contribute exact public output artifacts: ChancaDEM, OreFlow, PitForge, CutoffGrade, FragmentIQ, FrothSeg, TailWatch, RotorVitals, StockTwin and DispatchLab. Each retains its own case identity and provenance. A PitForge oracle, a synthetic froth frame and a stockpile campaign do not become measurements from one operating plant merely because they appear in one interface. They are asset-linked reference evidence. The connected reference plant's observation timeline is separately authored and visibly synthetic.

The lock at `data/sources/engines.lock.json` records every selected source and metric path. It uses only synthetic or analytic reference cases, with each software license retained: minehaulsim is Apache-2.0, the other three packages and ten selected application sources are MIT. No measured image, real vibration waveform or private site geometry is republished. The underlying engine equations and dataset limitations remain the responsibility of each upstream product and are linked from the evidence inspector.

CrushDEM and GeoTypes do not have an accepted public distribution contract at this audit. Their capability records state that fact; no private module is imported and no simulated substitute is claimed as their engine. Geological exploration tools and parked geotechnical scaffolds are not assumed relevant to every processing plant.

## Reproduction

Set the external data/cache root, run the pipeline's source-ingestion stage, and inspect the resulting engine evidence manifest. Offline reproduction works with a complete hash-verified cache. A missing cache fails with the missing engine name; it never substitutes random numbers or the previous run. Package version mismatch also fails before acceptance.

Sources: [MineHaul](https://pypi.org/project/minehaulsim/0.12.1/), [BedBlend](https://pypi.org/project/bedblend/0.7.3/), [MillDEM](https://pypi.org/project/milldem/0.3.1/), [OreBlocks](https://pypi.org/project/oreblocks/0.6.6/) and the exact GitHub source links in the lock.
