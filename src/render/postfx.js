import * as THREE from 'three';

export async function enablePostFX(engine) {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js')
  ]);

  const composer = new EffectComposer(engine.renderer);
  composer.addPass(new RenderPass(engine.scene, engine.camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.45, 0.6, 0.82
  ));
  composer.addPass(new OutputPass());
  composer.setSize(window.innerWidth, window.innerHeight);
  engine.composer = composer;
  return composer;
}