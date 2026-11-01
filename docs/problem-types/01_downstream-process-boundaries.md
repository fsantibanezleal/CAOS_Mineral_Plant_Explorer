# Downstream process models and their boundaries

The app displays one connected process. Each supporting model nevertheless has a precise material basis, time scale and operating envelope. A correct equation applied to an unsupported material is not an acceptable prediction.

## Leaching

For a spherical reactive particle with conversion X, the shrinking-core reference law combines reaction and product-layer diffusion times:

$$t=\tau_r[1-(1-X)^{1/3}]+\tau_d[1-3(1-X)^{2/3}+2(1-X)].$$

A bracketed root solve on $0\le X\le1$ is monotone, returns zero at zero age and complete conversion only after the declared characteristic time. An ideal continuous stirred tank integrates this conversion over an exponential residence-time distribution. The model assumes a specified mineral and fixed kinetic conditions; it excludes changing surface chemistry, channeling, heat transport, bacteria and precipitation. Those omissions are material: coupled heap models explicitly include them ([Leahy et al.](https://doi.org/10.1016/j.mineng.2005.07.003)).

Acid availability caps extracted copper after the kinetic calculation. Dissolved plus residual copper equals the feed copper. The acid requirement is an explicit case parameter, not a reagent prescription.

## Solution extraction and electrowinning

The SX reference is an ideal fresh-organic cross-current equilibrium sequence. For aqueous flow $Q_a$, organic flow $Q_o$ and a fixed distribution ratio D, each stage multiplies aqueous concentration by $Q_a/(Q_a+DQ_o)$. It is not a countercurrent industrial mixer-settler model and does not predict entrainment or impurity transfer.

Electrowinning follows charge conservation: $\dot m=I\eta M/(nF)$, with $n=2$ for copper, Faraday constant $F=96485.33212$ C/mol and copper molar mass $M=0.063546$ kg/mol. Available dissolved copper imposes a second cap. Electrical power is $IV$ and specific energy is reported only when deposition is positive. [BCcampus copper electrowinning](https://pressbooks.bccampus.ca/hydrometallurgy/chapter/copper-electrowinning-practice/) gives the engineering basis and circuit context.

## Thickening

The one-dimensional finite-volume model evolves solids volume fraction using downward hindered settling, upward overflow and downward underflow. A Rusanov numerical flux and a Courant-limited step preserve the transport balance. The feed is added at its specified depth. Top and bottom extraction are explicit boundary fluxes, so initial solids plus fed solids must equal retained plus discharged solids. Capacity exceedance above the allowed packing envelope is an error, not a value clipped to look stable.

The reference model excludes compression, flocculation chemistry and radial hydrodynamics. It is a conservative teaching and state-contract model; it does not size an industrial thickener. [Takács et al.](https://doi.org/10.1016/0043-1354(91)90066-Y) shows the dynamic flux basis, while [Haselhuhn and Kawatra](https://doi.org/10.19150/mmp.7243) illustrates why pilot and full-scale interpretation requires care.
