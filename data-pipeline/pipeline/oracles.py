"""Independent algebraic and physical oracles; no model implementation imports."""

import numpy as np


def balance_projection_kkt(y, sigma, A, b):
    y = np.asarray(y, float)
    precision = np.diag(1 / np.square(sigma))
    A = np.asarray(A, float)
    kkt = np.block([[precision, A.T], [A, np.zeros((len(A), len(A)))]])
    rhs = np.concatenate([precision @ y, np.asarray(b, float)])
    return np.linalg.lstsq(kkt, rhs, rcond=None)[0][: len(y)]


def faraday_copper(current_a, hours, efficiency):
    return current_a * hours * 3600 * efficiency * 0.063546 / (2 * 96485.33212)
