#!/usr/bin/env python3
"""
Craft and inject high-end anime-inspired attack animations into HulkForm2.json.
"""
import json
import os
import sys

JSON_PATH = "public/assets/spine/knight/HulkForm2.json"

def build_flash_step():
    """
    ANIME_FLASH_STEP:
    - 0.0s - 0.233s (f0-f14): Deep crouch anticipation / Iaijutsu coil.
    - 0.25s - 0.300s (f15-f18): Explosive dash blur.
    - 0.333s (f20): Impact strike (DamToTarget), full cleave extension.
    - 0.35s - 0.567s (f21-f34): Anime silhouette hold / freeze-frame.
    - 0.583s - 0.700s (f35-f42): Recovery back to neutral.
    """
    anim = {
        "events": [
            {"time": 0.3333, "name": "DamToTarget"}
        ],
        "bones": {
            # Hips / Pelvis displacement
            "bone3": {
                "translate": [
                    {"time": 0.0, "x": -27.34, "y": 0.0},
                    {"time": 0.1667, "x": -45.0, "y": -28.0},
                    {"time": 0.2333, "x": -55.0, "y": -35.0},
                    {"time": 0.2833, "x": 35.0, "y": -10.0},
                    {"time": 0.3333, "x": 65.0, "y": -15.0}, # Apex strike
                    {"time": 0.5333, "x": 60.0, "y": -12.0}, # Hold
                    {"time": 0.7000, "x": -27.34, "y": 0.0} # Return
                ]
            },
            # Torso base
            "body": {
                "rotate": [
                    {"time": 0.0, "value": -8.6},
                    {"time": 0.1667, "value": -24.0},
                    {"time": 0.2333, "value": -32.0}, # Deep forward tilt
                    {"time": 0.3000, "value": -5.0},
                    {"time": 0.3333, "value": -18.5}, # Snap cleave
                    {"time": 0.5333, "value": -16.0},
                    {"time": 0.7000, "value": -8.6}
                ],
                "translate": [
                    {"time": 0.0, "x": 37.66, "y": 24.5},
                    {"time": 0.2333, "x": 37.66, "y": 10.0},
                    {"time": 0.3333, "x": 37.66, "y": 16.0},
                    {"time": 0.7000, "x": 37.66, "y": 24.5}
                ]
            },
            # Upper spine segments for fluid curve
            "body2": {
                "rotate": [
                    {"time": 0.0, "value": 0.56},
                    {"time": 0.2333, "value": -8.0},
                    {"time": 0.3333, "value": 12.0},
                    {"time": 0.5333, "value": 10.0},
                    {"time": 0.7000, "value": 0.56}
                ]
            },
            "body3": {
                "rotate": [
                    {"time": 0.0, "value": 11.88},
                    {"time": 0.2333, "value": 2.0},
                    {"time": 0.3333, "value": 22.0},
                    {"time": 0.5333, "value": 18.0},
                    {"time": 0.7000, "value": 11.88}
                ]
            },
            "body4": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2333, "value": -12.0},
                    {"time": 0.3333, "value": 15.0},
                    {"time": 0.5333, "value": 12.0},
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            # Head looking sharp at the target
            "head": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2333, "value": 24.0}, # Look up while crouched
                    {"time": 0.3333, "value": -8.0},  # Lock eyes on cleave
                    {"time": 0.5333, "value": -5.0},
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            # Right arm (weapon arm)
            "arm": {
                "rotate": [
                    {"time": 0.0, "value": 78.66},
                    {"time": 0.1667, "value": -25.0},
                    {"time": 0.2333, "value": -48.0}, # Cocked back
                    {"time": 0.2833, "value": 85.0}, # Rapid whip through
                    {"time": 0.3333, "value": 215.0}, # Slashed forward across
                    {"time": 0.5333, "value": 208.0}, # Hold
                    {"time": 0.7000, "value": 78.66}
                ],
                "translate": [
                    {"time": 0.0, "x": 0.0, "y": 0.0},
                    {"time": 0.2333, "x": -15.0, "y": -10.0},
                    {"time": 0.3333, "x": 10.0, "y": -35.0},
                    {"time": 0.7000, "x": 0.0, "y": 0.0}
                ]
            },
            "forearm": {
                "rotate": [
                    {"time": 0.0, "value": -7.4},
                    {"time": 0.2333, "value": 45.0}, # Bent ready
                    {"time": 0.2833, "value": 10.0},
                    {"time": 0.3333, "value": -52.0}, # Snapped straight
                    {"time": 0.5333, "value": -48.0},
                    {"time": 0.7000, "value": -7.4}
                ]
            },
            "sword": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2333, "value": -45.0},
                    {"time": 0.3333, "value": -65.0}, # Leading edge blade/bell cut
                    {"time": 0.5333, "value": -60.0},
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            # Left arm (shield arm: tucked during coil, flings back for counterbalance)
            "arm2": {
                "rotate": [
                    {"time": 0.0, "value": -10.25},
                    {"time": 0.2333, "value": -75.0}, # Tucked to ribs
                    {"time": 0.3333, "value": 82.0},  # Fling back counter
                    {"time": 0.5333, "value": 75.0},
                    {"time": 0.7000, "value": -10.25}
                ]
            },
            "forearm2": {
                "rotate": [
                    {"time": 0.0, "value": 55.85},
                    {"time": 0.2333, "value": 85.0},
                    {"time": 0.3333, "value": 25.0},
                    {"time": 0.5333, "value": 30.0},
                    {"time": 0.7000, "value": 55.85}
                ]
            },
            # Feet & IK constraints for wide stance
            "bone": {
                "translate": [
                    {"time": 0.0, "x": -87.77},
                    {"time": 0.2333, "x": -110.0},
                    {"time": 0.3333, "x": -45.0},
                    {"time": 0.7000, "x": -87.77}
                ]
            },
            "bone2": {
                "translate": [
                    {"time": 0.0, "x": -58.86},
                    {"time": 0.2333, "x": -95.0},
                    {"time": 0.3333, "x": 25.0},
                    {"time": 0.7000, "x": -58.86}
                ]
            },
            "foot": {
                "rotate": [{"time": 0.0, "value": 128.26}],
                "translate": [{"time": 0.0, "x": 63.81, "y": -33.47}],
                "scale": [{"time": 0.0, "y": -1}]
            },
            "foot2": {
                "rotate": [
                    {"time": 0.0, "value": 33.62},
                    {"time": 0.3333, "value": 15.0},
                    {"time": 0.7000, "value": 33.62}
                ]
            },
            "calf": {
                "rotate": [
                    {"time": 0.0, "value": -25.91},
                    {"time": 0.2333, "value": -55.0},
                    {"time": 0.3333, "value": -15.0},
                    {"time": 0.7000, "value": -25.91}
                ]
            },
            "calf2": {
                "rotate": [
                    {"time": 0.0, "value": -48.43},
                    {"time": 0.2333, "value": -68.0},
                    {"time": 0.3333, "value": -35.0},
                    {"time": 0.7000, "value": -48.43}
                ]
            },
            "thight": {
                "rotate": [
                    {"time": 0.0, "value": -0.67},
                    {"time": 0.2333, "value": 35.0},
                    {"time": 0.3333, "value": 5.0},
                    {"time": 0.7000, "value": -0.67}
                ]
            },
            "thight2": {
                "rotate": [
                    {"time": 0.0, "value": 34.39},
                    {"time": 0.2333, "value": 75.0},
                    {"time": 0.3333, "value": 45.0},
                    {"time": 0.7000, "value": 34.39}
                ]
            }
        },
        "ik": {
            "foot": [{"bendPositive": False}],
            "foot2": [{"bendPositive": False}]
        }
    }
    return anim

