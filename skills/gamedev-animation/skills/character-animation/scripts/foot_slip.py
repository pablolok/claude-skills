"""Foot-slip check for a baked biped clip, run inside Blender.  UNTESTED - review before trusting its numbers.

What it measures (see references/checks.md, section 2):
  For each contact point on the sole (heel, ball, toe tip), the frames where it is within `contact_height` of the
  ground form stances. For each stance, slip = the largest horizontal distance of the point from where it was at
  the stance's first frame. Pass: slip <= max_slip (1 cm) for every stance, and no point deeper than
  `below_tolerance` under the ground.

In-place clips: the ground moves back under the feet. Pass `travel_velocity` = the velocity over the ground the clip
represents (metres/second, world X and Y, e.g. (0.0, 0.8) for a walk toward +Y at 0.8 m/s). Each sampled position
is corrected by + travel_velocity * t, so a planted foot reads still.

Usage, from Blender's Python console or a text block:

    import sys; sys.path.append(r"<folder holding this file>")
    import foot_slip
    contacts = {
        "heel_L": ("foot.L", (0.0, -0.03, -0.04)),   # (bone name, offset in that bone's local space, metres)
        "ball_L": ("toe.L",  (0.0,  0.00, -0.03)),
        "heel_R": ("foot.R", (0.0, -0.03, -0.04)),
        "ball_R": ("toe.R",  (0.0,  0.00, -0.03)),
    }
    report = foot_slip.foot_slip_report("Armature", contacts, travel_velocity=(0.0, 0.8))
    print(foot_slip.format_report(report))

Find each offset once in the rest pose: the point must lie ON the sole, not at the joint above it.
A stance that crosses a looping clip's end is reported as two stances; read them together.
"""

import bpy
from mathutils import Vector

MAX_SLIP_M = 0.01          # 1 cm over a whole stance
CONTACT_HEIGHT_M = 0.02    # a sole point this close to the ground is planted
BELOW_TOLERANCE_M = 0.005  # deeper than this under the ground fails
MIN_STANCE_FRAMES = 2      # a single touching frame is not a stance


def _contact_world(arm_obj, bone_name, offset):
    pose_bone = arm_obj.pose.bones[bone_name]
    return arm_obj.matrix_world @ (pose_bone.matrix @ Vector(offset))


def _sample_tracks(arm_obj, contacts, frame_start, frame_end, travel_velocity):
    scene = bpy.context.scene
    fps = scene.render.fps / scene.render.fps_base
    tracks = {name: [] for name in contacts}
    for frame in range(frame_start, frame_end + 1):
        scene.frame_set(frame)
        t = (frame - frame_start) / fps
        shift = Vector((travel_velocity[0] * t, travel_velocity[1] * t, 0.0))
        for name, (bone_name, offset) in contacts.items():
            tracks[name].append((frame, _contact_world(arm_obj, bone_name, offset) + shift))
    return tracks


def _stances(track, ground_z, contact_height):
    """Split one point's track into runs of consecutive planted frames."""
    runs, current = [], []
    for frame, pos in track:
        if pos.z - ground_z <= contact_height:
            current.append((frame, pos))
        elif current:
            runs.append(current)
            current = []
    if current:
        runs.append(current)
    return [run for run in runs if len(run) >= MIN_STANCE_FRAMES]


def _measure_stance(run, ground_z):
    origin = run[0][1]
    slip = max(((pos - origin).to_2d().length for _, pos in run), default=0.0)
    deepest = min(pos.z - ground_z for _, pos in run)
    return {"first": run[0][0], "last": run[-1][0], "slip_m": slip, "deepest_m": deepest}


def foot_slip_report(armature_name, contacts, frame_start=None, frame_end=None, ground_z=0.0,
                     contact_height=CONTACT_HEIGHT_M, travel_velocity=(0.0, 0.0),
                     max_slip=MAX_SLIP_M, below_tolerance=BELOW_TOLERANCE_M):
    """Return {point name: [stance dicts]} plus an overall 'passed' flag. Restores the frame and pose mode."""
    arm_obj = bpy.data.objects.get(armature_name)
    if arm_obj is None or arm_obj.type != 'ARMATURE':
        raise ValueError(f"{armature_name!r} is not an armature object")
    for name, (bone_name, _offset) in contacts.items():
        if bone_name not in arm_obj.pose.bones:
            raise ValueError(f"contact {name!r}: no bone {bone_name!r}")

    scene = bpy.context.scene
    start = scene.frame_start if frame_start is None else frame_start
    end = scene.frame_end if frame_end is None else frame_end
    saved_frame, saved_position = scene.frame_current, arm_obj.data.pose_position
    arm_obj.data.pose_position = 'POSE'   # a rig shown at Rest Position makes every posed matrix read rest
    try:
        tracks = _sample_tracks(arm_obj, contacts, start, end, travel_velocity)
    finally:
        arm_obj.data.pose_position = saved_position
        scene.frame_set(saved_frame)

    report = {"points": {}, "passed": True, "max_slip_m": max_slip}
    for name, track in tracks.items():
        stances = [_measure_stance(run, ground_z) for run in _stances(track, ground_z, contact_height)]
        for stance in stances:
            stance["passed"] = stance["slip_m"] <= max_slip and stance["deepest_m"] >= -below_tolerance
            report["passed"] = report["passed"] and stance["passed"]
        report["points"][name] = stances
    return report


def format_report(report):
    lines = [f"foot slip (limit {report['max_slip_m'] * 100:.1f} cm): {'PASS' if report['passed'] else 'FAIL'}"]
    for name, stances in report["points"].items():
        if not stances:
            lines.append(f"  {name}: never planted")
        for s in stances:
            flag = "ok  " if s["passed"] else "FAIL"
            lines.append(f"  {flag} {name} f{s['first']}-{s['last']}: slip {s['slip_m'] * 100:.2f} cm, "
                         f"deepest {s['deepest_m'] * 100:+.2f} cm")
    return "\n".join(lines)
