# Plant geometry, topology and state

The asset graph is the shared identity boundary. Each equipment record has an immutable ID, bilingual name, stage, equipment class, dimensions and a metre-based position. Each stream references existing source and destination IDs, a material class, engineering unit and an authored transport delay. A cyclic recycle is a valid graph edge; traversals retain a visited set so a user can trace upstream without an infinite loop.

The reference plant is an authored copper complex. Sulfide feed passes through crushing, grinding, cyclone classification and flotation, then concentrate thickening and filtration. Oxide feed uses a separate leach and SX/EW route. Shared process water links return pumps, thickeners and the concentrator. Concentrate and cathode are distinct product boundaries. This topology never implies that a particular ore can use either route without a mineralogical decision.

A scene node and a process diagram symbol carry the same asset ID. Selecting one changes a shared selection state, so the other view identifies the same physical equipment. Geometry is an authored engineering illustration. It does not establish the location, scale, design capacity or as-built status of a real site. Imported glTF geometry must supply a checked mapping; matching object names by approximate text is not accepted.

## Time and quality

An observation retains source time, gateway receipt time, source sequence, quality code and the tag/asset/unit binding. The validity predicate is evaluated before numerical inference. A stale value is visible as stale; an engine estimate never changes an invalid measured value into a good observation. Out-of-order data may be retained in historical storage but cannot replace the current observation. Unit conversion requires dimensional compatibility and a finite numeric value.

## State estimation

For measured flow vector y, positive diagonal covariance R and conservation matrix A, constrained WLS solves

$$\min_x (x-y)^T R^{-1}(x-y),\qquad Ax=b.$$

The closed-form projection is $x=y-RA^T(ARA^T)^+(Ay-b)$, with an SVD pseudoinverse for redundant valid rows. The implementation verifies feasibility and final residual. Inventory processes use a storage derivative in b; a dynamic tank is not silently treated as a steady-state junction. Huber IRLS reduces the influence of a gross residual, but does not by itself identify which sensor caused it.

The proposed TASC method adds only admissible engine pseudo-observations, each with an explicit uncertainty and validity envelope, then solves the robust constrained problem. Its evidence includes the original observation, normalized innovation and contributing graph factor. Its inference is separate from the raw observation. Unobservable states are refused rather than guessed.

## Sources and limits

- [OPC UA Mining General](https://reference.opcfoundation.org/specs/OPC-40560/full), machine and system information models.
- [glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), hierarchical scene nodes and metadata.
- [Sadeghi, Hodouin and Bazin 2018](https://doi.org/10.1016/j.mineng.2018.04.023), mineral and material reconciliation constraints.
- [Huber 1964](https://doi.org/10.1214/aoms/1177703732), robust loss, not causal fault attribution.

The reference experiment can verify implementation, conservation and injected-fault detection. It cannot establish field accuracy, operator benefit, equipment safety or production improvement.