def build_meteor_slam():
    """
    ANIME_METEOR_SLAM:
    - 0.0s - 0.133s (f0-f8): Deep squat compression.
    - 0.167s - 0.350s (f10-f21): Massive vertical leap & weapon raised high overhead.
    - 0.350s - 0.417s (f21-f25): Midair apex stall with arched spine.
    - 0.433s - 0.483s (f26-f29): Gravity terminal drop, whipping weapon down.
    - 0.500s (f30): Tremendous crater slam (DamToTarget).
    - 0.517s - 0.633s (f31-f38): Ground tremor hold.
    - 0.650s - 0.800s (f39-f48): Heavy rise to neutral.
    """
    anim = {
        "events": [
            {"time": 0.5000, "name": "DamToTarget"}
        ],
        "bones": {
            "bone3": {
                "translate": [
                    {"time": 0.0, "x": -27.34, "y": 0.0},
                    {"time": 0.1333, "x": -32.0, "y": -25.0}, # Deep coil
                    {"time": 0.2500, "x": -10.0, "y": 55.0},   # Flying upward
                    {"time": 0.3500, "x": 5.0, "y": 68.0},    # Apex zenith
                    {"time": 0.4500, "x": 12.0, "y": 20.0},   # Plunging down
                    {"time": 0.5000, "x": 18.0, "y": -42.0},  # Crater smash
                    {"time": 0.6333, "x": 15.0, "y": -38.0},  # Shock absorption
                    {"time": 0.8000, "x": -27.34, "y": 0.0}   # Rise to neutral
                ]
            },
            "body": {
                "rotate": [
                    {"time": 0.0, "value": -8.6},
                    {"time": 0.1333, "value": -22.0},
                    {"time": 0.3500, "value": 18.0},  # Arched back at apex
                    {"time": 0.4500, "value": -5.0},
                    {"time": 0.5000, "value": -34.0}, # Folded over the slam
                    {"time": 0.6333, "value": -30.0},
                    {"time": 0.8000, "value": -8.6}
                ],
                "translate": [
                    {"time": 0.0, "x": 37.66, "y": 24.5},
                    {"time": 0.1333, "x": 37.66, "y": 12.0},
                    {"time": 0.3500, "x": 37.66, "y": 30.0},
                    {"time": 0.5000, "x": 37.66, "y": 8.0},
                    {"time": 0.8000, "x": 37.66, "y": 24.5}
                ]
            },
            "body2": {
                "rotate": [
                    {"time": 0.0, "value": 0.56},
                    {"time": 0.1333, "value": -6.0},
                    {"time": 0.3500, "value": 14.0},
                    {"time": 0.5000, "value": -12.0},
                    {"time": 0.8000, "value": 0.56}
                ]
            },
            "body3": {
                "rotate": [
                    {"time": 0.0, "value": 11.88},
                    {"time": 0.3500, "value": 24.0},
                    {"time": 0.5000, "value": 2.0},
                    {"time": 0.8000, "value": 11.88}
                ]
            },
            "body4": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.3500, "value": 15.0},
                    {"time": 0.5000, "value": -15.0},
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "head": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.1333, "value": 15.0},
                    {"time": 0.3500, "value": -24.0}, # Look up at bell overhead
                    {"time": 0.5000, "value": 22.0},  # Look down at crater
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm": {
                "rotate": [
                    {"time": 0.0, "value": 78.66},
                    {"time": 0.1333, "value": 20.0},  # Wind down
                    {"time": 0.2500, "value": 145.0}, # Rising
                    {"time": 0.3500, "value": 205.0}, # Overhead apex
                    {"time": 0.4500, "value": 130.0}, # Downward whip
                    {"time": 0.5000, "value": 12.0},  # Slam into ground
                    {"time": 0.6333, "value": 15.0},  # Pin
                    {"time": 0.8000, "value": 78.66}
                ],
                "translate": [
                    {"time": 0.0, "x": 0.0, "y": 0.0},
                    {"time": 0.3500, "x": 5.0, "y": 20.0},
                    {"time": 0.5000, "x": 15.0, "y": -40.0},
                    {"time": 0.8000, "x": 0.0, "y": 0.0}
                ]
            },
            "forearm": {
                "rotate": [
                    {"time": 0.0, "value": -7.4},
                    {"time": 0.1333, "value": 30.0},
                    {"time": 0.3500, "value": -40.0},
                    {"time": 0.4500, "value": 10.0},
                    {"time": 0.5000, "value": -68.0}, # Straight vertical pin
                    {"time": 0.6333, "value": -65.0},
                    {"time": 0.8000, "value": -7.4}
                ]
            },
            "sword": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.3500, "value": 35.0},
                    {"time": 0.5000, "value": -55.0}, # Hammered into ground
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm2": {
                "rotate": [
                    {"time": 0.0, "value": -10.25},
                    {"time": 0.1333, "value": 15.0},
                    {"time": 0.3500, "value": -65.0}, # Trailing in air
                    {"time": 0.5000, "value": -35.0}, # Braced
                    {"time": 0.8000, "value": -10.25}
                ]
            },
            "forearm2": {
                "rotate": [
                    {"time": 0.0, "value": 55.85},
                    {"time": 0.3500, "value": 85.0},
                    {"time": 0.5000, "value": 115.0},
                    {"time": 0.8000, "value": 55.85}
                ]
            },
            # Feet IK: tuck up slightly in midair, then plant hard on landing
            "bone": {
                "translate": [
                    {"time": 0.0, "x": -87.77, "y": 0.0},
                    {"time": 0.1333, "x": -95.0, "y": 0.0},
                    {"time": 0.3500, "x": -75.0, "y": 45.0}, # In air
                    {"time": 0.5000, "x": -90.0, "y": 0.0},  # Landed
                    {"time": 0.8000, "x": -87.77, "y": 0.0}
                ]
            },
            "bone2": {
                "translate": [
                    {"time": 0.0, "x": -58.86, "y": 0.0},
                    {"time": 0.1333, "x": -65.0, "y": 0.0},
                    {"time": 0.3500, "x": -45.0, "y": 45.0}, # In air
                    {"time": 0.5000, "x": -55.0, "y": 0.0},  # Landed
                    {"time": 0.8000, "x": -58.86, "y": 0.0}
                ]
            },
            "foot": {
                "rotate": [{"time": 0.0, "value": 128.26}],
                "translate": [{"time": 0.0, "x": 63.81, "y": -33.47}],
                "scale": [{"time": 0.0, "y": -1}]
            },
            "foot2": {
                "rotate": [
                    {"time": 0.0, "value": 33.62},
                    {"time": 0.3500, "value": -15.0}, # Point toes down in air
                    {"time": 0.5000, "value": 33.62},
                    {"time": 0.8000, "value": 33.62}
                ]
            }
        },
        "ik": {
            "foot": [{"bendPositive": False}],
            "foot2": [{"bendPositive": False}]
        }
    }
    return anim

