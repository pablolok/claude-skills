# Export, engine import, and DCC facts

Part of `concept-to-asset` §7.

## FBX from Blender

```python
bpy.ops.export_scene.fbx(filepath=out, use_selection=True, object_types={'ARMATURE', 'MESH'},
    add_leaf_bones=False, mesh_smooth_type='FACE', use_mesh_modifiers=True,
    bake_anim=True, bake_anim_use_all_actions=True, bake_anim_use_nla_strips=False,
    path_mode='COPY', embed_textures=True, apply_scale_options='FBX_SCALE_ALL',
    axis_forward='-Z', axis_up='Y')
```

These are the flags as used. Even with `embed_textures=True`, save the textures as files too (below).

- `bake_anim_use_all_actions=True` exports each action as its own clip. Every clip rest-keys all bones first, so a
  clip doesn't inherit the last one's pose. Use no NLA tracks.
- **Put the bones in quaternion mode before export** when the clips key quaternions. Bones left in Euler can export
  every clip as still. Refuse to export a walk that turns no bone.
- With these axes, a model facing −Y in Blender faces +Z in Unity. Check the facing once per project and write it down.
- **Save textures as files** beside the FBX; don't rely on embedding. An image packed in the .blend with an empty file
  path exports silently as a texture-less material.
- **Driven shape keys** (correctives) export only as baked curves: sample each one per frame into a blend-shape curve
  in every clip, and prove it with a round trip into the engine.
- Keep the reference, the FBX, the textures and the spec in one commit. Back up the DCC work file before a risky rig
  or clip change.

## Unity

- Model importer: `animationType = Generic` (or Humanoid with a checked avatar map), **`importNormals = Import`** (on
  generated organic meshes, Calculate shaded faces black or odd).
- Rename clips to strip the `Armature|` prefix; set `loopTime` on idle and walk.
- Materials: create the render pipeline's material asset, assign the saved textures, and remap the FBX's material to it
  (`AddRemap`, then reimport). Scene instances made before a remap can hold a dead reference: re-instantiate them.
  A material assigned by hand in a preview scene can mask the breakage.
- No `.fbm` folders left in the project.
- **An attack clip's impact frame** is data: store it beside the clips, author the clip from it, and have the importer
  put an animation event there so gameplay lands the blow on it.
- **Unity has no pose-space driver** at runtime: correctives ship as baked blend-shape curves (above).
- Check deformation in the engine too: an edit-mode test over the imported mesh's clips (skin whole, every moving clip
  turning its bones, the stretch gate).

## Unreal

- Runtime secondary motion options (see the garments reference's sources): the Bone Driven Controller for plates
  driven by a share of a joint, AnimDynamics for dangling chains, and the clothing tool for simulated cloth.
- Import options, morph targets for correctives, and material setup are not written yet: see the skill's Open list.

## Grading

The DCC's view transform (AgX, Filmic) and the engine's tonemapper differ. Emission colour, metal value, albedo value
and gloss are set by capturing in the engine (`concept-match-loop`, §2), never by converting values by formula.

## Blender facts the scripts rely on

Check these before blaming a script.
- **Actions are layered** (Blender 5.x; check your version): F-curves live in channelbags (`action.layers → strips
  → channelbags → fcurves`), and `action.fcurves` is gone.
- **An active action overwrites the pose being measured**: detach, solve, re-attach, key. `frame_set(f)` on the current
  frame does not re-evaluate.
- **An armature left in Edit Mode freezes pose evaluation**: channels update, but the pose matrices stay at rest and the
  mesh doesn't deform, with no error. Check the mode and `pose_position == 'POSE'` before judging an animation.
- **Leftover datablocks rename new ones** (`Body.001`). Select joined parts by material or a stored property, never by
  index or name. A library load of a name the file already has comes in renamed: load only the missing names.
- **`materials.clear()` sends every face to slot 0**: swap slots instead.
- **The bake writes the whole image**: a NaN background comes back as zeros. Get coverage from a second, white bake.
- **Look up shader nodes by type, not name**: names are localised.
- **Render checks use a camera made and removed in the same call**, never a scene camera moved and left so.
- **After a restart, open the saved file**: a fresh scene has none of its lights or exposure, and renders come out dark.
- **A sphere cut by a plane steps along its grid**: build caps in rings.
- **A voxel pass's grid grows with the mesh's extent**: a bad smoothing weight blew a skin apart, and the next voxel
  pass froze the machine. Make voxel and smoothing helpers refuse such input.

When Blender is driven through a bridge (an MCP server or a socket):
- Globals don't persist between calls. Load your scripts in every call, or keep them in one namespace dict, and load
  them again after any file open or restart.
- Scripts loaded into one namespace must not share top-level names: a scalar from one script broke an array function
  of the same name in another. Check names whenever you add one.
- A call that runs past the bridge's timeout keeps going in the background: wait on the file it saves, and never send
  another call meanwhile. Keep a build and its renders in separate calls.
- Save, then restart, after a heavy job: the DCC holds the memory it loaded.
