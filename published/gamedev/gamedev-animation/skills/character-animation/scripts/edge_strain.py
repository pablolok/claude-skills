"""Edge-strain check for a skinned mesh over a clip, run inside Blender.  UNTESTED - review before trusting its numbers.

What it measures (references/checks.md section 5; the armor-rigging skill's stretch check):
  ratio = posed edge length / rest edge length, for every edge, in the frames given.
  Skin:   count edges with ratio > 1.35 (stretched) or < 0.60 (squashed), per region.
  Plates: call with stretch=1.02, squash=0.98 - a rigid plate's edges must not change at all (count 0).
A region is the vertex group holding the largest weight of an edge's first vertex (usually its bone).

Rest lengths come from the mesh data (object space, before modifiers and shape keys). The posed ones come from the
evaluated mesh, so the Armature modifier must keep the vertex count (no Decimate or Remesh after it).

Usage:
    import sys; sys.path.append(r"<folder holding this file>")
    import edge_strain
    rep = edge_strain.edge_strain_report("Body", frames=range(1, 61, 3))
    print(edge_strain.format_report(rep))
    plates = edge_strain.edge_strain_report("Armour", frames=range(1, 61, 3), stretch=1.02, squash=0.98)
"""

import bpy
import numpy as np

SKIN_STRETCH = 1.35
SKIN_SQUASH = 0.60
MIN_REST_LENGTH = 1e-6   # skip degenerate edges


def _rest_data(mesh):
    coords = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get("co", coords)
    edges = np.empty(len(mesh.edges) * 2, dtype=np.int64)
    mesh.edges.foreach_get("vertices", edges)
    return coords.reshape(-1, 3), edges.reshape(-1, 2)


def _dominant_groups(obj):
    names = {g.index: g.name for g in obj.vertex_groups}
    result = []
    for v in obj.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None)
        result.append(names.get(best.group, "<none>") if best is not None else "<none>")
    return result


def _posed_coords(obj, expected_count):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        if len(mesh.vertices) != expected_count:
            raise RuntimeError(f"{obj.name}: evaluated mesh has {len(mesh.vertices)} vertices, rest has "
                               f"{expected_count} - a modifier changes topology")
        coords = np.empty(expected_count * 3, dtype=np.float64)
        mesh.vertices.foreach_get("co", coords)
        return coords.reshape(-1, 3)
    finally:
        evaluated.to_mesh_clear()


def _armatures_of(obj):
    return [m.object for m in obj.modifiers if m.type == 'ARMATURE' and m.object is not None]


def edge_strain_report(mesh_name, frames, stretch=SKIN_STRETCH, squash=SKIN_SQUASH, regions=None):
    """Per region: the worst frame's count of stretched and squashed edges, and the extreme ratios seen.

    regions: optional set of region names to report (others are ignored)."""
    obj = bpy.data.objects.get(mesh_name)
    if obj is None or obj.type != 'MESH':
        raise ValueError(f"{mesh_name!r} is not a mesh object")
    rest, edges = _rest_data(obj.data)
    rest_len = np.linalg.norm(rest[edges[:, 0]] - rest[edges[:, 1]], axis=1)
    valid = rest_len > MIN_REST_LENGTH
    edge_region = np.array(_dominant_groups(obj), dtype=object)[edges[:, 0]]
    names = sorted(set(edge_region[valid])) if regions is None else sorted(regions)

    scene = bpy.context.scene
    armatures = _armatures_of(obj)
    saved_frame = scene.frame_current
    saved_positions = [a.data.pose_position for a in armatures]
    for a in armatures:
        a.data.pose_position = 'POSE'
    stats = {n: {"stretched": 0, "squashed": 0, "worst_frame": None, "max_ratio": 1.0, "min_ratio": 1.0}
             for n in names}
    try:
        for frame in frames:
            scene.frame_set(frame)
            posed = _posed_coords(obj, len(rest))
            ratio = np.ones(len(edges))
            ratio[valid] = np.linalg.norm(posed[edges[valid, 0]] - posed[edges[valid, 1]], axis=1) / rest_len[valid]
            for n in names:
                mask = valid & (edge_region == n)
                if not mask.any():
                    continue
                r = ratio[mask]
                s = stats[n]
                n_str, n_sq = int((r > stretch).sum()), int((r < squash).sum())
                if n_str + n_sq > s["stretched"] + s["squashed"]:
                    s.update(stretched=n_str, squashed=n_sq, worst_frame=frame)
                s["max_ratio"] = max(s["max_ratio"], float(r.max()))
                s["min_ratio"] = min(s["min_ratio"], float(r.min()))
    finally:
        for a, p in zip(armatures, saved_positions):
            a.data.pose_position = p
        scene.frame_set(saved_frame)
    return {"mesh": mesh_name, "stretch": stretch, "squash": squash, "regions": stats}


def format_report(report):
    lines = [f"edge strain on {report['mesh']} (stretched > {report['stretch']}, squashed < {report['squash']})"]
    for name, s in sorted(report["regions"].items(), key=lambda kv: -(kv[1]["stretched"] + kv[1]["squashed"])):
        worst = "-" if s["worst_frame"] is None else f"f{s['worst_frame']}"
        lines.append(f"  {name:24s} worst {worst}:{s['stretched']} stretched, {s['squashed']} squashed"
                     f"  (ratios {s['min_ratio']:.2f}-{s['max_ratio']:.2f})")
    return "\n".join(lines)