def build_dragon_cyclone():
    """
    ANIME_DRAGON_CYCLONE:
    - 0.0s - 0.167s (f0-f10): Counter-torque windup (coiling the spring).
    - 0.183s - 0.367s (f11-f22): 360 centrifugal spin acceleration.
    - 0.400s (f24): Impact release (DamToTarget) - upward diagonal power sweep.
    - 0.417s - 0.600s (f25-f36): Momentum brake / silhouette hold.
    - 0.617s - 0.800s (f37-f48): Smooth recovery into ready stance.
    """
    anim = {
        "events": [
            {"time": 0.4000, "name": "DamToTarget"}
        ],
        "bones": {
            "bone3": {
                "translate": [
                    {"time": 0.0, "x": -27.34, "y": 0.0},
                    {"time": 0.1667, "x": -40.0, "y": -18.0}, # Torque coil
                    {"time": 0.2667, "x": -10.0, "y": 5.0},   # Spinning forward
                    {"time": 0.3667, "x": 15.0, "y": -5.0},   # Driving into target
                    {"time": 0.4000, "x": 38.0, "y": -12.0},  # Impact release
                    {"time": 0.5667, "x": 35.0, "y": -10.0},  # Hold
                    {"time": 0.8000, "x": -27.34, "y": 0.0}   # Reset
                ]
            },
            "body": {
                "rotate": [
                    {"time": 0.0, "value": -8.6},
                    {"time": 0.1667, "value": 18.0},  # Twisted back
                    {"time": 0.2667, "value": -15.0}, # Mid-spin
                    {"time": 0.3667, "value": -35.0}, # Whipping across
                    {"time": 0.4000, "value": -22.0}, # Release arc
                    {"time": 0.5667, "value": -18.0},
                    {"time": 0.8000, "value": -8.6}
                ],
                "translate": [
                    {"time": 0.0, "x": 37.66, "y": 24.5},
                    {"time": 0.1667, "x": 37.66, "y": 15.0},
                    {"time": 0.4000, "x": 37.66, "y": 18.0},
                    {"time": 0.8000, "x": 37.66, "y": 24.5}
                ]
            },
            "body2": {
                "rotate": [
                    {"time": 0.0, "value": 0.56},
                    {"time": 0.1667, "value": 12.0},
                    {"time": 0.2667, "value": -8.0},
                    {"time": 0.4000, "value": 15.0},
                    {"time": 0.8000, "value": 0.56}
                ]
            },
            "body3": {
                "rotate": [
                    {"time": 0.0, "value": 11.88},
                    {"time": 0.1667, "value": 18.0},
                    {"time": 0.4000, "value": 24.0},
                    {"time": 0.8000, "value": 11.88}
                ]
            },
            "body4": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.1667, "value": 14.0},
                    {"time": 0.4000, "value": 16.0},
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "head": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.1667, "value": -15.0}, # Looking into coil
                    {"time": 0.2667, "value": 10.0},
                    {"time": 0.4000, "value": -8.0},  # Eyes locked on target
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm": {
                "rotate": [
                    {"time": 0.0, "value": 78.66},
                    {"time": 0.1667, "value": -45.0},  # Wound low behind
                    {"time": 0.2667, "value": 75.0},   # Cutting through
                    {"time": 0.3333, "value": 160.0},  # High centrifugal whip
                    {"time": 0.4000, "value": 225.0},  # Skyward diagonal cut
                    {"time": 0.5667, "value": 218.0},  # Dynamic hold
                    {"time": 0.8000, "value": 78.66}
                ],
                "translate": [
                    {"time": 0.0, "x": 0.0, "y": 0.0},
                    {"time": 0.1667, "x": -10.0, "y": -15.0},
                    {"time": 0.4000, "x": 15.0, "y": -25.0},
                    {"time": 0.8000, "x": 0.0, "y": 0.0}
                ]
            },
            "forearm": {
                "rotate": [
                    {"time": 0.0, "value": -7.4},
                    {"time": 0.1667, "value": 25.0},
                    {"time": 0.2667, "value": -10.0},
                    {"time": 0.3333, "value": -45.0}, # Straightened arm for max radius
                    {"time": 0.4000, "value": -55.0},
                    {"time": 0.5667, "value": -50.0},
                    {"time": 0.8000, "value": -7.4}
                ]
            },
            "sword": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.1667, "value": -35.0},
                    {"time": 0.4000, "value": -45.0}, # Leading edge cut
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm2": {
                "rotate": [
                    {"time": 0.0, "value": -10.25},
                    {"time": 0.1667, "value": -65.0}, # Tucked to ribs
                    {"time": 0.2667, "value": -30.0},
                    {"time": 0.4000, "value": 65.0},  # Flung back for balance
                    {"time": 0.5667, "value": 55.0},
                    {"time": 0.8000, "value": -10.25}
                ]
            },
            "forearm2": {
                "rotate": [
                    {"time": 0.0, "value": 55.85},
                    {"time": 0.1667, "value": 85.0},
                    {"time": 0.4000, "value": 35.0},
                    {"time": 0.8000, "value": 55.85}
                ]
            },
            "bone": {
                "translate": [
                    {"time": 0.0, "x": -87.77, "y": 0.0},
                    {"time": 0.1667, "x": -105.0, "y": 0.0},
                    {"time": 0.4000, "x": -60.0, "y": 0.0},
                    {"time": 0.8000, "x": -87.77, "y": 0.0}
                ]
            },
            "bone2": {
                "translate": [
                    {"time": 0.0, "x": -58.86, "y": 0.0},
                    {"time": 0.1667, "x": -85.0, "y": 0.0},
                    {"time": 0.4000, "x": 10.0, "y": 0.0},
                    {"time": 0.8000, "x": -58.86, "y": 0.0}
                ]
            },
            "foot": {
                "rotate": [{"time": 0.0, "value": 128.26}],
                "translate": [{"time": 0.0, "x": 63.81, "y": -33.47}],
                "scale": [{"time": 0.0, "y": -1}]
            },
            "foot2": {
                "rotate": [
                    {"time": 0.0, "value": 33.62},
                    {"time": 0.1667, "value": 45.0},
                    {"time": 0.4000, "value": 15.0},
                    {"time": 0.8000, "value": 33.62}
                ]
            }
        },
        "ik": {
            "foot": [{"bendPositive": False}],
            "foot2": [{"bendPositive": False}]
        }
    }
    return anim

