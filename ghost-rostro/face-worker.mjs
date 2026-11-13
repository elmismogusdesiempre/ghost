import { FaceLandmarker, FilesetResolver } from './vendor/vision_bundle.mjs';
import { poseFromMatrix } from './face-gesture.mjs';
let landmarker;
self.onmessage = async ({data}) => {
  if(data.type === 'init') {
    try {
      const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', import.meta.url).href, true);
      landmarker = await FaceLandmarker.createFromOptions(files, {
        baseOptions:{modelAssetPath:new URL('./assets/face_landmarker.task', import.meta.url).href,delegate:'CPU'},
        runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:0.65,minFacePresenceConfidence:0.65,minTrackingConfidence:0.65,
        outputFacialTransformationMatrixes:true,outputFaceBlendshapes:false
      });
      self.postMessage({type:'ready'});
    } catch(error) { self.postMessage({type:'error',message:error.message}); }
  } else if(data.type === 'frame') {
    try {
      const result = landmarker.detectForVideo(data.bitmap, data.time);
      const faces = result.faceLandmarks?.length || 0;
      const landmarks = faces === 1 ? result.faceLandmarks[0] : [];
      let pose = null;
      if(faces === 1 && landmarks.length) {
        const xs=landmarks.map(p=>p.x),ys=landmarks.map(p=>p.y);
        const box={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
        const rotation=poseFromMatrix(result.facialTransformationMatrixes?.[0]?.data);
        if(rotation)pose={...rotation,box};
      }
      self.postMessage({type:'pose',faces,pose,time:data.time});
    } catch(error) { self.postMessage({type:'error',message:error.message}); }
    finally {data.bitmap.close();}
  }
};