def build_shield_breaker():
    """
    ANIME_SHIELD_BREAKER:
    - 0.0s - 0.167s (f0-f10): Heavy iron guard brace & kinetic absorption.
    - 0.233s (f14): Explosive shield bash impact (DamToTarget #1).
    - 0.367s (f22): Point-blank straight weapon thrust (DamToTarget #2).
    - 0.383s - 0.550s (f23-f33): Piercing lock hold.
    - 0.567s - 0.700s (f34-f42): Return to balanced guard.
    """
    anim = {
        "events": [
            {"time": 0.2333, "name": "DamToTarget"},
            {"time": 0.3667, "name": "DamToTarget"}
        ],
        "bones": {
            "bone3": {
                "translate": [
                    {"time": 0.0, "x": -27.34, "y": 0.0},
                    {"time": 0.1667, "x": -35.0, "y": -10.0}, # Brace
                    {"time": 0.2333, "x": 15.0, "y": -5.0},   # Shield ram
                    {"time": 0.3667, "x": 42.0, "y": -8.0},   # Spear thrust
                    {"time": 0.5333, "x": 38.0, "y": -6.0},   # Hold
                    {"time": 0.7000, "x": -27.34, "y": 0.0}   # Reset
                ]
            },
            "body": {
                "rotate": [
                    {"time": 0.0, "value": -8.6},
                    {"time": 0.1667, "value": -18.0}, # Leaning into guard
                    {"time": 0.2333, "value": -28.0}, # Ramming forward
                    {"time": 0.3667, "value": -15.0}, # Thrust extension
                    {"time": 0.5333, "value": -12.0},
                    {"time": 0.7000, "value": -8.6}
                ],
                "translate": [
                    {"time": 0.0, "x": 37.66, "y": 24.5},
                    {"time": 0.2333, "x": 37.66, "y": 14.0},
                    {"time": 0.3667, "x": 37.66, "y": 20.0},
                    {"time": 0.7000, "x": 37.66, "y": 24.5}
                ]
            },
            "body2": {
                "rotate": [
                    {"time": 0.0, "value": 0.56},
                    {"time": 0.2333, "value": -6.0},
                    {"time": 0.3667, "value": 8.0},
                    {"time": 0.7000, "value": 0.56}
                ]
            },
            "body3": {
                "rotate": [
                    {"time": 0.0, "value": 11.88},
                    {"time": 0.2333, "value": 4.0},
                    {"time": 0.3667, "value": 18.0},
                    {"time": 0.7000, "value": 11.88}
                ]
            },
            "body4": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2333, "value": -10.0},
                    {"time": 0.3667, "value": 12.0},
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            "head": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2333, "value": 15.0},  # Hunker behind shield
                    {"time": 0.3667, "value": -5.0},  # Eyes locked on thrust
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            # Shield arm: drives forward on bash, holds firm on thrust
            "arm2": {
                "rotate": [
                    {"time": 0.0, "value": -10.25},
                    {"time": 0.1667, "value": -35.0},
                    {"time": 0.2333, "value": -20.0}, # Ram impact
                    {"time": 0.3667, "value": -45.0}, # Clears way for thrust
                    {"time": 0.5333, "value": -40.0},
                    {"time": 0.7000, "value": -10.25}
                ]
            },
            "forearm2": {
                "rotate": [
                    {"time": 0.0, "value": 55.85},
                    {"time": 0.1667, "value": 140.0}, # Solid forward block
                    {"time": 0.2333, "value": 160.0}, # Full bash
                    {"time": 0.3667, "value": 130.0},
                    {"time": 0.5333, "value": 135.0},
                    {"time": 0.7000, "value": 55.85}
                ]
            },
            # Weapon arm: primed in chamber, then linear piston thrust
            "arm": {
                "rotate": [
                    {"time": 0.0, "value": 78.66},
                    {"time": 0.1667, "value": -15.0}, # Primed back
                    {"time": 0.2333, "value": -10.0},
                    {"time": 0.3667, "value": 120.0}, # Snaps forward in thrust
                    {"time": 0.5333, "value": 115.0}, # Hold
                    {"time": 0.7000, "value": 78.66}
                ],
                "translate": [
                    {"time": 0.0, "x": 0.0, "y": 0.0},
                    {"time": 0.1667, "x": -10.0, "y": -5.0},
                    {"time": 0.3667, "x": 20.0, "y": -20.0},
                    {"time": 0.7000, "x": 0.0, "y": 0.0}
                ]
            },
            "forearm": {
                "rotate": [
                    {"time": 0.0, "value": -7.4},
                    {"time": 0.1667, "value": 45.0},  # Bent chambered
                    {"time": 0.3667, "value": -45.0}, # Straight thrust
                    {"time": 0.5333, "value": -42.0},
                    {"time": 0.7000, "value": -7.4}
                ]
            },
            "sword": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.1667, "value": 15.0},
                    {"time": 0.3667, "value": -30.0}, # Pointed straight ahead
                    {"time": 0.7000, "value": 0.0}
                ]
            },
            "bone": {
                "translate": [
                    {"time": 0.0, "x": -87.77, "y": 0.0},
                    {"time": 0.2333, "x": -95.0, "y": 0.0},
                    {"time": 0.3667, "x": -55.0, "y": 0.0},
                    {"time": 0.7000, "x": -87.77, "y": 0.0}
                ]
            },
            "bone2": {
                "translate": [
                    {"time": 0.0, "x": -58.86, "y": 0.0},
                    {"time": 0.2333, "x": -40.0, "y": 0.0},
                    {"time": 0.3667, "x": 15.0, "y": 0.0},
                    {"time": 0.7000, "x": -58.86, "y": 0.0}
                ]
            },
            "foot": {
                "rotate": [{"time": 0.0, "value": 128.26}],
                "translate": [{"time": 0.0, "x": 63.81, "y": -33.47}],
                "scale": [{"time": 0.0, "y": -1}]
            },
            "foot2": {
                "rotate": [
                    {"time": 0.0, "value": 33.62},
                    {"time": 0.2333, "value": 25.0},
                    {"time": 0.3667, "value": 15.0},
                    {"time": 0.7000, "value": 33.62}
                ]
            }
        },
        "ik": {
            "foot": [{"bendPositive": False}],
            "foot2": [{"bendPositive": False}]
        }
    }
    return anim

def build_cross_eclipse():
    """
    ANIME_CROSS_ECLIPSE:
    - 0.0s - 0.100s (f0-f6): Quick drop & low windup.
    - 0.200s (f12): Hit 1 (DamToTarget) - upward rising crescent uppercut.
    - 0.217s - 0.350s (f13-f21): Midair airborne twist & reverse loop.
    - 0.433s (f26): Hit 2 (DamToTarget) - downward cross-cleaving guillotine.
    - 0.450s - 0.633s (f27-f38): Wide crouch freeze & blade flourish hold.
    - 0.650s - 0.800s (f39-f48): Smooth rise back to neutral.
    """
    anim = {
        "events": [
            {"time": 0.2000, "name": "DamToTarget"},
            {"time": 0.4333, "name": "DamToTarget"}
        ],
        "bones": {
            "bone3": {
                "translate": [
                    {"time": 0.0, "x": -27.34, "y": 0.0},
                    {"time": 0.1000, "x": -35.0, "y": -18.0}, # Drop low
                    {"time": 0.2000, "x": 10.0, "y": 25.0},   # Rising on Hit 1
                    {"time": 0.3167, "x": 15.0, "y": 30.0},   # Airborne transition
                    {"time": 0.4333, "x": 30.0, "y": -22.0},  # Downward Hit 2
                    {"time": 0.6000, "x": 28.0, "y": -18.0},  # Hold
                    {"time": 0.8000, "x": -27.34, "y": 0.0}   # Reset
                ]
            },
            "body": {
                "rotate": [
                    {"time": 0.0, "value": -8.6},
                    {"time": 0.1000, "value": -24.0},
                    {"time": 0.2000, "value": 15.0},  # Arched up on uppercut
                    {"time": 0.3167, "value": -5.0},  # Twisting in midair
                    {"time": 0.4333, "value": -32.0}, # Folded down on guillotine
                    {"time": 0.6000, "value": -28.0},
                    {"time": 0.8000, "value": -8.6}
                ],
                "translate": [
                    {"time": 0.0, "x": 37.66, "y": 24.5},
                    {"time": 0.1000, "x": 37.66, "y": 14.0},
                    {"time": 0.2000, "x": 37.66, "y": 28.0},
                    {"time": 0.4333, "x": 37.66, "y": 12.0},
                    {"time": 0.8000, "x": 37.66, "y": 24.5}
                ]
            },
            "body2": {
                "rotate": [
                    {"time": 0.0, "value": 0.56},
                    {"time": 0.2000, "value": 12.0},
                    {"time": 0.4333, "value": -10.0},
                    {"time": 0.8000, "value": 0.56}
                ]
            },
            "body3": {
                "rotate": [
                    {"time": 0.0, "value": 11.88},
                    {"time": 0.2000, "value": 18.0},
                    {"time": 0.4333, "value": 4.0},
                    {"time": 0.8000, "value": 11.88}
                ]
            },
            "body4": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2000, "value": 14.0},
                    {"time": 0.4333, "value": -12.0},
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "head": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2000, "value": -18.0}, # Look up with uppercut
                    {"time": 0.4333, "value": 18.0},  # Look down with guillotine
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm": {
                "rotate": [
                    {"time": 0.0, "value": 78.66},
                    {"time": 0.1000, "value": -25.0},  # Low draw
                    {"time": 0.2000, "value": 215.0},  # High rising uppercut (Hit 1)
                    {"time": 0.3167, "value": 250.0},  # Over-the-top loop
                    {"time": 0.4333, "value": 18.0},   # Downward cleave (Hit 2)
                    {"time": 0.6000, "value": 22.0},   # Hold
                    {"time": 0.8000, "value": 78.66}
                ],
                "translate": [
                    {"time": 0.0, "x": 0.0, "y": 0.0},
                    {"time": 0.2000, "x": 10.0, "y": -15.0},
                    {"time": 0.4333, "x": 15.0, "y": -35.0},
                    {"time": 0.8000, "x": 0.0, "y": 0.0}
                ]
            },
            "forearm": {
                "rotate": [
                    {"time": 0.0, "value": -7.4},
                    {"time": 0.1000, "value": 35.0},
                    {"time": 0.2000, "value": -48.0}, # Straightened upward
                    {"time": 0.3167, "value": 25.0},  # Bent overhead
                    {"time": 0.4333, "value": -58.0}, # Straightened downward
                    {"time": 0.6000, "value": -55.0},
                    {"time": 0.8000, "value": -7.4}
                ]
            },
            "sword": {
                "rotate": [
                    {"time": 0.0, "value": 0.0},
                    {"time": 0.2000, "value": -40.0}, # Upward slice angle
                    {"time": 0.4333, "value": -55.0}, # Downward cleave angle
                    {"time": 0.8000, "value": 0.0}
                ]
            },
            "arm2": {
                "rotate": [
                    {"time": 0.0, "value": -10.25},
                    {"time": 0.2000, "value": -75.0}, # Shield counter-balance low
                    {"time": 0.4333, "value": 65.0},  # Shield held high during down-cleave
                    {"time": 0.6000, "value": 55.0},
                    {"time": 0.8000, "value": -10.25}
                ]
            },
            "forearm2": {
                "rotate": [
                    {"time": 0.0, "value": 55.85},
                    {"time": 0.2000, "value": 85.0},
                    {"time": 0.4333, "value": 45.0},
                    {"time": 0.8000, "value": 55.85}
                ]
            },
            "bone": {
                "translate": [
                    {"time": 0.0, "x": -87.77, "y": 0.0},
                    {"time": 0.2000, "x": -75.0, "y": 15.0},
                    {"time": 0.4333, "x": -65.0, "y": 0.0},
                    {"time": 0.8000, "x": -87.77, "y": 0.0}
                ]
            },
            "bone2": {
                "translate": [
                    {"time": 0.0, "x": -58.86, "y": 0.0},
                    {"time": 0.2000, "x": -45.0, "y": 15.0},
                    {"time": 0.4333, "x": 10.0, "y": 0.0},
                    {"time": 0.8000, "x": -58.86, "y": 0.0}
                ]
            },
            "foot": {
                "rotate": [{"time": 0.0, "value": 128.26}],
                "translate": [{"time": 0.0, "x": 63.81, "y": -33.47}],
                "scale": [{"time": 0.0, "y": -1}]
            },
            "foot2": {
                "rotate": [
                    {"time": 0.0, "value": 33.62},
                    {"time": 0.2000, "value": 10.0},
                    {"time": 0.4333, "value": 20.0},
                    {"time": 0.8000, "value": 33.62}
                ]
            }
        },
        "ik": {
            "foot": [{"bendPositive": False}],
            "foot2": [{"bendPositive": False}]
        }
    }
    return anim

def main():
    with open(JSON_PATH, "r") as f:
        data = json.load(f)

    data["animations"]["ANIME_FLASH_STEP"] = build_flash_step()
    data["animations"]["ANIME_METEOR_SLAM"] = build_meteor_slam()
    data["animations"]["ANIME_DRAGON_CYCLONE"] = build_dragon_cyclone()
    data["animations"]["ANIME_SHIELD_BREAKER"] = build_shield_breaker()
    data["animations"]["ANIME_CROSS_ECLIPSE"] = build_cross_eclipse()

    with open(JSON_PATH, "w") as f:
        json.dump(data, f, separators=(',', ':'))

    print(f"Successfully injected all 5 anime animations into {JSON_PATH}")

if __name__ == "__main__":
    main()




